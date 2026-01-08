# GastownUI FTUE PRD: Voice-Guided First-Time User Experience

**Project:** GastownUI  
**Feature:** First-Time User Experience (FTUE)  
**Version:** 1.0  
**Date:** January 8, 2026  
**Author:** Cosmo (Overseer) & Claude  
**Status:** Draft  
**Depends On:** Phase 2 Voice Engine Core (F2.1, F2.2)

---

## Executive Summary

This PRD defines the voice-guided first-time user experience for GastownUI—the moment when a user launches the app without Gas Town installed and gets walked through setup by a warm, competent voice assistant.

The FTUE embodies Gas Town's philosophy: **you will learn the terminal, but you won't learn it alone.** The voice assistant acts as an experienced colleague who's been through this before, guiding users through each command with patience, occasional wit, and genuine helpfulness.

### Design Philosophy

> "Gas Town is the beginning of industrialized factory-farming of code... by summer, OSS models will be as good as October's crop, which were 'good enough' for most startup-type eng work."  
> — Steve Yegge, "Welcome to Gas Town"

The FTUE acknowledges that Gas Town is for a specific audience—developers ready to embrace multi-agent workflows—while making the onboarding accessible to anyone curious enough to try. We're not gatekeeping; we're guiding.

**Key Principles:**
1. **Voice-first, terminal-real**: Voice explains, user executes in their actual terminal
2. **Progressive disclosure**: Start simple, reveal complexity as needed
3. **Warm competence over snark**: Helpful first, personality second
4. **Graceful degradation**: Works without voice if needed
5. **Honest about requirements**: Don't hide that this costs money and requires commitment

---

## User Journey

### Entry Points

```
┌─────────────────────────────────────────────────────────────────┐
│                    GastownUI First Launch                        │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Fresh       │    │  Partial     │    │  Complete    │      │
│  │  Install     │    │  Setup       │    │  Setup       │      │
│  │              │    │              │    │              │      │
│  │  No gt/bd    │    │  Has tools,  │    │  Workspace   │      │
│  │  installed   │    │  no workspace│    │  exists      │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│    Full FTUE           Quick Setup         Dashboard           │
│    (5-7 min)           (1-2 min)           (immediate)         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Detection Logic

On launch, GastownUI checks setup state before showing any UI:

```typescript
interface SetupState {
  // Prerequisites
  hasGo: boolean
  goVersion?: string
  
  // Gas Town tools
  hasBd: boolean
  bdVersion?: string
  hasBdMinVersion: boolean  // >= 0.43.0
  
  hasGt: boolean
  gtVersion?: string
  hasGtMinVersion: boolean  // >= 0.2.0
  
  // Optional but recommended
  hasTmux: boolean
  tmuxVersion?: string
  
  // Workspace
  hasWorkspace: boolean
  workspacePath?: string
  workspaceRigs?: string[]
  
  // System info
  platform: 'darwin' | 'linux' | 'win32'
  arch: 'arm64' | 'x64'
  hasHomebrew?: boolean  // macOS only
  
  // For error recovery
  pathIncludesGobin: boolean
  lastError?: string
}
```

**Decision Tree:**

```
hasWorkspace && hasGtMinVersion && hasBdMinVersion?
  → YES: Skip to Dashboard
  → NO: Check what's missing...

hasGt && hasBd but no workspace?
  → Quick Setup: Just need to create workspace

hasGo but missing tools?
  → Tool Installation flow

No Go?
  → Full FTUE from beginning
