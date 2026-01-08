# GastownUI FTUE v2 PRD: Voice-Guided First-Time User Experience

**Project:** GastownUI  
**Feature:** First-Time User Experience (FTUE) v2  
**Version:** 2.0  
**Date:** January 8, 2026  
**Author:** Cosmo (Overseer) & Claude  
**Status:** Draft  
**Supersedes:** FTUE.md (v1)

---

## Executive Summary

This PRD defines the complete voice-guided first-time user experience for GastownUI, including the "theatrical illusion" approach for voice model delivery, background music, accessibility considerations, and a robust chunked download system.

The key insight: **FTUE is a scripted experience.** We know exactly what we'll say and when. By pre-rendering voice clips with the same LFM2.5 model and playing them during setup, we can provide immediate voice interaction while the actual model downloads in the background. The transition to live inference is seamless—users never know they were talking to recordings.

### Design Philosophy

> "Gas Town is the beginning of industrialized factory-farming of code."  
> — Steve Yegge, "Welcome to Gas Town"

**Key Principles:**
1. **Consent-first voice**: Explicitly ask before downloading gigabytes
2. **Transparent about the illusion**: Tell users we're downloading while guiding them
3. **Warm competence over snark**: Helpful first, personality second
4. **Accessible by default**: Full text-mode fallback, Apple HIG compliance
5. **Background music as ambiance**: Subtle, optional, never distracting
6. **Robust downloads**: Chunked, resumable, fast

---

## Voice Model Consent Flow

### The Opt-In Screen

Before any FTUE content, users choose their experience:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                         ⛽ GastownUI                             │
│                                                                  │
│                                                                  │
│         ┌─────────────────────────────────────────────┐         │
│         │  🎙️ Voice-Guided Experience                 │         │
│         │                                             │         │
│         │  Gas Town works best with voice. I can      │         │
│         │  guide you through setup, answer questions, │         │
│         │  and help manage your convoys hands-free.   │         │
│         │                                             │         │
│         │  This requires downloading a voice model    │         │
│         │  (~2-3GB).                                  │         │
│         │                                             │         │
│         │  ┌─────────────────┐  ┌─────────────────┐  │         │
│         │  │  Enable Voice   │  │  Skip (text-only)│  │         │
│         │  └─────────────────┘  └─────────────────┘  │         │
│         │                                             │         │
│         │  ℹ️ You can enable voice later in Settings  │         │
│         └─────────────────────────────────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Decision Paths

**"Enable Voice" clicked:**
1. Check available disk space (require 4GB free for safety margin)
2. If insufficient: Show friendly error, offer text-only alternative
3. If sufficient: Start background download, proceed to voice-guided FTUE

**"Skip (text-only)" clicked:**
1. Disable voice features entirely
2. Proceed to text-only FTUE
3. Voice can be enabled later in Settings

---

## The Theatrical Illusion

### How It Works

When users enable voice, they hear immediate voice guidance—but it's pre-recorded audio rendered from LFM2.5, not live inference. The actual model downloads silently in the background.

