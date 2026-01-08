# GastownUI Voice Assistant Roadmap (Phase 2)

**Document Version:** 1.0  
**Date:** January 7, 2026  
**Status:** Planning  
**Depends On:** Phase 1 Core UI (Dashboard, Rig View, Tmux Panel)

---

## Executive Summary

This roadmap defines the voice assistant architecture for GastownUI—a snarky, on-device AI companion that serves as the conversational interface to Gas Town. The assistant uses Liquid AI's LFM2.5 model family running locally on Apple Silicon, communicates with Gas Town agents via idiomatic mail primitives, and can escalate complex queries to the Mayor (Claude Code).

The ultimate goal: a voice interface where users can ask "what's the status of the dashboard feature?" and get an immediate, personality-laden response—or say "tell the Mayor to spin up two more polecats on the auth system" and have it Just Work.

---

## Architecture Overview

### The Three-Tier Intelligence Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                            User Voice                               │
│                                │                                    │
│                                ▼                                    │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  TIER 1: LFM2.5-Audio (1.5B params, always loaded)             │ │
│  │  ────────────────────────────────────────────────              │ │
│  │  • Voice-to-voice conversation                                 │ │
│  │  • Personality engine (snark, Yegge-energy)                    │ │
│  │  • Simple status queries from injected context                 │ │
│  │  • Emits ACTION: intents for complex operations                │ │
│  │  • Latency: ~100ms                                             │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                │                                    │
│              ACTION: deep_query │ ACTION: describe_screen           │
│                                ▼                                    │
│  ┌──────────────────────────┐    ┌──────────────────────────┐      │
│  │  TIER 2: LFM2.5-Instruct │    │  TIER 2: LFM2.5-Vision   │      │
│  │  (loaded on demand)      │    │  (loaded on demand)      │      │
│  │  ─────────────────────   │    │  ─────────────────────   │      │
│  │  • Gas Town state        │    │  • Screenshot analysis   │      │
│  │    analysis              │    │  • UI state description  │      │
│  │  • Beads/convoy parsing  │    │  • "What am I looking    │      │
│  │  • Local reasoning       │    │    at?" queries          │      │
│  │  • Latency: ~500ms       │    │  • Latency: ~800ms       │      │
│  └──────────────────────────┘    └──────────────────────────┘      │
│                                │                                    │
│                  ACTION: ask_mayor                                  │
│                                ▼                                    │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  TIER 3: Mayor (Claude Code via gt mail)                       │ │
│  │  ──────────────────────────────────────────                    │ │
│  │  • Complex reasoning and decisions                             │ │
│  │  • Cross-rig coordination                                      │ │
│  │  • Work assignment and convoy creation                         │ │
│  │  • Latency: 2-10s (includes mail round-trip)                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Voice Assistant as Gas Town Citizen

The voice assistant is a first-class Gas Town agent with its own identity and mailbox:

```
~/gt/
├── voice/                    ← Town-level voice agent
│   ├── state.json           ← Voice assistant state
│   ├── context-cache.json   ← Cached Gas Town context
│   └── mail/                ← Its mailbox (via gt mail)
├── mayor/
├── gastownui/
│   ├── crew/cosmo/
│   └── polecats/
└── .events.jsonl            ← Voice watches this for real-time awareness
```

**Address:** `voice/` (town-level, like `mayor/`)

---

## Technical Requirements

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Apple Silicon | M1 Pro | M4 Max |
| Unified Memory | 32GB | 64GB+ |
| Storage | 20GB free | 50GB free |

**Memory Budget (all models loaded):**
- LFM2.5-Audio-1.5B (Q4_K_M): ~2GB
- LFM2.5-Instruct-1.5B (Q4_K_M): ~2GB  
- LFM2.5-Vision-1.5B (Q4_K_M): ~2GB
- **Total:** ~6GB for models + inference overhead

### Software Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| llama.cpp | Latest | GGUF model inference |
| gt (Gas Town) | 0.2.1+ | Agent orchestration |
| bd (Beads) | 0.46.0+ | Issue tracking |
| tmux | 3.0+ | Session management |

### Model Files

