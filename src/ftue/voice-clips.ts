/**
 * FTUE Pre-baked Voice Clip Configuration
 *
 * Defines all 17 voice clips for the theatrical illusion FTUE.
 * Scripts from docs/FTUE-v2.md Appendix A.
 *
 * Generation: Use LFM2.5-Audio on M4 Max to render each script.
 * Output: assets/voice/ftue/*.wav (normalized audio levels)
 */

import type { VoiceClip } from './audio'

/**
 * Voice clip identifier
 */
export type VoiceClipId =
  | 'welcome'
  | 'resuming'
  | 'download_starting'
  | 'checking_go'
  | 'go_found'
  | 'go_missing_mac'
  | 'go_missing_linux'
  | 'go_missing_windows'
  | 'go_path_error'
  | 'install_beads'
  | 'beads_found'
  | 'beads_path_error'
  | 'install_gastown'
  | 'gastown_found'
  | 'configure_workspace'
  | 'creating_workspace'
  | 'celebration'
  | 'next_steps'
  | 'download_failed'
  | 'download_complete'
  | 'goodbye'

/**
 * Voice clip metadata including script for generation
 */
export interface VoiceClipMeta extends VoiceClip {
  /** Filename (without path) */
  filename: string
  /** Script text for TTS generation */
  script: string
  /** Approximate duration in seconds */
  estimatedDuration: number
  /** Platform-specific variant */
  platform?: 'darwin' | 'linux' | 'win32'
}

/**
 * Base path for FTUE voice assets
 */
export const VOICE_ASSETS_PATH = '/assets/voice/ftue'

/**
 * All FTUE voice clips with scripts
 */
