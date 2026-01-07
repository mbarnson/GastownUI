# GastownUI Product Requirements Document

**Project:** GastownUI  
**Version:** 1.0  
**Date:** January 7, 2026  
**Author:** Cosmo (Overseer)

---

## Executive Summary

GastownUI is a cross-platform, voice-first graphical interface for Steve Yegge's Gas Town agent orchestration system. It channels Gas Town's chaotic, high-throughput energy into an inspectable, controllable visual experience while maintaining full compatibility with the underlying tmux-based workflow.

The UI is built to bootstrap itself using Gas Town, creating a self-improving system that can literally rebuild its own interface through the agents it controls.

### Key Differentiators

1. **Voice-First with Local LFM2.5**: Snarky personality powered by Liquid AI's LFM2.5-Audio-1.5B running locally on Apple Silicon - no separate STT/TTS needed
2. **Truly Cross-Platform**: macOS, iOS, iPadOS, VisionOS, Windows, Linux, Android + web via Tauri 2.0 + TanStack
3. **Self-Building**: Gas Town agents build and improve GastownUI through Gas Town
4. **Self-Testing**: LFM2.5 voice models test themselves through voice-to-voice conversation
5. **Tmux-Transparent**: Full visibility into underlying tmux sessions; users can always drop to CLI

---

## Technical Architecture

### Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GastownUI Application                      │
├─────────────────────────────────────────────────────────────┤
│  Voice Interface          │     Visual Interface              │
│  ┌─────────────────────┐  │  ┌─────────────────────────────┐ │
│  │ LFM2.5-Audio-1.5B   │  │  │ TanStack Start + Router     │ │
│  │ (llama.cpp / GGUF)  │  │  │ TanStack Query + Table      │ │
│  │ Local, 4-bit quant  │  │  │ TanStack Virtual + Form     │ │
│  └─────────────────────┘  │  └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                     Tauri 2.0 Shell                           │
│  • Rust backend for system integration                        │
│  • Native capabilities (audio, filesystem, shell)             │
│  • Cross-platform: macOS/iOS/iPadOS/VisionOS/Win/Linux/Android│
├─────────────────────────────────────────────────────────────┤
│                     Gas Town Core                             │
│  • gt CLI commands via Tauri shell plugin                     │
│  • Beads database via JSON/JSONL parsing                      │
│  • tmux session management + monitoring                       │
└─────────────────────────────────────────────────────────────┘
```

### Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Frontend Framework** | TanStack Start (React) | Full-stack, type-safe, modern React patterns |
| **Routing** | TanStack Router | Type-safe routing with search params as state |
| **Data Fetching** | TanStack Query | Server state management, caching, real-time updates |
| **Tables/Lists** | TanStack Table + Virtual | Efficient rendering of convoy/bead lists |
| **Forms** | TanStack Form | Agent configuration, sling parameters |
| **Native Shell** | Tauri 2.0 | Cross-platform with mobile support, small binaries |
| **Voice Model** | LFM2.5-Audio-1.5B-GGUF | Native voice-to-voice, runs locally on M4 Max |
| **Voice Runtime** | llama.cpp (via Tauri Rust) | Efficient GGUF inference on Apple Silicon |

### Voice Architecture

**CRITICAL CONSTRAINT**: Use ONLY LFM2.5 for all voice interactions. No separate STT, TTS, or language models.

```
User Voice ──▶ LFM2.5-Audio ──▶ Audio Response
              (voice-to-voice,
               text-to-voice,
               voice-to-text)
