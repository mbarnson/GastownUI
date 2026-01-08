use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

/// Status of a single dependency
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyInfo {
    pub name: String,
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub install_url: String,
    pub install_instructions: String,
}

/// Overall setup status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetupStatus {
    pub ready: bool,
    pub dependencies: Vec<DependencyInfo>,
    pub workspace_exists: bool,
    pub workspace_path: Option<String>,
    pub missing_count: usize,
    pub voice_guidance: String,
}

/// Check if a command exists and get its version
fn check_command(cmd: &str, version_args: &[&str]) -> (bool, Option<String>, Option<String>) {
    // First check if command exists using `which`
    let which_result = Command::new("which")
        .arg(cmd)
        .output();

    let path = match which_result {
        Ok(output) if output.status.success() => {
            Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
        }
        _ => None,
    };

    if path.is_none() {
        return (false, None, None);
    }

    // Get version
    let version_result = Command::new(cmd)
        .args(version_args)
        .output();

    let version = match version_result {
        Ok(output) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            // Version might be in stdout or stderr depending on tool
            let combined = format!("{}{}", stdout, stderr);
            // Extract first line and clean up
            combined.lines().next().map(|s| s.trim().to_string())
        }
        _ => None,
    };

    (true, version, path)
}

/// Check Go installation
fn check_go() -> DependencyInfo {
    let (installed, version, path) = check_command("go", &["version"]);

    DependencyInfo {
        name: "Go".to_string(),
        installed,
        version,
        path,
        install_url: "https://go.dev/dl/".to_string(),
        install_instructions: "Download and install Go from go.dev. On macOS: `brew install go`".to_string(),
    }
}

/// Check gt CLI installation
fn check_gt() -> DependencyInfo {
    let (installed, version, path) = check_command("gt", &["--version"]);

    DependencyInfo {
        name: "gt (Gas Town CLI)".to_string(),
        installed,
        version,
        path,
        install_url: "https://github.com/txgsync/gastown".to_string(),
        install_instructions: "Install gt: `go install github.com/txgsync/gastown/cmd/gt@latest`".to_string(),
    }
}

/// Check bd CLI installation
fn check_bd() -> DependencyInfo {
    let (installed, version, path) = check_command("bd", &["--version"]);

    DependencyInfo {
        name: "bd (Beads CLI)".to_string(),
        installed,
        version,
        path,
        install_url: "https://github.com/txgsync/beads".to_string(),
        install_instructions: "Install bd: `go install github.com/txgsync/beads/cmd/bd@latest`".to_string(),
    }
}

/// Check Git installation
fn check_git() -> DependencyInfo {
    let (installed, version, path) = check_command("git", &["--version"]);

    DependencyInfo {
        name: "Git".to_string(),
        installed,
        version,
        path,
        install_url: "https://git-scm.com/downloads".to_string(),
        install_instructions: "Install Git from git-scm.com. On macOS: `xcode-select --install`".to_string(),
    }
}

/// Check tmux installation
fn check_tmux() -> DependencyInfo {
    let (installed, version, path) = check_command("tmux", &["-V"]);

    DependencyInfo {
        name: "tmux".to_string(),
        installed,
        version,
        path,
        install_url: "https://github.com/tmux/tmux".to_string(),
        install_instructions: "Install tmux: `brew install tmux` (macOS) or `apt install tmux` (Linux)".to_string(),
    }
}

/// Check if Gas Town workspace exists
fn check_workspace() -> (bool, Option<String>) {
    // Check common locations
    let home = dirs::home_dir().unwrap_or_default();
    let common_paths = vec![
        home.join("gt"),
        home.join("gastown"),
        home.join("workspace/gt"),
    ];

    for path in common_paths {
        if path.exists() && path.join(".gt").exists() {
            return (true, Some(path.to_string_lossy().to_string()));
        }
    }

    // Also check if GT_ROOT is set
    if let Ok(gt_root) = std::env::var("GT_ROOT") {
        let path = PathBuf::from(&gt_root);
        if path.exists() {
            return (true, Some(gt_root));
        }
    }

    (false, None)
}

