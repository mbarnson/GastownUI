# Windows Installation Guide

GastownUI provides two installer formats for Windows: NSIS (.exe) and MSI.

## System Requirements

- **OS**: Windows 10 (version 1803+) or Windows 11
- **WebView2**: Microsoft Edge WebView2 Runtime (auto-installed if missing)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 200MB for application, additional space for LFM2.5 models (~2GB)

## Installer Options

### NSIS Installer (gastownui-setup.exe)

The recommended installer for most users.

**Interactive Install:**
```
gastownui-setup.exe
```

**Silent Install:**
```
gastownui-setup.exe /S
```

**Silent Install with Custom Directory:**
```
gastownui-setup.exe /S /D=C:\Program Files\GastownUI
```

**Uninstall:**
```
"C:\Program Files\GastownUI\Uninstall.exe" /S
```

### MSI Installer (gastownui.msi)

For enterprise deployment and Group Policy.

**Interactive Install:**
```
msiexec /i gastownui.msi
```

**Silent Install:**
```
msiexec /i gastownui.msi /qn
```

**Silent Install with Logging:**
```
msiexec /i gastownui.msi /qn /l*v install.log
```

**Uninstall:**
```
msiexec /x gastownui.msi /qn
```

## WebView2 Runtime

GastownUI uses Microsoft Edge WebView2 for rendering. The installer handles this automatically:

1. **Download Bootstrapper** (default): Downloads and installs WebView2 if not present (~1.5MB download, ~150MB installed)
2. **Embedded Install**: WebView2 runtime bundled in installer (~150MB larger installer)
3. **Offline Install**: For air-gapped environments, pre-install WebView2 from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### Checking WebView2 Installation

```powershell
# Check if WebView2 is installed
Get-ItemProperty "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
```

### Manual WebView2 Installation

If automatic installation fails:

1. Download from: https://go.microsoft.com/fwlink/p/?LinkId=2124703
2. Run the installer as Administrator
3. Restart GastownUI

## Code Signing

### SmartScreen Warning

Unsigned installers trigger Windows SmartScreen. Users will see:
- "Windows protected your PC"
- "Windows SmartScreen prevented an unrecognized app from starting"

**For Development Builds:**
Click "More info" → "Run anyway"

**For Production:**
Sign with an EV (Extended Validation) code signing certificate to establish SmartScreen reputation.

### Signing Configuration

To enable code signing, set in `tauri.conf.json`:

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "YOUR_CERT_THUMBPRINT",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

Or use environment variables:
```
TAURI_SIGNING_PRIVATE_KEY=path/to/key.pfx
TAURI_SIGNING_PRIVATE_KEY_PASSWORD=your_password
```

## Build Instructions

### Prerequisites

- Rust (latest stable)
- Node.js 18+
- Visual Studio Build Tools (with C++ workload)

### Building on Windows

```powershell
# Install dependencies
npm install

# Build for production
npm run tauri:build

# Output location:
# - src-tauri/target/release/bundle/nsis/gastownui_0.1.0_x64-setup.exe
# - src-tauri/target/release/bundle/msi/gastownui_0.1.0_x64_en-US.msi
```

### Cross-Compiling from macOS/Linux

Cross-compilation requires additional setup:

```bash
# Install Windows target
rustup target add x86_64-pc-windows-msvc

# Build (requires wine + windows SDK)
npm run tauri:build -- --target x86_64-pc-windows-msvc
```

Note: Cross-compilation is complex. CI/CD with Windows runners is recommended.

## Troubleshooting

### "VCRUNTIME140.dll not found"

Install Visual C++ Redistributable:
https://aka.ms/vs/17/release/vc_redist.x64.exe

### WebView2 Crashes

1. Update Microsoft Edge to latest version
2. Reset WebView2: `%LOCALAPPDATA%\GastownUI\EBWebView` → delete folder
3. Reinstall WebView2 runtime

### Voice Features Not Working

LFM2.5 models require manual installation:
1. Download models to `%USERPROFILE%\.cache\huggingface\models\LFM2.5-Audio-1.5B-GGUF\`
2. Ensure `llama-liquid-audio-server.exe` is in the runners directory
3. Check Windows Defender isn't blocking the server

### Antivirus False Positives

Some antivirus software flags Tauri apps. Add exceptions for:
- `C:\Program Files\GastownUI\`
- `%USERPROFILE%\.cache\huggingface\models\`

## Enterprise Deployment

### Group Policy

MSI installer supports:
- Per-machine or per-user installation
- TARGETDIR customization
- Feature selection (future)

### SCCM/Intune

Detection rule:
```
File exists: C:\Program Files\GastownUI\GastownUI.exe
```

Install command:
```
msiexec /i gastownui.msi /qn
```

Uninstall command:
```
msiexec /x gastownui.msi /qn
```

## File Locations

| Purpose | Path |
|---------|------|
| Application | `C:\Program Files\GastownUI\` |
| User Data | `%APPDATA%\com.gastownui.app\` |
| WebView2 Cache | `%LOCALAPPDATA%\GastownUI\EBWebView\` |
| Logs | `%APPDATA%\com.gastownui.app\logs\` |
| LFM2.5 Models | `%USERPROFILE%\.cache\huggingface\models\` |
