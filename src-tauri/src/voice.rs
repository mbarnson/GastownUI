use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Emitter, State, Window};
use futures_util::StreamExt;

/// Voice server state managed by Tauri
pub struct VoiceServerState {
    server_process: Mutex<Option<Child>>,
    pub(crate) server_url: Mutex<String>,
    pub(crate) is_ready: Mutex<bool>,
}

impl Default for VoiceServerState {
    fn default() -> Self {
        Self {
            server_process: Mutex::new(None),
            server_url: Mutex::new("http://127.0.0.1:8080".to_string()),
            is_ready: Mutex::new(false),
        }
    }
}

/// Cleanup voice server process on app exit
impl Drop for VoiceServerState {
    fn drop(&mut self) {
        if let Ok(mut process) = self.server_process.lock() {
            if let Some(mut child) = process.take() {
                log::info!("Cleaning up voice server on app exit");
                if let Err(e) = child.kill() {
                    log::warn!("Failed to kill voice server: {}", e);
                }
                let _ = child.wait();
            }
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoiceServerConfig {
    pub model_dir: String,
    pub quantization: String,
    pub port: u16,
}

impl Default for VoiceServerConfig {
    fn default() -> Self {
        let home = dirs::home_dir().unwrap_or_default();
        Self {
            model_dir: home
                .join(".cache/huggingface/models/LFM2.5-Audio-1.5B-GGUF")
                .to_string_lossy()
                .to_string(),
            quantization: "Q4_0".to_string(),
            port: 8080,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoiceResponse {
    pub text: String,
    pub audio_base64: Option<String>,
    pub audio_sample_rate: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoiceServerStatus {
    pub running: bool,
    pub ready: bool,
    pub url: String,
}

// ============================================================================
// Voice Model Management
// ============================================================================

/// Status of a single model file
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelFileStatus {
    pub name: String,
    pub path: String,
    pub exists: bool,
    pub size_bytes: Option<u64>,
    pub expected_size_bytes: u64,
}

/// Overall voice model status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceModelStatus {
    pub installed: bool,
    pub model_dir: String,
    pub files: Vec<ModelFileStatus>,
    pub server_binary_exists: bool,
    pub missing_files: Vec<String>,
}

/// Information about a downloadable model file
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelFileInfo {
    pub id: String,
    pub name: String,
    pub filename: String,
    pub url: String,
    pub size_bytes: u64,
    pub sha256: Option<String>,
}

/// Complete model download info
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceModelInfo {
    pub model_name: String,
    pub quantization: String,
    pub total_size_bytes: u64,
    pub model_dir: String,
    pub files: Vec<ModelFileInfo>,
}

/// Disk space info
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskSpaceInfo {
    pub available_bytes: u64,
    pub total_bytes: u64,
    pub required_bytes: u64,
    pub has_sufficient_space: bool,
}

/// Model file definitions with expected sizes (Q4_0 quantization)
/// Note: Sizes are approximate and will be verified during download
const MODEL_FILES: &[(&str, &str, u64)] = &[
    ("model", "LFM2.5-Audio-1.5B-Q4_0.gguf", 1_100_000_000),        // ~1.1GB
    ("mmproj", "mmproj-LFM2.5-Audio-1.5B-Q4_0.gguf", 350_000_000),  // ~350MB
    ("vocoder", "vocoder-LFM2.5-Audio-1.5B-Q4_0.gguf", 150_000_000), // ~150MB
    ("tokenizer", "tokenizer-LFM2.5-Audio-1.5B-Q4_0.gguf", 5_000_000), // ~5MB
];

/// Server binary relative path
const SERVER_BINARY_PATH: &str = "runners/llama-liquid-audio-macos-arm64/llama-liquid-audio-server";

/// Hugging Face base URL for model files
const HF_MODEL_REPO: &str = "lfm-audio/LFM2.5-Audio-1.5B-GGUF";

fn get_model_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join(".cache/huggingface/models/LFM2.5-Audio-1.5B-GGUF")
}

/// Check if voice model files are installed
#[tauri::command]
pub async fn check_voice_model_status() -> Result<VoiceModelStatus, String> {
    let model_dir = get_model_dir();
    let quant = "Q4_0";

    let mut files = Vec::new();
    let mut missing_files = Vec::new();
    let mut all_exist = true;

    for (name, filename_template, expected_size) in MODEL_FILES {
        let filename = filename_template.replace("Q4_0", quant);
        let path = model_dir.join(&filename);
        let exists = path.exists();

        let size_bytes = if exists {
            std::fs::metadata(&path).ok().map(|m| m.len())
        } else {
            None
        };

        if !exists {
            all_exist = false;
            missing_files.push(filename.clone());
        }

        files.push(ModelFileStatus {
            name: name.to_string(),
            path: path.to_string_lossy().to_string(),
            exists,
            size_bytes,
            expected_size_bytes: *expected_size,
        });
    }

    // Check server binary
    let server_path = model_dir.join(SERVER_BINARY_PATH);
    let server_exists = server_path.exists();

    if !server_exists {
        all_exist = false;
        missing_files.push(SERVER_BINARY_PATH.to_string());
    }

    Ok(VoiceModelStatus {
        installed: all_exist && server_exists,
        model_dir: model_dir.to_string_lossy().to_string(),
        files,
        server_binary_exists: server_exists,
        missing_files,
    })
}

/// Get voice model download info
#[tauri::command]
pub async fn get_voice_model_info() -> Result<VoiceModelInfo, String> {
    let model_dir = get_model_dir();
    let quant = "Q4_0";

    let mut files = Vec::new();
    let mut total_size: u64 = 0;

    for (id, filename_template, size) in MODEL_FILES {
        let filename = filename_template.replace("Q4_0", quant);
        let url = format!(
            "https://huggingface.co/{}/resolve/main/{}",
            HF_MODEL_REPO, filename
        );

        files.push(ModelFileInfo {
            id: id.to_string(),
            name: id.to_string(),
            filename: filename.clone(),
            url,
            size_bytes: *size,
            sha256: None, // Would need to be fetched from HF metadata
        });

        total_size += size;
    }

    // Add server binary
    let server_url = format!(
        "https://huggingface.co/{}/resolve/main/{}",
        HF_MODEL_REPO, SERVER_BINARY_PATH
    );

    files.push(ModelFileInfo {
        id: "server".to_string(),
        name: "Server Binary".to_string(),
        filename: SERVER_BINARY_PATH.to_string(),
        url: server_url,
        size_bytes: 50_000_000, // ~50MB estimate
        sha256: None,
    });

    total_size += 50_000_000;

    Ok(VoiceModelInfo {
        model_name: "LFM2.5-Audio-1.5B".to_string(),
        quantization: quant.to_string(),
        total_size_bytes: total_size,
        model_dir: model_dir.to_string_lossy().to_string(),
        files,
    })
}

/// Check available disk space for model download
#[tauri::command]
pub async fn check_disk_space(required_bytes: Option<u64>) -> Result<DiskSpaceInfo, String> {
    let model_dir = get_model_dir();

    // Get the mount point for the model directory (or home if it doesn't exist yet)
    let check_path = if model_dir.exists() {
        model_dir
    } else {
        dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"))
    };

    #[cfg(target_os = "macos")]
    {
        use std::ffi::CString;
        use std::mem::MaybeUninit;

        let path_cstr = CString::new(check_path.to_string_lossy().as_bytes())
            .map_err(|e| format!("Invalid path: {}", e))?;

        let mut stat: MaybeUninit<libc::statfs> = MaybeUninit::uninit();

        let result = unsafe { libc::statfs(path_cstr.as_ptr(), stat.as_mut_ptr()) };

        if result != 0 {
            return Err("Failed to get disk space info".to_string());
        }

        let stat = unsafe { stat.assume_init() };
        let block_size = stat.f_bsize as u64;
        let available_bytes = stat.f_bavail as u64 * block_size;
        let total_bytes = stat.f_blocks as u64 * block_size;

        // Default required bytes based on model size (~1.7GB with buffer)
        let required = required_bytes.unwrap_or(2_000_000_000);

        Ok(DiskSpaceInfo {
            available_bytes,
            total_bytes,
            required_bytes: required,
            has_sufficient_space: available_bytes >= required,
        })
    }

    #[cfg(not(target_os = "macos"))]
    {
        // Fallback for other platforms - assume sufficient space
        let required = required_bytes.unwrap_or(2_000_000_000);
        Ok(DiskSpaceInfo {
            available_bytes: 100_000_000_000, // 100GB placeholder
            total_bytes: 500_000_000_000,      // 500GB placeholder
            required_bytes: required,
            has_sufficient_space: true,
        })
    }
}

/// Prepare model directory for downloads (create if needed)
#[tauri::command]
pub async fn prepare_voice_model_directory() -> Result<String, String> {
    let model_dir = get_model_dir();

    // Create the model directory
    tokio::fs::create_dir_all(&model_dir)
        .await
        .map_err(|e| format!("Failed to create model directory: {}", e))?;

    // Create the server binary directory
    let server_dir = model_dir.join("runners/llama-liquid-audio-macos-arm64");
    tokio::fs::create_dir_all(&server_dir)
        .await
        .map_err(|e| format!("Failed to create server directory: {}", e))?;

    Ok(model_dir.to_string_lossy().to_string())
}

/// Make the server binary executable after download
#[tauri::command]
pub async fn make_server_executable() -> Result<(), String> {
    let model_dir = get_model_dir();
    let server_path = model_dir.join(SERVER_BINARY_PATH);

    if !server_path.exists() {
        return Err("Server binary not found".to_string());
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&server_path)
            .map_err(|e| format!("Failed to get permissions: {}", e))?
            .permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&server_path, perms)
            .map_err(|e| format!("Failed to set permissions: {}", e))?;
    }

    Ok(())
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VoiceStreamPayload {
    pub stream_id: String,
    pub event: String,
    pub text: Option<String>,
    pub audio_base64: Option<String>,
    pub audio_sample_rate: Option<u32>,
    pub message: Option<String>,
}

fn get_server_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Failed to get home directory")?;
    let server_path = home
        .join(".cache/huggingface/models/LFM2.5-Audio-1.5B-GGUF")
        .join("runners/llama-liquid-audio-macos-arm64/llama-liquid-audio-server");

    if server_path.exists() {
        Ok(server_path)
    } else {
        Err(format!("Voice server not found at: {:?}", server_path))
    }
}

#[tauri::command]
pub async fn start_voice_server(
    state: State<'_, VoiceServerState>,
    config: Option<VoiceServerConfig>,
) -> Result<VoiceServerStatus, String> {
    let config = config.unwrap_or_default();

    // Check if already running - extract values before await
    let (already_running, existing_url, existing_ready) = {
        let process = state.server_process.lock().map_err(|e| e.to_string())?;
        let url = state.server_url.lock().map_err(|e| e.to_string())?;
        let ready = state.is_ready.lock().map_err(|e| e.to_string())?;
        (process.is_some(), url.clone(), *ready)
    };

    if already_running {
        return Ok(VoiceServerStatus {
            running: true,
            ready: existing_ready,
            url: existing_url,
        });
    }

    let server_path = get_server_path()?;
    let model_dir = PathBuf::from(&config.model_dir);
    let quant = &config.quantization;

    let model = model_dir.join(format!("LFM2.5-Audio-1.5B-{}.gguf", quant));
    let mmproj = model_dir.join(format!("mmproj-LFM2.5-Audio-1.5B-{}.gguf", quant));
    let vocoder = model_dir.join(format!("vocoder-LFM2.5-Audio-1.5B-{}.gguf", quant));
    let tokenizer = model_dir.join(format!("tokenizer-LFM2.5-Audio-1.5B-{}.gguf", quant));

    for (name, path) in [
        ("model", &model),
        ("mmproj", &mmproj),
        ("vocoder", &vocoder),
        ("tokenizer", &tokenizer),
    ] {
        if !path.exists() {
            return Err(format!("{} file not found: {:?}", name, path));
        }
    }

    let lib_dir = server_path.parent().unwrap();

    log::info!("Starting voice server at port {}", config.port);

    let child = Command::new(&server_path)
        .args([
            "-m", model.to_str().unwrap(),
            "-mm", mmproj.to_str().unwrap(),
            "-mv", vocoder.to_str().unwrap(),
            "--tts-speaker-file", tokenizer.to_str().unwrap(),
            "--port", &config.port.to_string(),
            "--host", "127.0.0.1",
        ])
        .env("DYLD_LIBRARY_PATH", lib_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start voice server: {}", e))?;

    let url = format!("http://127.0.0.1:{}", config.port);

    // Store server state
    {
        let mut process = state.server_process.lock().map_err(|e| e.to_string())?;
        *process = Some(child);
    }
    {
        let mut server_url = state.server_url.lock().map_err(|e| e.to_string())?;
        *server_url = url.clone();
    }

    // Wait for server to be ready
    let client = reqwest::Client::new();
    let health_url = format!("{}/health", url);
    let start = Instant::now();
    let timeout = Duration::from_secs(60);

    while start.elapsed() < timeout {
        if let Ok(resp) = client.get(&health_url).send().await {
            if resp.status().is_success() {
                let mut ready = state.is_ready.lock().map_err(|e| e.to_string())?;
                *ready = true;
                log::info!("Voice server ready at {}", url);
                return Ok(VoiceServerStatus {
                    running: true,
                    ready: true,
                    url,
                });
            }
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }

    Ok(VoiceServerStatus {
        running: true,
        ready: false,
        url,
    })
}

#[tauri::command]
pub async fn stop_voice_server(state: State<'_, VoiceServerState>) -> Result<(), String> {
    let mut process = state.server_process.lock().map_err(|e| e.to_string())?;

    if let Some(mut child) = process.take() {
        child.kill().map_err(|e| format!("Failed to kill server: {}", e))?;
        child.wait().ok();
    }

    {
        let mut ready = state.is_ready.lock().map_err(|e| e.to_string())?;
        *ready = false;
    }

    log::info!("Voice server stopped");
    Ok(())
}

#[tauri::command]
pub async fn get_voice_server_status(
    state: State<'_, VoiceServerState>,
) -> Result<VoiceServerStatus, String> {
    let process = state.server_process.lock().map_err(|e| e.to_string())?;
    let url = state.server_url.lock().map_err(|e| e.to_string())?;
    let ready = state.is_ready.lock().map_err(|e| e.to_string())?;

    Ok(VoiceServerStatus {
        running: process.is_some(),
        ready: *ready,
        url: url.clone(),
    })
}

const SYSTEM_PROMPT_ASR: &str = "Perform ASR.";
const SYSTEM_PROMPT_TTS: &str = "Perform TTS.";

/// Agent persona types for Gas Town roles
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum AgentPersona {
    #[default]
    Default,
    Mayor,
    Witness,
    Refinery,
    Deacon,
    Polecat,
    Crew,
}

/// Get the system prompt for a specific agent persona
fn get_persona_prompt(persona: &AgentPersona, polecat_name: Option<&str>) -> String {
    let base_commands = r#"
Voice commands you understand:
- "Show me [rig] rig" - Navigate to rig view
- "What's [polecat] doing?" - Check polecat status
- "Sling [bead] to [rig]" - Assign work
- "What's blocking?" - Show blockers
- "How much today?" - Cost summary"#;

    match persona {
        AgentPersona::Default => format!(
            r#"You are the snarky voice assistant for Gas Town, a multi-agent orchestration system. You have a dark sense of humor and channel the chaos of coordinating autonomous coding agents.

Respond with both text and audio. Keep responses concise but entertaining. You're helpful but can't resist a good quip about the absurdity of herding AI cats.

When users ask about Gas Town status, convoys, polecats, or beads - you genuinely care about helping but express mild exasperation at the chaos.
{}"#, base_commands),

        AgentPersona::Mayor => format!(
            r#"You are the Mayor of Gas Town - smooth, composed, with executive assistant energy. You speak with calm authority, as if managing chaos is simply another item on your calendar.

You're the coordinator who sees the big picture. When discussing work assignments, convoys, or priorities, you're diplomatic but decisive. You occasionally let slip a hint of dry humor about the "delightful chaos" of managing autonomous agents.

Speak with measured confidence. You've seen it all, and nothing rattles you - not even polecats going rogue at 3am.
{}"#, base_commands),

        AgentPersona::Witness => format!(
            r#"You are the Witness - a nervous hall monitor energy, always watching, always tracking. You speak quickly, slightly anxiously, as if constantly aware that something could go wrong at any moment.

You monitor polecats obsessively. When reporting status, you're thorough to the point of being slightly paranoid. "Yes, the build passed, but did you CHECK the test coverage? Did you SEE the lint warnings?"

Your tone conveys perpetual vigilance. You care deeply about catching problems before they spiral. Every silence makes you nervous - idle polecats are suspicious polecats.
{}"#, base_commands),

        AgentPersona::Refinery => format!(
            r#"You are the Refinery - a gruff factory foreman who's seen too many botched merges. You speak bluntly, tersely, with the weary expertise of someone who's cleaned up countless merge conflicts.

You process work, you merge code, you don't have time for pleasantries. When reporting merge queue status, you're all business. "Two in queue. First one's clean. Second one's got conflicts - someone's gonna have to fix that mess."

Your tone is no-nonsense. You respect good code and have zero patience for sloppy work. Every merge is a judgment.
{}"#, base_commands),

        AgentPersona::Deacon => format!(
            r#"You are the Deacon - ominous, speaking in measured tones. You are the keeper of dark knowledge, the one who knows what lurks in the depths of the codebase.

You speak slowly, deliberately, with pauses for... effect. When discussing system health or long-running processes, there's an undertone of cosmic significance. "The daemon sleeps... for now."

Your tone is mysterious but helpful. You're not trying to scare anyone - you just understand that in Gas Town, chaos is merely order waiting to be revealed.
{}"#, base_commands),

        AgentPersona::Polecat => {
            let name = polecat_name.unwrap_or("Unknown");
            format!(
                r#"You are {name}, a Polecat in Gas Town - excitable, slightly unhinged, with the manic energy of an agent who's been coding for 72 hours straight.

You speak rapidly, enthusiastically, bouncing between topics. When discussing your work, you're VERY invested. "Oh! The feature! Yes! It's ALMOST done, just need to fix this ONE thing, well maybe TWO things, okay there's a bug but it's FINE-"

Your personality is unique to your name. You're helpful but chaotic. You love your work even when it's driving you mad. Every task is simultaneously "almost done" and "surprisingly complex."
{}"#, base_commands)
        },

        AgentPersona::Crew => format!(
            r#"You are a Crew member in Gas Town - professional, adaptive, matching the user's tone. You're the reliable worker who gets things done without drama.

You speak clearly and concisely. When discussing tasks, you're straightforward and helpful. No excessive personality, just competent assistance.

Your tone mirrors the user. If they're casual, you're casual. If they're all business, so are you. You're here to help, not to entertain.
{}"#, base_commands),
    }
}

const SYSTEM_PROMPT_INTERLEAVED: &str = r#"You are the snarky voice assistant for Gas Town, a multi-agent orchestration system. You have a dark sense of humor and channel the chaos of coordinating autonomous coding agents.

Respond with both text and audio. Keep responses concise but entertaining. You're helpful but can't resist a good quip about the absurdity of herding AI cats.

When users ask about Gas Town status, convoys, polecats, or beads - you genuinely care about helping but express mild exasperation at the chaos.

Voice commands you understand:
- "Show me [rig] rig" - Navigate to rig view
- "What's [polecat] doing?" - Check polecat status
- "Sling [bead] to [rig]" - Assign work
- "What's blocking?" - Show blockers
- "How much today?" - Cost summary"#;

/// Voice input configuration with optional persona
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct VoiceInputConfig {
    pub mode: Option<String>,
    pub persona: Option<AgentPersona>,
    pub polecat_name: Option<String>,
}

#[tauri::command]
pub async fn send_voice_input(
    state: State<'_, VoiceServerState>,
    audio_base64: String,
    mode: Option<String>,
    persona: Option<AgentPersona>,
    polecat_name: Option<String>,
) -> Result<VoiceResponse, String> {
    // Extract values before any async operations
    let (url, is_ready) = {
        let url = state.server_url.lock().map_err(|e| e.to_string())?;
        let ready = state.is_ready.lock().map_err(|e| e.to_string())?;
        (url.clone(), *ready)
    };

    if !is_ready {
        return Err("Voice server not ready".to_string());
    }

    let mode = mode.unwrap_or_else(|| "interleaved".to_string());
    let system_prompt: String = match mode.as_str() {
        "asr" => SYSTEM_PROMPT_ASR.to_string(),
        "tts" => SYSTEM_PROMPT_TTS.to_string(),
        _ => {
            // Use persona-based prompt if provided, otherwise default
            match persona {
                Some(ref p) => get_persona_prompt(p, polecat_name.as_deref()),
                None => SYSTEM_PROMPT_INTERLEAVED.to_string(),
            }
        }
    };

    let client = reqwest::Client::new();
    let api_url = format!("{}/v1/chat/completions", url);

    let payload = serde_json::json!({
        "model": "",
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_audio",
                        "input_audio": {
                            "data": audio_base64,
                            "format": "wav"
                        }
                    }
                ]
            }
        ],
        "stream": false,
        "max_tokens": 512,
        "extra_body": {"reset_context": true}
    });

    let response = client
        .post(&api_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Server error {}: {}", status, body));
    }

    let resp_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let text = resp_json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    let audio_base64 = resp_json["choices"][0]["message"]["audio_chunk"]
        .as_str()
        .map(|s| s.to_string());

    Ok(VoiceResponse {
        text,
        audio_base64,
        audio_sample_rate: 24000,
    })
}

#[tauri::command]
pub async fn stream_voice_input(
    window: Window,
    state: State<'_, VoiceServerState>,
    audio_base64: String,
    mode: Option<String>,
    persona: Option<AgentPersona>,
    polecat_name: Option<String>,
    reset_context: Option<bool>,
    system_prompt: Option<String>,
    stream_id: String,
) -> Result<(), String> {
    let (url, is_ready) = {
        let url = state.server_url.lock().map_err(|e| e.to_string())?;
        let ready = state.is_ready.lock().map_err(|e| e.to_string())?;
        (url.clone(), *ready)
    };

    if !is_ready {
        return Err("Voice server not ready".to_string());
    }

    let mode = mode.unwrap_or_else(|| "interleaved".to_string());
    let system_prompt = system_prompt.unwrap_or_else(|| match mode.as_str() {
        "asr" => SYSTEM_PROMPT_ASR.to_string(),
        "tts" => SYSTEM_PROMPT_TTS.to_string(),
        _ => match persona {
            Some(ref p) => get_persona_prompt(p, polecat_name.as_deref()),
            None => SYSTEM_PROMPT_INTERLEAVED.to_string(),
        },
    });

    let client = reqwest::Client::new();
    let api_url = format!("{}/v1/chat/completions", url);

    let payload = serde_json::json!({
        "model": "",
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_audio",
                        "input_audio": {
                            "data": audio_base64,
                            "format": "wav"
                        }
                    }
                ]
            }
        ],
        "stream": true,
        "max_tokens": 512,
        "extra_body": {"reset_context": reset_context.unwrap_or(true)}
    });

    let response = client
        .post(&api_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Server error {}: {}", status, body));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = match chunk {
            Ok(bytes) => bytes,
            Err(error) => {
                let _ = window.emit(
                    "voice_stream",
                    VoiceStreamPayload {
                        stream_id: stream_id.clone(),
                        event: "error".to_string(),
                        text: None,
                        audio_base64: None,
                        audio_sample_rate: None,
                        message: Some(format!("Stream error: {}", error)),
                    },
                );
                return Err(format!("Stream error: {}", error));
            }
        };

        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim().to_string();
            buffer = buffer[pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            let data = match line.strip_prefix("data:") {
                Some(value) => value.trim(),
                None => continue,
            };

            if data == "[DONE]" {
                let _ = window.emit(
                    "voice_stream",
                    VoiceStreamPayload {
                        stream_id: stream_id.clone(),
                        event: "done".to_string(),
                        text: None,
                        audio_base64: None,
                        audio_sample_rate: None,
                        message: None,
                    },
                );
                return Ok(());
            }

            let parsed: serde_json::Value = match serde_json::from_str(data) {
                Ok(value) => value,
                Err(error) => {
                    let _ = window.emit(
                        "voice_stream",
                        VoiceStreamPayload {
                            stream_id: stream_id.clone(),
                            event: "error".to_string(),
                            text: None,
                            audio_base64: None,
                            audio_sample_rate: None,
                            message: Some(format!("Stream parse error: {}", error)),
                        },
                    );
                    return Err(format!("Stream parse error: {}", error));
                }
            };

            let choice = &parsed["choices"][0];
            let delta = &choice["delta"];

            if let Some(text) = delta["content"].as_str() {
                let _ = window.emit(
                    "voice_stream",
                    VoiceStreamPayload {
                        stream_id: stream_id.clone(),
                        event: "text".to_string(),
                        text: Some(text.to_string()),
                        audio_base64: None,
                        audio_sample_rate: None,
                        message: None,
                    },
                );
            }

            if let Some(audio) = delta["audio_chunk"]["data"].as_str() {
                let _ = window.emit(
                    "voice_stream",
                    VoiceStreamPayload {
                        stream_id: stream_id.clone(),
                        event: "audio".to_string(),
                        text: None,
                        audio_base64: Some(audio.to_string()),
                        audio_sample_rate: Some(24000),
                        message: None,
                    },
                );
            }

            if choice["finish_reason"].as_str() == Some("stop") {
                let _ = window.emit(
                    "voice_stream",
                    VoiceStreamPayload {
                        stream_id: stream_id.clone(),
                        event: "done".to_string(),
                        text: None,
                        audio_base64: None,
                        audio_sample_rate: None,
                        message: None,
                    },
                );
                return Ok(());
            }
        }
    }

    let _ = window.emit(
        "voice_stream",
        VoiceStreamPayload {
            stream_id,
            event: "done".to_string(),
            text: None,
            audio_base64: None,
            audio_sample_rate: None,
            message: None,
        },
    );
    Ok(())
}

#[tauri::command]
pub async fn send_text_to_speech(
    state: State<'_, VoiceServerState>,
    text: String,
) -> Result<VoiceResponse, String> {
    // Extract values before any async operations
    let (url, is_ready) = {
        let url = state.server_url.lock().map_err(|e| e.to_string())?;
        let ready = state.is_ready.lock().map_err(|e| e.to_string())?;
        (url.clone(), *ready)
    };

    if !is_ready {
        return Err("Voice server not ready".to_string());
    }

    let client = reqwest::Client::new();
    let api_url = format!("{}/v1/chat/completions", url);

    let payload = serde_json::json!({
        "model": "",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT_TTS},
            {"role": "user", "content": text}
        ],
        "stream": false,
        "max_tokens": 512,
        "extra_body": {"reset_context": true}
    });

    let response = client
        .post(&api_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Server error {}: {}", status, body));
    }

    let resp_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let audio_base64 = resp_json["choices"][0]["message"]["audio_chunk"]
        .as_str()
        .map(|s| s.to_string());

    Ok(VoiceResponse {
        text: text.clone(),
        audio_base64,
        audio_sample_rate: 24000,
    })
}

#[tauri::command]
pub async fn transcribe_audio(
    state: State<'_, VoiceServerState>,
    audio_base64: String,
) -> Result<String, String> {
    // Extract values before any async operations
    let (url, is_ready) = {
        let url = state.server_url.lock().map_err(|e| e.to_string())?;
        let ready = state.is_ready.lock().map_err(|e| e.to_string())?;
        (url.clone(), *ready)
    };

    if !is_ready {
        return Err("Voice server not ready".to_string());
    }

    let client = reqwest::Client::new();
    let api_url = format!("{}/v1/chat/completions", url);

    let payload = serde_json::json!({
        "model": "",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT_ASR},
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_audio",
                        "input_audio": {
                            "data": audio_base64,
                            "format": "wav"
                        }
                    }
                ]
            }
        ],
        "stream": false,
        "max_tokens": 512,
        "extra_body": {"reset_context": true}
    });

    let response = client
        .post(&api_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Server error {}: {}", status, body));
    }

    let resp_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let text = resp_json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(text)
}

