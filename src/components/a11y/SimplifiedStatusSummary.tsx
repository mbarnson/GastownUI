import { Check, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { useSimplifyMode, getSimplifiedStatus } from '../../contexts/SimplifyModeContext'

interface StatusCounts {
  working?: number
  waiting?: number
  done?: number
  stuck?: number
}

interface SimplifiedStatusSummaryProps {
  /** Status counts to display */
  counts: StatusCounts
  /** Optional title */
  title?: string
  /** Additional class names */
  className?: string
}

/**
 * A clear, easy-to-understand status summary
 * Shows simple counts with clear labels and icons
 */
export default function SimplifiedStatusSummary({
  counts,
  title,
  className = '',
}: SimplifiedStatusSummaryProps) {
  const { isSimplified } = useSimplifyMode()

  const items = [
    {
      key: 'working',
      count: counts.working || 0,
      label: isSimplified ? 'Working' : 'In Progress',
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    },
    {
      key: 'waiting',
      count: counts.waiting || 0,
      label: isSimplified ? 'Waiting' : 'Pending',
      icon: <Clock className="w-4 h-4" />,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
    },
    {
      key: 'done',
      count: counts.done || 0,
      label: isSimplified ? 'Done' : 'Completed',
      icon: <Check className="w-4 h-4" />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
    {
      key: 'stuck',
      count: counts.stuck || 0,
      label: isSimplified ? 'Stuck' : 'Blocked',
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
    },
  ].filter((item) => item.count > 0)

  if (items.length === 0) {
    return (
      <div className={`text-slate-500 text-sm ${className}`}>
        {isSimplified ? 'Nothing happening' : 'No activity'}
      </div>
    )
  }

  return (
    <div className={className}>
      {title && (
        <h3 className="text-sm font-medium text-slate-400 mb-2">{title}</h3>
      )}
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <div
            key={item.key}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg
              ${item.bgColor}
            `}
          >
            <span className={item.color}>{item.icon}</span>
            <span className="text-white font-semibold">{item.count}</span>
            <span className="text-slate-300 text-sm">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * A single-line summary for compact spaces
 */
export function CompactStatusSummary({ counts }: { counts: StatusCounts }) {
  const { isSimplified } = useSimplifyMode()

  const total = (counts.working || 0) + (counts.waiting || 0) + (counts.done || 0) + (counts.stuck || 0)
  const done = counts.done || 0

  if (total === 0) {
    return <span className="text-slate-500">{isSimplified ? 'Empty' : 'No items'}</span>
  }

  const percentDone = Math.round((done / total) * 100)

  return (
    <span className="text-slate-300">
      {isSimplified ? (
        <>
          {done} of {total} done
          {percentDone > 0 && <span className="text-green-400 ml-1">({percentDone}%)</span>}
        </>
      ) : (
        <>
          {done}/{total} completed
          {counts.stuck ? <span className="text-red-400 ml-1">({counts.stuck} blocked)</span> : null}
        </>
      )}
    </span>
  )
}

/**
 * Progress bar with clear percentage
 */
export function ClearProgressBar({
  current,
  total,
  label,
  className = '',
}: {
  current: number
  total: number
  label?: string
  className?: string
}) {
  const { isSimplified } = useSimplifyMode()
  const percent = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400">{label}</span>
          <span className="text-slate-300">
            {isSimplified ? `${percent}%` : `${current} of ${total} (${percent}%)`}
          </span>
        </div>
      )}
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label ? `${label}: ${percent}%` : `${percent}%`}
        />
      </div>
    </div>
  )
}
