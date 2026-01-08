#!/bin/bash
# Generate Android signing keystore for GastownUI
#
# Usage: ./scripts/generate-android-keystore.sh
#
# This creates a keystore file for signing Android release APKs.
# Keep the generated keystore and passwords secure - losing them
# means you cannot update published apps.

set -e

KEYSTORE_DIR="src-tauri/gen/android/app"
KEYSTORE_FILE="$KEYSTORE_DIR/release.keystore"
KEYSTORE_ALIAS="gastownui"
VALIDITY_DAYS=10000

# Ensure directory exists
mkdir -p "$KEYSTORE_DIR"

if [ -f "$KEYSTORE_FILE" ]; then
    echo "Keystore already exists at $KEYSTORE_FILE"
    echo "Delete it first if you want to regenerate."
    exit 1
fi

echo "Generating Android signing keystore..."
echo ""
echo "You will be prompted for:"
echo "  1. Keystore password (remember this!)"
echo "  2. Key password (can be same as keystore password)"
echo "  3. Certificate details (name, org, location)"
echo ""

# Generate keystore using keytool
keytool -genkeypair \
    -v \
    -keystore "$KEYSTORE_FILE" \
    -keyalg RSA \
    -keysize 2048 \
    -validity $VALIDITY_DAYS \
    -alias "$KEYSTORE_ALIAS" \
    -storetype PKCS12

echo ""
echo "Keystore generated at: $KEYSTORE_FILE"
echo ""
echo "IMPORTANT: Save these values securely!"
echo "  - Keystore file: $KEYSTORE_FILE"
echo "  - Keystore alias: $KEYSTORE_ALIAS"
echo "  - Keystore password: (what you entered)"
echo "  - Key password: (what you entered)"
echo ""
echo "For CI/CD, set these GitHub secrets:"
echo "  - ANDROID_KEYSTORE_BASE64: base64 -i $KEYSTORE_FILE"
echo "  - ANDROID_KEYSTORE_PASSWORD: your keystore password"
echo "  - ANDROID_KEY_ALIAS: $KEYSTORE_ALIAS"
echo "  - ANDROID_KEY_PASSWORD: your key password"
echo ""
echo "To encode keystore for GitHub secrets:"
echo "  base64 -i $KEYSTORE_FILE | pbcopy"