```
┌─────────────────────────────────────────────────────────────────┐
│                      User's Perspective                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ "Thanks! I'm downloading my voice model now—it'll be a      ││
│  │  few gigabytes. In the meantime, I'll walk you through      ││
│  │  getting Gas Town set up using some recordings I made       ││
│  │  earlier. Let's get started!"                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│                      What's Actually Happening                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Audio Layer:    [Pre-baked .wav files playing]             ││
│  │  Download Layer: [LFM2.5 model chunks downloading]          ││
│  │  UI Layer:       [Checklist + progress bar + detection]     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Transparency

We're honest about this in the opening voice clip:

> "Thanks! I'm downloading my voice model now—it'll be a few gigabytes. In the meantime, I'll walk you through getting Gas Town set up using some recordings I made earlier. Let's get started!"

This sets expectations correctly: the user knows they're hearing recordings, knows a download is happening, and understands that live voice will be available after setup.

### Pre-Baked Audio Assets


All voice clips are generated using the LFM2.5-Audio model on Cosmo's M4 Max, ensuring the pre-baked voice sounds identical to live inference. Clips are bundled with the app (~50-100MB total).

```
assets/voice/ftue/
├── 00_consent_intro.wav          # "Gas Town works best with voice..."
├── 01_download_starting.wav      # "Thanks! I'm downloading my voice model..."
├── 02_checking_go.wav            # "Let me check what you have installed..."
├── 03_go_found.wav               # "Nice—you've got Go {{version}}..."
├── 04_go_missing_mac.wav         # "First thing we need is Go..."
├── 04_go_missing_linux.wav       # Platform variant
├── 04_go_missing_windows.wav     # Platform variant
├── 05_go_path_error.wav          # "Hmm, I'm not finding Go in your PATH..."
├── 06_install_beads.wav          # "Now let's install Beads..."
├── 07_beads_found.wav            # "Beads {{version}} is installed. Nice."
├── 08_beads_path_error.wav       # "Beads installed, but your shell..."
├── 09_install_gastown.wav        # "One more tool: Gas Town itself..."
├── 10_gastown_found.wav          # "Gas Town {{version}} is ready..."
├── 11_configure_workspace.wav    # "Last step: we need to create..."
├── 12_creating_workspace.wav     # "Creating your workspace..."
├── 13_celebration.wav            # "You're all set!"
├── 14_next_steps.wav             # "A few things you might want to do..."
├── 15_download_failed.wav        # "Download failed. Want to try again?"
├── 16_download_complete.wav      # "My voice model is ready now..."
└── 17_goodbye.wav                # "Happy coding!"
```

**Clip Generation Process:**
1. Write all scripts (see Appendix A)
2. Use LFM2.5-Audio on M4 Max to render each script to .wav
3. Normalize audio levels across all clips
4. Bundle with app distribution

### Branching Coverage

The FTUE isn't fully linear—we have platform detection and error states. But the tree is small:

```
consent → download_start → check_go → {
  go_found → check_beads,
  go_missing → {mac, linux, windows} → waiting → go_found
}
→ check_beads → {
  beads_found → check_gastown,
  beads_missing → install_beads → waiting → beads_found
}
→ check_gastown → {
  gastown_found → configure_workspace,
  gastown_missing → install_gastown → waiting → gastown_found
}
→ configure_workspace → creating → celebration
```

~20-25 unique clips cover all realistic paths. Error recovery clips (PATH issues, download failures) bring the total to ~30.

### Live Model Transition

The pre-baked voice handles the entire FTUE. By the time users reach "celebration," the model is typically downloaded and ready. The transition happens naturally:

1. **During FTUE:** Pre-baked clips play, download progresses
2. **FTUE Complete:** If model ready, switch to live; if not, continue with pre-baked "next steps"
3. **Post-FTUE:** All interaction is live inference

If the model download completes mid-FTUE, we don't interrupt—we wait for a natural transition point.

---

## Background Music

### Design Intent

Ambient music during setup creates a welcoming atmosphere without demanding attention. Think "elevator music for hackers"—pleasant, unobtrusive, slightly energetic.

### Music Assets

Three tracks from Cosmo's "Hairspring" catalog, selected for setup ambiance:

```
assets/music/ftue/
├── melodic_1.mp3    # First track
├── melodic_5.mp3    # Second track  
├── vibing_2.mp3     # Third track
```

**Licensing:**
- Composer: Matthew P. Barnson (performing as "Hairspring")
- License: Public Domain
- Usage: Anyone is free to use this music for any purpose

### Audio Behavior

**Volume:** 
- Music plays at 20% volume (relative to voice clips)
- Music stays at 20% constantly—no ducking logic needed
- Voice is always clear and prominent

**Playback Order:**
- Tracks play in sequence: melodic_1 → melodic_5 → vibing_2
- After all three complete, music stops (no loop)
- If FTUE completes before music ends, music fades out over 2 seconds

**User Control:**
```
┌──────────────────────────────────────────────────────────────┐
│                                           🔇 [mute icon]     │
└──────────────────────────────────────────────────────────────┘
```
- Small mute/unmute icon in corner
- Click to toggle music on/off
- State persisted for session only (music always starts on)

---

## Chunked Download System

### Why Chunking Matters

Downloading 2-3GB as a single HTTP request is unreliable:
- Connection drops = start over
- No progress visibility during transfer
- Can't saturate bandwidth

Chunked downloads fix all of this:
- Resume from any interruption
- Parallel chunks saturate bandwidth
- Real progress feedback

### Implementation: EmiliaDownloader Pattern

Adapted from OpenEmilia's battle-tested download system:

```typescript
// Configuration
const CHUNK_SIZE = 64 * 1024 * 1024;        // 64MB chunks
const MAX_CONCURRENT = 8;                    // Parallel downloads
const MIN_SIZE_FOR_CHUNKING = 64 * 1024 * 1024;  // Files < 64MB download whole

