use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

use crate::voice::{VoiceServerState, VoiceResponse};

/// Test case definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCase {
    pub id: String,
    pub command: String,           // Voice command to execute
    pub expected_action: String,   // Expected UI action
    pub validation_prompt: String, // Prompt for verifier to check
}

/// Result of a single test
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestResult {
    pub test_id: String,
    pub command: String,
    pub passed: bool,
    pub tester_output: String,
    pub verifier_output: String,
    pub duration_ms: u64,
}

/// State of a self-test session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelfTestSession {
    pub id: String,
    pub status: String,  // "idle", "running", "completed", "failed"
    pub total_tests: usize,
    pub passed_tests: usize,
    pub failed_tests: usize,
    pub current_test: Option<String>,
    pub results: Vec<TestResult>,
    pub duration_ms: u64,
}

impl Default for SelfTestSession {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            status: "idle".to_string(),
            total_tests: 0,
            passed_tests: 0,
            failed_tests: 0,
            current_test: None,
            results: vec![],
            duration_ms: 0,
        }
    }
}

/// State for self-testing
pub struct SelfTestState {
    pub session: Mutex<SelfTestSession>,
    pub test_cases: Mutex<Vec<TestCase>>,
}

impl Default for SelfTestState {
    fn default() -> Self {
        Self {
            session: Mutex::new(SelfTestSession::default()),
            test_cases: Mutex::new(default_test_cases()),
        }
    }
}

/// Default test cases for voice testing
fn default_test_cases() -> Vec<TestCase> {
    vec![
        TestCase {
            id: "nav-dashboard".to_string(),
            command: "Show me the dashboard".to_string(),
            expected_action: "Navigate to dashboard view".to_string(),
            validation_prompt: "Is the dashboard view visible with convoy information?".to_string(),
        },
        TestCase {
            id: "convoy-status".to_string(),
            command: "What are the convoys?".to_string(),
            expected_action: "Show convoy status".to_string(),
            validation_prompt: "Did the assistant report convoy status?".to_string(),
        },
        TestCase {
            id: "check-blockers".to_string(),
            command: "What's blocking?".to_string(),
            expected_action: "Show blocked items".to_string(),
            validation_prompt: "Did the assistant report blocked items or say nothing is blocked?".to_string(),
        },
        TestCase {
            id: "ready-work".to_string(),
            command: "What's ready to work on?".to_string(),
            expected_action: "Show ready work".to_string(),
            validation_prompt: "Did the assistant report ready work items?".to_string(),
        },
        TestCase {
            id: "help-command".to_string(),
            command: "What can you do?".to_string(),
            expected_action: "Show help".to_string(),
            validation_prompt: "Did the assistant explain available commands?".to_string(),
        },
    ]
}

/// System prompts for tester and verifier
const TESTER_SYSTEM_PROMPT: &str = r#"You are the TESTER agent for Gas Town UI voice testing. Your job is to issue voice commands to test the UI.

When given a test case, speak the command clearly. You are testing the voice interface.

Be direct and clear. Say only the command, nothing extra."#;

const VERIFIER_SYSTEM_PROMPT: &str = r#"You are the VERIFIER agent for Gas Town UI voice testing. Your job is to validate that the UI responded correctly.

Given:
1. The command that was issued
2. The expected action
3. The actual response from the UI

Determine if the test PASSED or FAILED. Be strict but fair.

Respond with exactly:
- "PASS: [brief reason]" if the test passed
- "FAIL: [brief reason]" if the test failed

Be concise."#;

/// Get the current self-test session status
#[tauri::command]
pub async fn get_self_test_status(
    state: State<'_, SelfTestState>,
) -> Result<SelfTestSession, String> {
    let session = state.session.lock().map_err(|e| e.to_string())?;
    Ok(session.clone())
}

/// Get available test cases
#[tauri::command]
pub async fn get_test_cases(
    state: State<'_, SelfTestState>,
) -> Result<Vec<TestCase>, String> {
    let cases = state.test_cases.lock().map_err(|e| e.to_string())?;
    Ok(cases.clone())
}