```

---

## Voice Script & UI Flow

### Scene 1: Welcome (No Setup Detected)

**UI State:** Minimal welcome screen with GastownUI logo, microphone indicator, and a simple progress checklist (all items unchecked).

**Visual:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                         ⛽ GastownUI                             │
│                                                                  │
│                    Welcome to the factory.                       │
│                                                                  │
│         ┌─────────────────────────────────────────┐             │
│         │  Setup Checklist                        │             │
│         │                                         │             │
│         │  ○ Go programming language              │             │
│         │  ○ Beads (issue tracker)                │             │
│         │  ○ Gas Town (orchestrator)              │             │
│         │  ○ Workspace initialization             │             │
│         │                                         │             │
│         └─────────────────────────────────────────┘             │
│                                                                  │
│                        🎤 Listening...                          │
│                                                                  │
│         [Continue without voice]  [Skip setup →]                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Voice Script:**

> "Hey there! I'm your Gas Town assistant. I'll be helping you get set up—it usually takes about five minutes.
>
> Before we start, I should mention: Gas Town is designed for developers who are comfortable in the terminal and ready to run multiple AI coding agents in parallel. It's powerful, but it does use real API credits. If that sounds like what you're looking for, let's get started.
>
> Say 'let's go' when you're ready, or 'tell me more' if you want to know what we're setting up."

**User Responses:**
- "Let's go" / "Ready" / "Start" → Proceed to Scene 2
- "Tell me more" → Brief explanation of Gas Town components
- "Skip" / "I'll do it later" → Exit to minimal dashboard with setup banner
- Silence (10s) → "No rush. Say 'ready' when you want to begin, or click the button below."

**"Tell me more" response:**

> "Gas Town is an orchestration system for coding agents—think of it as a factory floor where multiple Claude Code instances work in parallel on your codebase.
>
> We need to install two command-line tools: Beads, which is a Git-backed issue tracker your agents will use, and Gas Town itself, which coordinates everything. Both are open source and install via Go.
>
> Ready to get started?"

---

### Scene 2: Go Check

**Voice Script (Go detected):**

> "Let me check what you already have installed..."  
> *(brief pause while checking)*  
> "Nice—you've got Go {{version}}. That's all we need to install the tools."

**Voice Script (Go not detected):**

> "First thing we need is Go—it's the programming language that Gas Town and Beads are written in.
>
> {{platform_specific_instructions}}"

**Platform-specific instructions:**

**macOS:**
> "On Mac, the easiest way is with Homebrew. If you have Homebrew, run: `brew install go`
>
> If you don't have Homebrew yet, you can get it at brew.sh, or download Go directly from go.dev.
>
> Let me know when Go is installed."

**Linux:**
> "On Linux, you can usually install Go with your package manager. For Ubuntu or Debian: `sudo apt install golang-go`
>
> Or download it directly from go.dev.
>
> Let me know when it's ready."

**Windows:**
> "On Windows, head to go.dev/dl and download the installer. Run it, and make sure to check the box that adds Go to your PATH.
>
> Let me know when the installation finishes."

**UI State:** 
- Checklist item "Go programming language" is highlighted
- Command shown in copyable code block
- "Check again" button appears

**Detection Loop:**
- Poll every 3 seconds for `go version`
- On detection: 
  - Check mark animates on checklist
  - Voice: "Got it! Go {{version}} is ready."
  - Auto-advance to Scene 3

**Error Handling (Go installed but not in PATH):**

> "Hmm, I'm not finding Go in your PATH. This usually means you need to add Go's bin directory to your shell configuration.
>
> Try adding this line to your ~/.zshrc or ~/.bashrc:
>
> `export PATH=$PATH:/usr/local/go/bin`
>
> Then restart your terminal and say 'check again'."

---

### Scene 3: Install Beads

**Voice Script:**

> "Now let's install Beads—this is the issue tracker your agents will use to coordinate work. It's like Jira, but stored in Git and actually pleasant to use.
>
> Run this command in your terminal:"

**UI State:**
- Show command: `go install github.com/steveyegge/beads/cmd/bd@latest`
- Checklist item "Beads" highlighted
- Copy button next to command

**Voice continues after showing command:**

> "This will download and compile Beads. It might take a minute or two the first time."

**Detection Loop:**
- Poll every 3 seconds for `bd version`
- On detection:
  - Parse version, check against minimum (0.43.0)
  - If version OK: "Beads {{version}} is installed. Nice."
  - If version too old: "You have Beads {{version}}, but we need at least 0.43.0. Run the install command again to update."

**Common Error: GOPATH/bin not in PATH:**

> "Beads installed, but your shell can't find it yet. You need to add Go's bin directory to your PATH.
>
> Add this to your ~/.zshrc:
>
> `export PATH=$PATH:$(go env GOPATH)/bin`
>
> Then run `source ~/.zshrc` or restart your terminal."

---

### Scene 4: Install Gas Town

**Voice Script:**

> "One more tool: Gas Town itself. Same process—run this command:"

**UI State:**
- Show command: `go install github.com/steveyegge/gastown/cmd/gt@latest`
- Checklist item "Gas Town" highlighted

**Voice continues:**

> "This is the orchestrator that coordinates all your coding agents. It'll take a minute to compile."

**Detection Loop:**
- Poll for `gt version`
- Check minimum version (0.2.0)
- On success: "Gas Town {{version}} is ready. We're almost there."

---

### Scene 5: Create Workspace

**Voice Script:**

> "Last step: we need to create your Gas Town workspace. This is your headquarters—the directory where all your projects and agents will live.
>
> The standard location is ~/gt. Does that work for you, or would you prefer somewhere else?"

**User Responses:**
- "That's fine" / "Yes" / "~/gt is good" → Use default
- "Somewhere else" / "Different location" → Prompt for path
- Specific path mentioned → Use that path

**Path Selection UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Where should we create your Gas Town workspace?                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ~/gt                                           [Browse] │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  This will create:                                              │
│    • mayor/     - Your main coordination point                  │
│    • .beads/    - Issue tracking database                       │
│    • logs/      - Activity logs                                 │
│                                                                  │
│                              [Create Workspace]                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Voice (after path confirmed):**

> "Creating your workspace at {{path}}..."

**Command executed:**
```bash
gt install {{path}} --git
```

**Detection:**
- Check for `{{path}}/mayor/town.json`
- On success: Checklist complete, proceed to Scene 6

**Error Handling:**

If `gt install` fails:
> "Something went wrong creating the workspace. The error was: {{error_summary}}.
>
> This sometimes happens if the directory already exists or there's a permissions issue. Want to try a different location, or should I show you the full error?"

---

### Scene 6: Celebration & Next Steps

**UI State:** All checklist items checked, celebratory animation (subtle, not over the top)

**Voice Script:**

> "You're all set! You've got a fresh Gas Town workspace at {{path}}.
>
> A few things you might want to do next:
>
> First, you could add a project. If you have a Git repository you want to work on, I can help you add it as a rig—that's what Gas Town calls a managed project.
>
> Or, you can start the Mayor—that's your main coordination agent. It's the one you'll talk to most often.
>
> What sounds good?"

**Options UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    🎉 Setup Complete!                           │
│                                                                  │
│         Your Gas Town workspace is ready at ~/gt                │
│                                                                  │
│         ┌─────────────────────────────────────────┐             │
│         │  What's next?                           │             │
│         │                                         │             │
│         │  [🚀 Add a project]                     │             │
│         │     Add a Git repo as your first rig   │             │
│         │                                         │             │
│         │  [👔 Start the Mayor]                   │             │
│         │     Fire up your coordination agent    │             │
│         │                                         │             │
│         │  [📊 Go to Dashboard]                   │             │
│         │     Explore the interface first        │             │
│         │                                         │             │
│         └─────────────────────────────────────────┘             │
│                                                                  │
│         Pro tip: You can always access Gas Town from            │
│         your terminal with `gt` commands.                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**User Responses:**

**"Add a project":**
> "What's the Git URL for your project? You can paste it or tell me the GitHub path—like 'my-username/my-repo'."

Then:
```bash
gt rig add {{repo_name}} {{git_url}}
```

**"Start the Mayor":**
> "Starting the Mayor... this will open a tmux session where you can talk to your main coordination agent.
>
> I'll still be here in the background if you need me. Just switch back to this window."

```bash
gt mayor start
```

**"Go to Dashboard":**
> "Here's your dashboard. It's pretty quiet right now since you don't have any work running yet. 
>
> When you're ready, you can add a project and start dispatching work. I'll be here if you have questions."

→ Navigate to main dashboard

---

## Optional Flows

### Quick Setup (Has tools, no workspace)

If tools are installed but no workspace exists:

**Voice:**
> "Hey! Looks like you have the Gas Town tools installed but haven't created a workspace yet. Want me to help you set that up? It'll just take a minute."

→ Skip to Scene 5

### Resume Interrupted Setup

If user quits mid-setup and relaunches:

**Voice:**
> "Welcome back! Looks like we didn't finish setting up last time. You're {{progress_summary}}—want to pick up where we left off?"

Track progress in local storage:
```typescript
interface FTUEProgress {
  startedAt: string
  lastStep: FTUEStep
  completedSteps: FTUEStep[]
  customPath?: string
  errors: string[]
}
```

### Skip Setup

Users can skip FTUE at any time. The dashboard shows a persistent banner:

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Gas Town not configured. [Complete setup] to enable all     │
│    features.                                           [Dismiss]│
└─────────────────────────────────────────────────────────────────┘
```

