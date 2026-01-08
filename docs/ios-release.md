# iOS App Store Release Guide

## Prerequisites

1. **Apple Developer Account** ($99/year)
   - Enroll at [developer.apple.com](https://developer.apple.com/programs/enroll/)

2. **Xcode** with iOS development tools
   - Already installed: ✓

3. **CocoaPods**
   - Already installed: ✓

## Project Setup Complete

The following have been configured:

### Tauri iOS Target
- iOS project initialized at `src-tauri/gen/apple/`
- Minimum iOS version: 14.0
- Architecture: arm64

### Info.plist Capabilities
- `NSMicrophoneUsageDescription` - Voice command recording
- `NSSpeechRecognitionUsageDescription` - Voice-to-text processing
- `UIBackgroundModes` - Audio processing

### App Store Metadata
- `fastlane/metadata/en-US/description.txt` - App Store description
- `fastlane/metadata/en-US/name.txt` - App name
- `fastlane/metadata/en-US/subtitle.txt` - App subtitle
- `fastlane/metadata/en-US/keywords.txt` - Search keywords
- `fastlane/metadata/en-US/promotional_text.txt` - Promotional text

### Fastlane Automation
- `fastlane/Fastfile` - Build and upload lanes
- `fastlane/Appfile` - App Store Connect configuration

## Steps to Complete Release

### 1. Configure Code Signing

Open `src-tauri/gen/apple/gastownui.xcworkspace` in Xcode:

1. Select `gastownui` project in navigator
2. Select `gastownui_iOS` target
3. Go to "Signing & Capabilities" tab
4. Check "Automatically manage signing"
5. Select your Development Team
6. Xcode will create provisioning profiles

### 2. Update Fastlane Configuration

Edit `fastlane/Appfile`:
```ruby
app_identifier("com.gastownui.app")
apple_id("your@email.com")           # Your Apple ID
team_id("XXXXXXXXXX")                # Developer Portal Team ID
itc_team_id("XXXXXXXXXX")            # App Store Connect Team ID
```

### 3. Create App in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click "+" to create new app
3. Fill in:
   - Platform: iOS
   - Name: Gas Town UI
   - Primary Language: English (U.S.)
   - Bundle ID: com.gastownui.app
   - SKU: gastownui-ios

### 4. Build for TestFlight

```bash
# Build iOS app
npm run tauri ios build -- --target aarch64

# Or use fastlane
cd fastlane && fastlane beta
```

### 5. Create Screenshots

Required sizes:
- 6.9" (iPhone 16 Pro Max): 1320 × 2868
- 6.7" (iPhone 14 Pro Max): 1290 × 2796
- 6.5" (iPhone 11 Pro Max): 1242 × 2688
- 5.5" (iPhone 8 Plus): 1242 × 2208
- 12.9" iPad Pro (6th gen): 2048 × 2732
- 12.9" iPad Pro (2nd gen): 2048 × 2732

### 6. Submit for Review

1. Upload build via Xcode or Transporter
2. Add app information in App Store Connect
3. Upload screenshots
4. Submit for review

## Build Commands

```bash
# Development build (simulator)
npm run tauri ios build -- --target aarch64-sim

# Release build (device)
npm run tauri ios build -- --target aarch64

# Open in Xcode
open src-tauri/gen/apple/gastownui.xcworkspace
```

## Troubleshooting

### "Requires a development team"
Open Xcode and select your team in Signing & Capabilities.

### "Provisioning profile doesn't include..."
Add the required capability in Xcode, then re-export.

### Build fails with Rust errors
Ensure iOS Rust targets are installed:
```bash
rustup target add aarch64-apple-ios
rustup target add x86_64-apple-ios
```
