import { useState, useEffect } from 'react';
import {
  useSetupStatus,
  useGoInstructions,
  useBeadsInstructions,
  getCurrentSetupScene,
  SetupScene,
} from '../hooks/useSetup';
import { useSetupPreferences } from '../hooks/useSetupPreferences';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Terminal,
  Copy,
  ExternalLink,
  RefreshCw,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface SetupWizardProps {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const { data: status, isLoading, refetch } = useSetupStatus();
  const { preferences, isLoaded, disableVoice, enableVoice, setLastStep } = useSetupPreferences();
  const scene = getCurrentSetupScene(status, isLoading);

  // Track current step for resume capability
  useEffect(() => {
    if (scene !== 'loading' && scene !== 'complete') {
      setLastStep(scene);
    }
  }, [scene, setLastStep]);

  // Auto-advance when setup is complete
  useEffect(() => {
    if (scene === 'complete') {
      setLastStep(null);
      const timer = setTimeout(onComplete, 1500);
      return () => clearTimeout(timer);
    }
  }, [scene, onComplete, setLastStep]);

  const voiceEnabled = preferences.voiceEnabled;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">
            <span className="text-gray-400">GAS</span>{' '}
            <span className="text-rose-500">TOWN</span>
          </h1>
          <p className="text-gray-400">First-Time Setup</p>

          {/* Voice mode toggle */}
          {isLoaded && scene !== 'complete' && (
            <button
              onClick={voiceEnabled ? disableVoice : enableVoice}
              className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors ${
                voiceEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                  : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
              }`}
              title={voiceEnabled ? 'Voice guidance enabled' : 'Text-only mode'}
            >
              {voiceEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  Voice Enabled
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  Text Only
                </>
              )}
            </button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <StepIndicator
            step={1}
            label="Go"
            status={getStepStatus('go-install', scene, status?.go.installed)}
          />
          <div className="w-12 h-0.5 bg-slate-700" />
          <StepIndicator
            step={2}
            label="Beads"
            status={getStepStatus('beads-install', scene, status?.beads.installed)}
          />
        </div>

        {/* Scene content */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 p-6">
          {scene === 'loading' && <LoadingScene />}
          {scene === 'go-install' && <GoInstallScene onRefresh={refetch} voiceEnabled={voiceEnabled} />}
          {scene === 'beads-install' && <BeadsInstallScene onRefresh={refetch} voiceEnabled={voiceEnabled} />}
          {scene === 'complete' && <CompleteScene />}
        </div>
      </div>
    </div>
  );
}

function getStepStatus(
  targetScene: SetupScene,
  currentScene: SetupScene,
  isInstalled?: boolean
): 'pending' | 'active' | 'complete' {
  if (isInstalled) return 'complete';
  if (currentScene === targetScene) return 'active';
  return 'pending';
}

interface StepIndicatorProps {
  step: number;
  label: string;
  status: 'pending' | 'active' | 'complete';
}

function StepIndicator({ step, label, status }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
          status === 'complete'
            ? 'bg-emerald-500 text-white'
            : status === 'active'
            ? 'bg-rose-500 text-white'
            : 'bg-slate-700 text-gray-400'
        }`}
      >
        {status === 'complete' ? <CheckCircle className="w-5 h-5" /> : step}
      </div>
      <span
        className={`text-sm ${
          status === 'active' ? 'text-white font-medium' : 'text-gray-400'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function LoadingScene() {
  return (
    <div className="text-center py-8">
      <Loader2 className="w-12 h-12 text-rose-500 animate-spin mx-auto mb-4" />
      <p className="text-gray-400">Checking system requirements...</p>
    </div>
  );
}

function GoInstallScene({ onRefresh, voiceEnabled }: { onRefresh: () => void; voiceEnabled: boolean }) {
  const { data: instructions, isLoading } = useGoInstructions();
  const { data: status } = useSetupStatus();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract the main command from instructions
  const mainCommand = instructions?.split('\n')[0] || '';

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-amber-500/20 rounded-lg">
          <XCircle className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Go Required</h2>
          <p className="text-gray-400">
            Gas Town needs Go to run the Beads issue tracker.
          </p>
        </div>
      </div>

      {/* Non-voice mode: Expanded step-by-step instructions */}
      {!voiceEnabled && (
        <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-600 space-y-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <VolumeX className="w-4 h-4 text-gray-400" />
            Step-by-Step Instructions
          </h3>
          <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
            <li>Open your terminal application</li>
            <li>Copy the installation command below</li>
            <li>Paste and run the command in your terminal</li>
            <li>Wait for the installation to complete</li>
            <li>Click "Check Again" when done</li>
          </ol>
        </div>
      )}

      {/* Platform info */}
      {status?.platform && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Terminal className="w-4 h-4" />
          <span>
            Detected: {status.platform.os} ({status.platform.arch})
            {status.platform.package_manager && (
              <> with {status.platform.package_manager}</>
            )}
          </span>
        </div>
      )}

      {/* Installation instructions */}
      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Installation command:</span>
          <button
            onClick={() => copyToClipboard(mainCommand)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <Copy className="w-3 h-3" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <code className="block text-emerald-400 font-mono text-sm whitespace-pre-wrap">
          {isLoading ? 'Loading...' : mainCommand}
        </code>
      </div>

      {/* Full instructions */}
      {instructions && instructions.includes('\n') && (
        <details className="group">
          <summary className="text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
            Show full instructions
          </summary>
          <pre className="mt-2 p-3 bg-slate-900/50 rounded-lg text-xs text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto">
            {instructions}
          </pre>
        </details>
      )}

      {/* Error message if any */}
      {status?.go.error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{status.go.error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <a
          href="https://go.dev/dl/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Download from go.dev
        </a>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Check Again
        </button>
      </div>
    </div>
  );
}

function BeadsInstallScene({ onRefresh, voiceEnabled }: { onRefresh: () => void; voiceEnabled: boolean }) {
  const { data: instructions, isLoading } = useBeadsInstructions();
  const { data: status } = useSetupStatus();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mainCommand = 'go install github.com/steveyegge/beads/cmd/bd@latest';

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-emerald-500/20 rounded-lg">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Go Installed!</h2>
          <p className="text-gray-400">
            Now let's install Beads for issue tracking.
          </p>
        </div>
      </div>

      {/* Go version */}
      {status?.go.version && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle className="w-4 h-4" />
          <span>Go {status.go.version} detected at {status.go.path}</span>
        </div>
      )}

      {/* Non-voice mode: Expanded step-by-step instructions */}
      {!voiceEnabled && (
        <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-600 space-y-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <VolumeX className="w-4 h-4 text-gray-400" />
            Step-by-Step Instructions
          </h3>
          <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
            <li>Open your terminal application</li>
            <li>Copy the go install command below</li>
            <li>Paste and run the command in your terminal</li>
            <li>Ensure <code className="bg-slate-800 px-1 rounded">$(go env GOPATH)/bin</code> is in your PATH</li>
            <li>Click "Check Again" when done</li>
          </ol>
        </div>
      )}

      {/* Installation instructions */}
      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Installation command:</span>
          <button
            onClick={() => copyToClipboard(mainCommand)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <Copy className="w-3 h-3" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <code className="block text-emerald-400 font-mono text-sm">
          {isLoading ? 'Loading...' : mainCommand}
        </code>
      </div>

      {/* PATH reminder */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <p className="text-sm text-amber-400">
          <strong>PATH Note:</strong> Make sure <code className="bg-slate-800 px-1 rounded">$(go env GOPATH)/bin</code> is in your PATH.
        </p>
      </div>

      {/* Full instructions */}
      {instructions && instructions.includes('\n') && (
        <details className="group">
          <summary className="text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
            Show full instructions
          </summary>
          <pre className="mt-2 p-3 bg-slate-900/50 rounded-lg text-xs text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto">
            {instructions}
          </pre>
        </details>
      )}

      {/* Error message if any */}
      {status?.beads.error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{status.beads.error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <a
          href="https://github.com/steveyegge/beads"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Beads on GitHub
        </a>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Check Again
        </button>
      </div>
    </div>
  );
}

function CompleteScene() {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-10 h-10 text-emerald-400" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Setup Complete!</h2>
      <p className="text-gray-400">All dependencies installed. Starting Gas Town...</p>
    </div>
  );
}

export default SetupWizard;