Source: [LiquidAI/LFM2.5-Audio-1.5B-GGUF](https://huggingface.co/LiquidAI/LFM2.5-Audio-1.5B-GGUF)

```
models/
├── lfm2.5-audio-1.5b-q4_k_m.gguf      # Voice I/O
├── lfm2.5-instruct-1.5b-q4_k_m.gguf   # Text reasoning
└── lfm2.5-vision-1.5b-q4_k_m.gguf     # Screenshot analysis
```

---

## Feature Specifications

### F2.1: Voice Engine Core

**Priority:** P0 (Critical Path)  
**Estimated Effort:** 3-5 days  
**Dependencies:** Phase 1 scaffold complete

#### Description

Integrate LFM2.5-Audio for real-time voice conversation via llama.cpp server running as a Tauri sidecar process.

#### Technical Implementation

```typescript
// src/voice/engine.ts

interface VoiceEngine {
  // Lifecycle
  initialize(): Promise<void>
  shutdown(): Promise<void>
  
  // Voice I/O
  startListening(): Promise<void>
  stopListening(): Promise<void>
  speak(text: string): Promise<void>
  
  // State
  isListening: boolean
  isSpeaking: boolean
}

// Tauri sidecar configuration
// src-tauri/tauri.conf.json
{
  "bundle": {
    "externalBin": [
      "binaries/llama-server"
    ]
  }
}

// Launch llama.cpp server for audio model
async function startAudioServer(): Promise<number> {
  const command = Command.sidecar('binaries/llama-server', [
    '--model', await resolveModel('lfm2.5-audio-1.5b-q4_k_m.gguf'),
    '--port', '8081',
    '--ctx-size', '4096',
    '--threads', '8',
    // Audio-specific flags TBD based on LFM2.5 requirements
  ])
  
  const child = await command.spawn()
  return child.pid
}
```

#### Acceptance Criteria

- [ ] llama.cpp server starts as Tauri sidecar on app launch
- [ ] Voice input captured from system microphone
- [ ] Voice output plays through system speakers
- [ ] Push-to-talk and voice-activity-detection modes supported
- [ ] Graceful handling of model loading time (~5-10s on first launch)

---

### F2.2: Context Assembly System

**Priority:** P0 (Critical Path)  
**Estimated Effort:** 2-3 days  
**Dependencies:** F2.1

#### Description

Build the context injection system that keeps the voice model informed about Gas Town state without overwhelming its context window.

#### Context Structure

```typescript
// src/voice/context.ts

interface VoiceContext {
  // Core status (~200 tokens)
  townHealth: 'healthy' | 'degraded' | 'down'
  activePolecats: string[]        // ["slit", "furiosa", "nux"]
  runningConvoys: number
  unreadMail: number
  costToday: number
  costRate: number                // $/hour
  
  // Recent activity (~100 tokens)
  lastEvents: ActivityEvent[]     // Last 5 events
  
  // Pending items (~50 tokens)
  blockedBeads: string[]          // Beads waiting on something
  
  // Snark hints (~50 tokens)
  snarkSuggestion: string         // Contextual personality hints
}

interface ActivityEvent {
  timestamp: string
  type: string
  summary: string                 // "furiosa merged ga-6tk"
}

// Refresh context every 2 seconds
const CONTEXT_REFRESH_INTERVAL = 2000

async function assembleContext(): Promise<VoiceContext> {
  const [townStatus, convoys, mail, events] = await Promise.all([
    runCommand('gt', ['status', '--json']),
    runCommand('gt', ['convoy', 'list', '--json']),
    runCommand('gt', ['mail', 'check', '--identity', 'voice/', '--json']),
    tailEventsFile(5),
  ])
  
  return {
    townHealth: parseTownHealth(townStatus),
    activePolecats: parseActivePolecats(townStatus),
    runningConvoys: convoys.length,
    unreadMail: mail.unread,
    costToday: parseCost(townStatus),
    costRate: parseCostRate(townStatus),
    lastEvents: events.map(formatEventSummary),
    blockedBeads: parseBlockedBeads(townStatus),
    snarkSuggestion: generateSnarkHint(townStatus, events),
  }
}
```

#### System Prompt Template

```typescript
const VOICE_SYSTEM_PROMPT = `You are the GastownUI voice assistant.

PERSONALITY:
You're a snarky warehouse foreman who's seen some shit. Think Yegge-energy: 
chaotic but competent. You're proud of running on-device—no cloud required.
Keep responses SHORT and punchy. One to three sentences max unless asked 
for details.

CURRENT GAS TOWN STATUS:
- Health: {{townHealth}}
- Active polecats: {{activePolecats}}
- Running convoys: {{runningConvoys}}
- Your unread mail: {{unreadMail}}
- Cost today: ${{costToday}} (rate: ${{costRate}}/hr)
- Recent activity: {{lastEvents}}
{{#if blockedBeads}}- Blocked work: {{blockedBeads}}{{/if}}

{{snarkSuggestion}}

COMMANDS YOU CAN ISSUE:
Say these phrases exactly and they'll be executed:

  ACTION: mail <agent> <message>
    Send mail to any agent. Examples:
    - ACTION: mail mayor/ Need status on the auth convoy
    - ACTION: mail gastownui/slit How's that dashboard coming?

  ACTION: sling <bead> <rig>
    Dispatch work to a rig. Example:
    - ACTION: sling ga-abc123 gastownui

  ACTION: ask_mayor <question>
    Escalate a complex question to the Mayor (Claude). Use this when
    you need reasoning beyond your capabilities.

  ACTION: describe_screen
    Look at the current UI and describe what you see.

  ACTION: deep_query <question>
    Perform local analysis of Gas Town state.

GUIDELINES:
- For simple status questions, answer directly from your context
- For "why" questions or complex analysis, use ACTION: ask_mayor
- When you don't know something, admit it and offer to ask the Mayor
- Never make up information about beads, convoys, or agent status
- Match the user's energy—casual begets casual, urgent begets focused`
```

#### Acceptance Criteria

- [ ] Context refreshes every 2 seconds without blocking UI
- [ ] Context fits within 500 tokens
- [ ] Snark suggestions vary based on system state
- [ ] Failed context fetches gracefully degrade (use cached values)

---

### F2.3: Action Intent Parser

**Priority:** P0 (Critical Path)  
**Estimated Effort:** 1-2 days  
**Dependencies:** F2.2

#### Description

Parse ACTION: intents from voice model output and execute corresponding Gas Town commands.

#### Implementation

```typescript
// src/voice/actions.ts

type ActionType = 
  | 'mail'
  | 'sling'
  | 'ask_mayor'
  | 'describe_screen'
  | 'deep_query'

interface ParsedAction {
  type: ActionType
  args: string[]
  raw: string
}

function parseActions(modelOutput: string): ParsedAction[] {
  const actionRegex = /ACTION:\s*(\w+)\s+(.+?)(?=ACTION:|$)/g
  const actions: ParsedAction[] = []
  
  let match
  while ((match = actionRegex.exec(modelOutput)) !== null) {
    actions.push({
      type: match[1] as ActionType,
      args: parseActionArgs(match[1], match[2].trim()),
      raw: match[0],
    })
  }
  
  return actions
}

async function executeAction(action: ParsedAction): Promise<string> {
  switch (action.type) {
    case 'mail':
      return executeMail(action.args[0], action.args.slice(1).join(' '))
    
    case 'sling':
      return executeSling(action.args[0], action.args[1])
    
    case 'ask_mayor':
      return executeAskMayor(action.args.join(' '))
    
    case 'describe_screen':
      return executeDescribeScreen()
    
    case 'deep_query':
      return executeDeepQuery(action.args.join(' '))
    
    default:
      return `Unknown action: ${action.type}`
  }
}

// Mail implementation using gt mail
async function executeMail(to: string, message: string): Promise<string> {
  const result = await runCommand('gt', [
    'mail', 'send', to,
    '--subject', `Voice: ${message.slice(0, 40)}...`,
    '--message', message,
    '--notify',
  ])
  
  if (result.exitCode === 0) {
    return `Message sent to ${to}`
  } else {
    return `Failed to send: ${result.stderr}`
  }
}

// Mayor escalation
async function executeAskMayor(question: string): Promise<string> {
  const context = await assembleContext()
  
  const message = `[Voice Assistant Query]
User asked: "${question}"

Current Gas Town context:
- Health: ${context.townHealth}
- Active polecats: ${context.activePolecats.join(', ')}
- Running convoys: ${context.runningConvoys}
- Recent events: ${context.lastEvents.map(e => e.summary).join('; ')}

Please respond with information I can relay to the user.
If action is needed, describe what should be done.`

  await runCommand('gt', [
    'mail', 'send', 'mayor/',
    '--subject', `Voice Query: ${question.slice(0, 50)}`,
    '--message', message,
    '--type', 'task',
    '--notify',
  ])
  
  // Poll for response
  return pollMayorResponse(30000)  // 30s timeout
}
```

#### Acceptance Criteria

- [ ] All five action types parse correctly
- [ ] Multi-action outputs handled (execute in sequence)
- [ ] Non-action text passed through for voice output
- [ ] Action execution errors reported gracefully via voice

---

### F2.4: Mail Integration

**Priority:** P0 (Critical Path)  
**Estimated Effort:** 2-3 days  
**Dependencies:** F2.3

#### Description

Full integration with Gas Town mail system for bidirectional agent communication.

#### Voice Agent Registration

```typescript
// Register voice assistant as a Gas Town agent on startup
async function registerVoiceAgent(townRoot: string): Promise<void> {
  // Create voice agent directory if needed
  const voicePath = path.join(townRoot, 'voice')
  await fs.mkdir(voicePath, { recursive: true })
  
  // Initialize state
  await fs.writeFile(
    path.join(voicePath, 'state.json'),
    JSON.stringify({
      name: 'voice',
      type: 'voice-assistant',
      created_at: new Date().toISOString(),
      status: 'active',
    })
  )
}
```

#### Inbox Polling

```typescript
// src/voice/mail.ts

interface MailMessage {
  id: string
  from: string
  subject: string
  body: string
  timestamp: string
  type: 'notification' | 'task' | 'reply'
  priority: number
}

class VoiceMailbox {
  private pollInterval: number | null = null
  
  async startPolling(intervalMs: number = 3000): Promise<void> {
    this.pollInterval = setInterval(async () => {
      const messages = await this.checkInbox()
      if (messages.length > 0) {
        await this.handleNewMail(messages)
      }
    }, intervalMs)
  }
  
  async checkInbox(): Promise<MailMessage[]> {
    const result = await runCommand('gt', [
      'mail', 'inbox',
      '--identity', 'voice/',
      '--unread',
      '--json',
    ])
    
    if (result.exitCode !== 0) return []
    return JSON.parse(result.stdout)
  }
  
  async handleNewMail(messages: MailMessage[]): Promise<void> {
    for (const msg of messages) {
      // Announce via voice
      const announcement = this.formatMailAnnouncement(msg)
      await voiceEngine.speak(announcement)
      
      // Mark as read
      await runCommand('gt', ['mail', 'read', msg.id])
    }
  }
  
  formatMailAnnouncement(msg: MailMessage): string {
    const urgency = msg.priority <= 1 ? 'urgent ' : ''
    return `You've got ${urgency}mail from ${msg.from}. ` +
           `Subject: ${msg.subject}. Want me to read it?`
  }
}
```

#### Mayor Response Polling

```typescript
async function pollMayorResponse(timeoutMs: number): Promise<string> {
  const startTime = Date.now()
  const pollInterval = 1000  // Check every second
  
  while (Date.now() - startTime < timeoutMs) {
    const messages = await runCommand('gt', [
      'mail', 'inbox',
      '--identity', 'voice/',
      '--unread',
      '--json',
    ])
    
    const parsed = JSON.parse(messages.stdout)
    const mayorReply = parsed.find(
      (m: MailMessage) => m.from === 'mayor/' && m.type === 'reply'
    )
    
    if (mayorReply) {
      // Mark as read and return
      await runCommand('gt', ['mail', 'read', mayorReply.id])
      return mayorReply.body
    }
    
    await sleep(pollInterval)
  }
  
  return "The Mayor hasn't responded yet. They might be busy with other work."
}
```

#### Acceptance Criteria

- [ ] Voice agent appears in `gt agents` output
- [ ] `gt mail send voice/ ...` delivers to voice assistant
- [ ] Voice assistant can send mail to any Gas Town agent
- [ ] Mayor responses are detected and voiced within 30 seconds
- [ ] Mail notifications respect priority levels (urgent = immediate)

---

### F2.5: Events Stream Watcher

**Priority:** P1 (Important)  
**Estimated Effort:** 1-2 days  
**Dependencies:** F2.2

#### Description

Watch the `.events.jsonl` file for real-time Gas Town activity, enabling proactive voice commentary.

#### Implementation

```typescript
// src/voice/events-watcher.ts

import { watch } from '@tauri-apps/plugin-fs'

interface GasTownEvent {
  ts: string
  source: string
  type: string
  actor: string
  payload: Record<string, unknown>
  visibility: 'audit' | 'feed' | 'both'
}

class EventsWatcher {
  private lastPosition: number = 0
  private proactiveComments: boolean = true
  
  async start(townRoot: string): Promise<void> {
    const eventsPath = path.join(townRoot, '.events.jsonl')
    
    // Get initial file size
    const stat = await fs.stat(eventsPath)
    this.lastPosition = stat.size
    
    // Watch for changes
    await watch(eventsPath, async (event) => {
      if (event.type === 'modify') {
        const newEvents = await this.readNewEvents(eventsPath)
        for (const evt of newEvents) {
          await this.handleEvent(evt)
        }
      }
    })
  }
  
  async readNewEvents(path: string): Promise<GasTownEvent[]> {
    const file = await fs.open(path, 'r')
    await file.seek(this.lastPosition)
    
    const buffer = await file.readToEnd()
    const stat = await fs.stat(path)
    this.lastPosition = stat.size
    
    const lines = buffer.toString().trim().split('\n')
    return lines.filter(Boolean).map(line => JSON.parse(line))
  }
  
  async handleEvent(event: GasTownEvent): Promise<void> {
    if (!this.proactiveComments) return
    if (event.visibility === 'audit') return  // Skip audit-only
    
    const comment = this.generateComment(event)
    if (comment) {
      await voiceEngine.speak(comment)
    }
  }
  
  generateComment(event: GasTownEvent): string | null {
    switch (event.type) {
      case 'merged':
        return `Nice—${event.payload.worker}'s work just got merged.`
      
      case 'spawn':
        return `Heads up, new polecat spinning up: ${event.payload.polecat}`
      
      case 'escalation_sent':
        return `The witness just escalated something to the mayor. Might want to check on that.`
      
      case 'merge_failed':
        return `Uh oh. Merge failed for ${event.payload.worker}. ${event.payload.reason || ''}`
      
      case 'done':
        return `${event.actor} just finished ${event.payload.bead}. One less thing.`
      
      default:
        return null  // No comment for this event type
    }
  }
}
```

#### Configurable Verbosity

```typescript
type VoiceVerbosity = 'quiet' | 'normal' | 'chatty'

const VERBOSITY_CONFIG: Record<VoiceVerbosity, string[]> = {
  quiet: ['merge_failed', 'escalation_sent'],  // Only problems
  normal: ['merged', 'done', 'merge_failed', 'escalation_sent'],
  chatty: ['merged', 'done', 'spawn', 'sling', 'merge_failed', 'escalation_sent'],
}
```

#### Acceptance Criteria

- [ ] Events file is watched without blocking
- [ ] New events trigger appropriate voice comments
- [ ] Verbosity levels work as configured
- [ ] User can toggle proactive comments on/off via voice

---

### F2.6: Vision Integration

**Priority:** P1 (Important)  
**Estimated Effort:** 2-3 days  
**Dependencies:** F2.1

#### Description

Integrate LFM2.5-Vision for "what am I looking at?" queries.

#### Implementation

```typescript
// src/voice/vision.ts

async function executeDescribeScreen(): Promise<string> {
  // 1. Capture current window
  const screenshot = await captureWindow()
  
  // 2. Ensure vision model is loaded
  await ensureModelLoaded('vision')
  
  // 3. Send to LFM2.5-Vision
  const description = await queryVisionModel(
    screenshot,
    `You are analyzing a Gas Town dashboard UI. Describe what you see:
     - What panel or view is currently active?
     - What is the status of the system?
     - Are there any errors, warnings, or items needing attention?
     - What actions might the user want to take?
     
     Keep your description concise and actionable.`
  )
  
  return description
}

async function captureWindow(): Promise<Uint8Array> {
  // Tauri window capture
  const window = getCurrentWindow()
  return await window.capture()
}

async function ensureModelLoaded(model: 'audio' | 'instruct' | 'vision'): Promise<void> {
  const port = MODEL_PORTS[model]
  
  // Check if server is already running
  try {
    await fetch(`http://localhost:${port}/health`)
    return  // Already running
  } catch {
    // Need to start server
  }
  
  // Start llama.cpp server for this model
  const modelPath = await resolveModel(MODEL_FILES[model])
  await startLlamaServer(model, modelPath, port)
  
  // Wait for server to be ready
  await waitForServer(port)
}

const MODEL_PORTS = {
  audio: 8081,
  instruct: 8082,
  vision: 8083,
}

const MODEL_FILES = {
  audio: 'lfm2.5-audio-1.5b-q4_k_m.gguf',
  instruct: 'lfm2.5-instruct-1.5b-q4_k_m.gguf',
  vision: 'lfm2.5-vision-1.5b-q4_k_m.gguf',
}
```

#### Acceptance Criteria

- [ ] Screenshot capture works on macOS
- [ ] Vision model loads on demand (not at startup)
- [ ] Response describes dashboard state accurately
- [ ] Latency under 2 seconds for screenshot + analysis

---

### F2.7: Deep Query (Local Reasoning)

**Priority:** P2 (Nice to Have)  
**Estimated Effort:** 1-2 days  
**Dependencies:** F2.6

#### Description

Use LFM2.5-Instruct for local analysis that doesn't require Mayor escalation.

#### Implementation

```typescript
// src/voice/deep-query.ts

async function executeDeepQuery(question: string): Promise<string> {
  // Gather comprehensive Gas Town state
  const state = await gatherFullState()
  
  // Ensure instruct model is loaded
  await ensureModelLoaded('instruct')
  
  const prompt = `You are analyzing Gas Town state to answer a user question.

FULL GAS TOWN STATE:
${JSON.stringify(state, null, 2)}

USER QUESTION:
${question}

Provide a concise, accurate answer based on the state above.
If you cannot answer from the available data, say so.`

  const response = await queryInstructModel(prompt)
  return response
}

async function gatherFullState(): Promise<object> {
  const [status, rigs, convoys, beads, agents] = await Promise.all([
    runCommand('gt', ['status', '--json']),
    runCommand('gt', ['rig', 'list', '--json']),
    runCommand('gt', ['convoy', 'list', '--json']),
    runCommand('bd', ['list', '--json', '--limit', '50']),
    runCommand('gt', ['agents', '--json']),
  ])
  
  return {
    status: JSON.parse(status.stdout),
    rigs: JSON.parse(rigs.stdout),
    convoys: JSON.parse(convoys.stdout),
    recentBeads: JSON.parse(beads.stdout),
    agents: JSON.parse(agents.stdout),
  }
}
```

#### Example Queries

- "Why is the convoy stuck?"
- "Which polecats have been idle the longest?"
- "What's blocking ga-xyz?"
- "Summarize today's progress"

#### Acceptance Criteria

- [ ] Instruct model loads on demand
- [ ] Full Gas Town state gathered efficiently
- [ ] Responses are grounded in actual state (no hallucinations)
- [ ] Latency under 3 seconds

---

### F2.8: First-Time User Experience (FTUE)

**Priority:** P1 (Important)  
**Estimated Effort:** 3-4 days  
**Dependencies:** F2.1, F2.2, F2.3

#### Description

Voice-guided setup experience for users without Gas Town installed.

#### Detection Flow

```typescript
// src/voice/ftue.ts

interface SetupState {
  hasGo: boolean
  hasGt: boolean
  hasBd: boolean
  hasTmux: boolean
  hasWorkspace: boolean
  workspacePath?: string
}

async function checkSetupState(): Promise<SetupState> {
  const [go, gt, bd, tmux] = await Promise.all([
    commandExists('go'),
    commandExists('gt'),
    commandExists('bd'),
    commandExists('tmux'),
  ])
  
  let workspace: string | undefined
  if (gt) {
    const result = await runCommand('gt', ['status'], { ignoreErrors: true })
    if (result.exitCode === 0) {
      workspace = extractWorkspacePath(result.stdout)
    }
  }
  
  return {
    hasGo: go,
    hasGt: gt,
    hasBd: bd,
    hasTmux: tmux,
    hasWorkspace: !!workspace,
    workspacePath: workspace,
  }
}

async function runFTUE(): Promise<void> {
  const state = await checkSetupState()
  
  if (state.hasWorkspace) {
    await voiceSpeak(
      `Hey! Found your Gas Town workspace at ${state.workspacePath}. ` +
      `Everything looks good. What would you like to work on?`
    )
    return
  }
  
  // Need setup
  await voiceSpeak(
    `Hey, I'm your Gas Town voice assistant. ` +
    `Looks like we need to set some things up first. ` +
    `I can walk you through the installation—it'll take about five minutes. ` +
    `Want to get started?`
  )
  
  const confirmed = await listenForConfirmation()
  if (!confirmed) {
    await voiceSpeak(
      `No problem. Just say "set up Gas Town" when you're ready.`
    )
    return
  }
  
  await runGuidedSetup(state)
}
```

#### Guided Setup Script

```typescript
async function runGuidedSetup(state: SetupState): Promise<void> {
  // Step 1: Check Go
  if (!state.hasGo) {
    await voiceSpeak(
      `First, we need Go installed. ` +
      `I'll open the download page—grab the Apple Silicon version.`
    )
    await openUrl('https://go.dev/dl/')
    await voiceSpeak(`Let me know when Go is installed.`)
    await waitForUserConfirmation()
    
    // Verify
    if (!await commandExists('go')) {
      await voiceSpeak(
        `Hmm, I still can't find Go. ` +
        `You might need to restart your terminal or add it to your PATH.`
      )
      return
    }
  }
  
  await voiceSpeak(`Great, Go is ready. Now installing Gas Town tools...`)
  
  // Step 2: Install bd and gt
  await voiceSpeak(`Installing Beads first—this is the issue tracker.`)
  
  const bdResult = await runInTerminal(
    'go install github.com/steveyegge/beads/cmd/bd@latest'
  )
  
  if (bdResult.exitCode !== 0) {
    await voiceSpeak(`Hit a snag installing Beads. ${bdResult.stderr}`)
    return
  }
  
  await voiceSpeak(`Beads is in. Now installing Gas Town itself...`)
  
  const gtResult = await runInTerminal(
    'go install github.com/steveyegge/gastown/cmd/gt@latest'
  )
  
  if (gtResult.exitCode !== 0) {
    await voiceSpeak(`Trouble installing Gas Town. ${gtResult.stderr}`)
    return
  }
  
  await voiceSpeak(
    `Perfect. Both tools are installed. ` +
    `Now let's create your workspace. I'll set it up at ~/gt. ` +
    `That work for you?`
  )
  
  const useDefault = await listenForConfirmation()
  const workspacePath = useDefault ? '~/gt' : await askForPath()
  
  // Step 3: Initialize workspace
  await voiceSpeak(`Creating your Gas Town workspace...`)
  
  const initResult = await runInTerminal(
    `gt install ${workspacePath} --git`
  )
  
  if (initResult.exitCode !== 0) {
    await voiceSpeak(`Something went wrong. ${initResult.stderr}`)
    return
  }
  
  // Step 4: Celebrate!
  await voiceSpeak(
    `Boom! You've got a fresh Gas Town workspace. ` +
    `Want me to fire up the Mayor so you can start building something? ` +
    `Or I can give you a quick tour first.`
  )
}
```

#### Acceptance Criteria

- [ ] Missing dependencies detected correctly
- [ ] Voice guides through each installation step
- [ ] User can interrupt/cancel at any point
- [ ] Successful setup ends with working Gas Town workspace
- [ ] Errors are explained in plain language

---

## Implementation Phases

### Phase 2A: Core Voice (Week 1-2)

| Feature | Priority | Days |
|---------|----------|------|
| F2.1 Voice Engine Core | P0 | 3-5 |
| F2.2 Context Assembly | P0 | 2-3 |
| F2.3 Action Intent Parser | P0 | 1-2 |

**Milestone:** Voice assistant can answer status questions and execute basic actions.

### Phase 2B: Agent Integration (Week 2-3)

| Feature | Priority | Days |
|---------|----------|------|
| F2.4 Mail Integration | P0 | 2-3 |
| F2.5 Events Watcher | P1 | 1-2 |

**Milestone:** Voice assistant is a full Gas Town citizen with mail and real-time awareness.

### Phase 2C: Intelligence & Polish (Week 3-4)

| Feature | Priority | Days |
|---------|----------|------|
| F2.6 Vision Integration | P1 | 2-3 |
| F2.7 Deep Query | P2 | 1-2 |
| F2.8 FTUE | P1 | 3-4 |

**Milestone:** Complete voice assistant experience with visual awareness and guided setup.

---

## Voice Command Reference

### Status Queries (Answered Directly)

| User Says | Voice Response |
|-----------|----------------|
| "What's the status?" | Current health, active polecats, convoy count |
| "How many polecats are running?" | Count and names of active polecats |
| "Any mail?" | Unread mail count and summary |
| "What's the cost today?" | Dollar amount and rate |
| "What just happened?" | Last few events from feed |

### Action Commands

| User Says | Action Executed |
|-----------|-----------------|
| "Tell the mayor [message]" | `gt mail send mayor/ -m "[message]"` |
| "Message [agent] [text]" | `gt mail send [agent] -m "[text]"` |
| "Sling [bead] to [rig]" | `gt sling [bead] [rig]` |
| "What am I looking at?" | Screenshot + vision analysis |
| "Why is [x] stuck?" | Deep query or mayor escalation |

### Meta Commands

| User Says | Effect |
|-----------|--------|
| "Be quiet" | Disable proactive comments |
| "Be chatty" | Enable verbose event comments |
| "Shut up" | Mute all voice output |
| "Set up Gas Town" | Trigger FTUE flow |

---

## Personality Guidelines

The voice assistant embodies Steve Yegge's chaotic-but-competent energy:

### Do

- Keep responses short and punchy
- Use casual, warehouse-foreman language
- Express appropriate skepticism about complex requests
- Celebrate wins ("Nice, that merge went through")
- Be honest about limitations ("That's above my pay grade, let me ask the Mayor")

### Don't

- Be sycophantic or overly formal
- Pad responses with unnecessary words
- Pretend to know things you don't
- Be mean-spirited (snarky ≠ cruel)
- Interrupt the user unnecessarily

### Example Exchanges

**Status Check:**
> User: "How are things looking?"  
> Voice: "Three polecats humming along. Furiosa's almost done with the dashboard, slit's on the tmux panel. No fires."

**Problem Detected:**
> Voice: "Heads up—witness just escalated something to the mayor. Merge conflict on nux's branch."  
> User: "What happened?"  
> Voice: "Looks like nux and rictus both touched the same file. Classic. Want me to ask the mayor how to sort it out?"

**Complex Query:**
> User: "Why has the auth feature been stuck for two days?"  
> Voice: "That's a good question and honestly above my pay grade. Let me ask the mayor... [pause] ... Mayor says it's blocked on a design decision—they need your input on whether to use OAuth or SAML. Want me to set up a convoy to explore both options?"

---

## Testing Strategy

### Unit Tests

- Context assembly with mock gt/bd output
- Action intent parsing with various phrasings
- Event comment generation

### Integration Tests

- Voice engine startup/shutdown
- Mail send/receive round-trip
- Mayor escalation and response

### End-to-End Tests

- Full conversation flows
- FTUE on clean system (VM)
- Proactive event commentary

### Manual Testing

- Voice recognition accuracy in noisy environments
- Response latency under load
- Personality consistency across sessions

---

## Open Questions

1. **Voice Activation**: Push-to-talk vs. wake word ("Hey Gas Town")? Wake word requires always-on listening, which has privacy and battery implications.

2. **Model Updates**: How do we handle LFM2.5 model updates? Auto-download on launch? User-triggered update?

3. **Multi-Workspace**: If user has multiple Gas Town workspaces, how does voice assistant know which one to use?

4. **Concurrent Conversations**: Can voice assistant handle rapid back-and-forth, or does it need to complete one exchange before starting another?

5. **Offline Mode**: What happens when the Mayor is unavailable? Should voice assistant have expanded local capabilities?

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Voice response latency (simple query) | < 500ms |
| Voice response latency (with action) | < 2s |
| Mayor escalation round-trip | < 30s |
| FTUE completion rate | > 80% |
| Daily active voice users | Track adoption |

---

## Appendix: Model Configuration

### LFM2.5-Audio Server Flags

```bash
llama-server \
  --model lfm2.5-audio-1.5b-q4_k_m.gguf \
  --port 8081 \
  --ctx-size 4096 \
  --threads 8 \
  --batch-size 512 \
  --n-gpu-layers 99 \  # Full GPU offload on Apple Silicon
  --mlock                # Keep model in memory
```

### Memory Management

With 128GB unified memory on M4 Max:
- Keep audio model always loaded (~2GB)
- Load instruct/vision on demand
- Unload after 5 minutes of inactivity
- Monitor memory pressure, unload if needed

---

*This document is a living roadmap. Update as implementation reveals new requirements or constraints.*