### Non-Voice Mode

If voice is unavailable or user clicks "Continue without voice":
- All instructions appear as text in the UI
- Progress still tracked visually
- Commands still shown with copy buttons
- Same flow, just silent

---

## Personality Guidelines

The FTUE voice should be:

### Do
- **Warm and competent**: Like an experienced colleague showing you around
- **Patient**: Never rush, never make the user feel slow
- **Honest**: Clear about what Gas Town is and what it costs
- **Encouraging**: Celebrate progress without being patronizing
- **Helpful first**: Personality comes through in word choice, not forced jokes

### Don't
- **Don't gatekeep**: We're welcoming curious developers, not hazing them
- **Don't be sycophantic**: No "Great question!" or excessive praise
- **Don't be robotic**: Vary sentence structure, use contractions
- **Don't info-dump**: Explain things as they become relevant
- **Don't hide complexity**: Be upfront about costs and requirements

### Voice Characteristics
- Pace: Moderate, with natural pauses
- Tone: Confident, friendly, slightly informal
- Energy: Calm competence, not frantic enthusiasm

### Example Tone Calibration

**Too cold:**
> "Go is not installed. Install it and retry."

**Too warm:**
> "Oh no, looks like Go isn't installed yet! But don't worry, that's totally fine! We can fix that super easily!"