```

The LFM2.5-Audio model handles:
- Speech recognition (voice input)
- Natural language understanding
- Response generation
- Speech synthesis (voice output)

This unified approach means the snarky personality is baked into one model, not stitched together from parts.

---

## Features

### Phase 1: Core UI (MVP)

#### 1.1 Dashboard View

**The Refinery Floor** - Real-time overview of Gas Town activity:

- **Town Status**: Health indicator, active rigs count, running agents
- **Convoy Dashboard**: Active convoys with progress bars and status
- **Activity Feed**: Live stream of bead state changes, merges, completions
- **Cost Tracker**: Running token/dollar burn rate (if available from Claude Code)

```
┌─────────────────────────────────────────────────────────────┐
│ 🏭 GAS TOWN                          💰 $47.23/hr  🔥 Active │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CONVOYS IN FLIGHT                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🚚 "Voice Integration" ██████████░░░░░░░░ 62%       │   │
│  │    gt-a7je4, gt-b2kf5, gt-c9mw2                     │   │
│  │    ETA: ~45 min  |  3 polecats active               │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🚚 "Tmux Panel Redesign" ██████████████████░░ 89%   │   │
│  │    bd-x4rt7                                          │   │
│  │    Pending merge  |  Refinery processing            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ACTIVITY FEED                              [Voice: 🎤 ON]  │
│  ────────────────────────────────────────────────────────  │
│  14:23:05  Polecat Toast claimed gt-a7je4                  │
│  14:22:51  Convoy "Voice Integration" spawned 3 polecats   │
│  14:22:34  Refinery merged bd-x4rt7 to main                │
│  14:21:12  Witness nudged stuck polecat Waffles            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 1.2 Rig View

Per-rig detailed view showing:

- **Merge Queue**: Current MQ state with draggable reordering
- **Polecats Panel**: Active polecats with their assignments
- **Crew Panel**: Named crew members with status
- **Beads Browser**: Filterable list of rig beads (ready, in_progress, blocked)

#### 1.3 Tmux Integration Panel

**The Window into Chaos** - See what the agents actually see:

- Embedded terminal views showing actual tmux panes
- Click to attach to any session
- Copy connection string for native terminal access
- Session health indicators (responding, stuck, cycling)

```
┌─────────────────────────────────────────────────────────────┐
│ TMUX SESSIONS                                    [⌘T to jump]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📍 gastown/polecats/Toast                    🟢 Active      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Implementing voice capture hook...                      │ │
│  │ > git add src/voice/capture.rs                         │ │
│  │ > gt mol step done implement                           │ │
│  │ ◼ (awaiting input)                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│  [Attach] [Copy: tmux attach -t gastown-toast]              │
│                                                              │
│  📍 gastown/refinery                          🟡 Processing  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Merging gt-a7je4...                                    │ │
│  │ Resolving conflicts in src/main.rs                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 1.4 Voice Command Interface

**Snarky Local Assistant** powered by LFM2.5-Audio:

- Push-to-talk activation (spacebar or click)
- Always-listening mode (optional, with wake word)
- Voice commands routed to appropriate gt/bd commands
- Personality: Sarcastic, helpful, channeling Gas Town chaos

Example interactions:
- "Hey, what's Toast working on?" → Queries polecat status, responds with voice
- "Sling that bug fix to gastown" → `gt sling <bead> gastown`
- "How much have I burned today?" → Cost summary with commentary
- "What's blocking the convoy?" → Dependency analysis

### Phase 2: Advanced Features

#### 2.1 Voice-to-Voice Self-Testing

Two LFM2.5 instances test the UI through conversation:

```
┌─────────────────────────────────────────────────────────────┐
│ VOICE SELF-TEST MODE                           [🔴 Recording]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tester LFM: "Show me the gastown rig"                      │
│  UI Response: [navigates to rig view]                        │
│  Verifier LFM: "I see the rig view loaded with 3 polecats.  │
│                 Test passed."                                │
│                                                              │
│  Tester LFM: "What's the merge queue status?"               │
│  UI Response: [displays MQ panel]                            │
│  Verifier LFM: "Merge queue shows 2 pending items.          │
│                 Test passed."                                │
│                                                              │
│  Tests: 47/52 passed | Duration: 3m 42s                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2 Molecule Visualizer

Interactive DAG visualization of workflow molecules:

- Zoomable/pannable molecule graph
- Step status coloring (pending, active, complete, failed)
- Click-to-inspect step details
- Real-time progress animation

#### 2.3 Design Mode

Visual formula/molecule editor:

