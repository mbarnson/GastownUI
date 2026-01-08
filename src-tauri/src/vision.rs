use base64::{engine::general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::State;
use tempfile::NamedTempFile;

/// Vision server state managed by Tauri - loads on demand, not at startup
pub struct VisionServerState {
    server_process: Mutex<Option<Child>>,
    server_url: Mutex<String>,
    is_ready: Mutex<bool>,
}

impl Default for VisionServerState {
    fn default() -> Self {
        Self {
            server_process: Mutex::new(None),
            server_url: Mutex::new("http://127.0.0.1:8081".to_string()),
            is_ready: Mutex::new(false),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VisionServerConfig {
    pub model_dir: String,
    pub quantization: String,
    pub port: u16,
}

impl Default for VisionServerConfig {
    fn default() -> Self {
        let home = dirs::home_dir().unwrap_or_default();
        Self {
            model_dir: home
                .join(".cache/huggingface/models/LFM2.5-Vision-1.5B-GGUF")
                .to_string_lossy()
                .to_string(),
            quantization: "Q4_0".to_string(),
            port: 8081, // Different from voice server
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VisionResponse {
    pub description: String,
    pub latency_ms: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VisionServerStatus {
    pub running: bool,
    pub ready: bool,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScreenshotResult {
    pub image_base64: String,
    pub width: u32,
    pub height: u32,
}

/// Capture screenshot on macOS using screencapture
#[tauri::command]
pub async fn capture_screenshot() -> Result<ScreenshotResult, String> {
    // Create temp file for screenshot
    let temp_file = NamedTempFile::new()
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    let temp_path = temp_file.path().with_extension("png");

    // Use macOS screencapture command
    // -x: No sound
    // -C: Capture cursor
    // -T 0: No delay
    let output = Command::new("screencapture")
        .args(["-x", "-C", "-T", "0", temp_path.to_str().unwrap()])
        .output()
        .map_err(|e| format!("Failed to run screencapture: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("screencapture failed: {}", stderr));
    }

    // Read the screenshot file
    let image_data = std::fs::read(&temp_path)
        .map_err(|e| format!("Failed to read screenshot: {}", e))?;

    // Get image dimensions using imageproc or assume standard size
    // For now, we'll use sips to get dimensions
    let dims_output = Command::new("sips")
        .args(["-g", "pixelWidth", "-g", "pixelHeight", temp_path.to_str().unwrap()])
        .output()
        .map_err(|e| format!("Failed to get image dimensions: {}", e))?;

    let dims_str = String::from_utf8_lossy(&dims_output.stdout);
    let (width, height) = parse_sips_dimensions(&dims_str).unwrap_or((1920, 1080));

    // Clean up temp file
    let _ = std::fs::remove_file(&temp_path);

    // Encode to base64
    let image_base64 = STANDARD.encode(&image_data);

    Ok(ScreenshotResult {
        image_base64,
        width,
        height,
    })
}

fn parse_sips_dimensions(output: &str) -> Option<(u32, u32)> {
    let mut width = None;
    let mut height = None;

    for line in output.lines() {
        if line.contains("pixelWidth") {
            width = line.split_whitespace().last()?.parse().ok();
        }
        if line.contains("pixelHeight") {
            height = line.split_whitespace().last()?.parse().ok();
        }
    }

    match (width, height) {
        (Some(w), Some(h)) => Some((w, h)),
        _ => None,
    }
}

fn get_vision_server_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Failed to get home directory")?;

    // Try LFM2.5-Vision specific server first
    let vision_server = home
        .join(".cache/huggingface/models/LFM2.5-Vision-1.5B-GGUF")
        .join("runners/llama-vision-macos-arm64/llama-vision-server");

    if vision_server.exists() {
        return Ok(vision_server);
    }

    // Fall back to generic llama.cpp server with vision support
    let llama_server = home
        .join(".cache/huggingface/models/llama.cpp")
        .join("llama-server");

    if llama_server.exists() {
        return Ok(llama_server);
    }

    Err("Vision server not found. Install LFM2.5-Vision or llama.cpp with vision support".to_string())
}

/// Start the vision server on demand
#[tauri::command]
pub async fn start_vision_server(
    state: State<'_, VisionServerState>,
    config: Option<VisionServerConfig>,
) -> Result<VisionServerStatus, String> {
    let config = config.unwrap_or_default();

    // Check if already running
    let (already_running, existing_url, existing_ready) = {
        let process = state.server_process.lock().map_err(|e| e.to_string())?;
        let url = state.server_url.lock().map_err(|e| e.to_string())?;
        let ready = state.is_ready.lock().map_err(|e| e.to_string())?;
        (process.is_some(), url.clone(), *ready)
    };

    if already_running {
        return Ok(VisionServerStatus {
            running: true,
            ready: existing_ready,
            url: existing_url,
        });
    }

    let server_path = get_vision_server_path()?;
    let model_dir = PathBuf::from(&config.model_dir);
    let quant = &config.quantization;

    // Vision model files
    let model = model_dir.join(format!("LFM2.5-Vision-1.5B-{}.gguf", quant));
    let mmproj = model_dir.join(format!("mmproj-LFM2.5-Vision-1.5B-{}.gguf", quant));

    // Check model files exist
    if !model.exists() {
        return Err(format!("Vision model not found: {:?}", model));
    }

    log::info!("Starting vision server at port {}", config.port);

    // Build command based on server type
    let child = if server_path.to_str().unwrap().contains("llama-vision") {
        // LFM2.5-Vision specific server
        Command::new(&server_path)
            .args([
                "-m", model.to_str().unwrap(),
                "--mmproj", mmproj.to_str().unwrap(),
                "--port", &config.port.to_string(),
                "--host", "127.0.0.1",
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
    } else {
        // Generic llama.cpp server
        Command::new(&server_path)
            .args([
                "-m", model.to_str().unwrap(),
                "--mmproj", mmproj.to_str().unwrap(),
                "--port", &config.port.to_string(),
                "--host", "127.0.0.1",
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
    }
    .map_err(|e| format!("Failed to start vision server: {}", e))?;

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
                log::info!("Vision server ready at {}", url);
                return Ok(VisionServerStatus {
                    running: true,
                    ready: true,
                    url,
                });
            }
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }

    Ok(VisionServerStatus {
        running: true,
        ready: false,
        url,
    })
}

/// Stop the vision server
#[tauri::command]
pub async fn stop_vision_server(state: State<'_, VisionServerState>) -> Result<(), String> {
    let mut process = state.server_process.lock().map_err(|e| e.to_string())?;

    if let Some(mut child) = process.take() {
        child.kill().map_err(|e| format!("Failed to kill vision server: {}", e))?;
        child.wait().ok();
    }

    {
        let mut ready = state.is_ready.lock().map_err(|e| e.to_string())?;
        *ready = false;
    }

    log::info!("Vision server stopped");
    Ok(())
}

/// Get vision server status
#[tauri::command]
pub async fn get_vision_server_status(
    state: State<'_, VisionServerState>,
) -> Result<VisionServerStatus, String> {
    let process = state.server_process.lock().map_err(|e| e.to_string())?;
    let url = state.server_url.lock().map_err(|e| e.to_string())?;
    let ready = state.is_ready.lock().map_err(|e| e.to_string())?;

    Ok(VisionServerStatus {
        running: process.is_some(),
        ready: *ready,
        url: url.clone(),
    })
}

const VISION_SYSTEM_PROMPT: &str = r#"You are a vision assistant for Gas Town, a multi-agent orchestration system. When shown a screenshot of the GastownUI dashboard, describe what you see concisely:

- Identify the current view (dashboard, rig view, settings, etc.)
- Report active convoys and their status
- List visible polecats and their states (active/idle/stuck)
- Note any alerts, errors, or items needing attention
- Mention the merge queue status if visible

Be factual and brief. Focus on actionable information."#;

/// Describe what's on screen - the main vision query function
/// Captures screenshot, starts vision server if needed, returns description
#[tauri::command]
pub async fn describe_screen(
    state: State<'_, VisionServerState>,
    custom_prompt: Option<String>,
) -> Result<VisionResponse, String> {
    let start = Instant::now();

    // Capture screenshot first
    let screenshot = capture_screenshot().await?;

    // Ensure vision server is running (starts on demand)
    let status = get_vision_server_status(state.clone()).await?;
    if !status.ready {
        // Start server on demand
        let start_result = start_vision_server(state.clone(), None).await?;
        if !start_result.ready {
            return Err("Vision server failed to start within timeout".to_string());
        }
    }

    // Get server URL
    let url = {
        let server_url = state.server_url.lock().map_err(|e| e.to_string())?;
        server_url.clone()
    };

    let prompt = custom_prompt.unwrap_or_else(|| "What am I looking at? Describe the current state of this dashboard.".to_string());

    let client = reqwest::Client::new();
    let api_url = format!("{}/v1/chat/completions", url);

    let payload = serde_json::json!({
        "model": "",
        "messages": [
            {"role": "system", "content": VISION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": format!("data:image/png;base64,{}", screenshot.image_base64)
                        }
                    }
                ]
            }
        ],
        "stream": false,
        "max_tokens": 512
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
        return Err(format!("Vision server error {}: {}", status, body));
    }

    let resp_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let description = resp_json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("Unable to describe screen")
        .to_string();

    let latency_ms = start.elapsed().as_millis() as u64;

    Ok(VisionResponse {
        description,
        latency_ms,
    })
}

/// Describe a specific image (not screenshot)
#[tauri::command]
pub async fn describe_image(
    state: State<'_, VisionServerState>,
    image_base64: String,
    prompt: Option<String>,
) -> Result<VisionResponse, String> {
    let start = Instant::now();

    // Ensure vision server is running
    let status = get_vision_server_status(state.clone()).await?;
    if !status.ready {
        let start_result = start_vision_server(state.clone(), None).await?;
        if !start_result.ready {
            return Err("Vision server failed to start within timeout".to_string());
        }
    }

    let url = {
        let server_url = state.server_url.lock().map_err(|e| e.to_string())?;
        server_url.clone()
    };

    let prompt = prompt.unwrap_or_else(|| "Describe this image.".to_string());

    let client = reqwest::Client::new();
    let api_url = format!("{}/v1/chat/completions", url);

    let payload = serde_json::json!({
        "model": "",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": format!("data:image/png;base64,{}", image_base64)
                        }
                    }
                ]
            }
        ],
        "stream": false,
        "max_tokens": 512
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
        return Err(format!("Vision server error {}: {}", status, body));
    }

    let resp_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let description = resp_json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("Unable to describe image")
        .to_string();

    let latency_ms = start.elapsed().as_millis() as u64;

    Ok(VisionResponse {
        description,
        latency_ms,
    })
}
