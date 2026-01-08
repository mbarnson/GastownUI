use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

/// Gas Town event from .events.jsonl
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasTownEvent {
    pub ts: String,
    pub source: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub actor: String,
    pub payload: serde_json::Value,
    pub visibility: Option<String>,
}

/// Verbosity level for event filtering
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Verbosity {
    Quiet,   // Only critical events (errors, stuck agents)
    Normal,  // Standard events (completions, assignments)
    Chatty,  // All events including minor updates
}

impl Default for Verbosity {
    fn default() -> Self {
        Verbosity::Normal
    }
}

/// Events watcher state
pub struct EventsWatcherState {
    is_watching: AtomicBool,
    verbosity: Mutex<Verbosity>,
    last_position: AtomicU64,
    watcher: Mutex<Option<RecommendedWatcher>>,
}

impl Default for EventsWatcherState {
    fn default() -> Self {
        Self {
            is_watching: AtomicBool::new(false),
            verbosity: Mutex::new(Verbosity::Normal),
            last_position: AtomicU64::new(0),
            watcher: Mutex::new(None),
        }
    }
}

/// Get the events file path
fn get_events_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Failed to get home directory")?;
    let events_path = home.join("gt/.events.jsonl");

    if events_path.exists() {
        Ok(events_path)
    } else {
        Err(format!("Events file not found: {:?}", events_path))
    }
}

/// Check if event should be emitted based on verbosity
fn should_emit_event(event: &GasTownEvent, verbosity: Verbosity) -> bool {
    match verbosity {
        Verbosity::Quiet => {
            // Only critical: errors, stuck, blocked
            matches!(
                event.event_type.as_str(),
                "error" | "stuck" | "blocked" | "escalation"
            )
        }
        Verbosity::Normal => {
            // Standard: completions, assignments, mail, session changes
            matches!(
                event.event_type.as_str(),
                "error" | "stuck" | "blocked" | "escalation" |
                "mail" | "complete" | "assignment" | "session_start" | "session_end" |
                "merge" | "convoy_start" | "convoy_complete"
            )
        }
        Verbosity::Chatty => {
            // Everything
            true
        }
    }
}

/// Generate voice commentary for an event
fn generate_commentary(event: &GasTownEvent) -> Option<String> {
    let commentary = match event.event_type.as_str() {
        "mail" => {
            let subject = event.payload.get("subject")
                .and_then(|v| v.as_str())
                .unwrap_or("message");
            let to = event.payload.get("to")
                .and_then(|v| v.as_str())
                .unwrap_or("someone");
            Some(format!("Mail from {} to {}: {}", event.actor, to, subject))
        }
        "session_start" => {
            Some(format!("{} has joined the party.", event.actor))
        }
        "session_end" => {
            Some(format!("{} has left. Hopefully they finished something.", event.actor))
        }
        "complete" => {
            let task = event.payload.get("task")
                .and_then(|v| v.as_str())
                .unwrap_or("something");
            Some(format!("{} completed {}. Miracles do happen.", event.actor, task))
        }
        "stuck" => {
            Some(format!("Heads up: {} appears to be stuck. Might need a nudge.", event.actor))
        }
        "error" => {
            let msg = event.payload.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown error");
            Some(format!("Error from {}: {}", event.actor, msg))
        }
        "nudge" => {
            let target = event.payload.get("target")
                .and_then(|v| v.as_str())
                .unwrap_or("someone");
            Some(format!("{} nudged {}.", event.actor, target))
        }
        "merge" => {
            Some(format!("Work from {} has been merged. Progress!", event.actor))
        }
        "convoy_start" => {
            let name = event.payload.get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("convoy");
            Some(format!("Convoy {} is rolling out.", name))
        }
        "convoy_complete" => {
            let name = event.payload.get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("convoy");
            Some(format!("Convoy {} has reached its destination.", name))
        }
        _ => None,
    };

    commentary
}

/// Enriched event with commentary
#[derive(Debug, Clone, Serialize)]
pub struct EnrichedEvent {
    pub event: GasTownEvent,
    pub commentary: Option<String>,
}