- Drag-and-drop step creation
- Dependency wire drawing
- Variable binding UI
- Export to TOML formula

### Phase 3: Platform Expansion

#### 3.1 Mobile Companions (iOS/Android)

- Notification hub for convoy completions
- Voice-only interaction mode
- Approve/reject escalations on the go
- Cost alerts

#### 3.2 VisionOS Experience

- Spatial tmux windows floating in space
- Glanceable convoy status
- Voice-first primary interaction

---

## Gas Town Integration

### Bootstrap Strategy

GastownUI will be built using Gas Town itself. This creates a virtuous cycle where improvements to Gas Town improve the ability to improve GastownUI.

#### Initial Bootstrap Commands

```bash
# Install Gas Town if not present
npm install -g @anthropic/gastown

# Create GastownUI rig under existing town
cd ~/gt
gt rig add gastownui git@github.com:txgsync/gastownui.git

# Configure beads prefix
# (in gastownui/config.json)
{
  "type": "rig",
  "name": "gastownui",
  "beads": { "prefix": "gui" }
}

# Create initial convoy for Phase 1 MVP
gt convoy create "Phase 1: Core UI MVP" \
  --notify overseer

# Spawn design convoy for architecture
gt formula run design \
  --problem="GastownUI cross-platform architecture" \
  --scope=large
```

#### Self-Build Workflow

Once basic UI is functional:

1. File feature as bead: `bd create --prefix gui "Add molecule visualizer"`
2. Create convoy: `gt convoy create "Molecule Viz" gui-xxxxx`
3. Sling to polecats: `gt sling gui-xxxxx gastownui`
4. Watch progress in GastownUI itself
5. Voice: "Hey, how's the molecule visualizer coming?"

### Agent Persona Integration

Each Gas Town role gets a distinct voice persona when interacting through GastownUI:

| Role | Voice Persona |
|------|---------------|
| **Mayor** | Smooth, executive assistant energy |
| **Witness** | Nervous hall monitor, always watching |
| **Refinery** | Gruff factory foreman |
| **Deacon** | Ominous, speaks in measured tones |
| **Polecats** | Excitable, slightly unhinged (unique per polecat name) |
| **Crew** | Professional, matches user tone |

---

## Technical Implementation Details

### Tauri 2.0 Configuration

```rust
// src-tauri/src/main.rs
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())      // For gt/bd commands
        .plugin(tauri_plugin_fs::init())         // Beads file access
        .plugin(tauri_plugin_process::init())    // tmux management
        .invoke_handler(tauri::generate_handler![
            run_gt_command,
            read_beads_file,
            list_tmux_sessions,
            attach_tmux_session,
            start_voice_session,
            send_voice_input,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### LFM2.5 Integration

```rust
// src-tauri/src/voice.rs
use llama_cpp_rs::{LlamaModel, LlamaContext};

pub struct VoiceEngine {
    model: LlamaModel,
    context: LlamaContext,
}

impl VoiceEngine {
    pub fn new() -> Self {
        // Load 4-bit quantized model for speed
        let model = LlamaModel::load_from_file(
            "models/LFM2.5-Audio-1.5B-Q4_K_M.gguf",
            Default::default(),
        ).expect("Failed to load LFM2.5");
        
        Self {
            model,
            context: model.create_context(Default::default()),
        }
    }
    
    // Voice-to-voice: audio in, audio out
    pub async fn process_voice(&mut self, audio_input: &[f32]) -> Vec<f32> {
        // LFM2.5 handles full pipeline
        self.context.process_audio(audio_input)
    }
    
    // Voice-to-text for command parsing
    pub async fn transcribe(&mut self, audio_input: &[f32]) -> String {
        self.context.transcribe(audio_input)
    }
    
    // Text-to-voice for UI feedback
    pub async fn synthesize(&mut self, text: &str) -> Vec<f32> {
        self.context.synthesize(text)
    }
}
```

### TanStack Query Hooks for Gas Town

```typescript
// src/hooks/useGastown.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

