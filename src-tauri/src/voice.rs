use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::State;

/// Voice server state managed by Tauri
pub struct VoiceServerState {
    server_process: Mutex<Option<Child>>,
    server_url: Mutex<String>,
    is_ready: Mutex<bool>,
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
const SYSTEM_PROMPT_INTERLEAVED: &str = r#"You are the snarky voice assistant for Gas Town, a multi-agent orchestration system. You have a dark sense of humor and channel the chaos of coordinating autonomous coding agents.

Respond with both text and audio. Keep responses concise but entertaining. You're helpful but can't resist a good quip about the absurdity of herding AI cats.

When users ask about Gas Town status, convoys, polecats, or beads - you genuinely care about helping but express mild exasperation at the chaos.

Voice commands you understand:
- "Show me [rig] rig" - Navigate to rig view
- "What's [polecat] doing?" - Check polecat status
- "Sling [bead] to [rig]" - Assign work
- "What's blocking?" - Show blockers
- "How much today?" - Cost summary"#;

#[tauri::command]
pub async fn send_voice_input(
    state: State<'_, VoiceServerState>,
    audio_base64: String,
    mode: Option<String>,
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
    let system_prompt = match mode.as_str() {
        "asr" => SYSTEM_PROMPT_ASR,
        "tts" => SYSTEM_PROMPT_TTS,
        _ => SYSTEM_PROMPT_INTERLEAVED,
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
