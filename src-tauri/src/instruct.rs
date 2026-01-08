use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use tauri::State;

/// Instruct model state for Deep Query
pub struct InstructState {
    model_path: Mutex<Option<PathBuf>>,
    llama_cli_path: Mutex<PathBuf>,
}

impl Default for InstructState {
    fn default() -> Self {
        // Default paths for model and llama-cli
        let home = dirs::home_dir().unwrap_or_default();
        let default_model = home
            .join(".cache/huggingface/models/LFM2.5-Instruct-GGUF")
            .join("LFM2.5-Instruct-Q4_0.gguf");

        Self {
            model_path: Mutex::new(if default_model.exists() {
                Some(default_model)
            } else {
                None
            }),
            llama_cli_path: Mutex::new(PathBuf::from("/opt/homebrew/bin/llama-cli")),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstructStatus {
    pub available: bool,
    pub model_path: Option<String>,
    pub llama_cli_available: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeepQueryResponse {
    pub answer: String,
    pub context_used: Vec<String>,
    pub latency_ms: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GasTownContext {
    pub convoy_status: String,
    pub ready_work: String,
    pub polecat_status: String,
    pub blocked_issues: String,
}

/// Get current instruct model status
#[tauri::command]
pub async fn get_instruct_status(state: State<'_, InstructState>) -> Result<InstructStatus, String> {
    let model_path = state.model_path.lock().map_err(|e| e.to_string())?;
    let llama_cli = state.llama_cli_path.lock().map_err(|e| e.to_string())?;

    Ok(InstructStatus {
        available: model_path.is_some(),
        model_path: model_path.as_ref().map(|p| p.to_string_lossy().to_string()),
        llama_cli_available: llama_cli.exists(),
    })
}

/// Set the instruct model path
#[tauri::command]
pub async fn set_instruct_model(
    state: State<'_, InstructState>,
    path: String,
) -> Result<InstructStatus, String> {
    let new_path = PathBuf::from(&path);
    if !new_path.exists() {
        return Err(format!("Model file not found: {}", path));
    }

    {
        let mut model_path = state.model_path.lock().map_err(|e| e.to_string())?;
        *model_path = Some(new_path);
    }

    get_instruct_status(state).await
}

/// Gather Gas Town context for Deep Query
async fn gather_gt_context() -> Result<GasTownContext, String> {
    // Run gt and bd commands to gather current state
    let convoy_status = run_command("gt", &["convoy", "list"])
        .unwrap_or_else(|e| format!("Failed to get convoy status: {}", e));

    let ready_work = run_command("bd", &["ready"])
        .unwrap_or_else(|e| format!("Failed to get ready work: {}", e));

    let polecat_status = run_command("gt", &["polecat", "list"])
        .unwrap_or_else(|e| format!("Failed to get polecat status: {}", e));

    let blocked_issues = run_command("bd", &["blocked"])
        .unwrap_or_else(|e| format!("Failed to get blocked issues: {}", e));

    Ok(GasTownContext {
        convoy_status,
        ready_work,
        polecat_status,
        blocked_issues,
    })
}

fn run_command(cmd: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new(cmd)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run {} {:?}: {}", cmd, args, e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Return stdout anyway if there's output, some commands write to stdout even on "failure"
        let stdout = String::from_utf8_lossy(&output.stdout);
        if !stdout.is_empty() {
            Ok(stdout.to_string())
        } else {
            Err(format!("Command failed: {}", stderr))
        }
    }
}

/// Run Deep Query - analyze Gas Town state with local LLM
#[tauri::command]
pub async fn query_deep(
    state: State<'_, InstructState>,
    query: String,
) -> Result<DeepQueryResponse, String> {
    let start = std::time::Instant::now();

    // Check if model is available
    let (model_path, llama_cli) = {
        let model = state.model_path.lock().map_err(|e| e.to_string())?;
        let cli = state.llama_cli_path.lock().map_err(|e| e.to_string())?;
        (model.clone(), cli.clone())
    };

    // If no instruct model, use the voice server API for text-only queries
    if model_path.is_none() {
        return query_via_voice_server(query, start).await;
    }

    let model_path = model_path.unwrap();
    if !llama_cli.exists() {
        return Err("llama-cli not found. Install with: brew install llama.cpp".to_string());
    }

    // Gather Gas Town context
    let context = gather_gt_context().await?;
    let context_used = vec![
        "convoy_status".to_string(),
        "ready_work".to_string(),
        "polecat_status".to_string(),
        "blocked_issues".to_string(),
    ];

    // Build prompt with context
    let prompt = format!(
        r#"You are a helpful assistant for Gas Town, a multi-agent orchestration system. Analyze the following state and answer the user's question.

## Current Gas Town State

### Active Convoys
{}

### Ready Work (Unblocked Issues)
{}

### Polecat Status
{}

### Blocked Issues
{}

## User Question
{}

Provide a concise, helpful answer based only on the data above. If you cannot answer from the provided context, say so."#,
        context.convoy_status,
        context.ready_work,
        context.polecat_status,
        context.blocked_issues,
        query
    );

    // Run llama-cli inference
    let output = Command::new(&llama_cli)
        .args([
            "-m",
            model_path.to_str().unwrap(),
            "-p",
            &prompt,
            "-n",
            "512",
            "--temp",
            "0.7",
            "-ngl",
            "99", // GPU layers
        ])
        .output()
        .map_err(|e| format!("Failed to run llama-cli: {}", e))?;

    let latency_ms = start.elapsed().as_millis() as u64;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Inference failed: {}", stderr));
    }

    let answer = String::from_utf8_lossy(&output.stdout)
        .trim()
        .to_string();

    Ok(DeepQueryResponse {
        answer,
        context_used,
        latency_ms,
    })
}

/// Fallback: Use the voice server for text queries when no instruct model
async fn query_via_voice_server(
    query: String,
    start: std::time::Instant,
) -> Result<DeepQueryResponse, String> {
    // Gather Gas Town context
    let context = gather_gt_context().await?;
    let context_used = vec![
        "convoy_status".to_string(),
        "ready_work".to_string(),
        "polecat_status".to_string(),
        "blocked_issues".to_string(),
    ];

    // Build prompt with context
    let system_prompt = format!(
        r#"You are a helpful assistant for Gas Town, a multi-agent orchestration system. You analyze system state and answer questions.

## Current Gas Town State

### Active Convoys
{}

### Ready Work (Unblocked Issues)
{}

### Polecat Status
{}

### Blocked Issues
{}

Provide concise, helpful answers based only on the data above. If you cannot answer from the provided context, say so."#,
        context.convoy_status,
        context.ready_work,
        context.polecat_status,
        context.blocked_issues
    );

    // Use the voice server's text API endpoint
    let client = reqwest::Client::new();
    let api_url = "http://127.0.0.1:8080/v1/chat/completions";

    let payload = serde_json::json!({
        "model": "",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ],
        "stream": false,
        "max_tokens": 512,
        "extra_body": {"reset_context": true}
    });

    let response = client
        .post(api_url)
        .json(&payload)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    let latency_ms = start.elapsed().as_millis() as u64;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Server error {}: {}", status, body));
    }

    let resp_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let answer = resp_json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("No response generated")
        .to_string();

    Ok(DeepQueryResponse {
        answer,
        context_used,
        latency_ms,
    })
}