/// Start a self-test session
#[tauri::command]
pub async fn start_self_test(
    self_test_state: State<'_, SelfTestState>,
    voice_state: State<'_, VoiceServerState>,
    test_ids: Option<Vec<String>>,
) -> Result<SelfTestSession, String> {
    // Extract all needed data from locks before any async operations
    let (url, cases_to_run) = {
        let voice_url = voice_state.server_url.lock().map_err(|e| e.to_string())?;
        let voice_ready = voice_state.is_ready.lock().map_err(|e| e.to_string())?;

        if !*voice_ready {
            return Err("Voice server not ready. Start it first.".to_string());
        }

        let all_cases = self_test_state.test_cases.lock().map_err(|e| e.to_string())?;
        let cases: Vec<TestCase> = match &test_ids {
            Some(ids) => all_cases
                .iter()
                .filter(|c| ids.contains(&c.id))
                .cloned()
                .collect(),
            None => all_cases.clone(),
        };

        (voice_url.clone(), cases)
    };

    if cases_to_run.is_empty() {
        return Err("No test cases to run".to_string());
    }

    // Initialize session
    let session_id = uuid::Uuid::new_v4().to_string();
    let total_tests = cases_to_run.len();
    {
        let mut session = self_test_state.session.lock().map_err(|e| e.to_string())?;
        *session = SelfTestSession {
            id: session_id.clone(),
            status: "running".to_string(),
            total_tests,
            passed_tests: 0,
            failed_tests: 0,
            current_test: None,
            results: vec![],
            duration_ms: 0,
        };
    }

    let start_time = std::time::Instant::now();
    let client = reqwest::Client::new();
    let api_url = format!("{}/v1/chat/completions", url);

    // Run each test case
    for test_case in cases_to_run {
        let test_id = test_case.id.clone();
        let command = test_case.command.clone();

        // Update current test
        {
            let mut session = self_test_state.session.lock().map_err(|e| e.to_string())?;
            session.current_test = Some(test_id.clone());
        }

        let test_start = std::time::Instant::now();

        // Step 1: Have tester generate the voice command (simulate TTS)
        let tester_output = command.clone();

        // Step 2: Send command to main voice interface (simulating voice input)
        let voice_response = send_test_command(&client, &api_url, &command).await?;

        // Step 3: Have verifier validate the response
        let verifier_output = verify_response(
            &client,
            &api_url,
            &test_case,
            &voice_response.text,
        ).await?;

        let passed = verifier_output.to_uppercase().starts_with("PASS");
        let test_duration = test_start.elapsed().as_millis() as u64;

        // Record result
        let result = TestResult {
            test_id,
            command,
            passed,
            tester_output,
            verifier_output: verifier_output.clone(),
            duration_ms: test_duration,
        };

        // Update session
        {
            let mut session = self_test_state.session.lock().map_err(|e| e.to_string())?;
            if passed {
                session.passed_tests += 1;
            } else {
                session.failed_tests += 1;
            }
            session.results.push(result);
        }
    }

    // Finalize session
    let total_duration = start_time.elapsed().as_millis() as u64;
    let final_session = {
        let mut session = self_test_state.session.lock().map_err(|e| e.to_string())?;
        session.status = "completed".to_string();
        session.current_test = None;
        session.duration_ms = total_duration;
        session.clone()
    };

    Ok(final_session)
}

/// Stop a running self-test
#[tauri::command]
pub async fn stop_self_test(
    state: State<'_, SelfTestState>,
) -> Result<(), String> {
    let mut session = state.session.lock().map_err(|e| e.to_string())?;
    if session.status == "running" {
        session.status = "stopped".to_string();
        session.current_test = None;
    }
    Ok(())
}

/// Add a custom test case
#[tauri::command]
pub async fn add_test_case(
    state: State<'_, SelfTestState>,
    test_case: TestCase,
) -> Result<(), String> {
    let mut cases = state.test_cases.lock().map_err(|e| e.to_string())?;
    cases.push(test_case);
    Ok(())
}

/// Send a test command to the voice interface
async fn send_test_command(
    client: &reqwest::Client,
    api_url: &str,
    command: &str,
) -> Result<VoiceResponse, String> {
    // Use text input to simulate voice command (faster for testing)
    let payload = serde_json::json!({
        "model": "",
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful Gas Town assistant. Respond to commands concisely."
            },
            {"role": "user", "content": command}
        ],
        "stream": false,
        "max_tokens": 256,
        "extra_body": {"reset_context": true}
    });

    let response = client
        .post(api_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send test command: {}", e))?;

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

    Ok(VoiceResponse {
        text,
        audio_base64: None,
        audio_sample_rate: 24000,
    })
}

/// Verify response using the verifier agent
async fn verify_response(
    client: &reqwest::Client,
    api_url: &str,
    test_case: &TestCase,
    actual_response: &str,
) -> Result<String, String> {
    let verification_prompt = format!(
        "Command issued: \"{}\"\n\
         Expected action: {}\n\
         Validation check: {}\n\
         Actual response: \"{}\"\n\n\
         Did this test pass or fail?",
        test_case.command,
        test_case.expected_action,
        test_case.validation_prompt,
        actual_response
    );

    let payload = serde_json::json!({
        "model": "",
        "messages": [
            {"role": "system", "content": VERIFIER_SYSTEM_PROMPT},
            {"role": "user", "content": verification_prompt}
        ],
        "stream": false,
        "max_tokens": 128,
        "extra_body": {"reset_context": true}
    });

    let response = client
        .post(api_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Verifier request failed: {}", e))?;

    if !response.status().is_success() {
        return Ok("FAIL: Verifier error".to_string());
    }

    let resp_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse verifier response: {}", e))?;

    let text = resp_json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("FAIL: No response")
        .to_string();

    Ok(text)
}
