# GastownUI

**The GUI that Gas Town built. Literally.**

---

## What Even Is This

You know how normal people build software? With sprints, and Jira tickets, and "stakeholder alignment meetings"?

Yeah, we don't do that here.

GastownUI is what happens when you let Claude Code rip farts in public. It's a cross-platform, voice-first dashboard for [Gas Town](https://steve-yegge.medium.com/welcome-to-gas-town-4f25ee16dd04) - Steve Yegge's unhinged experiment in autonomous agent orchestration. The kicker? **Gas Town agents built this UI themselves.** The polecats are inside the house. They're building the walls. It's polecats all the way down.

```
        🔥 Welcome to Gas Town 🔥
     It's loud, chaotic, and burns
      money like guzzoline.
```

## The Mad Max Aesthetic

Gas Town isn't just a name. It's a lifestyle.

| Term | What It Means |
|------|--------------|
| **Rig** | A project container. Your code lives here. |
| **Polecat** | Worker agent with its own git worktree. Named after the War Boys' pole-swinging lunatics. |
| **Witness** | Per-rig manager that watches polecats, nudges the stuck ones, handles cleanup. |
| **Refinery** | Merge queue processor. Takes polecat output, squashes, merges to main. |
| **Mayor** | Global coordinator. Dispatches work, handles cross-rig chaos. |
| **Beads** | Issue tracker. Like Jira, but it doesn't make you want to die. |
| **Convoy** | Batch work execution across multiple polecats. |
| **Molecule** | A workflow template. Steps to complete a task. |
| **Guzzoline** | API tokens. Burns fast. |

## The Propulsion Principle

> "If you find something on your hook, YOU RUN IT."

Gas Town is a steam engine. Agents are pistons. When you spawn a polecat with work hooked, it doesn't ask "should I start?" It **executes**. No confirmation dialogs. No "are you sure?" popups. The hook IS the assignment.

This isn't about being a good worker. This is physics. Steam engines don't run on politeness - they run on pistons firing.

```
Work hooked → Run it.
Hook empty → Check mail.
Nothing anywhere → Wait for user.
```

The Witness assumes you're running. If you stall, the whole rig stalls. If you're stuck, you get nudged. If you're cycling, you get recycled.

## Features

### Voice-First Interface

GastownUI ships with **LFM2.5-Audio** running locally on your machine. Not some cloud API. Not a stitched-together Whisper+GPT+ElevenLabs monstrosity. One model. Voice in, voice out.

And it has opinions.

```
You: "Hey, what's blocking the convoy?"
LFM: "Three polecats fighting over the same merge target.
      Again. Have you considered therapy for your agents?"
```

Push-to-talk. Always-listening mode (if you're brave). The personality is baked in - sarcastic, helpful, and acutely aware that managing autonomous agents is basically herding caffeinated cats.

### The Refinery Floor (Dashboard)

Real-time overview of your chaos:
- **Convoys in Flight** - Progress bars, ETAs, active polecats
- **Activity Feed** - Live stream of merges, claims, nudges, completions
- **Cost Tracker** - Watch your guzzoline burn ($47.23/hr and climbing)
- **Town Health** - Is everything on fire? (Usually yes)

### Rig View

Per-project deep dive:
- **Merge Queue** - Draggable reordering because sometimes priority changes
- **Polecats Panel** - Who's active, idle, or stuck
- **Beads Browser** - Filter by status, search, sling work to workers

### Tmux Integration

**The Window into Chaos**

Gas Town runs on tmux under the hood. GastownUI doesn't hide that - it embraces it. See actual terminal output from your agents. Click to attach. Copy connection strings. Watch polecats think in real-time.

```
📍 gastown/polecats/furiosa                 🟢 Active
┌──────────────────────────────────────────────────┐
│ Implementing voice capture hook...               │
│ > git add src/voice/capture.rs                   │
│ > gt mol step done implement                     │
│ ◼ (awaiting input)                              │
└──────────────────────────────────────────────────┘
[Attach] [Copy: tmux attach -t gastown-furiosa]
```

You can always escape to the CLI. GastownUI is a window, not a cage.

### Vision Integration

"What am I looking at?"

Screenshot capture + LFM2.5-Vision gives you natural language descriptions of the dashboard state. Useful for voice queries, accessibility, and debugging when you've been staring at terminals for six hours and can't remember what anything means.

## Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| **Frontend** | TanStack Start + Router + Query + Table | Type-safe, fast, modern React |
| **Native Shell** | Tauri 2.0 | Cross-platform (yes, even VisionOS), tiny binaries |
| **Voice** | LFM2.5-Audio-1.5B via llama.cpp | Local inference, no cloud dependency |
| **Vision** | LFM2.5-Vision | On-demand loading, < 2s latency |
| **Backend** | Rust | Because we're not animals |

### Platform Support

- macOS (primary development)
- Windows
- Linux
- iOS / iPadOS (companion apps)
- VisionOS (spatial tmux windows, because why not)
- Android
- Web (limited, no voice)

## Self-Building

Here's the unhinged part: **GastownUI is being built by Gas Town agents.**

The polecats writing this code are visible in the UI they're building. The dashboard shows convoys containing tasks to improve the dashboard. It's recursive. It's absurd. It works.

Every merge that lands was processed by the Refinery. Every task was tracked in Beads. Every polecat that contributed is listed in the git log. The agents have commit rights.

## Installation

```bash
# Clone the repo
git clone https://github.com/mbarnson/GastownUI.git
cd GastownUI

# Install dependencies
npm install

# Development (web only)
npm run dev

# Full native experience
npm run tauri:dev

# Build for production
npm run tauri:build
```

### Voice Model Setup

The voice assistant requires LFM2.5-Audio locally:

```bash
# Download the model (one-time)
# Models go to ~/.cache/huggingface/models/LFM2.5-Audio-1.5B-GGUF/
# See docs/VOICE_SETUP.md for details
```

## Philosophy

Gas Town was built on a few heretical beliefs:

1. **Agents should have agency.** Not "human in the loop for every comma." Real autonomy. Real consequences. Real recovery.

2. **Visibility beats control.** You can't micromanage 20 parallel workers. But you can watch them. Nudge the stuck ones. Trust the system.

3. **CLI is escape hatch, not jail.** GastownUI makes things visible. But `tmux attach` is always one click away.

4. **Snark is a feature.** If your AI assistant sounds like a corporate FAQ, you've failed. LFM2.5 has opinions. It judges your code. It celebrates your victories. It's a coworker, not a servant.

5. **Self-improvement is the endgame.** The system that builds itself gets better at building itself. That's the whole game.

## Contributing

Gas Town welcomes chaos. If you want to contribute:

1. Check `bd ready` for available work
2. Claim a bead: `bd update <id> --status=in_progress`
3. Do the work
4. Submit: `gt done`

Or just open an issue. The Mayor reads everything. Eventually.

## License

MIT. Build weird things.

---

*"We are not things. We are polecats."*

**GastownUI** - Built by the inmates. For the inmates.
