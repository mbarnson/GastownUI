import { useEffect, useRef } from 'react';
import {
  Molecule,
  MoleculeStep,
  getStepStatusColor,
  getStepStatusIcon,
} from '../hooks/useMolecule';

interface MoleculeVisualizerProps {
  molecule: Molecule;
  compact?: boolean;
}

export function MoleculeVisualizer({ molecule, compact = false }: MoleculeVisualizerProps) {
  const currentStepRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current step
  useEffect(() => {
    if (currentStepRef.current && containerRef.current) {
      currentStepRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [molecule.current_step]);

  const completedSteps = molecule.steps.filter((s) => s.status === 'completed').length;
  const totalSteps = molecule.steps.length;

  return (
    <div className="molecule-visualizer">
      <div className="mol-header">
        <div className="mol-title">
          <h4>{molecule.name}</h4>
          <span className="mol-id">{molecule.id}</span>
        </div>
        <div className="mol-progress">
          <span className="progress-text">
            {completedSteps}/{totalSteps} steps
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${molecule.progress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {molecule.description && !compact && (
        <p className="mol-description">{molecule.description}</p>
      )}

      <div className="steps-container" ref={containerRef}>
        {molecule.steps.map((step, index) => (
          <StepItem
            key={step.id}
            step={step}
            isFirst={index === 0}
            isLast={index === molecule.steps.length - 1}
            isCurrent={step.id === molecule.current_step}
            compact={compact}
            ref={step.id === molecule.current_step ? currentStepRef : undefined}
          />
        ))}
      </div>

      <style>{`
        .molecule-visualizer {
          background: #1a1a2e;
          border-radius: 8px;
          overflow: hidden;
        }

        .mol-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #16213e;
          border-bottom: 1px solid #0f3460;
        }

        .mol-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mol-title h4 {
          margin: 0;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
        }

        .mol-id {
          color: #888;
          font-size: 11px;
          font-family: monospace;
        }

        .mol-progress {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .progress-text {
          color: #888;
          font-size: 12px;
        }

        .progress-bar {
          width: 80px;
          height: 4px;
          background: #0f3460;
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #4ecca3;
          transition: width 0.3s ease;
        }

        .mol-description {
          padding: 8px 16px;
          margin: 0;
          color: #888;
          font-size: 12px;
          border-bottom: 1px solid #0f3460;
        }

        .steps-container {
          padding: 16px;
          max-height: 400px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}

interface StepItemProps {
  step: MoleculeStep;
  isFirst: boolean;
  isLast: boolean;
  isCurrent: boolean;
  compact?: boolean;
}

const StepItem = ({
  step,
  isFirst,
  isLast,
  isCurrent,
  compact,
  ref,
}: StepItemProps & { ref?: React.Ref<HTMLDivElement> }) => {
  const statusColor = getStepStatusColor(step.status);
  const statusIcon = getStepStatusIcon(step.status);

  return (
    <div
      ref={ref}
      className={`step-item ${isCurrent ? 'current' : ''} ${step.status}`}
    >
      <div className="step-connector">
        {!isFirst && <div className="connector-line top" />}
        <div
          className="step-dot"
          style={{ backgroundColor: statusColor, borderColor: statusColor }}
        >
          <span className="step-icon">{statusIcon}</span>
        </div>
        {!isLast && <div className="connector-line bottom" />}
      </div>
      <div className="step-content">
        <div className="step-header">
          <span className="step-title">{step.title}</span>
          {step.agent && (
            <span className="step-agent">{step.agent}</span>
          )}
        </div>
        {!compact && step.description && (
          <p className="step-description">{step.description}</p>
        )}
        {step.status === 'in_progress' && step.started_at && (
          <span className="step-time">Started: {formatTime(step.started_at)}</span>
        )}
        {step.status === 'completed' && step.completed_at && (
          <span className="step-time">Completed: {formatTime(step.completed_at)}</span>
        )}
      </div>

      <style>{`
        .step-item {
          display: flex;
          gap: 12px;
          position: relative;
        }

        .step-item.current {
          background: rgba(249, 200, 70, 0.1);
          margin: -8px;
          padding: 8px;
          border-radius: 6px;
        }

        .step-connector {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 20px;
          flex-shrink: 0;
        }

        .connector-line {
          width: 2px;
          flex: 1;
          background: #0f3460;
        }

        .connector-line.top {
          min-height: 8px;
        }

        .connector-line.bottom {
          min-height: 8px;
        }

        .step-item.completed .connector-line {
          background: #4ecca3;
        }

        .step-dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .step-icon {
          font-size: 10px;
          color: white;
        }

        .step-content {
          flex: 1;
          padding-bottom: 16px;
        }

        .step-header {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .step-title {
          color: #fff;
          font-size: 13px;
          font-weight: 500;
        }

        .step-item.completed .step-title {
          color: #4ecca3;
        }

        .step-item.blocked .step-title {
          color: #e94560;
        }

        .step-agent {
          font-size: 11px;
          color: #888;
          padding: 2px 6px;
          background: #0f3460;
          border-radius: 4px;
        }

        .step-description {
          margin: 4px 0 0 0;
          color: #888;
          font-size: 12px;
        }

        .step-time {
          display: block;
          margin-top: 4px;
          color: #666;
          font-size: 10px;
        }
      `}</style>
    </div>
  );
};

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  } catch {
    return timestamp;
  }
}

// Demo molecule for when no real data is available
export const DEMO_MOLECULE: Molecule = {
  id: 'mol-demo',
  name: 'Feature Implementation',
  description: 'Example workflow showing molecule visualization',
  progress: 0.4,
  status: 'in_progress',
  current_step: 'step-3',
  steps: [
    {
      id: 'step-1',
      title: 'Plan implementation',
      description: 'Design the approach and identify files to modify',
      status: 'completed',
      completed_at: new Date(Date.now() - 3600000).toISOString(),
      dependencies: [],
    },
    {
      id: 'step-2',
      title: 'Write backend code',
      description: 'Implement Rust backend with Tauri commands',
      status: 'completed',
      completed_at: new Date(Date.now() - 1800000).toISOString(),
      dependencies: ['step-1'],
    },
    {
      id: 'step-3',
      title: 'Build frontend component',
      description: 'Create React component with hooks',
      status: 'in_progress',
      agent: 'nux',
      started_at: new Date(Date.now() - 600000).toISOString(),
      dependencies: ['step-2'],
    },
    {
      id: 'step-4',
      title: 'Integration testing',
      description: 'Test end-to-end functionality',
      status: 'pending',
      dependencies: ['step-3'],
    },
    {
      id: 'step-5',
      title: 'Documentation',
      description: 'Update docs and close issue',
      status: 'pending',
      dependencies: ['step-4'],
    },
  ],
};
