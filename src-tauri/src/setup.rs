use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformInfo {
    pub os: String,
    pub arch: String,
    pub package_manager: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetupStatus {
    pub go: ToolStatus,
    pub beads: ToolStatus,
    pub platform: PlatformInfo,
}

/// Detect the platform's package manager
fn detect_package_manager() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        // Check for Homebrew
        if Command::new("brew").arg("--version").output().is_ok() {
            return Some("homebrew".to_string());
        }
        // Check for MacPorts
        if Command::new("port").arg("version").output().is_ok() {
            return Some("macports".to_string());
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Check for apt (Debian/Ubuntu)
        if Command::new("apt").arg("--version").output().is_ok() {
            return Some("apt".to_string());
        }
        // Check for dnf (Fedora)
        if Command::new("dnf").arg("--version").output().is_ok() {
            return Some("dnf".to_string());
        }
        // Check for pacman (Arch)
        if Command::new("pacman").arg("--version").output().is_ok() {
            return Some("pacman".to_string());
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Check for winget
        if Command::new("winget").arg("--version").output().is_ok() {
            return Some("winget".to_string());
        }
        // Check for chocolatey
        if Command::new("choco").arg("--version").output().is_ok() {
            return Some("chocolatey".to_string());
        }
    }

    None
}

/// Check if Go is installed and get its version
#[tauri::command]
pub async fn check_go_installation() -> Result<ToolStatus, String> {
    let output = Command::new("go").arg("version").output();

    match output {
        Ok(result) => {
            if result.status.success() {
                let version_str = String::from_utf8_lossy(&result.stdout);
                // Parse "go version go1.21.0 darwin/arm64" -> "1.21.0"
                let version = version_str
                    .split_whitespace()
                    .find(|s| s.starts_with("go") && s.len() > 2 && s.chars().nth(2).map(|c| c.is_numeric()).unwrap_or(false))
                    .map(|s| s.trim_start_matches("go").to_string());

                // Get go path
                let path = Command::new("which")
                    .arg("go")
                    .output()
                    .ok()
                    .and_then(|o| {
                        if o.status.success() {
                            Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
                        } else {
                            None
                        }
                    });

                Ok(ToolStatus {
                    installed: true,
                    version,
                    path,
                    error: None,
                })
            } else {
                let stderr = String::from_utf8_lossy(&result.stderr);
                Ok(ToolStatus {
                    installed: false,
                    version: None,
                    path: None,
                    error: Some(stderr.to_string()),
                })
            }
        }
        Err(e) => {
            // Check if it's a PATH issue vs not installed
            let error_msg = if e.kind() == std::io::ErrorKind::NotFound {
                "Go not found in PATH. It may not be installed or PATH may need configuration.".to_string()
            } else {
                format!("Error checking Go: {}", e)
            };

            Ok(ToolStatus {
                installed: false,
                version: None,
                path: None,
                error: Some(error_msg),
            })
        }
    }
}

/// Check if Beads (bd) is installed and get its version
#[tauri::command]
pub async fn check_beads_installation() -> Result<ToolStatus, String> {
    let output = Command::new("bd").arg("--version").output();

    match output {
        Ok(result) => {
            if result.status.success() {
                let version_str = String::from_utf8_lossy(&result.stdout);
                // Parse version from "bd version 0.1.0" or similar
                let version = version_str
                    .split_whitespace()
                    .last()
                    .map(|s| s.trim().to_string());

                // Get bd path
                let path = Command::new("which")
                    .arg("bd")
                    .output()
                    .ok()
                    .and_then(|o| {
                        if o.status.success() {
                            Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
                        } else {
                            None
                        }
                    });

                Ok(ToolStatus {
                    installed: true,
                    version,
                    path,
                    error: None,
                })
            } else {
                let stderr = String::from_utf8_lossy(&result.stderr);
                Ok(ToolStatus {
                    installed: false,
                    version: None,
                    path: None,
                    error: Some(stderr.to_string()),
                })
            }
        }
        Err(e) => {
            let error_msg = if e.kind() == std::io::ErrorKind::NotFound {
                "Beads (bd) not found in PATH. Run: go install github.com/steveyegge/beads/cmd/bd@latest".to_string()
            } else {
                format!("Error checking Beads: {}", e)
            };

            Ok(ToolStatus {
                installed: false,
                version: None,
                path: None,
                error: Some(error_msg),
            })
        }
    }
}

/// Get platform information
#[tauri::command]
pub async fn get_platform_info() -> Result<PlatformInfo, String> {
    let os = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();
    let package_manager = detect_package_manager();

    Ok(PlatformInfo {
        os,
        arch,
        package_manager,
    })
}

/// Get full setup status (all tools + platform)
#[tauri::command]
pub async fn get_setup_status() -> Result<SetupStatus, String> {
    let go = check_go_installation().await?;
    let beads = check_beads_installation().await?;
    let platform = get_platform_info().await?;

    Ok(SetupStatus { go, beads, platform })
}

/// Get platform-specific Go installation instructions
#[tauri::command]
pub async fn get_go_install_instructions() -> Result<String, String> {
    let platform = get_platform_info().await?;

    let instructions = match (platform.os.as_str(), platform.package_manager.as_deref()) {
        ("macos", Some("homebrew")) => {
            "brew install go\n\nAfter installation, add to your shell config:\nexport PATH=$PATH:$(go env GOPATH)/bin"
        }
        ("macos", _) => {
            "Download from https://go.dev/dl/\nOr install Homebrew first: /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"\nThen: brew install go"
        }
        ("linux", Some("apt")) => {
            "sudo apt update && sudo apt install golang-go\n\nAfter installation, add to ~/.bashrc or ~/.zshrc:\nexport PATH=$PATH:$(go env GOPATH)/bin"
        }
        ("linux", Some("dnf")) => {
            "sudo dnf install golang\n\nAfter installation, add to ~/.bashrc:\nexport PATH=$PATH:$(go env GOPATH)/bin"
        }
        ("linux", Some("pacman")) => {
            "sudo pacman -S go\n\nAfter installation, add to ~/.bashrc:\nexport PATH=$PATH:$(go env GOPATH)/bin"
        }
        ("linux", _) => {
            "Download from https://go.dev/dl/\nExtract and add to PATH:\ntar -C /usr/local -xzf go*.tar.gz\nexport PATH=$PATH:/usr/local/go/bin:$(go env GOPATH)/bin"
        }
        ("windows", Some("winget")) => {
            "winget install GoLang.Go\n\nAfter installation, add %USERPROFILE%\\go\\bin to your PATH"
        }
        ("windows", Some("chocolatey")) => {
            "choco install golang\n\nAfter installation, add %USERPROFILE%\\go\\bin to your PATH"
        }
        ("windows", _) => {
            "Download from https://go.dev/dl/\nRun the MSI installer.\nAfter installation, add %USERPROFILE%\\go\\bin to your PATH"
        }
        _ => {
            "Visit https://go.dev/dl/ for installation instructions for your platform."
        }
    };

    Ok(instructions.to_string())
}

/// Get Beads installation instructions
#[tauri::command]
pub async fn get_beads_install_instructions() -> Result<String, String> {
    let go = check_go_installation().await?;

    if !go.installed {
        return Ok("Go must be installed first before installing Beads.".to_string());
    }

    Ok("go install github.com/steveyegge/beads/cmd/bd@latest\n\nMake sure $(go env GOPATH)/bin is in your PATH.".to_string())
}