**Just right:**
> "First thing we need is Go—it's the programming language that Gas Town is written in. Here's how to install it."

---

## Technical Implementation

### State Machine

```typescript
type FTUEStep = 
  | 'welcome'
  | 'checking_prerequisites'
  | 'install_go'
  | 'waiting_for_go'
  | 'install_beads'
  | 'waiting_for_beads'
  | 'install_gastown'
  | 'waiting_for_gastown'
  | 'configure_workspace'
  | 'creating_workspace'
  | 'complete'
  | 'add_first_rig'
  | 'start_mayor'

interface FTUEState {
  step: FTUEStep
  setupState: SetupState
  customPath?: string
  firstRigUrl?: string
  errorCount: number
  lastError?: string
  voiceEnabled: boolean
  startedAt: Date
}

type FTUEAction =
  | { type: 'PROCEED' }
  | { type: 'GO_DETECTED'; version: string }
  | { type: 'BD_DETECTED'; version: string }
  | { type: 'GT_DETECTED'; version: string }
  | { type: 'WORKSPACE_CREATED'; path: string }
  | { type: 'SET_CUSTOM_PATH'; path: string }
  | { type: 'ERROR'; error: string }
  | { type: 'SKIP' }
  | { type: 'RETRY' }
```

### Detection Service

