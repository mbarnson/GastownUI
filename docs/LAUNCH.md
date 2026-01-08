# GastownUI Launch Guide

> How to run Gas Town's unhinged voice-enabled dashboard

## Directory Structure

GastownUI uses git worktrees for parallel development. Here's where things live:

```
~/gt/GastownUI/
├── mayor/rig/          ← Canonical clone (Mayor's read-only reference)
├── crew/cosmo/         ← Human development worktree
├── polecats/           ← Agent worktrees (furiosa, nux, rictus, etc.)
└── docs/               ← This file lives here
```

**Which directory to use:**

| Task | Directory |
|------|-----------|
| Human development | `~/gt/GastownUI/crew/cosmo/` |
| Running the app | Any worktree with `package.json` |
| Production builds | `~/gt/GastownUI/mayor/rig/` (after merging) |

All `npm` commands below should run from a worktree root (where `package.json` lives).

---

## Quick Start

### Browser Mode (Chrome/Firefox/Safari)

Run the web app without Tauri:

```bash
# Navigate to your worktree
cd ~/gt/GastownUI/crew/cosmo

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

Open http://localhost:3000 in your browser.

**Note:** Browser mode requires ttyd for terminal access:
```bash
# Install ttyd (macOS)
brew install ttyd

# Start ttyd for tmux integration
ttyd --writable --port 7681 tmux attach-session -t gastown
```

### Desktop App (Tauri)

Full native experience with voice, system access, and tmux:

```bash
# Development mode
npm run tauri:dev

# Production build
npm run tauri:build
```

Built apps appear in `src-tauri/target/release/bundle/`.

---

## Platform-Specific Instructions

### macOS App Store Release

#### Prerequisites
- Xcode 15+ installed
- Apple Developer Program membership ($99/year)
- App Store Connect account

#### Xcode Configuration

1. **Generate Xcode Project**
   ```bash
   npm run tauri:build -- --target universal-apple-darwin
   ```

2. **Open in Xcode**
   ```bash
   open src-tauri/gen/apple/gastownui.xcodeproj
   ```

3. **Configure Signing**
   - Select the project in Navigator
   - Go to "Signing & Capabilities" tab
   - Team: Select your Apple Developer team
   - Bundle Identifier: `com.gastownui.app` (must match tauri.conf.json)
   - Signing Certificate: "Apple Distribution"
   - Provisioning Profile: Create in App Store Connect

4. **Required Capabilities**
   Add these in "Signing & Capabilities":
   - App Sandbox (required for App Store)
   - Hardened Runtime
   - Network: Outgoing Connections (for API calls)
   - Files: User Selected File (for file access)

5. **Info.plist Additions**
   ```xml
   <key>NSMicrophoneUsageDescription</key>
   <string>GastownUI needs microphone access for voice commands</string>
   <key>NSSpeechRecognitionUsageDescription</key>
   <string>GastownUI uses speech recognition for voice control</string>
   ```

6. **Archive & Submit**
   - Product > Archive
   - Distribute App > App Store Connect
   - Upload

#### App Store Review Notes
- Voice features require on-device LLM (no cloud API)
- Terminal features connect to local tmux sessions only
- No user data leaves the device

### iOS (TestFlight / App Store)

```bash
# Initialize iOS target
npm run tauri:ios init

# Build for iOS
npm run tauri:ios build

# Open in Xcode
npm run tauri:ios open
```

Configure signing same as macOS, then:
- Product > Archive
- Distribute App > TestFlight & App Store

### Android (Signed APK for Sideloading)

```bash
# Initialize Android target
npm run tauri:android init

# Build release APK
npm run tauri:android build -- --release
```

**Signing the APK:**
```bash
# Generate keystore (first time)
keytool -genkey -v -keystore gastownui.keystore \
  -alias gastownui -keyalg RSA -keysize 2048 -validity 10000

# Sign the APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore gastownui.keystore \
  src-tauri/gen/android/app/build/outputs/apk/release/app-release-unsigned.apk \
  gastownui

# Align the APK
zipalign -v 4 \
  app-release-unsigned.apk \
  gastownui-release.apk
```

### Windows (Installer)

```bash
# Build Windows installer
npm run tauri:build -- --target x86_64-pc-windows-msvc
```

Outputs:
- `src-tauri/target/release/bundle/msi/` - MSI installer
- `src-tauri/target/release/bundle/nsis/` - NSIS installer

**Code Signing (optional but recommended):**
```powershell
# Sign with Windows SDK signtool
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com gastownui.exe
```

### Linux Packages

```bash
# Build all Linux formats
npm run tauri:build -- --target x86_64-unknown-linux-gnu
```

Outputs in `src-tauri/target/release/bundle/`:
- `deb/` - Debian/Ubuntu package
- `rpm/` - Fedora/RHEL package
- `appimage/` - Universal AppImage

**Install on Debian/Ubuntu:**
```bash
sudo dpkg -i gastownui_0.1.0_amd64.deb
```

**Install on Fedora/RHEL:**
```bash
sudo rpm -i gastownui-0.1.0-1.x86_64.rpm
```

---

## Environment Requirements

| Platform | Requirements |
|----------|-------------|
| Browser | Chrome 90+, Firefox 88+, Safari 14+ |
| macOS | macOS 11+ (Big Sur), Xcode 15+ for builds |
| Windows | Windows 10+, WebView2 runtime |
| Linux | WebKitGTK 4.1+, libappindicator3 |
| iOS | iOS 14+, Xcode 15+ |
| Android | Android 7+ (API 24), Android Studio |

## Voice Assistant Requirements

The voice assistant uses local LLMs (no cloud):

```
models/
├── ggml-small.en.bin     # Whisper for speech-to-text
└── lmstudio-community/   # LFM2.5 for voice responses
```

Download models before first run:
```bash
# Whisper model
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin \
  -o models/ggml-small.en.bin
```

---

## Troubleshooting

**"ttyd offline" in browser mode:**
```bash
ttyd --writable --port 7681 tmux new -s gastown
```

**Voice not working:**
- Check microphone permissions in System Settings
- Verify model files exist in `models/`

**Build fails on macOS:**
```bash
xcode-select --install
rustup target add aarch64-apple-darwin x86_64-apple-darwin
```

**Build fails on Linux:**
```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev
```
