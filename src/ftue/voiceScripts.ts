/**
 * FTUE Voice Scripts
 *
 * Maps FTUE steps to voice scripts for text-to-speech playback.
 * Scripts follow the PRD tone: warm competence, patient, helpful first.
 */

import type { FTUEStep, Platform } from './types'

export interface VoiceScript {
  /** Main text to speak */
  text: string
  /** Whether to wait for user response after speaking */
  waitForResponse?: boolean
  /** Expected response patterns (for voice recognition) */
  expectedResponses?: string[]
  /** Delay before speaking (ms) */
  delay?: number
}

export interface PlatformScripts {
  darwin: string
  linux: string
  win32: string
}

/**
 * Voice scripts for each FTUE step
 */
export const VOICE_SCRIPTS: Partial<Record<FTUEStep, VoiceScript>> = {
  welcome: {
    text: `Hey there! I'm your Gas Town assistant. I'll be helping you get set up—it usually takes about five minutes.

Before we start, I should mention: Gas Town is designed for developers who are comfortable in the terminal and ready to run multiple AI coding agents in parallel. It's powerful, but it does use real API credits. If that sounds like what you're looking for, let's get started.

Say "let's go" when you're ready, or "tell me more" if you want to know what we're setting up.`,
    waitForResponse: true,
    expectedResponses: ["let's go", 'ready', 'start', 'tell me more', 'skip'],
  },

  resuming: {
    text: `Welcome back! Looks like we didn't finish setting up last time. No worries—we can pick up right where you left off.

Would you like to continue from where we were, or start fresh?`,
    waitForResponse: true,
    expectedResponses: ['continue', 'resume', 'pick up', 'start fresh', 'start over', 'fresh'],
  },

  checking_prerequisites: {
    text: `Let me check what you already have installed...`,
    delay: 500,
  },

  install_go: {
    text: `First thing we need is Go—it's the programming language that Gas Town and Beads are written in.`,
  },

  waiting_for_go: {
    text: `Let me know when Go is installed. I'll check automatically.`,
    waitForResponse: true,
    expectedResponses: ['done', 'installed', 'ready', 'check again'],
  },

  install_beads: {
    text: `Now let's install Beads—this is the issue tracker your agents will use to coordinate work. It's like Jira, but stored in Git and actually pleasant to use.

Run this command in your terminal. This will download and compile Beads. It might take a minute or two the first time.`,
  },

  waiting_for_beads: {
    text: `Installing Beads. I'll detect it automatically when it's ready.`,
  },

  install_gastown: {
    text: `One more tool: Gas Town itself. Same process—run this command. This is the orchestrator that coordinates all your coding agents. It'll take a minute to compile.`,
  },

  waiting_for_gastown: {
    text: `Installing Gas Town. Almost there.`,
  },

  configure_workspace: {
    text: `Last step: we need to create your Gas Town workspace. This is your headquarters—the directory where all your projects and agents will live.

The standard location is tilde gt. Does that work for you, or would you prefer somewhere else?`,
    waitForResponse: true,
    expectedResponses: ["that's fine", 'yes', 'somewhere else', 'different location'],
  },

  creating_workspace: {
    text: `Creating your workspace...`,
  },

  complete: {
    text: `You're all set! You've got a fresh Gas Town workspace ready to go.

A few things you might want to do next: You could add a project—if you have a Git repository you want to work on, I can help you add it as a rig. That's what Gas Town calls a managed project.

Or, you can start the Mayor—that's your main coordination agent. It's the one you'll talk to most often.

What sounds good?`,
    waitForResponse: true,
    expectedResponses: ['add a project', 'add rig', 'start mayor', 'dashboard', 'go to dashboard'],
  },

  add_first_rig: {
    text: `What's the Git URL for your project? You can paste it or tell me the GitHub path—like "my-username slash my-repo".`,
    waitForResponse: true,
  },

  start_mayor: {
    text: `Starting the Mayor... this will open a tmux session where you can talk to your main coordination agent.

I'll still be here in the background if you need me. Just switch back to this window.`,
  },

  skipped: {
    text: `No problem. You can complete setup anytime from the dashboard. Just look for the setup banner.`,
  },
}

/**
 * Platform-specific installation instructions
 */
export const GO_INSTALL_SCRIPTS: PlatformScripts = {
  darwin: `On Mac, the easiest way is with Homebrew. If you have Homebrew, run: brew install go.

If you don't have Homebrew yet, you can get it at brew dot sh, or download Go directly from go dot dev.

Let me know when Go is installed.`,

  linux: `On Linux, you can usually install Go with your package manager. For Ubuntu or Debian: sudo apt install golang-go.

Or download it directly from go dot dev.

Let me know when it's ready.`,

  win32: `On Windows, head to go dot dev slash dl and download the installer. Run it, and make sure to check the box that adds Go to your PATH.

Let me know when the installation finishes.`,
}

/**
 * Error recovery scripts
 */
export const ERROR_SCRIPTS = {
  goPathError: `Hmm, I'm not finding Go in your PATH. This usually means you need to add Go's bin directory to your shell configuration.

Try adding this line to your .zshrc or .bashrc:
export PATH equals dollar PATH colon slash usr slash local slash go slash bin

Then restart your terminal and say "check again".`,

  beadsPathError: `Beads installed, but your shell can't find it yet. You need to add Go's bin directory to your PATH.

Add this to your .zshrc:
export PATH equals dollar PATH colon dollar open paren go env GOPATH close paren slash bin

Then run "source .zshrc" or restart your terminal.`,

  beadsVersionError: (version: string) =>
    `You have Beads ${version}, but we need at least 0.43.0. Run the install command again to update.`,

  gtVersionError: (version: string) =>
    `You have Gas Town ${version}, but we need at least 0.2.0. Run the install command again to update.`,

  workspaceError: (error: string) =>
    `Something went wrong creating the workspace. ${error}. This sometimes happens if the directory already exists or there's a permissions issue. Want to try a different location, or should I show you the full error?`,
}

/**
 * "Tell me more" response for welcome screen
 */
export const TELL_ME_MORE_SCRIPT = `Gas Town is an orchestration system for coding agents—think of it as a factory floor where multiple Claude Code instances work in parallel on your codebase.

We need to install two command-line tools: Beads, which is a Git-backed issue tracker your agents will use, and Gas Town itself, which coordinates everything. Both are open source and install via Go.

Ready to get started?`

/**
 * Get the voice script for a step, with platform-specific variants
 */
export function getVoiceScript(step: FTUEStep, platform?: Platform): VoiceScript | null {
  const baseScript = VOICE_SCRIPTS[step]
  if (!baseScript) return null

  // For install_go, append platform-specific instructions
  if (step === 'install_go' && platform) {
    const platformScript = GO_INSTALL_SCRIPTS[platform]
    return {
      ...baseScript,
      text: `${baseScript.text}\n\n${platformScript}`,
    }
  }

  return baseScript
}

/**
 * Detection success scripts
 */
export const DETECTION_SCRIPTS = {
  goDetected: (version: string) => `Nice—you've got Go ${version}. That's all we need to install the tools.`,
  beadsDetected: (version: string) => `Beads ${version} is installed. Nice.`,
  gtDetected: (version: string) => `Gas Town ${version} is ready. We're almost there.`,
  workspaceCreated: (path: string) => `Your workspace is ready at ${path}.`,
}