/// Generate voice guidance based on setup status
fn generate_voice_guidance(deps: &[DependencyInfo], workspace_exists: bool) -> String {
    let missing: Vec<&str> = deps
        .iter()
        .filter(|d| !d.installed)
        .map(|d| d.name.as_str())
        .collect();

    if missing.is_empty() && workspace_exists {
        return "All set! Gas Town is ready to roll. You've got all the tools and a workspace. Let's make some chaos.".to_string();
    }

    if missing.is_empty() && !workspace_exists {
        return "Tools are installed, but you don't have a workspace yet. Want me to help you create one? Just say 'create workspace'.".to_string();
    }

    let missing_str = match missing.len() {
        1 => format!("You're missing {}.", missing[0]),
        2 => format!("You're missing {} and {}.", missing[0], missing[1]),
        _ => {
            let last = missing.last().unwrap();
            let rest = &missing[..missing.len()-1];
            format!("You're missing {}, and {}.", rest.join(", "), last)
        }
    };

    if missing.contains(&"Go") {
        format!("{} Go is the foundation - you'll need that first. Want me to walk you through the installation?", missing_str)
    } else if missing.contains(&"gt (Gas Town CLI)") || missing.contains(&"bd (Beads CLI)") {
        format!("{} The Gas Town tools need Go installed first, which you have. Say 'install gt' or 'install bd' to continue.", missing_str)
    } else {
        format!("{} Let me know which one you want to install first.", missing_str)
    }
}

/// Check all dependencies and return setup status
#[tauri::command]
pub async fn check_dependencies() -> Result<SetupStatus, String> {
    let dependencies = vec![
        check_git(),
        check_go(),
        check_tmux(),
        check_gt(),
        check_bd(),
    ];

    let missing_count = dependencies.iter().filter(|d| !d.installed).count();
    let (workspace_exists, workspace_path) = check_workspace();
    let voice_guidance = generate_voice_guidance(&dependencies, workspace_exists);

    Ok(SetupStatus {
        ready: missing_count == 0 && workspace_exists,
        dependencies,
        workspace_exists,
        workspace_path,
        missing_count,
        voice_guidance,
    })
}

/// Result of an installation step
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallResult {
    pub success: bool,
    pub message: String,
    pub next_step: Option<String>,
    pub voice_response: String,
}

