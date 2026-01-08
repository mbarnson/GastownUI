# UI Visual Verification

Use this command to visually verify the GastownUI application works correctly.
Requires Claude Code to be run with `--chrome` flag for browser automation.

## Prerequisites
- Dev server running: `npm run tauri:dev` or `npm run dev`
- Chrome browser available

## Verification Steps

### Step 1: Navigate to App
Use the Chrome MCP tools to navigate to the app:
- For Tauri dev: `http://localhost:1420`
- For Vite dev: `http://localhost:3000`

### Step 2: Verify Header
Check the header contains:
- Gas Town banner image (NOT TanStack logo)
- Menu hamburger button
- Convoy count indicator
- Session count indicator
- Query and Self-Test toggle buttons

### Step 3: Verify No Errors
Check for absence of:
- React error overlay (red error boundary)
- Console errors mentioning "Provider" or "Context"
- Blank white screen

### Step 4: Verify Main Dashboard
Check the dashboard shows:
- Setup banner (if not configured) OR convoy/molecule view
- Sidebar with voice interface
- No JavaScript errors in console

## Expected Behavior

PASS if:
- Header shows Gas Town branding
- No error overlays visible
- Dashboard renders with content
- Console has no critical errors

FAIL if:
- TanStack logo visible in header
- "useSidebarMode must be used within SidebarModeProvider" error
- "No QueryClient set" error
- Blank screen or crash

## Quick Check Commands

```bash
# Build check
npm run build

# Start dev server
npm run dev

# Full Tauri app
npm run tauri:dev
```

## Reporting Results

After verification, report:
1. Screenshot of header
2. Any console errors
3. PASS/FAIL status