interface DownloadManifest {
  version: 2;
  repoID: string;
  totalBytes: number;
  files: FileInfo[];
  chunks: ChunkInfo[];
  verified: boolean;
  startedAt: string;
  verifiedAt?: string;
}

interface ChunkInfo {
  fileIndex: number;
  offset: number;
  length: number;
  completed: boolean;
}
```

### Download Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Voice Model Download                         │
│                                                                  │
│  Phase 1: Metadata                                              │
│  └─ Fetch file list and sizes from HuggingFace                  │
│                                                                  │
│  Phase 2: Plan Chunks                                           │
│  └─ Split large files into 64MB chunks                          │
│  └─ Create/load manifest for resume support                     │
│                                                                  │
│  Phase 3: Parallel Download                                     │
│  └─ Download up to 8 chunks simultaneously                      │
│  └─ Use HTTP Range requests for partial content                 │
│  └─ Write chunks directly to correct file offsets               │
│  └─ Mark chunks complete in manifest as they finish             │
│                                                                  │
│  Phase 4: Verification                                          │
│  └─ SHA256 hash check for LFS files                             │
│  └─ Mark manifest as verified                                   │
│                                                                  │
│  Phase 5: Ready                                                 │
│  └─ Model available for inference                               │
└─────────────────────────────────────────────────────────────────┘
```

### Resume Support

If download is interrupted (app quit, network failure, system restart):

1. On restart, load existing manifest
2. Identify incomplete chunks
3. Resume downloading only what's missing
4. No re-downloading completed chunks

```typescript
// Resume detection
const manifest = DownloadManifest.load(modelDir);
if (manifest && !manifest.verified && manifest.chunks.length > 0) {
  const remaining = manifest.chunks.filter(c => !c.completed);
  console.log(`Resuming: ${remaining.length} chunks remaining`);
}
```

### Progress UI During FTUE

```
┌─────────────────────────────────────────────────────────────────┐
│  Voice Model Download                                           │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░  48%                 │
│  1.2 GB / 2.5 GB  •  45 MB/s  •  ~30 sec remaining             │
└─────────────────────────────────────────────────────────────────┘
```

Progress bar shows:
- Percentage complete
- Downloaded / Total bytes
- Current speed (calculated from recent chunks)
- Estimated time remaining

### Error Handling

**Network Failure:**
- Individual chunk failures retry 3x with exponential backoff
- After 3 failures, chunk marked as failed
- Download continues with other chunks
- Failed chunks can be retried later

**Integrity Failure:**
- SHA256 mismatch detected post-download
- Corrupted file deleted
- User offered retry option
- Pre-baked voice: "The download seems to have gotten corrupted. Want to try again?"

**Disk Space:**
- Check before starting: need ~4GB free (model + temp space)
- If insufficient: "You'll need about 4 gigabytes free. Want to free up some space and try again?"

---

## Text-Only FTUE (Accessibility)

### Apple HIG Compliance

Following Apple Human Interface Guidelines for accessibility:
- All information available without audio
- Clear visual hierarchy
- Keyboard navigation support
- VoiceOver compatibility
- Reduced motion support

### Text Mode Flow

Same steps as voice mode, but:
- All voice scripts appear as text in UI
- "Next" button advances between steps (no auto-advance)
- Commands shown in copyable code blocks
- Detection still polls and auto-checks when tools appear