```typescript
// src/ftue/detection.ts

const POLL_INTERVAL = 3000  // 3 seconds

class SetupDetector {
  private polling = false
  private callbacks: Map<string, (detected: boolean, version?: string) => void> = new Map()

  async checkAll(): Promise<SetupState> {
    const [go, bd, gt, tmux, workspace] = await Promise.all([
      this.checkGo(),
      this.checkBeads(),
      this.checkGastown(),
      this.checkTmux(),
      this.findWorkspace(),
    ])

    return {
      ...go,
      ...bd,
      ...gt,
      ...tmux,
      ...workspace,
      platform: await platform(),
      arch: await arch(),
      hasHomebrew: await this.checkHomebrew(),
      pathIncludesGobin: await this.checkGobinInPath(),
    }
  }

  private async checkGo(): Promise<{ hasGo: boolean; goVersion?: string }> {
    try {
      const result = await runCommand('go', ['version'])
      const match = result.stdout.match(/go(\d+\.\d+(\.\d+)?)/)
      return {
        hasGo: true,
        goVersion: match?.[1],
      }
    } catch {
      return { hasGo: false }
    }
  }

  private async checkBeads(): Promise<{ hasBd: boolean; bdVersion?: string; hasBdMinVersion: boolean }> {
    try {
      const result = await runCommand('bd', ['version'])
      const match = result.stdout.match(/bd version (\d+\.\d+\.\d+)/)
      const version = match?.[1]
      return {
        hasBd: true,
        bdVersion: version,
        hasBdMinVersion: version ? this.compareVersions(version, '0.43.0') >= 0 : false,
      }
    } catch {
      return { hasBd: false, hasBdMinVersion: false }
    }
  }

  private async checkGastown(): Promise<{ hasGt: boolean; gtVersion?: string; hasGtMinVersion: boolean }> {
    try {
      const result = await runCommand('gt', ['version'])
      const match = result.stdout.match(/gt version (\d+\.\d+\.\d+)/)
      const version = match?.[1]
      return {
        hasGt: true,
        gtVersion: version,
        hasGtMinVersion: version ? this.compareVersions(version, '0.2.0') >= 0 : false,
      }
    } catch {
      return { hasGt: false, hasGtMinVersion: false }
    }
  }

  private async findWorkspace(): Promise<{ hasWorkspace: boolean; workspacePath?: string }> {
    // Check common locations
    const candidates = [
      await resolveHome('~/gt'),
      await resolveHome('~/gastown'),
      process.cwd(),
    ]

    for (const path of candidates) {
      if (await this.isWorkspace(path)) {
        return { hasWorkspace: true, workspacePath: path }
      }
    }

    return { hasWorkspace: false }
  }

  private async isWorkspace(path: string): Promise<boolean> {
    try {
      await fs.access(join(path, 'mayor', 'town.json'))
      return true
    } catch {
      return false
    }
  }

  startPolling(target: 'go' | 'bd' | 'gt', callback: (detected: boolean, version?: string) => void) {
    this.callbacks.set(target, callback)
    if (!this.polling) {
      this.polling = true
      this.pollLoop()
    }
  }

  private async pollLoop() {
    while (this.polling && this.callbacks.size > 0) {
      for (const [target, callback] of this.callbacks) {
        const check = target === 'go' ? this.checkGo() :
                      target === 'bd' ? this.checkBeads() :
                      this.checkGastown()
        
        const result = await check
        const hasIt = target === 'go' ? result.hasGo :
                      target === 'bd' ? result.hasBd :
                      result.hasGt
        
        if (hasIt) {
          callback(true, result[`${target}Version`])
          this.callbacks.delete(target)
        }
      }
      await sleep(POLL_INTERVAL)
    }
    this.polling = false
  }

  stopPolling() {
    this.polling = false
    this.callbacks.clear()
  }
}
```

### Voice Integration

