import { useColorBlindMode, ColorBlindMode, colorPalettes } from '../hooks/useColorBlindMode';
import { Eye, Palette, Check } from 'lucide-react';

interface ColorBlindSettingsProps {
  compact?: boolean;
}

const modeLabels: Record<ColorBlindMode, { name: string; description: string }> = {
  normal: {
    name: 'Normal',
    description: 'Default color vision',
  },
  deuteranopia: {
    name: 'Deuteranopia',
    description: 'Red-green (green-weak)',
  },
  protanopia: {
    name: 'Protanopia',
    description: 'Red-green (red-weak)',
  },
  tritanopia: {
    name: 'Tritanopia',
    description: 'Blue-yellow',
  },
  'high-contrast': {
    name: 'High Contrast',
    description: 'Maximum visibility',
  },
};

export function ColorBlindSettings({ compact = false }: ColorBlindSettingsProps) {
  const {
    preferences,
    isLoaded,
    setMode,
    togglePatterns,
    toggleShapes,
  } = useColorBlindMode();

  if (!isLoaded) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-gray-400" />
        <select
          value={preferences.mode}
          onChange={(e) => setMode(e.target.value as ColorBlindMode)}
          className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600"
          aria-label="Color blind mode"
        >
          {(Object.keys(modeLabels) as ColorBlindMode[]).map((mode) => (
            <option key={mode} value={mode}>
              {modeLabels[mode].name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-white">
        <Palette className="w-5 h-5" />
        <h3 className="font-medium">Color Vision</h3>
      </div>

      {/* Mode selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(Object.keys(modeLabels) as ColorBlindMode[]).map((mode) => {
          const { name, description } = modeLabels[mode];
          const palette = colorPalettes[mode];
          const isSelected = preferences.mode === mode;

          return (
            <button
              key={mode}
              onClick={() => setMode(mode)}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                isSelected
                  ? 'border-rose-500 bg-rose-500/10'
                  : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
              }`}
              aria-pressed={isSelected}
            >
              {/* Color preview */}
              <div className="flex gap-1 mt-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: palette.success }}
                  aria-hidden="true"
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: palette.warning }}
                  aria-hidden="true"
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: palette.error }}
                  aria-hidden="true"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isSelected ? 'text-rose-400' : 'text-white'}`}>
                    {name}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-rose-400" />}
                </div>
                <span className="text-xs text-gray-400">{description}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Additional options */}
      <div className="space-y-2 pt-2 border-t border-slate-700">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.useShapes}
            onChange={toggleShapes}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-rose-500 focus:ring-rose-500"
          />
          <span className="text-sm text-gray-300">
            Use shapes for status indicators
            <span className="ml-2 text-gray-500">(✓ ⚠ ✕)</span>
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.usePatterns}
            onChange={togglePatterns}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-rose-500 focus:ring-rose-500"
          />
          <span className="text-sm text-gray-300">
            Use patterns in progress bars
          </span>
        </label>
      </div>

      {/* Preview */}
      <div className="p-3 bg-slate-900/50 rounded-lg space-y-2">
        <span className="text-xs text-gray-400">Preview:</span>
        <div className="flex gap-4 text-sm">
          <span className="status-indicator status-success">Success</span>
          <span className="status-indicator status-warning">Warning</span>
          <span className="status-indicator status-error">Error</span>
          <span className="status-indicator status-info">Info</span>
        </div>
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full progress-fill rounded-full"
            style={{
              width: '60%',
              backgroundColor: colorPalettes[preferences.mode].success,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default ColorBlindSettings;