// Real-time convoy status
export function useConvoys() {
  return useQuery({
    queryKey: ['convoys'],
    queryFn: () => invoke<Convoy[]>('run_gt_command', { 
      cmd: 'convoy', 
      args: ['list', '--json'] 
    }),
    refetchInterval: 2000, // Poll every 2s
  });
}

// Beads for a rig
export function useBeads(rig: string, status?: BeadStatus) {
  return useQuery({
    queryKey: ['beads', rig, status],
    queryFn: () => invoke<Bead[]>('run_gt_command', {
      cmd: 'bd',
      args: ['list', '--prefix', rig, '--json', ...(status ? ['--status', status] : [])],
    }),
    refetchInterval: 5000,
  });
}

// Sling work mutation
export function useSling() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ bead, rig }: { bead: string; rig: string }) =>
      invoke('run_gt_command', { cmd: 'gt', args: ['sling', bead, rig] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convoys'] });
      queryClient.invalidateQueries({ queryKey: ['beads'] });
    },
  });
}
```

### State Persistence for Save/Resume

```typescript
// src/stores/appState.ts
import { Store } from '@tauri-apps/plugin-store';

const store = new Store('gastownui-state.json');

export interface AppState {
  activeRig: string | null;
  voiceEnabled: boolean;
  expandedConvoys: string[];
  tmuxPanelVisible: boolean;
  lastViewedConvoy: string | null;
}

export async function saveState(state: AppState) {
  await store.set('appState', state);
  await store.save();
}

export async function loadState(): Promise<AppState | null> {
  return await store.get<AppState>('appState');
}
```

---

## Stop Work Protocol

GastownUI must gracefully handle shutdown without killing active Gas Town work.

### Clean Exit Sequence

1. **Save UI State**: Persist current view, expanded panels, voice settings
2. **Detach Voice Engine**: Stop LFM2.5 processing, release audio
3. **Notify User**: "Gas Town continues running. Attach to Mayor: `gt mayor attach`"
4. **Exit Without Kill**: Do NOT send `gt stop --all`

### Stop Work Command

For intentional work stoppage:

```typescript
// Emergency stop - exposed in UI and via voice
export async function stopAllWork() {
  const confirmed = await dialog.confirm(
    "This will stop ALL Gas Town agents. Convoys will be interrupted. Continue?",
    { title: "Stop All Work", kind: "warning" }
  );
  
  if (confirmed) {
    await invoke('run_gt_command', { cmd: 'gt', args: ['stop', '--all'] });
  }
}
```

Voice activation: "Hey, stop everything" or "Emergency stop"

---

## Development Workflow

### For Human Developers

```bash
# Clone and setup
git clone git@github.com:txgsync/gastownui.git
cd gastownui
npm install
cargo tauri dev  # Development mode with hot reload

# Add to Gas Town as a rig
cd ~/gt
gt rig add gastownui ~/devel/gastownui
```

### For Gas Town Agents (System Prompt Additions)

```markdown
## GastownUI Development Context

You are working on GastownUI, a cross-platform GUI for Gas Town.

**Tech Stack:**
- Frontend: TanStack Start + Router + Query + Table + Virtual + Form
- Native: Tauri 2.0 (Rust backend)
- Voice: LFM2.5-Audio-1.5B via llama.cpp (CRITICAL: no separate STT/TTS)
- Platforms: macOS, iOS, iPadOS, VisionOS, Windows, Linux, Android, Web

**Key Constraints:**
- Voice interactions MUST use LFM2.5 only - this is non-negotiable
- UI state must persist for save/resume across app restarts
- Never auto-kill Gas Town on app exit
- Always expose tmux session details for CLI escape hatch
- Channel chaotic energy - this should feel like Gas Town, not Enterprise™

**File Structure:**
```
gastownui/
├── src/                    # TanStack frontend
│   ├── routes/            # File-based routing
│   ├── components/        # React components
│   ├── hooks/             # TanStack Query hooks
│   └── stores/            # State management
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── main.rs       # Tauri entry
│   │   ├── voice.rs      # LFM2.5 integration
│   │   └── gastown.rs    # gt/bd command wrappers
│   └── Cargo.toml
├── models/                # LFM2.5 GGUF files
└── .beads/               # Rig beads database
```