```
┌─────────────────────────────────────────────────────────────────┐
│                         ⛽ GastownUI                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  First thing we need is Go—it's the programming language   ││
│  │  that Gas Town is written in.                               ││
│  │                                                              ││
│  │  On Mac, the easiest way is with Homebrew:                  ││
│  │                                                              ││
│  │  ┌──────────────────────────────────────────────┐           ││
│  │  │  brew install go                       [📋]  │           ││
│  │  └──────────────────────────────────────────────┘           ││
│  │                                                              ││
│  │  Run this in your terminal, then click Next.                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│         ○ Go programming language    ← current                  │
│         ○ Beads (issue tracker)                                 │
│         ○ Gas Town (orchestrator)                               │
│         ○ Workspace initialization                              │
│                                                                  │
│                                    [← Back]  [Next →]           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Pacing in Text Mode

- User controls pace with explicit "Next" clicks
- No timeouts or auto-advance
- Can go "Back" to review previous steps
- Detection polling continues in background
- When tool detected, "Next" becomes enabled (if it was waiting)

---

## Technical Implementation

### State Machine

```typescript
type FTUEStep = 
  | 'consent'                    // Voice opt-in screen
  | 'checking_prerequisites'     // Initial system check
  | 'install_go'                 // Show Go install instructions
  | 'waiting_for_go'             // Polling for Go
  | 'install_beads'              // Show Beads install
  | 'waiting_for_beads'          // Polling for Beads
  | 'install_gastown'            // Show Gas Town install
  | 'waiting_for_gastown'        // Polling for Gas Town
  | 'configure_workspace'        // Path selection
  | 'creating_workspace'         // Running gt install
  | 'complete'                   // Celebration screen
  | 'next_steps'                 // Add rig / start mayor options

interface FTUEState {
  step: FTUEStep;
  
  // Voice/Audio state
  voiceEnabled: boolean;
  voiceModelDownloading: boolean;
  voiceModelReady: boolean;
  voiceModelProgress: number;      // 0-100
  voiceModelBytesDownloaded: number;
  voiceModelTotalBytes: number;
  
  // Music state
  musicEnabled: boolean;
  currentTrackIndex: number;       // 0, 1, or 2
  musicFinished: boolean;
  
  // Setup detection
  setupState: SetupState;
  
  // UI state
  textMode: boolean;               // Using text-only flow
  customWorkspacePath?: string;
  
  // Error tracking
  lastError?: string;
  downloadRetryCount: number;
}

type FTUEAction =
  | { type: 'ENABLE_VOICE' }
  | { type: 'SKIP_VOICE' }
  | { type: 'PROCEED' }                          // Text mode: Next button
  | { type: 'GO_BACK' }                          // Text mode: Back button
  | { type: 'GO_DETECTED'; version: string }
  | { type: 'BD_DETECTED'; version: string }
  | { type: 'GT_DETECTED'; version: string }
  | { type: 'WORKSPACE_CREATED'; path: string }
  | { type: 'SET_WORKSPACE_PATH'; path: string }
  | { type: 'DOWNLOAD_PROGRESS'; bytes: number; total: number }
  | { type: 'DOWNLOAD_COMPLETE' }
  | { type: 'DOWNLOAD_FAILED'; error: string }
  | { type: 'DOWNLOAD_RETRY' }
  | { type: 'TOGGLE_MUSIC' }
  | { type: 'MUSIC_TRACK_ENDED' }
  | { type: 'ERROR'; error: string }
  | { type: 'SKIP_FTUE' }
```

### Voice Audio Manager

```typescript
// src/ftue/audio.ts

class FTUEAudioManager {
  private voiceAudio: HTMLAudioElement | null = null;
  private musicAudio: HTMLAudioElement | null = null;
  
  private readonly musicTracks = [
    '/assets/music/ftue/melodic_1.mp3',
    '/assets/music/ftue/melodic_5.mp3',
    '/assets/music/ftue/vibing_2.mp3',
  ];
  
  private currentMusicTrack = 0;
  private musicEnabled = true;
  
  // Voice clips mapped by step
  private readonly voiceClips: Record<string, string> = {
    'download_starting': '/assets/voice/ftue/01_download_starting.wav',
    'checking_go': '/assets/voice/ftue/02_checking_go.wav',
    'go_found': '/assets/voice/ftue/03_go_found.wav',
    'go_missing_darwin': '/assets/voice/ftue/04_go_missing_mac.wav',
    'go_missing_linux': '/assets/voice/ftue/04_go_missing_linux.wav',
    'go_missing_win32': '/assets/voice/ftue/04_go_missing_windows.wav',
    // ... etc
  };
  
  async playVoiceClip(clipId: string): Promise<void> {
    const clipPath = this.voiceClips[clipId];
    if (!clipPath) return;
    
    // Stop any current voice
    if (this.voiceAudio) {
      this.voiceAudio.pause();
    }
    
    this.voiceAudio = new Audio(clipPath);
    await this.voiceAudio.play();
    
    return new Promise(resolve => {
      this.voiceAudio!.onended = () => resolve();
    });
  }
  