```typescript
// src/ftue/voice.ts

interface FTUEVoiceScript {
  speak(text: string): Promise<void>
  waitForResponse(options: ResponseOptions): Promise<string>
  isEnabled(): boolean
}

interface ResponseOptions {
  timeout?: number           // ms before giving up
  expectedResponses?: string[]  // Valid responses to listen for
  fallbackOnTimeout?: string    // What to do if no response
}

class FTUEVoice implements FTUEVoiceScript {
  private engine: VoiceEngine

  async speak(text: string): Promise<void> {
    if (!this.isEnabled()) return
    
    // Use LFM2.5-Audio for text-to-speech
    await this.engine.synthesize(text)
  }

  async waitForResponse(options: ResponseOptions): Promise<string> {
    if (!this.isEnabled()) {
      return options.fallbackOnTimeout || 'continue'
    }

    const timeout = options.timeout || 30000
    
    try {
      const response = await Promise.race([
        this.engine.listen(),
        sleep(timeout).then(() => { throw new Error('timeout') }),
      ])

      // Match against expected responses
      const normalized = response.toLowerCase().trim()
      const matches = options.expectedResponses?.find(exp => 
        normalized.includes(exp.toLowerCase())
      )
      
      return matches || response
    } catch {
      return options.fallbackOnTimeout || 'timeout'
    }
  }

  isEnabled(): boolean {
    return this.engine?.isReady() ?? false
  }
}
```

### FTUE Component