/// Start watching the events file
#[tauri::command]
pub async fn start_events_watcher(
    app: AppHandle,
    state: State<'_, EventsWatcherState>,
) -> Result<(), String> {
    if state.is_watching.load(Ordering::SeqCst) {
        return Ok(()); // Already watching
    }

    let events_path = get_events_path()?;

    // Get current file size as starting position
    let file = File::open(&events_path)
        .map_err(|e| format!("Failed to open events file: {}", e))?;
    let metadata = file.metadata()
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;
    state.last_position.store(metadata.len(), Ordering::SeqCst);

    // Create shared state for the watcher callback
    let last_position = Arc::new(AtomicU64::new(metadata.len()));
    let verbosity_level = Arc::new(Mutex::new(*state.verbosity.lock().unwrap()));

    // Store starting position
    state.last_position.store(metadata.len(), Ordering::SeqCst);

    let last_position_clone = Arc::clone(&last_position);
    let verbosity_clone = Arc::clone(&verbosity_level);
    let events_path_clone = events_path.clone();
    let app_clone = app.clone();

    // Create file watcher
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                if event.kind.is_modify() {
                    // Read new lines from the file
                    if let Ok(mut file) = File::open(&events_path_clone) {
                        let current_pos = last_position_clone.load(Ordering::SeqCst);
                        if file.seek(SeekFrom::Start(current_pos)).is_ok() {
                            let reader = BufReader::new(&file);
                            let verbosity = *verbosity_clone.lock().unwrap();

                            for line in reader.lines() {
                                if let Ok(line) = line {
                                    if let Ok(event) = serde_json::from_str::<GasTownEvent>(&line) {
                                        if should_emit_event(&event, verbosity) {
                                            let commentary = generate_commentary(&event);
                                            let enriched = EnrichedEvent { event, commentary };
                                            let _ = app_clone.emit("gastwon-event", &enriched);
                                        }
                                    }
                                }
                            }

                            // Update position
                            if let Ok(pos) = file.stream_position() {
                                last_position_clone.store(pos, Ordering::SeqCst);
                            }
                        }
                    }
                }
            }
        },
        Config::default().with_poll_interval(Duration::from_secs(1)),
    ).map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher.watch(&events_path, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch events file: {}", e))?;

    *state.watcher.lock().unwrap() = Some(watcher);
    state.is_watching.store(true, Ordering::SeqCst);

    log::info!("Started watching events at {:?}", events_path);
    Ok(())
}

/// Stop watching the events file
#[tauri::command]
pub async fn stop_events_watcher(
    state: State<'_, EventsWatcherState>,
) -> Result<(), String> {
    state.is_watching.store(false, Ordering::SeqCst);
    *state.watcher.lock().unwrap() = None;
    log::info!("Stopped watching events");
    Ok(())
}

/// Set verbosity level
#[tauri::command]
pub async fn set_events_verbosity(
    state: State<'_, EventsWatcherState>,
    verbosity: Verbosity,
) -> Result<(), String> {
    *state.verbosity.lock().unwrap() = verbosity;
    log::info!("Set events verbosity to {:?}", verbosity);
    Ok(())
}

/// Get current verbosity level
#[tauri::command]
pub async fn get_events_verbosity(
    state: State<'_, EventsWatcherState>,
) -> Result<Verbosity, String> {
    Ok(*state.verbosity.lock().unwrap())
}

/// Get recent events (last N)
#[tauri::command]
pub async fn get_recent_events(
    state: State<'_, EventsWatcherState>,
    count: Option<usize>,
) -> Result<Vec<EnrichedEvent>, String> {
    let events_path = get_events_path()?;
    let file = File::open(&events_path)
        .map_err(|e| format!("Failed to open events file: {}", e))?;

    let reader = BufReader::new(file);
    let verbosity = *state.verbosity.lock().unwrap();
    let limit = count.unwrap_or(20);

    let events: Vec<EnrichedEvent> = reader.lines()
        .filter_map(|line| line.ok())
        .filter_map(|line| serde_json::from_str::<GasTownEvent>(&line).ok())
        .filter(|e| should_emit_event(e, verbosity))
        .map(|event| {
            let commentary = generate_commentary(&event);
            EnrichedEvent { event, commentary }
        })
        .collect();

    // Return last N events
    let start = events.len().saturating_sub(limit);
    Ok(events[start..].to_vec())
}

/// Check if watcher is active
#[tauri::command]
pub async fn is_events_watcher_active(
    state: State<'_, EventsWatcherState>,
) -> Result<bool, String> {
    Ok(state.is_watching.load(Ordering::SeqCst))
}
