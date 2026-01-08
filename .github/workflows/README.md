# GitHub Actions Workflows

## macOS DMG Build (`build-macos-dmg.yml`)

Builds, signs, and notarizes macOS DMG installers for GastownUI.

### Triggers

- **Tags**: Automatically runs on `v*` tags (e.g., `v0.1.0`)
- **Manual**: Can be triggered manually with options to disable signing/notarization

### Required Secrets

For code signing and notarization, configure these repository secrets:

| Secret | Description |
|--------|-------------|
| `APPLE_CERTIFICATE` | Base64-encoded `.p12` certificate file |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12` certificate |
| `APPLE_SIGNING_IDENTITY` | Certificate name (e.g., `Developer ID Application: Your Name (TEAMID)`) |
| `KEYCHAIN_PASSWORD` | Temporary keychain password (can be any random string) |
| `APPLE_ID` | Apple ID email for notarization |
| `APPLE_ID_PASSWORD` | App-specific password for Apple ID |
| `APPLE_TEAM_ID` | Apple Developer Team ID |
| `TAURI_SIGNING_PRIVATE_KEY` | (Optional) Tauri update signing key |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | (Optional) Password for Tauri signing key |

### Generating Secrets

#### 1. Export Certificate

```bash
# Export from Keychain Access as .p12, then:
base64 -i certificate.p12 | pbcopy
# Paste as APPLE_CERTIFICATE secret
```

#### 2. Find Signing Identity

```bash
security find-identity -v -p codesigning
# Copy the "Developer ID Application" identity
```

#### 3. Create App-Specific Password

1. Go to https://appleid.apple.com
2. Sign in → App-Specific Passwords → Generate

#### 4. Find Team ID

```bash
# From your certificate name, or:
xcrun altool --list-providers -u your@email.com -p @keychain:altool
```

### Output

- `gastownui-{version}-universal.dmg` - Universal binary (Intel + Apple Silicon)
- `gastownui-{version}-x86_64.dmg` - Intel only
- `gastownui-{version}-aarch64.dmg` - Apple Silicon only

### Running Without Signing

For testing, run the workflow manually with:
- `sign: false`
- `notarize: false`

This will produce unsigned DMGs that work on the build machine but won't run on other Macs without Gatekeeper bypass.