export const FTUE_VOICE_CLIPS: Record<VoiceClipId, VoiceClipMeta> = {
  welcome: {
    id: 'welcome',
    src: `${VOICE_ASSETS_PATH}/00_welcome.wav`,
    filename: '00_welcome.wav',
    script: `Hey there! I'm your Gas Town assistant. I'll be helping you get set up—it usually takes about five minutes. Before we start, I should mention: Gas Town is designed for developers who are comfortable in the terminal and ready to run multiple AI coding agents in parallel. It's powerful, but it does use real API credits. If that sounds like what you're looking for, let's get started. Say "let's go" when you're ready, or "tell me more" if you want to know what we're setting up.`,
    estimatedDuration: 25,
  },

  resuming: {
    id: 'resuming',
    src: `${VOICE_ASSETS_PATH}/00_resuming.wav`,
    filename: '00_resuming.wav',
    script: `Welcome back! Looks like we didn't finish setting up last time. No worries—we can pick up right where you left off. Would you like to continue from where we were, or start fresh?`,
    estimatedDuration: 10,
  },

  download_starting: {
    id: 'download_starting',
    src: `${VOICE_ASSETS_PATH}/01_download_starting.wav`,
    filename: '01_download_starting.wav',
    script: `Thanks! I'm downloading my voice model now—it'll be a few gigabytes. In the meantime, I'll walk you through getting Gas Town set up using some recordings I made earlier. Let's get started!`,
    estimatedDuration: 12,
  },

  checking_go: {
    id: 'checking_go',
    src: `${VOICE_ASSETS_PATH}/02_checking_go.wav`,
    filename: '02_checking_go.wav',
    script: `Let me check what you already have installed.`,
    estimatedDuration: 3,
  },

  go_found: {
    id: 'go_found',
    src: `${VOICE_ASSETS_PATH}/03_go_found.wav`,
    filename: '03_go_found.wav',
    script: `Nice—you've got Go installed. That's all we need to install the tools.`,
    estimatedDuration: 5,
  },

  go_missing_mac: {
    id: 'go_missing_mac',
    src: `${VOICE_ASSETS_PATH}/04_go_missing_mac.wav`,
    filename: '04_go_missing_mac.wav',
    script: `First thing we need is Go—it's the programming language that Gas Town is written in. On Mac, the easiest way is with Homebrew. If you have Homebrew, run: brew install go. If you don't have Homebrew yet, you can get it at brew.sh, or download Go directly from go.dev. Let me know when Go is installed.`,
    estimatedDuration: 18,
    platform: 'darwin',
  },

  go_missing_linux: {
    id: 'go_missing_linux',
    src: `${VOICE_ASSETS_PATH}/04_go_missing_linux.wav`,
    filename: '04_go_missing_linux.wav',
    script: `First thing we need is Go—it's the programming language that Gas Town is written in. On Linux, you can usually install Go with your package manager. For Ubuntu or Debian: sudo apt install golang-go. Or download it directly from go.dev. Let me know when it's ready.`,
    estimatedDuration: 15,
    platform: 'linux',
  },

  go_missing_windows: {
    id: 'go_missing_windows',
    src: `${VOICE_ASSETS_PATH}/04_go_missing_windows.wav`,
    filename: '04_go_missing_windows.wav',
    script: `First thing we need is Go—it's the programming language that Gas Town is written in. On Windows, head to go.dev/dl and download the installer. Run it, and make sure to check the box that adds Go to your PATH. Let me know when the installation finishes.`,
    estimatedDuration: 15,
    platform: 'win32',
  },

  go_path_error: {
    id: 'go_path_error',
    src: `${VOICE_ASSETS_PATH}/05_go_path_error.wav`,
    filename: '05_go_path_error.wav',
    script: `Hmm, I'm not finding Go in your PATH. This usually means you need to add Go's bin directory to your shell configuration. Try adding the Go bin path to your shell profile, then restart your terminal and we can check again.`,
    estimatedDuration: 12,
  },

  install_beads: {
    id: 'install_beads',
    src: `${VOICE_ASSETS_PATH}/06_install_beads.wav`,
    filename: '06_install_beads.wav',
    script: `Now let's install Beads—this is the issue tracker your agents will use to coordinate work. It's like Jira, but stored in Git and actually pleasant to use. Run the go install command shown on screen. This will download and compile Beads. It might take a minute or two the first time.`,
    estimatedDuration: 16,
  },

  beads_found: {
    id: 'beads_found',
    src: `${VOICE_ASSETS_PATH}/07_beads_found.wav`,
    filename: '07_beads_found.wav',
    script: `Beads is installed. Nice.`,
    estimatedDuration: 2,
  },

  beads_path_error: {
    id: 'beads_path_error',
    src: `${VOICE_ASSETS_PATH}/08_beads_path_error.wav`,
    filename: '08_beads_path_error.wav',
    script: `Beads installed, but your shell can't find it yet. You need to add Go's bin directory to your PATH. Add the Go bin path to your shell profile, then run source on your profile or restart your terminal.`,
    estimatedDuration: 12,
  },

  install_gastown: {
    id: 'install_gastown',
    src: `${VOICE_ASSETS_PATH}/09_install_gastown.wav`,
    filename: '09_install_gastown.wav',
    script: `One more tool: Gas Town itself. Same process—run the go install command on screen. This is the orchestrator that coordinates all your coding agents. It'll take a minute to compile.`,
    estimatedDuration: 12,
  },

  gastown_found: {
    id: 'gastown_found',
    src: `${VOICE_ASSETS_PATH}/10_gastown_found.wav`,
    filename: '10_gastown_found.wav',
    script: `Gas Town is ready. We're almost there.`,
    estimatedDuration: 3,
  },

  configure_workspace: {
    id: 'configure_workspace',
    src: `${VOICE_ASSETS_PATH}/11_configure_workspace.wav`,
    filename: '11_configure_workspace.wav',
    script: `Last step: we need to create your Gas Town workspace. This is your headquarters—the directory where all your projects and agents will live. The standard location is ~/gt. Does that work for you, or would you prefer somewhere else?`,
    estimatedDuration: 14,
  },

  creating_workspace: {
    id: 'creating_workspace',
    src: `${VOICE_ASSETS_PATH}/12_creating_workspace.wav`,
    filename: '12_creating_workspace.wav',
    script: `Creating your workspace now.`,
    estimatedDuration: 2,
  },

  celebration: {
    id: 'celebration',
    src: `${VOICE_ASSETS_PATH}/13_celebration.wav`,
    filename: '13_celebration.wav',
    script: `You're all set! You've got a fresh Gas Town workspace ready to go.`,
    estimatedDuration: 5,
  },

  next_steps: {
    id: 'next_steps',
    src: `${VOICE_ASSETS_PATH}/14_next_steps.wav`,
    filename: '14_next_steps.wav',
    script: `A few things you might want to do next. You could add a project—if you have a Git repository you want to work on, I can help you add it as a rig. Or, you can start the Mayor—that's your main coordination agent. What sounds good?`,
    estimatedDuration: 14,
  },

  download_failed: {
    id: 'download_failed',
    src: `${VOICE_ASSETS_PATH}/15_download_failed.wav`,
    filename: '15_download_failed.wav',
    script: `The download ran into some trouble. Sometimes the internet just has a bad day. Want to try again?`,
    estimatedDuration: 6,
  },

  download_complete: {
    id: 'download_complete',
    src: `${VOICE_ASSETS_PATH}/16_download_complete.wav`,
    filename: '16_download_complete.wav',
    script: `My voice model is all downloaded now. I'm fully online and ready to help you with whatever you need.`,
    estimatedDuration: 7,
  },

  goodbye: {
    id: 'goodbye',
    src: `${VOICE_ASSETS_PATH}/17_goodbye.wav`,
    filename: '17_goodbye.wav',
    script: `Happy coding!`,
    estimatedDuration: 2,
  },
}

