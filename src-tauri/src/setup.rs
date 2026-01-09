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

/// Minimum required gt version
const MIN_GT_VERSION: &str = "0.1.0";

/// Minimum required bd version
const MIN_BD_VERSION: &str = "0.43.0";

/// Check gt CLI installation with version comparison
fn check_gt() -> DependencyInfo {
    let (installed, version, path) = check_command("gt", &["--version"]);

    // Check if version meets minimum requirement
    let version_ok = version.as_ref().map(|v| {
        // Parse version string (e.g., "gt version 0.1.0" or "0.1.0")
        let ver_str = v.split_whitespace()
            .find(|s| s.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false))
            .unwrap_or("0.0.0");
        compare_versions(ver_str, MIN_GT_VERSION) >= 0
    }).unwrap_or(false);

    let install_instructions = if installed && !version_ok {
        format!("Update gt: `go install github.com/txgsync/gastown/cmd/gt@latest` (current version outdated, need >= {})", MIN_GT_VERSION)
    } else {
        "Install gt: `go install github.com/txgsync/gastown/cmd/gt@latest`".to_string()
    };

    DependencyInfo {
        name: "gt (Gas Town CLI)".to_string(),
        installed: installed && version_ok,
        version,
        path,
        install_url: "https://github.com/txgsync/gastown".to_string(),
        install_instructions,
    }
}

/// Simple version comparison (returns -1, 0, or 1)
fn compare_versions(v1: &str, v2: &str) -> i32 {
    let parse_version = |v: &str| -> Vec<u32> {
        v.split('.')
            .filter_map(|s| s.parse::<u32>().ok())
            .collect()
    };

    let parts1 = parse_version(v1);
    let parts2 = parse_version(v2);

    for i in 0..std::cmp::max(parts1.len(), parts2.len()) {
        let p1 = parts1.get(i).unwrap_or(&0);
        let p2 = parts2.get(i).unwrap_or(&0);
        if p1 < p2 {
            return -1;
        }
        if p1 > p2 {
            return 1;
        }
    }
    0
}

/// Check if GOPATH/bin is in PATH, return warning message if not
fn check_gopath_in_path() -> Option<String> {
    let path = std::env::var("PATH").unwrap_or_default();
    let home = dirs::home_dir()?;

    // Common Go bin locations
    let gopath_bin = home.join("go").join("bin");
    let gobin = std::env::var("GOBIN").ok().map(PathBuf::from);

    // Check if either is in PATH
    let path_parts: Vec<&str> = path.split(':').collect();

    let gopath_in_path = path_parts.iter().any(|p| {
        let p = PathBuf::from(p);
        p == gopath_bin || gobin.as_ref().map(|gb| p == *gb).unwrap_or(false)
    });

    if gopath_in_path {
        None
    } else {
        Some(format!(
            "Add {} to your PATH. For bash/zsh: `echo 'export PATH=$HOME/go/bin:$PATH' >> ~/.zshrc`",
            gopath_bin.display()
        ))
    }
}

