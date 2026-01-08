#!/bin/bash
#
# Build notarized macOS DMG for GastownUI
#
# Prerequisites:
# - Xcode Command Line Tools
# - Apple Developer ID certificate in Keychain
# - App-specific password for notarization
#
# Environment variables required for signing/notarization:
# - APPLE_SIGNING_IDENTITY: Developer ID Application certificate name
# - APPLE_ID: Apple ID email for notarization
# - APPLE_TEAM_ID: Apple Developer Team ID
# - APPLE_PASSWORD: App-specific password (or @keychain:notarytool)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAURI_DIR="$PROJECT_ROOT/src-tauri"
TARGET_DIR="$TAURI_DIR/target"
BUNDLE_DIR="$TARGET_DIR/release/bundle"
APP_NAME="GastownUI"
VERSION=$(grep '"version"' "$TAURI_DIR/tauri.conf.json" | head -1 | cut -d'"' -f4)

# Build targets for universal binary
TARGETS=("aarch64-apple-darwin" "x86_64-apple-darwin")

log_info "Building GastownUI v$VERSION"

# Check for required tools
command -v cargo >/dev/null 2>&1 || { log_error "cargo is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed."; exit 1; }

# Build frontend first
log_info "Building frontend..."
cd "$PROJECT_ROOT"
npm run build

# Build for each target architecture
for target in "${TARGETS[@]}"; do
    log_info "Building for $target..."

    # Add target if not installed
    rustup target add "$target" 2>/dev/null || true

    cd "$TAURI_DIR"
    cargo build --release --target "$target"
done

# Create universal binary
log_info "Creating universal binary..."
UNIVERSAL_DIR="$TARGET_DIR/universal-apple-darwin/release"
mkdir -p "$UNIVERSAL_DIR"

# Find the built binaries
ARM_BINARY="$TARGET_DIR/aarch64-apple-darwin/release/gastownui"
X86_BINARY="$TARGET_DIR/x86_64-apple-darwin/release/gastownui"

if [[ -f "$ARM_BINARY" && -f "$X86_BINARY" ]]; then
    lipo -create -output "$UNIVERSAL_DIR/gastownui" "$ARM_BINARY" "$X86_BINARY"
    log_info "Universal binary created"
else
    log_warn "Could not create universal binary, using native build"
fi

# Build the app bundle with Tauri
log_info "Building app bundle..."
cd "$PROJECT_ROOT"
npm run tauri build -- --target universal-apple-darwin 2>/dev/null || npm run tauri build

# Find the built app
APP_PATH=$(find "$BUNDLE_DIR" -name "*.app" -type d | head -1)
DMG_PATH=$(find "$BUNDLE_DIR" -name "*.dmg" -type f | head -1)

if [[ -z "$APP_PATH" ]]; then
    log_error "App bundle not found"
    exit 1
fi

log_info "App bundle: $APP_PATH"

# Code signing (if identity provided)
if [[ -n "$APPLE_SIGNING_IDENTITY" ]]; then
    log_info "Signing app with: $APPLE_SIGNING_IDENTITY"

    # Sign all frameworks and dylibs first
    find "$APP_PATH" -name "*.dylib" -o -name "*.framework" | while read -r item; do
        codesign --force --options runtime --sign "$APPLE_SIGNING_IDENTITY" \
            --entitlements "$TAURI_DIR/entitlements.plist" "$item" 2>/dev/null || true
    done

    # Sign the main binary
    codesign --force --options runtime --sign "$APPLE_SIGNING_IDENTITY" \
        --entitlements "$TAURI_DIR/entitlements.plist" \
        "$APP_PATH/Contents/MacOS/GastownUI"

    # Sign the entire app
    codesign --force --options runtime --sign "$APPLE_SIGNING_IDENTITY" \
        --entitlements "$TAURI_DIR/entitlements.plist" \
        "$APP_PATH"

    # Verify signature
    codesign --verify --deep --strict "$APP_PATH"
    log_info "Code signing complete and verified"
else
    log_warn "APPLE_SIGNING_IDENTITY not set, skipping code signing"
fi

# Notarization (if credentials provided)
if [[ -n "$APPLE_ID" && -n "$APPLE_TEAM_ID" && -n "$APPLE_PASSWORD" ]]; then
    log_info "Submitting for notarization..."

    # Create a zip for notarization
    NOTARIZE_ZIP="$TARGET_DIR/$APP_NAME-notarize.zip"
    ditto -c -k --keepParent "$APP_PATH" "$NOTARIZE_ZIP"

    # Submit for notarization
    xcrun notarytool submit "$NOTARIZE_ZIP" \
        --apple-id "$APPLE_ID" \
        --team-id "$APPLE_TEAM_ID" \
        --password "$APPLE_PASSWORD" \
        --wait

    # Staple the notarization ticket
    log_info "Stapling notarization ticket..."
    xcrun stapler staple "$APP_PATH"

    # Clean up
    rm -f "$NOTARIZE_ZIP"

    log_info "Notarization complete"
else
    log_warn "Notarization credentials not set, skipping notarization"
    log_warn "Set APPLE_ID, APPLE_TEAM_ID, and APPLE_PASSWORD to enable"
fi

# Create DMG if not already created
if [[ -z "$DMG_PATH" ]]; then
    log_info "Creating DMG..."
    DMG_PATH="$BUNDLE_DIR/dmg/$APP_NAME-$VERSION.dmg"
    mkdir -p "$(dirname "$DMG_PATH")"

    # Create DMG with hdiutil
    hdiutil create -volname "$APP_NAME" -srcfolder "$APP_PATH" \
        -ov -format UDZO "$DMG_PATH"
fi

# Sign the DMG (if identity provided)
if [[ -n "$APPLE_SIGNING_IDENTITY" && -f "$DMG_PATH" ]]; then
    log_info "Signing DMG..."
    codesign --force --sign "$APPLE_SIGNING_IDENTITY" "$DMG_PATH"

    # Staple if notarized
    if [[ -n "$APPLE_ID" ]]; then
        xcrun stapler staple "$DMG_PATH" 2>/dev/null || true
    fi
fi

# Output summary
echo ""
log_info "Build complete!"
echo "============================================"
echo "  App: $APP_PATH"
[[ -f "$DMG_PATH" ]] && echo "  DMG: $DMG_PATH"
echo "  Version: $VERSION"
echo "============================================"

# Verify Gatekeeper acceptance
if [[ -n "$APPLE_SIGNING_IDENTITY" ]]; then
    log_info "Verifying Gatekeeper acceptance..."
    spctl --assess --type execute "$APP_PATH" && log_info "Gatekeeper: ACCEPTED" || log_warn "Gatekeeper: Check signing"
fi