**Voice Personality Guidelines:**
The LFM2.5 voice should be:
- Snarky but helpful (think JARVIS with attitude)
- Aware of Gas Town state and context
- Willing to editorialize on code quality
- Impatient with repeated questions
- Celebrates convoy completions
```

---

## Success Metrics

### Phase 1 (MVP)
- [ ] Dashboard shows real-time convoy status
- [ ] Can sling work via UI
- [ ] Tmux sessions visible and attachable
- [ ] Voice commands work for basic navigation
- [ ] Runs on macOS (development platform)

### Phase 2
- [ ] Voice-to-voice self-testing operational
- [ ] Molecule visualizer renders complex workflows
- [ ] Windows and Linux builds functional
- [ ] Voice personality distinct per role

### Phase 3
- [ ] iOS/Android companions in app stores
- [ ] VisionOS spatial experience
- [ ] GastownUI regularly improves itself via Gas Town

---

## Appendix A: Voice Command Reference

| Command Pattern | Action | gt/bd Equivalent |
|----------------|--------|------------------|
| "Show me [rig] rig" | Navigate to rig view | - |
| "What's [polecat] doing?" | Show polecat status | `gt peek [polecat]` |
| "Sling [bead] to [rig]" | Assign work | `gt sling [bead] [rig]` |
| "Create convoy [name]" | Start convoy | `gt convoy create "[name]"` |
| "What's blocking?" | Show blockers | `bd list --status=blocked` |
| "Stop [agent]" | Stop session | `gt stop [agent]` |
| "Emergency stop" | Kill all | `gt stop --all` |
| "How much today?" | Cost summary | `gt costs` |
| "Nudge [agent]" | Wake agent | `gt nudge [agent]` |

---

## Appendix B: Gas Town Formulas for GastownUI

### gastownui-feature.formula.toml

```toml
description = "Standard feature development workflow for GastownUI"
formula = "gastownui-feature"
type = "workflow"
version = 1

[[steps]]
id = "design"
title = "Design {{feature}}"
description = """
Design the feature for GastownUI.
Consider:
- How does this fit the chaotic aesthetic?
- What's the voice interaction angle?
- Cross-platform implications?
- tmux transparency requirements?
"""

[[steps]]
id = "implement"
title = "Implement {{feature}}"
needs = ["design"]
description = """
Implement the feature.
Tech stack: TanStack + Tauri + LFM2.5
Remember: Voice uses ONLY LFM2.5, no separate models.
"""

[[steps]]
id = "voice-test"
title = "Voice-test {{feature}}"
needs = ["implement"]
description = """
Test the feature via voice interaction.
Can you use this feature entirely through voice?
Does the snarky personality come through?
"""

[[steps]]
id = "review"
title = "Review {{feature}}"
needs = ["voice-test"]
description = "Code review with attention to cross-platform and voice concerns."

[[steps]]
id = "submit"
title = "Submit {{feature}}"
needs = ["review"]
description = "Submit for merge. Celebrate with appropriate snark."

[vars.feature]
description = "The feature being implemented"
required = true
```

---

## Appendix C: Platform Build Matrix

| Platform | Build Command | Notes |
|----------|---------------|-------|
| macOS (dev) | `cargo tauri dev` | Primary development |
| macOS (prod) | `cargo tauri build --target aarch64-apple-darwin` | M1+ |
| macOS (Intel) | `cargo tauri build --target x86_64-apple-darwin` | Legacy |
| iOS | `cargo tauri ios build` | Requires Xcode |
| Android | `cargo tauri android build` | Requires Android Studio |
| Windows | `cargo tauri build --target x86_64-pc-windows-msvc` | CI/CD only |
| Linux | `cargo tauri build --target x86_64-unknown-linux-gnu` | CI/CD only |

---

*"Welcome to Gas Town. It's loud, chaotic, and burns money like guzzoline. But damn if it doesn't get shit done."*