/**
 * Get voice clip by ID
 */
export function getVoiceClip(id: VoiceClipId): VoiceClipMeta {
  return FTUE_VOICE_CLIPS[id]
}

/**
 * Get platform-specific "Go missing" clip
 */
export function getGoMissingClip(
  platform: 'darwin' | 'linux' | 'win32'
): VoiceClipMeta {
  switch (platform) {
    case 'darwin':
      return FTUE_VOICE_CLIPS.go_missing_mac
    case 'linux':
      return FTUE_VOICE_CLIPS.go_missing_linux
    case 'win32':
      return FTUE_VOICE_CLIPS.go_missing_windows
    default:
      return FTUE_VOICE_CLIPS.go_missing_mac
  }
}

/**
 * Get all clips as array for iteration
 */
export function getAllVoiceClips(): VoiceClipMeta[] {
  return Object.values(FTUE_VOICE_CLIPS)
}

/**
 * Calculate total estimated duration of all clips
 */
export function getTotalDuration(): number {
  return getAllVoiceClips().reduce(
    (sum, clip) => sum + clip.estimatedDuration,
    0
  )
}

/**
 * Check if voice assets are available
 * Returns false if clips need to be generated
 */
export async function checkVoiceAssetsAvailable(): Promise<boolean> {
  try {
    // Check first clip as a proxy for all
    const response = await fetch(FTUE_VOICE_CLIPS.download_starting.src, {
      method: 'HEAD',
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Voice clip playback order for linear FTUE flow
 */
export const FTUE_CLIP_SEQUENCE: VoiceClipId[] = [
  'welcome', // OR 'resuming' if interrupted session detected
  'download_starting',
  'checking_go',
  // Then branch based on detection:
  // - go_found OR go_missing_[platform] → go_path_error (if needed)
  'install_beads',
  'beads_found', // OR beads_path_error
  'install_gastown',
  'gastown_found',
  'configure_workspace',
  'creating_workspace',
  'celebration',
  'next_steps',
  // download_complete plays when model finishes (async)
  'goodbye',
]