/// Install a specific dependency (guides user through process)
#[tauri::command]
pub async fn install_dependency(name: String) -> Result<InstallResult, String> {
    match name.to_lowercase().as_str() {
        "go" => {
            // Can't auto-install Go, guide user
            Ok(InstallResult {
                success: false,
                message: "Go requires manual installation".to_string(),
                next_step: Some("https://go.dev/dl/".to_string()),
                voice_response: "Go needs to be installed manually. I'm opening the download page. Grab the installer for your system, run it, then come back and say 'check setup'.".to_string(),
            })
        }
        "gt" | "gastown" => {
            // Try to install gt via go install
            let output = Command::new("go")
                .args(["install", "github.com/txgsync/gastown/cmd/gt@latest"])
                .output()
                .map_err(|e| format!("Failed to run go install: {}", e))?;

            if output.status.success() {
                Ok(InstallResult {
                    success: true,
                    message: "gt installed successfully".to_string(),
                    next_step: Some("install bd".to_string()),
                    voice_response: "Got it! gt is now installed. You'll also need bd for issue tracking. Say 'install bd' to continue.".to_string(),
                })
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Ok(InstallResult {
                    success: false,
                    message: format!("gt installation failed: {}", stderr),
                    next_step: None,
                    voice_response: format!("Hmm, gt installation failed. Error: {}. Make sure Go is properly installed and your GOPATH is set.", stderr.lines().next().unwrap_or("unknown error")),
                })
            }
        }
        "bd" | "beads" => {
            // Try to install bd via go install
            let output = Command::new("go")
                .args(["install", "github.com/txgsync/beads/cmd/bd@latest"])
                .output()
                .map_err(|e| format!("Failed to run go install: {}", e))?;

            if output.status.success() {
                Ok(InstallResult {
                    success: true,
                    message: "bd installed successfully".to_string(),
                    next_step: Some("create workspace".to_string()),
                    voice_response: "Nice! bd is installed. Now you need a Gas Town workspace. Say 'create workspace' to set one up.".to_string(),
                })
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Ok(InstallResult {
                    success: false,
                    message: format!("bd installation failed: {}", stderr),
                    next_step: None,
                    voice_response: format!("bd installation hit a snag: {}. Check that Go is working correctly.", stderr.lines().next().unwrap_or("unknown error")),
                })
            }
        }
        "git" => {
            Ok(InstallResult {
                success: false,
                message: "Git requires manual installation".to_string(),
                next_step: Some("https://git-scm.com/downloads".to_string()),
                voice_response: "Git needs to be installed from your system's package manager or git-scm.com. On Mac, you can run 'xcode-select --install' in Terminal.".to_string(),
            })
        }
        "tmux" => {
            // Try brew install on macOS
            #[cfg(target_os = "macos")]
            {
                let output = Command::new("brew")
                    .args(["install", "tmux"])
                    .output();

                match output {
                    Ok(o) if o.status.success() => {
                        return Ok(InstallResult {
                            success: true,
                            message: "tmux installed via Homebrew".to_string(),
                            next_step: None,
                            voice_response: "tmux is now installed. Terminal multiplexing unlocked!".to_string(),
                        });
                    }
                    _ => {}
                }
            }

            Ok(InstallResult {
                success: false,
                message: "tmux requires manual installation".to_string(),
                next_step: None,
                voice_response: "Install tmux using your package manager. On Mac: 'brew install tmux'. On Linux: 'apt install tmux' or 'yum install tmux'.".to_string(),
            })
        }
        _ => {
            Ok(InstallResult {
                success: false,
                message: format!("Unknown dependency: {}", name),
                next_step: None,
                voice_response: format!("I don't know how to install '{}'. Check the setup screen for available options.", name),
            })
        }
    }
}

/// Create a new Gas Town workspace
#[tauri::command]
pub async fn create_workspace(path: Option<String>) -> Result<InstallResult, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let workspace_path = path
        .map(PathBuf::from)
        .unwrap_or_else(|| home.join("gt"));

    // Check if path already exists
    if workspace_path.exists() {
        if workspace_path.join(".gt").exists() {
            return Ok(InstallResult {
                success: true,
                message: "Workspace already exists".to_string(),
                next_step: None,
                voice_response: format!("You already have a Gas Town workspace at {}. You're all set!", workspace_path.display()),
            });
        }
    }

    // Create directory
    std::fs::create_dir_all(&workspace_path)
        .map_err(|e| format!("Failed to create workspace directory: {}", e))?;

    // Initialize with gt init
    let output = Command::new("gt")
        .args(["init"])
        .current_dir(&workspace_path)
        .output()
        .map_err(|e| format!("Failed to run gt init: {}", e))?;

    if output.status.success() {
        Ok(InstallResult {
            success: true,
            message: format!("Workspace created at {}", workspace_path.display()),
            next_step: None,
            voice_response: format!(
                "Welcome to Gas Town! Your workspace is ready at {}. You can now add rigs with 'gt rig add' or just start slinging work. It's gonna get chaotic.",
                workspace_path.display()
            ),
        })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Ok(InstallResult {
            success: false,
            message: format!("Failed to initialize workspace: {}", stderr),
            next_step: None,
            voice_response: format!("Workspace creation failed: {}. Make sure gt is installed and working.", stderr.lines().next().unwrap_or("unknown error")),
        })
    }
}

/// Get current setup status for the FTUE wizard
#[tauri::command]
pub async fn get_setup_status() -> Result<SetupStatus, String> {
    check_dependencies().await
}
