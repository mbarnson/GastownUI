/**
 * FTUE Background Music Configuration
 *
 * Integrates Hairspring music tracks for the First-Time User Experience.
 * Tracks play sequentially at 20% volume with crossfades.
 */

import type { AudioTrack } from './audio'
import { getFTUEAudioManager, type FTUEAudioConfig } from './audio'

/**
 * Hairspring track identifiers
 */
export type HairspringTrack = 'melodic_1' | 'melodic_5' | 'vibing_2'

/**
 * Track metadata for UI display
 */
export interface TrackInfo {
  id: HairspringTrack
  name: string
  artist: string
  duration: number // seconds (approximate)
}

/**
 * Hairspring track metadata
 */
export const HAIRSPRING_TRACKS: TrackInfo[] = [
  {
    id: 'melodic_1',
    name: 'Melodic 1',
    artist: 'Hairspring',
    duration: 180, // ~3 minutes
  },
  {
    id: 'melodic_5',
    name: 'Melodic 5',
    artist: 'Hairspring',
    duration: 195, // ~3:15
  },
  {
    id: 'vibing_2',
    name: 'Vibing 2',
    artist: 'Hairspring',
    duration: 210, // ~3:30
  },
]

/**
 * Base path for bundled audio assets
 */
const MUSIC_BASE_PATH = '/assets/music/hairspring'

/**
 * Create AudioTrack configuration for FTUE music
 */
export function createMusicTracks(): AudioTrack[] {
  return HAIRSPRING_TRACKS.map((track) => ({
    id: track.id,
    src: `${MUSIC_BASE_PATH}/${track.id}.mp3`,
    volume: 1.0, // Individual track volume (master is at 20%)
    loop: false, // Sequential playback with crossfade
  }))
}

/**
 * FTUE music configuration (20% volume, smooth crossfades)
 */
export const FTUE_MUSIC_CONFIG: FTUEAudioConfig = {
  musicVolume: 0.2, // 20% background volume
  voiceVolume: 1.0,
  duckingVolume: 0.05, // 5% during voice
  crossfadeDuration: 2, // 2 second crossfades
  fadeOutDuration: 3, // 3 second fade on completion
}

/**
 * Initialize and start FTUE background music
 *
 * @example
 * ```typescript
 * // In FTUE component mount
 * useEffect(() => {
 *   const cleanup = startFTUEMusic()
 *   return cleanup
 * }, [])
 * ```
 */
export async function startFTUEMusic(): Promise<() => void> {
  const audioManager = getFTUEAudioManager(FTUE_MUSIC_CONFIG)

  await audioManager.init()
  await audioManager.startMusic(createMusicTracks())

  return () => {
    audioManager.stopAll()
  }
}

/**
 * Fade out music on FTUE completion
 */
export async function fadeOutFTUEMusic(): Promise<void> {
  const audioManager = getFTUEAudioManager()
  await audioManager.fadeOutAll()
}

/**
 * Toggle music mute state
 * @returns Current mute state after toggle
 */
export function toggleFTUEMusicMute(): boolean {
  const audioManager = getFTUEAudioManager()
  return audioManager.toggleMute()
}

/**
 * Set music volume (0-1)
 */
export function setFTUEMusicVolume(volume: number): void {
  const audioManager = getFTUEAudioManager()
  audioManager.setMusicVolume(volume)
}

/**
 * Get current music state
 */
export function getFTUEMusicState(): {
  isMuted: boolean
  isPlaying: boolean
  state: 'stopped' | 'playing' | 'paused' | 'ducked'
} {
  const audioManager = getFTUEAudioManager()
  return {
    isMuted: audioManager.getIsMuted(),
    isPlaying: audioManager.getState() !== 'stopped',
    state: audioManager.getState(),
  }
}

/**
 * React hook for FTUE music integration
 *
 * @example
 * ```tsx
 * function FTUEWrapper({ children }) {
 *   useFTUEMusic()
 *   return children
 * }
 * ```
 */
export function useFTUEMusic(enabled = true) {
  // Import React hooks lazily to avoid circular deps
  // This would be implemented in the component file
  // For now, export the functions for manual integration
  return {
    start: startFTUEMusic,
    fadeOut: fadeOutFTUEMusic,
    toggleMute: toggleFTUEMusicMute,
    setVolume: setFTUEMusicVolume,
    getState: getFTUEMusicState,
  }
}

/**
 * Check if music assets are available
 * Returns false if assets haven't been bundled yet
 */
export async function checkMusicAssetsAvailable(): Promise<boolean> {
  try {
    const tracks = createMusicTracks()
    if (tracks.length === 0) return false

    // Check first track availability
    const response = await fetch(tracks[0].src, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Preload music assets for smoother playback
 * Call during FTUE initialization
 */
export async function preloadMusicAssets(): Promise<void> {
  const tracks = createMusicTracks()

  const preloadPromises = tracks.map(async (track) => {
    try {
      const response = await fetch(track.src)
      await response.arrayBuffer()
    } catch {
      console.warn(`Failed to preload music track: ${track.id}`)
    }
  })

  await Promise.allSettled(preloadPromises)
}
