# Investigation: Browser-based tmux Integration

**Issue:** ga-e3e
**Status:** FEASIBLE - Recommended for implementation
**Date:** 2026-01-07
**Investigator:** slit

## Executive Summary

Browser-based tmux integration is **feasible and recommended**. The combination of xterm.js (frontend) and ttyd (backend) provides a mature, production-ready solution that can work alongside our existing Tauri approach.

## 1. Web Terminal Solutions Evaluated

### xterm.js (Recommended Frontend)
- **What:** JavaScript terminal emulator for browsers
- **Maturity:** Highly mature, used by VS Code, Hyper, and many others
- **Key Features:**
  - @xterm/addon-attach for WebSocket connections
  - Works in all modern browsers (Chrome, Firefox, Safari, Edge)
  - Also works in Electron/Tauri apps
  - Good performance with GPU-accelerated rendering

### ttyd (Recommended Backend)
- **What:** C-based terminal sharing tool over WebSocket
- **Maturity:** Production-ready, actively maintained
- **Key Features:**
  - Built on libwebsockets + libuv (fast)
  - Native tmux integration: `ttyd tmux new -A -s session`
  - SSL/TLS support built-in
  - Session sharing with multiple clients
  - Docker support for isolation

### GoTTY (Alternative)
- **What:** Original Go implementation
- **Status:** Less actively maintained
- **Notes:** ttyd is the preferred successor

### DomTerm (Advanced Alternative)
- **What:** Feature-rich terminal with detachable sessions
- **Interesting:** Has Tauri front-end support, could unify our approaches
- **Notes:** More complex, may be overkill for our needs

## 2. Tmux Connection Architecture

### Option A: ttyd Direct (Simplest)

```
Browser (xterm.js) <--WebSocket--> ttyd <---> tmux session
```

**Pros:**
- Zero custom backend code
- ttyd handles all WebSocket complexity
- Native tmux session attach: `ttyd tmux attach -t session`

**Cons:**
- Requires ttyd binary on host
- Less control over authentication

### Option B: Custom WebSocket Proxy (More Control)

```
Browser (xterm.js) <--WebSocket--> Node/Rust Proxy <--PTY--> tmux
```

**Pros:**
- Full control over authentication
- Can integrate with existing GastownUI auth
- Could run as Tauri sidecar

**Cons:**
- More code to maintain
- Need to handle PTY correctly

### Option C: Hybrid (Recommended)

```
Tauri Mode:  Tauri app <--direct--> tmux
Browser Mode: xterm.js <--WebSocket--> ttyd/proxy <--> tmux
```

Use native Tauri for desktop, ttyd/proxy for browser. Share the same tmux sessions.

## 3. Backend Requirements

### For ttyd approach:
- ttyd binary (available via Homebrew, apt, etc.)
- Start ttyd pointing to tmux: `ttyd -p 7681 tmux attach -t session`
- Could be managed by Gas Town itself

### For custom proxy:
- WebSocket server (ws in Node.js, tungstenite in Rust)
- PTY handling (node-pty, portable-pty)
- Session management logic

### Integration Points:
- **gt commands**: Could auto-start ttyd when browser UI detected
- **Witness**: Could manage ttyd process lifecycle
- **Config**: Port, SSL, authentication settings

## 4. Tauri Compatibility

**Fully compatible.** Two approaches:

1. **Conditional Mode:**
   - Tauri app: Use native tmux commands via shell plugin (current)
   - Browser: Use WebSocket to ttyd/proxy

2. **Unified Mode (DomTerm-style):**
   - Both modes use xterm.js frontend
   - Tauri: WebSocket to local ttyd
   - Browser: WebSocket to local/remote ttyd

The conditional approach is simpler and recommended for Phase 1.

## 5. Security Implications

### Risks:
- **Exposure:** Terminal access is powerful; misconfig = full system access
- **Authentication:** Need to prevent unauthorized connections
- **Network:** WebSocket traffic interception if not encrypted

### Mitigations:

| Risk | Mitigation |
|------|------------|
| Unauthorized access | Localhost-only by default, require explicit --host flag |
| Session hijacking | Token-based auth per session, expire on disconnect |
| Traffic sniffing | Require HTTPS/WSS for non-localhost |
| Runaway sessions | Timeout idle connections, max concurrent limit |
| Privilege escalation | Run ttyd as non-root user, consider containers |

### Recommended Security Config:
```bash
# Development (localhost only, no auth)
ttyd -p 7681 tmux attach -t session

# Production (with auth and SSL)
ttyd --ssl --ssl-cert cert.pem --ssl-key key.pem \
     --credential user:pass \
     -p 7681 tmux attach -t session
```

## 6. Implementation Recommendation

### Phase 1: MVP (Low Effort)
1. Add ttyd as optional dependency
2. Create `gt tmux serve` command to start ttyd
3. Update TmuxPanel to detect ttyd availability
4. Connect via xterm.js when ttyd is running

**Effort:** ~2-3 days
**Scope:** Localhost development only

### Phase 2: Production Ready
1. Add authentication layer
2. SSL/TLS support
3. Session management (multiple users)
4. Integrate with Gas Town lifecycle

**Effort:** ~1 week
**Scope:** Remote/team access

### Phase 3: Full Integration
1. Auto-start ttyd with GastownUI
2. Unified Tauri/browser experience
3. Session recording/playback
4. Mobile support

**Effort:** ~2 weeks
**Scope:** Production deployment

## 7. Conclusion

**Verdict: GO**

Browser-based tmux is feasible with mature tools. Recommended approach:
- Use xterm.js for frontend (already React-compatible)
- Use ttyd for backend (zero custom code for MVP)
- Start with localhost-only, expand to authenticated remote

This would enable GastownUI to work purely in browser mode, dramatically lowering the barrier to entry for new users who don't want to build Tauri apps.

## References

- [xterm.js](https://xtermjs.org/) - Terminal emulator for the web
- [ttyd](https://tsl0922.github.io/ttyd/) - Share terminal over the web
- [GoTTY](https://github.com/yudai/gotty) - Original Go implementation
- [DomTerm](https://domterm.org/) - Advanced terminal with Tauri support