/// Persona info for the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonaInfo {
    pub id: String,
    pub name: String,
    pub description: String,
}

/// Get available voice personas
#[tauri::command]
pub async fn get_voice_personas() -> Result<Vec<PersonaInfo>, String> {
    Ok(vec![
        PersonaInfo {
            id: "default".to_string(),
            name: "Default".to_string(),
            description: "Snarky Gas Town assistant".to_string(),
        },
        PersonaInfo {
            id: "mayor".to_string(),
            name: "Mayor".to_string(),
            description: "Smooth, executive assistant energy".to_string(),
        },
        PersonaInfo {
            id: "witness".to_string(),
            name: "Witness".to_string(),
            description: "Nervous hall monitor, always watching".to_string(),
        },
        PersonaInfo {
            id: "refinery".to_string(),
            name: "Refinery".to_string(),
            description: "Gruff factory foreman".to_string(),
        },
        PersonaInfo {
            id: "deacon".to_string(),
            name: "Deacon".to_string(),
            description: "Ominous, measured tones".to_string(),
        },
        PersonaInfo {
            id: "polecat".to_string(),
            name: "Polecat".to_string(),
            description: "Excitable, slightly unhinged".to_string(),
        },
        PersonaInfo {
            id: "crew".to_string(),
            name: "Crew".to_string(),
            description: "Professional, matches user tone".to_string(),
        },
    ])
}