  startMusic(): void {
    if (!this.musicEnabled) return;
    this.playMusicTrack(0);
  }
  
  private playMusicTrack(index: number): void {
    if (index >= this.musicTracks.length) {
      // All tracks played
      return;
    }
    
    this.currentMusicTrack = index;
    this.musicAudio = new Audio(this.musicTracks[index]);
    this.musicAudio.volume = 0.2;  // 20% volume
    this.musicAudio.play();
    
    this.musicAudio.onended = () => {
      this.playMusicTrack(index + 1);
    };
  }
  
  toggleMusic(): void {
    this.musicEnabled = !this.musicEnabled;
    
    if (this.musicAudio) {
      if (this.musicEnabled) {
        this.musicAudio.play();
      } else {
        this.musicAudio.pause();
      }
    }
  }
  
  stopMusic(): void {
    if (this.musicAudio) {
      // Fade out over 2 seconds
      const fadeOut = setInterval(() => {
        if (this.musicAudio!.volume > 0.02) {
          this.musicAudio!.volume -= 0.02;
        } else {
          this.musicAudio!.pause();
          clearInterval(fadeOut);
        }
      }, 100);
    }
  }
  
  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }
}
```



### Download Service (Tauri/Rust)

The chunked download logic lives in Rust for performance and reliability:

```rust
// src-tauri/src/download.rs

use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};

const CHUNK_SIZE: u64 = 64 * 1024 * 1024;  // 64MB
const MAX_CONCURRENT: usize = 8;
const MIN_SIZE_FOR_CHUNKING: u64 = 64 * 1024 * 1024;

