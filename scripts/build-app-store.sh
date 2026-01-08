#!/bin/bash
#
# Build macOS app for Mac App Store submission
#
# Prerequisites:
# - Xcode with valid Apple Developer account
# - Mac App Distribution certificate in Keychain
# - App Store Connect app entry created
# - Provisioning profile for Mac App Store
#
# Environment variables:
# - APPLE_TEAM_ID: Apple Developer Team ID
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAURI_DIR="$PROJECT_ROOT/src-tauri"
TARGET_DIR="$TAURI_DIR/target"
APP_NAME="GastownUI"
BUNDLE_ID="com.gastownui.app"
VERSION=$(grep '"version"' "$TAURI_DIR/tauri.conf.json" | head -1 | cut -d'"' -f4)

log_info "Building GastownUI v$VERSION for Mac App Store"

# Check for Xcode
if ! xcode-select -p &>/dev/null; then
    log_error "Xcode is required. Install from the App Store."
    exit 1
fi

# Build frontend
log_info "Building frontend..."
cd "$PROJECT_ROOT"
npm run build

# Build Tauri app
log_info "Building Tauri app..."
npm run tauri build

# Find the app bundle
APP_PATH=$(find "$TARGET_DIR" -name "*.app" -type d | head -1)
if [[ -z "$APP_PATH" ]]; then
    log_error "App bundle not found"
    exit 1
fi

log_info "App bundle: $APP_PATH"

# Copy App Store entitlements
ENTITLEMENTS_SRC="$TAURI_DIR/entitlements.mac-app-store.plist"
if [[ ! -f "$ENTITLEMENTS_SRC" ]]; then
    log_error "App Store entitlements not found: $ENTITLEMENTS_SRC"
    exit 1
fi

# Re-sign with App Store entitlements
log_info "Signing with App Store entitlements..."

# Sign all nested code first
find "$APP_PATH" -name "*.dylib" -o -name "*.framework" | while read -r item; do
    codesign --force --sign "3rd Party Mac Developer Application" \
        --entitlements "$ENTITLEMENTS_SRC" "$item" 2>/dev/null || true
done

# Sign main binary
codesign --force --sign "3rd Party Mac Developer Application" \
    --entitlements "$ENTITLEMENTS_SRC" \
    "$APP_PATH/Contents/MacOS/$APP_NAME"

# Sign the app bundle
codesign --force --sign "3rd Party Mac Developer Application" \
    --entitlements "$ENTITLEMENTS_SRC" \
    "$APP_PATH"

# Verify signature
log_info "Verifying signature..."
codesign --verify --deep --strict "$APP_PATH"

# Create archive directory
ARCHIVE_DIR="$TARGET_DIR/archive"
mkdir -p "$ARCHIVE_DIR"

# Create pkg for App Store
PKG_PATH="$ARCHIVE_DIR/$APP_NAME-$VERSION.pkg"
log_info "Creating installer package..."

productbuild --component "$APP_PATH" /Applications \
    --sign "3rd Party Mac Developer Installer" \
    "$PKG_PATH"

log_info "Package created: $PKG_PATH"

# Validate package
log_info "Validating package..."
xcrun altool --validate-app -f "$PKG_PATH" -t macos \
    --apiKey "$APPLE_API_KEY" --apiIssuer "$APPLE_API_ISSUER" 2>/dev/null || {
    log_warn "Validation skipped - set APPLE_API_KEY and APPLE_API_ISSUER for validation"
}

# Upload option
if [[ "$1" == "--upload" ]]; then
    log_info "Uploading to App Store Connect..."
    xcrun altool --upload-app -f "$PKG_PATH" -t macos \
        --apiKey "$APPLE_API_KEY" --apiIssuer "$APPLE_API_ISSUER"
    log_info "Upload complete! Check App Store Connect for processing status."
else
    log_info "To upload to App Store Connect, run: $0 --upload"
fi

# Summary
echo ""
log_info "Build complete!"
echo "============================================"
echo "  App: $APP_PATH"
echo "  Package: $PKG_PATH"
echo "  Version: $VERSION"
echo "  Bundle ID: $BUNDLE_ID"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Upload package to App Store Connect"
echo "  2. Submit for TestFlight review"
echo "  3. Invite testers"
echo "  4. Submit for App Store review"