/// Check bd CLI installation with version comparison
fn check_bd() -> DependencyInfo {
    let (installed, version, path) = check_command("bd", &["--version"]);

    // Check if version meets minimum requirement
    let version_ok = version.as_ref().map(|v| {
        // Parse version string (e.g., "bd version 0.43.0" or "0.43.0")
        let ver_str = v.split_whitespace()
            .find(|s| s.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false))
            .unwrap_or("0.0.0");
        compare_versions(ver_str, MIN_BD_VERSION) >= 0
    }).unwrap_or(false);

    let install_instructions = if installed && !version_ok {
        format!("Update bd: `go install github.com/mbarnson/beads/cmd/bd@latest` (current version outdated, need >= {})", MIN_BD_VERSION)
    } else {
        "Install bd: `go install github.com/mbarnson/beads/cmd/bd@latest`".to_string()
    };

    DependencyInfo {
        name: "bd (Beads CLI)".to_string(),
        installed: installed && version_ok,
        version,
        path,
        install_url: "https://github.com/mbarnson/beads".to_string(),
        install_instructions,
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
                .args(["install", "github.com/mbarnson/beads/cmd/bd@latest"])
                .output()
                .map_err(|e| format!("Failed to run go install: {}", e))?;

            if output.status.success() {
                // Check if GOPATH/bin is in PATH
                let path_warning = check_gopath_in_path();
                let voice_response = if path_warning.is_some() {
                    format!("bd is installed, but you may need to add Go's bin directory to your PATH. {}. Then say 'check setup' to verify.", path_warning.unwrap())
                } else {
                    "Nice! bd is installed. Now you need a Gas Town workspace. Say 'create workspace' to set one up.".to_string()
                };

                Ok(InstallResult {
                    success: true,
                    message: "bd installed successfully".to_string(),
                    next_step: Some("create workspace".to_string()),
                    voice_response,
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

/// Expand ~ to home directory
fn expand_tilde(path: &str) -> PathBuf {
    if path.starts_with("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(&path[2..]);
        }
    } else if path == "~" {
        if let Some(home) = dirs::home_dir() {
            return home;
        }
    }
    PathBuf::from(path)
}

/// Create a new Gas Town workspace
#[tauri::command]
pub async fn create_workspace(path: Option<String>) -> Result<InstallResult, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;

    // Expand ~ in path and use default if not provided
    let workspace_path = path
        .map(|p| expand_tilde(&p))
        .unwrap_or_else(|| home.join("gt"));

    // Check if path already exists
    if workspace_path.exists() {
        // Check if it's already a Gas Town workspace
        if workspace_path.join(".gt").exists() {
            return Ok(InstallResult {
                success: true,
                message: "Workspace already exists".to_string(),
                next_step: None,
                voice_response: format!("You already have a Gas Town workspace at {}. You're all set!", workspace_path.display()),
            });
        }

        // Directory exists but isn't a Gas Town workspace
        // Check if it's empty
        let is_empty = std::fs::read_dir(&workspace_path)
            .map(|mut entries| entries.next().is_none())
            .unwrap_or(false);

        if !is_empty {
            return Ok(InstallResult {
                success: false,
                message: format!("Directory {} exists and is not empty", workspace_path.display()),
                next_step: None,
                voice_response: format!(
                    "The directory {} already exists and isn't empty. Choose a different path, or empty that directory first if you want to use it.",
                    workspace_path.display()
                ),
            });
        }
    }

    // Create directory if it doesn't exist
    std::fs::create_dir_all(&workspace_path)
        .map_err(|e| format!("Failed to create workspace directory: {}", e))?;

    // Initialize with gt install (creates HQ structure)
    let output = Command::new("gt")
        .args(["install", workspace_path.to_string_lossy().as_ref()])
        .output()
        .map_err(|e| format!("Failed to run gt install: {}", e))?;

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
        let stdout = String::from_utf8_lossy(&output.stdout);

        // Try gt init as fallback (older version)
        let init_output = Command::new("gt")
            .args(["init"])
            .current_dir(&workspace_path)
            .output();

        if let Ok(out) = init_output {
            if out.status.success() {
                return Ok(InstallResult {
                    success: true,
                    message: format!("Workspace created at {} (using gt init)", workspace_path.display()),
                    next_step: None,
                    voice_response: format!(
                        "Welcome to Gas Town! Your workspace is ready at {}. You can now add rigs with 'gt rig add' or just start slinging work.",
                        workspace_path.display()
                    ),
                });
            }
        }

        Ok(InstallResult {
            success: false,
            message: format!("Failed to initialize workspace: {}", if stderr.is_empty() { &stdout } else { &stderr }),
            next_step: None,
            voice_response: format!(
                "Workspace creation failed: {}. Make sure gt is installed and working.",
                stderr.lines().next().unwrap_or(stdout.lines().next().unwrap_or("unknown error"))
            ),
        })
    }
}

/// Get current setup status for the FTUE wizard
#[tauri::command]
pub async fn get_setup_status() -> Result<SetupStatus, String> {
    check_dependencies().await
}

/// Result of running a gt command
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GtCommandResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// Install Gas Town to a path
/// Runs: gt install <path> [--git]
#[tauri::command]
pub async fn gt_install(path: String, with_git: Option<bool>) -> Result<GtCommandResult, String> {
    let resolved_path = expand_tilde(&path);
    let path_str = resolved_path.to_string_lossy().to_string();

    let mut args = vec!["install".to_string(), path_str];
    if with_git.unwrap_or(false) {
        args.push("--git".to_string());
    }

    let output = Command::new("gt")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run gt install: {}", e))?;

    let exit_code = output.status.code().unwrap_or(-1);
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Ok(GtCommandResult {
        success: output.status.success(),
        stdout,
        stderr,
        exit_code,
    })
}

/// Add a rig (Git repository) to the workspace
/// Runs: gt rig add <name> <url>
#[tauri::command]
pub async fn gt_rig_add(name: String, url: String) -> Result<GtCommandResult, String> {
    let output = Command::new("gt")
        .args(["rig", "add", &name, &url])
        .output()
        .map_err(|e| format!("Failed to run gt rig add: {}", e))?;

    let exit_code = output.status.code().unwrap_or(-1);
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Ok(GtCommandResult {
        success: output.status.success(),
        stdout,
        stderr,
        exit_code,
    })
}

/// Start the Mayor agent
/// Runs: gt mayor start
#[tauri::command]
pub async fn gt_mayor_start() -> Result<GtCommandResult, String> {
    let output = Command::new("gt")
        .args(["mayor", "start"])
        .output()
        .map_err(|e| format!("Failed to run gt mayor start: {}", e))?;

    let exit_code = output.status.code().unwrap_or(-1);
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Ok(GtCommandResult {
        success: output.status.success(),
        stdout,
        stderr,
        exit_code,
    })
}