```tsx
// src/routes/ftue.tsx

import { useReducer, useEffect } from 'react'
import { ftueReducer, initialState } from '../ftue/reducer'
import { SetupDetector } from '../ftue/detection'
import { FTUEVoice } from '../ftue/voice'
import { ChecklistItem } from '../components/ChecklistItem'
import { CommandBlock } from '../components/CommandBlock'

export function FTUERoute() {
  const [state, dispatch] = useReducer(ftueReducer, initialState)
  const detector = useMemo(() => new SetupDetector(), [])
  const voice = useMemo(() => new FTUEVoice(), [])

  // Initial detection
  useEffect(() => {
    detector.checkAll().then(setupState => {
      dispatch({ type: 'INITIAL_CHECK', setupState })
    })
  }, [])

  // Voice narration based on step
  useEffect(() => {
    const script = VOICE_SCRIPTS[state.step]
    if (script && state.voiceEnabled) {
      voice.speak(script.text).then(() => {
        if (script.waitForResponse) {
          voice.waitForResponse(script.responseOptions).then(response => {
            dispatch({ type: 'VOICE_RESPONSE', response })
          })
        }
      })
    }
  }, [state.step, state.voiceEnabled])

  return (
    <div className="ftue-container">
      <header className="ftue-header">
        <Logo />
        <h1>Welcome to the factory.</h1>
      </header>

      <main className="ftue-content">
        <SetupChecklist state={state} />
        
        {state.step === 'install_go' && (
          <InstallGoStep 
            platform={state.setupState.platform}
            hasHomebrew={state.setupState.hasHomebrew}
          />
        )}
        
        {state.step === 'install_beads' && (
          <CommandStep
            title="Install Beads"
            command="go install github.com/steveyegge/beads/cmd/bd@latest"
            description="Git-backed issue tracker for your agents"
          />
        )}
        
        {state.step === 'install_gastown' && (
          <CommandStep
            title="Install Gas Town"
            command="go install github.com/steveyegge/gastown/cmd/gt@latest"
            description="Multi-agent orchestration system"
          />
        )}
        
        {state.step === 'configure_workspace' && (
          <WorkspaceConfigStep
            defaultPath="~/gt"
            onConfirm={(path) => dispatch({ type: 'SET_CUSTOM_PATH', path })}
          />
        )}
        
        {state.step === 'complete' && (
          <CompletionStep 
            workspacePath={state.setupState.workspacePath!}
            onAddRig={() => dispatch({ type: 'START_ADD_RIG' })}
            onStartMayor={() => dispatch({ type: 'START_MAYOR' })}
            onDashboard={() => dispatch({ type: 'GO_DASHBOARD' })}
          />
        )}
      </main>

      <footer className="ftue-footer">
        <MicrophoneIndicator enabled={state.voiceEnabled} />
        <button onClick={() => dispatch({ type: 'TOGGLE_VOICE' })}>
          {state.voiceEnabled ? 'Mute voice' : 'Enable voice'}
        </button>
        <button onClick={() => dispatch({ type: 'SKIP' })}>
          Skip setup
        </button>
      </footer>
    </div>
  )
}
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| FTUE completion rate | > 80% | Users who finish all steps / users who start |
| Time to completion | < 7 min | Median time from start to workspace created |
| Error recovery rate | > 90% | Users who continue after hitting an error |
| Voice engagement | > 60% | Users who keep voice enabled through setup |
| First action after setup | Track | Distribution of "add rig" / "start mayor" / "dashboard" |

---

## Testing Strategy

### Automated Tests

1. **Detection tests**: Mock command outputs, verify state parsing
2. **State machine tests**: Verify transitions for all action types
3. **Voice script tests**: Ensure all steps have appropriate scripts

### Manual Test Scenarios

1. **Clean Mac install**: No Go, no tools, no workspace
2. **Clean Linux install**: Same, verify apt instructions
3. **Partial install**: Has Go, missing tools
4. **Outdated tools**: Has old bd/gt versions
5. **PATH issues**: Tools installed but not in PATH
6. **Interrupted setup**: Quit at each step, resume
7. **Error recovery**: Simulate failed commands
8. **Non-voice mode**: Complete setup with voice disabled

### E2E Test (VM)

Run FTUE on fresh macOS and Ubuntu VMs to verify complete flow works in isolation.

---

## Open Questions

1. **Windows support**: How well does Gas Town work on Windows? Should FTUE have platform-specific warnings?

2. **Claude Code requirement**: Should FTUE help users get Claude Code set up, or assume they already have it?

3. **API key setup**: Does Gas Town need API keys configured? Should FTUE guide through that?

4. **First rig suggestions**: Should we suggest a demo repo for users who don't have a project ready?

5. **Offline fallback**: What if LFM2.5 model download fails? Should we have embedded fallback audio?

---

## Appendix: Voice Script Reference

Full scripts for each FTUE step, including variants for different platforms and error states.

### welcome
```
Default: "Hey there! I'm your Gas Town assistant..."
After skip: "No problem. Say 'set up Gas Town' when you're ready."
On return: "Welcome back! Looks like we didn't finish setting up..."
```

### install_go
```
Mac w/Homebrew: "On Mac, the easiest way is with Homebrew..."
Mac w/o Homebrew: "You can install Homebrew first, or download Go directly..."
Linux: "On Linux, you can usually install Go with your package manager..."
Windows: "On Windows, head to go.dev/dl and download the installer..."
PATH error: "Hmm, I'm not finding Go in your PATH..."
```

### install_beads
```
Default: "Now let's install Beads—this is the issue tracker..."
PATH error: "Beads installed, but your shell can't find it yet..."
Version error: "You have Beads {{version}}, but we need at least 0.43.0..."
```

### install_gastown
```
Default: "One more tool: Gas Town itself..."
PATH error: (same as beads)
Version error: "You have Gas Town {{version}}, but we need at least 0.2.0..."
```

### configure_workspace
```
Default: "Last step: we need to create your Gas Town workspace..."
Custom path: "Got it, I'll create the workspace at {{path}}..."
Path exists: "That directory already exists. Want to use it anyway, or pick a different location?"
```

### complete
```
Default: "You're all set! You've got a fresh Gas Town workspace..."
With first rig: "Your workspace is ready, and I've added {{rig}} as your first project..."
```

---

*"Gas Town is alive, if only just. I have created something that is just barely smart enough."*  
*— Steve Yegge*