#[derive(Serialize, Deserialize, Clone)]
pub struct DownloadManifest {
    version: u32,
    repo_id: String,
    total_bytes: u64,
    files: Vec<FileInfo>,
    chunks: Vec<ChunkInfo>,
    verified: bool,
    started_at: String,
    verified_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ChunkInfo {
    file_index: usize,
    offset: u64,
    length: u64,
    completed: bool,
}

#[derive(Clone)]
pub struct DownloadProgress {
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub bytes_per_second: f64,
}

pub struct VoiceModelDownloader {
    model_dir: PathBuf,
    manifest: Arc<Mutex<DownloadManifest>>,
}

impl VoiceModelDownloader {
    pub async fn download(
        &self,
        repo_id: &str,
        progress_callback: impl Fn(DownloadProgress) + Send + 'static,
    ) -> Result<PathBuf, DownloadError> {
        // Phase 1: Get metadata from HuggingFace
        let file_metadata = self.fetch_metadata(repo_id).await?;
        
        // Phase 2: Plan chunks (or load existing manifest for resume)
        let manifest = self.plan_or_resume(&file_metadata).await?;
        
        // Phase 3: Parallel chunk download
        let chunks_to_download: Vec<_> = manifest.chunks
            .iter()
            .enumerate()
            .filter(|(_, c)| !c.completed)
            .collect();
        
        let progress = Arc::new(Mutex::new(DownloadProgress {
            bytes_downloaded: manifest.completed_bytes(),
            total_bytes: manifest.total_bytes,
            bytes_per_second: 0.0,
        }));
        
        // Download chunks with bounded concurrency
        let semaphore = Arc::new(tokio::sync::Semaphore::new(MAX_CONCURRENT));
        let mut handles = vec![];
        
        for (idx, chunk) in chunks_to_download {
            let sem = semaphore.clone();
            let prog = progress.clone();
            let manifest = self.manifest.clone();
            let chunk = chunk.clone();
            
            let handle = tokio::spawn(async move {
                let _permit = sem.acquire().await.unwrap();
                
                // Download with retry
                let bytes = download_chunk_with_retry(&chunk, 3).await?;
                
                // Update progress
                {
                    let mut p = prog.lock().await;
                    p.bytes_downloaded += bytes;
                }
                
                // Mark chunk complete in manifest
                {
                    let mut m = manifest.lock().await;
                    m.chunks[idx].completed = true;
                    m.save()?;
                }
                
                Ok::<_, DownloadError>(bytes)
            });
            
            handles.push(handle);
        }
        
        // Wait for all chunks
        for handle in handles {
            handle.await??;
        }
        
        // Phase 4: Verify integrity
        self.verify_integrity().await?;
        
        // Phase 5: Mark verified
        {
            let mut m = self.manifest.lock().await;
            m.verified = true;
            m.verified_at = Some(chrono::Utc::now().to_rfc3339());
            m.save()?;
        }
        
        Ok(self.model_dir.clone())
    }
}

async fn download_chunk_with_retry(
    chunk: &ChunkInfo,
    max_retries: u32,
) -> Result<u64, DownloadError> {
    let mut last_error = None;
    
    for attempt in 1..=max_retries {
        match download_chunk(chunk).await {
            Ok(bytes) => return Ok(bytes),
            Err(e) => {
                last_error = Some(e);
                if attempt < max_retries {
                    let delay = std::time::Duration::from_secs(2u64.pow(attempt - 1));
                    tokio::time::sleep(delay).await;
                }
            }
        }
    }
    
    Err(last_error.unwrap())
}

async fn download_chunk(chunk: &ChunkInfo) -> Result<u64, DownloadError> {
    let client = reqwest::Client::new();
    
    let mut request = client.get(&chunk.url);
    
    // Use Range header for chunked files
    if chunk.total_file_size >= MIN_SIZE_FOR_CHUNKING {
        let range_end = chunk.offset + chunk.length - 1;
        request = request.header("Range", format!("bytes={}-{}", chunk.offset, range_end));
    }
    
    let response = request.send().await?;
    
    if !response.status().is_success() && response.status() != 206 {
        return Err(DownloadError::HttpError(response.status().as_u16()));
    }
    
    let bytes = response.bytes().await?;
    
    // Write to file at correct offset
    let mut file = tokio::fs::OpenOptions::new()
        .write(true)
        .open(&chunk.destination_file)
        .await?;
    
    file.seek(std::io::SeekFrom::Start(chunk.offset)).await?;
    file.write_all(&bytes).await?;
    
    Ok(bytes.len() as u64)
}
```

### Tauri Commands

```rust
// src-tauri/src/commands.rs

#[tauri::command]
pub async fn start_voice_model_download(
    app: tauri::AppHandle,
) -> Result<(), String> {
    let downloader = VoiceModelDownloader::new(get_model_dir());
    
    downloader.download("liquid-ai/lfm-2.5-audio-1.5b", move |progress| {
        app.emit_all("voice-download-progress", progress).ok();
    }).await.map_err(|e| e.to_string())?;
    
    app.emit_all("voice-download-complete", ()).ok();
    Ok(())
}

#[tauri::command]
pub async fn check_voice_model_ready() -> Result<bool, String> {
    let manifest_path = get_model_dir().join(".emilia_manifest.json");
    
    if let Ok(manifest) = DownloadManifest::load(&manifest_path) {
        Ok(manifest.verified)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn get_voice_download_progress() -> Result<Option<DownloadProgress>, String> {
    // Return current progress if download in progress
    // ...
}
```

### React Integration

```tsx
// src/ftue/FTUEPage.tsx

import { useReducer, useEffect, useMemo } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { ftueReducer, initialState } from './reducer';
import { FTUEAudioManager } from './audio';
import { SetupDetector } from './detection';

export function FTUEPage() {
  const [state, dispatch] = useReducer(ftueReducer, initialState);
  const audioManager = useMemo(() => new FTUEAudioManager(), []);
  const detector = useMemo(() => new SetupDetector(), []);
  
  // Listen for download progress from Rust
  useEffect(() => {
    const unlisten = listen('voice-download-progress', (event) => {
      const { bytes_downloaded, total_bytes } = event.payload;
      dispatch({ 
        type: 'DOWNLOAD_PROGRESS', 
        bytes: bytes_downloaded, 
        total: total_bytes 
      });
    });
    
    return () => { unlisten.then(f => f()); };
  }, []);
  
  // Listen for download complete
  useEffect(() => {
    const unlisten = listen('voice-download-complete', () => {
      dispatch({ type: 'DOWNLOAD_COMPLETE' });
    });
    
    return () => { unlisten.then(f => f()); };
  }, []);
  
  // Handle voice enable
  const handleEnableVoice = async () => {
    dispatch({ type: 'ENABLE_VOICE' });
    
    // Start background download
    invoke('start_voice_model_download').catch(err => {
      dispatch({ type: 'DOWNLOAD_FAILED', error: err });
    });
    
    // Start music
    audioManager.startMusic();
    
    // Play first voice clip
    await audioManager.playVoiceClip('download_starting');
    
    // Advance to setup
    dispatch({ type: 'PROCEED' });
  };
  
  // ... rest of component
}
```

---

## Disk Space Handling

### Pre-Download Check

Before offering voice download, check available space:

```typescript
async function checkDiskSpace(): Promise<{ available: number; sufficient: boolean }> {
  const available = await invoke<number>('get_available_disk_space');
  const required = 4 * 1024 * 1024 * 1024;  // 4GB
  
  return {
    available,
    sufficient: available >= required,
  };
}
```

### Insufficient Space UI

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│         ┌─────────────────────────────────────────────┐         │
│         │  ⚠️ Not Enough Space                        │         │
│         │                                             │         │
│         │  Voice mode needs about 4GB free, but you   │         │
│         │  only have 2.1GB available.                 │         │
│         │                                             │         │
│         │  You can:                                   │         │
│         │  • Free up some space and try again        │         │
│         │  • Continue with text-only mode            │         │
│         │                                             │         │
│         │  ┌─────────────────┐  ┌─────────────────┐  │         │
│         │  │  Check Again    │  │  Use Text Mode  │  │         │
│         │  └─────────────────┘  └─────────────────┘  │         │
│         └─────────────────────────────────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error Recovery

### Download Failure

When download fails after retries:

**Pre-baked voice clip (15_download_failed.wav):**
> "The download ran into some trouble. Sometimes the internet just has a bad day. Want to try again?"

**UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Download Failed                                             │
│                                                                  │
│  The voice model download didn't complete. This can happen      │
│  with network issues—trying again usually works.                │
│                                                                  │
│  Progress saved: You won't have to start over.                  │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────────────────────────┐   │
│  │  Try Again      │  │  Continue Without Voice (text mode) │   │
│  └─────────────────┘  └─────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

Key points:
- Progress is saved—resume, don't restart
- Offer text mode as graceful fallback
- No blame ("the internet just has a bad day")

### Integrity Failure

If SHA256 verification fails:

**Pre-baked voice clip:**
> "Hmm, the download seems to have gotten a bit scrambled. Let me clear that out and try again."

Action:
1. Delete corrupted file(s)
2. Clear affected chunks in manifest
3. Retry download of those chunks

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Voice opt-in rate | > 70% | Users who click "Enable Voice" / total users |
| Download completion rate | > 95% | Downloads completed / downloads started |
| Download resume success | > 90% | Resumed downloads that complete / total resumes |
| FTUE completion rate | > 85% | Users who finish all steps / users who start |
| Time to completion (voice) | < 7 min | Median time including download |
| Time to completion (text) | < 5 min | Median time for text-only users |
| Music toggle rate | < 10% | Users who mute music (low = good default) |

---

## Testing Strategy

### Automated Tests

1. **State machine tests**: All transitions valid
2. **Audio manager tests**: Clip playback, music sequencing
3. **Download service tests**: Mock HTTP, verify chunking math
4. **Resume tests**: Partial manifests restore correctly

### Manual Test Scenarios

1. **Happy path (voice)**: Enable voice, complete FTUE with music
2. **Happy path (text)**: Skip voice, complete FTUE
3. **Interrupted download**: Quit mid-download, relaunch, verify resume
4. **Network failure**: Disconnect during download, verify retry
5. **Slow network**: Throttle to 1Mbps, verify FTUE completes before download
6. **Insufficient space**: Test with < 4GB free
7. **All error states**: PATH issues, install failures, workspace errors
8. **Music toggle**: Verify mute/unmute works mid-FTUE
9. **Accessibility**: Complete FTUE with VoiceOver

### Integration Tests

1. **Full FTUE on fresh macOS VM**: No prior state
2. **Full FTUE on fresh Ubuntu VM**: Linux path
3. **Partial state tests**: Various combinations of tools present

---

## Open Questions (Carried Forward)

1. **Windows support**: How well does Gas Town work on Windows? Platform-specific warnings?

2. **Claude Code requirement**: Should FTUE help users get Claude Code set up?

3. **API key setup**: Does Gas Town need API keys configured? FTUE guidance?

4. **First rig suggestions**: Demo repo for users without a project ready?

---

## Appendix A: Voice Script Reference

Full scripts for pre-baked audio generation. Render these using LFM2.5-Audio on M4 Max.

### 01_download_starting.wav
```
Thanks! I'm downloading my voice model now—it'll be a few gigabytes. In the 
meantime, I'll walk you through getting Gas Town set up using some recordings 
I made earlier. Let's get started!
```

### 02_checking_go.wav
```
Let me check what you already have installed.
```

### 03_go_found.wav
```
Nice—you've got Go installed. That's all we need to install the tools.
```

### 04_go_missing_mac.wav
```
First thing we need is Go—it's the programming language that Gas Town is 
written in. On Mac, the easiest way is with Homebrew. If you have Homebrew, 
run: brew install go. If you don't have Homebrew yet, you can get it at 
brew.sh, or download Go directly from go.dev. Let me know when Go is installed.
```

### 04_go_missing_linux.wav
```
First thing we need is Go—it's the programming language that Gas Town is 
written in. On Linux, you can usually install Go with your package manager. 
For Ubuntu or Debian: sudo apt install golang-go. Or download it directly 
from go.dev. Let me know when it's ready.
```

### 04_go_missing_windows.wav
```
First thing we need is Go—it's the programming language that Gas Town is 
written in. On Windows, head to go.dev/dl and download the installer. Run it, 
and make sure to check the box that adds Go to your PATH. Let me know when 
the installation finishes.
```

### 05_go_path_error.wav
```
Hmm, I'm not finding Go in your PATH. This usually means you need to add Go's 
bin directory to your shell configuration. Try adding the Go bin path to your 
shell profile, then restart your terminal and we can check again.
```

### 06_install_beads.wav
```
Now let's install Beads—this is the issue tracker your agents will use to 
coordinate work. It's like Jira, but stored in Git and actually pleasant to 
use. Run the go install command shown on screen. This will download and 
compile Beads. It might take a minute or two the first time.
```

### 07_beads_found.wav
```
Beads is installed. Nice.
```

### 08_beads_path_error.wav
```
Beads installed, but your shell can't find it yet. You need to add Go's bin 
directory to your PATH. Add the Go bin path to your shell profile, then run 
source on your profile or restart your terminal.
```

### 09_install_gastown.wav
```
One more tool: Gas Town itself. Same process—run the go install command on 
screen. This is the orchestrator that coordinates all your coding agents. 
It'll take a minute to compile.
```

### 10_gastown_found.wav
```
Gas Town is ready. We're almost there.
```

### 11_configure_workspace.wav
```
Last step: we need to create your Gas Town workspace. This is your 
headquarters—the directory where all your projects and agents will live. 
The standard location is ~/gt. Does that work for you, or would you prefer 
somewhere else?
```

### 12_creating_workspace.wav
```
Creating your workspace now.
```

### 13_celebration.wav
```
You're all set! You've got a fresh Gas Town workspace ready to go.
```

### 14_next_steps.wav
```
A few things you might want to do next. You could add a project—if you have 
a Git repository you want to work on, I can help you add it as a rig. Or, 
you can start the Mayor—that's your main coordination agent. What sounds good?
```

### 15_download_failed.wav
```
The download ran into some trouble. Sometimes the internet just has a bad day. 
Want to try again?
```

### 16_download_complete.wav
```
My voice model is all downloaded now. I'm fully online and ready to help you 
with whatever you need.
```

### 17_goodbye.wav
```
Happy coding!
```

---

## Appendix B: Music Track Details

Three tracks from Cosmo's Hairspring catalog, licensed to public domain:

| Filename | Duration | BPM | Mood |
|----------|----------|-----|------|
| melodic_1.mp3 | ~3:00 | 120 | Upbeat, optimistic |
| melodic_5.mp3 | ~3:30 | 110 | Flowing, contemplative |
| vibing_2.mp3 | ~4:00 | 100 | Chill, ambient |

Total runtime: ~10:30, more than enough to cover typical FTUE.

---

*"Gas Town is alive, if only just. I have created something that is just barely smart enough."*  
*— Steve Yegge*
