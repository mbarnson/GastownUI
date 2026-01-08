import { Volume2, VolumeX, Bell, BellOff, Music } from 'lucide-react'
import { useAudioSettings, useAudioCues } from '../hooks/useAudioCues'
import type { AudioSettings as AudioSettingsType } from '../services/audio'

interface AudioSettingsProps {
  /** Optional class name */
  className?: string
}

/**
 * Audio settings panel for configuring earcons and sound preferences
 *
 * Features:
 * - Master volume control
 * - Enable/disable all sounds
 * - Enable/disable earcons specifically
 * - Sound scheme selection
 * - Test button to preview sounds
 *
 * @example
 * ```tsx
 * <AudioSettings className="p-4" />
 * ```
 */
export function AudioSettings({ className = '' }: AudioSettingsProps) {
  const {
    settings,
    toggleEnabled,
    toggleEarcons,
    setVolume,
    setSoundScheme,
  } = useAudioSettings()
  const { play } = useAudioCues()

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value))
  }

  const handleTestSound = () => {
    play('notification')
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
        <Volume2 className="w-5 h-5" />
        Audio Settings
      </h3>

      {/* Master Toggle */}
      <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
        <div className="flex items-center gap-3">
          {settings.enabled ? (
            <Volume2 className="w-5 h-5 text-blue-400" />
          ) : (
            <VolumeX className="w-5 h-5 text-slate-500" />
          )}
          <div>
            <div className="font-medium text-slate-200">Sound Effects</div>
            <div className="text-sm text-slate-400">
              Enable audio cues for status changes
            </div>
          </div>
        </div>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={toggleEnabled}
          className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
        />
      </label>

      {settings.enabled && (
        <>
          {/* Volume Slider */}
          <div className="p-3 bg-slate-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">Volume</span>
              <span className="text-sm text-slate-400">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={handleVolumeChange}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Earcons Toggle */}
          <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
            <div className="flex items-center gap-3">
              {settings.earcons ? (
                <Bell className="w-5 h-5 text-amber-400" />
              ) : (
                <BellOff className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <div className="font-medium text-slate-200">Earcons</div>
                <div className="text-sm text-slate-400">
                  Short audio cues for events
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.earcons}
              onChange={toggleEarcons}
              className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
            />
          </label>

          {/* Sound Scheme */}
          <div className="p-3 bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Music className="w-5 h-5 text-purple-400" />
              <span className="font-medium text-slate-200">Sound Scheme</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['default', 'minimal', 'spatial'] as const).map((scheme) => (
                <button
                  key={scheme}
                  onClick={() => setSoundScheme(scheme)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.soundScheme === scheme
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {settings.soundScheme === 'default' &&
                'Standard earcons for all events'}
              {settings.soundScheme === 'minimal' &&
                'Shorter, subtle sounds'}
              {settings.soundScheme === 'spatial' &&
                'Optimized for VisionOS spatial audio'}
            </p>
          </div>

          {/* Test Sound */}
          <button
            onClick={handleTestSound}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Bell className="w-4 h-4" />
            Test Sound
          </button>
        </>
      )}
    </div>
  )
}

/**
 * Compact audio toggle button for headers/toolbars
 *
 * @example
 * ```tsx
 * <AudioToggle />
 * ```
 */
export function AudioToggle({ className = '' }: { className?: string }) {
  const { settings, toggleEnabled } = useAudioSettings()

  return (
    <button
      onClick={toggleEnabled}
      className={`p-2 rounded-lg transition-colors ${
        settings.enabled
          ? 'text-blue-400 hover:bg-blue-500/10'
          : 'text-slate-500 hover:bg-slate-700'
      } ${className}`}
      title={settings.enabled ? 'Mute sounds' : 'Enable sounds'}
      aria-label={settings.enabled ? 'Mute sounds' : 'Enable sounds'}
    >
      {settings.enabled ? (
        <Volume2 className="w-5 h-5" />
      ) : (
        <VolumeX className="w-5 h-5" />
      )}
    </button>
  )
}

/**
 * Volume slider with icon
 *
 * @example
 * ```tsx
 * <VolumeControl />
 * ```
 */
export function VolumeControl({ className = '' }: { className?: string }) {
  const { settings, setVolume, toggleEnabled } = useAudioSettings()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setVolume(value)
    // Auto-enable if volume > 0
    if (value > 0 && !settings.enabled) {
      toggleEnabled()
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={toggleEnabled}
        className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
        aria-label={settings.enabled ? 'Mute' : 'Unmute'}
      >
        {settings.enabled && settings.volume > 0 ? (
          <Volume2 className="w-4 h-4" />
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={settings.enabled ? settings.volume : 0}
        onChange={handleChange}
        className="w-20 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500"
        aria-label="Volume"
      />
    </div>
  )
}
