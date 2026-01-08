import { useState, useEffect, useRef } from 'react'
import { X, Plus, Bug, Sparkles, ListTodo, AlertCircle } from 'lucide-react'
import { useKeyboardShortcut, formatShortcut, shortcuts } from '../hooks/useKeyboardShortcut'
import { useLiveRegion } from './a11y/LiveRegion'

type BeadType = 'task' | 'bug' | 'feature' | 'epic'
type Priority = 0 | 1 | 2 | 3 | 4

interface QuickCreateModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the modal should close */
  onClose: () => void
  /** Called when a bead is created */
  onCreate: (bead: { title: string; type: BeadType; priority: Priority }) => void
  /** Default rig to create in */
  defaultRig?: string
}

const typeOptions: { value: BeadType; label: string; icon: React.ReactNode }[] = [
  { value: 'task', label: 'Task', icon: <ListTodo className="w-4 h-4" /> },
  { value: 'bug', label: 'Bug', icon: <Bug className="w-4 h-4" /> },
  { value: 'feature', label: 'Feature', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'epic', label: 'Epic', icon: <AlertCircle className="w-4 h-4" /> },
]

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 0, label: 'P0 Critical', color: 'bg-red-500' },
  { value: 1, label: 'P1 High', color: 'bg-orange-500' },
  { value: 2, label: 'P2 Medium', color: 'bg-yellow-500' },
  { value: 3, label: 'P3 Low', color: 'bg-blue-500' },
  { value: 4, label: 'P4 Backlog', color: 'bg-slate-500' },
]

export default function QuickCreateModal({
  isOpen,
  onClose,
  onCreate,
  defaultRig,
}: QuickCreateModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<BeadType>('task')
  const [priority, setPriority] = useState<Priority>(2)
  const inputRef = useRef<HTMLInputElement>(null)
  const { announce } = useLiveRegion()

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      announce('Quick create bead dialog opened')
    }
  }, [isOpen, announce])

  // Close on Escape
  useKeyboardShortcut({
    key: 'Escape',
    onTrigger: onClose,
    enabled: isOpen,
  })

  // Submit on Cmd+Enter
  useKeyboardShortcut({
    key: 'Enter',
    modifiers: ['meta'],
    onTrigger: handleSubmit,
    enabled: isOpen && title.trim().length > 0,
  })

  function handleSubmit() {
    if (!title.trim()) return

    onCreate({ title: title.trim(), type, priority })
    announce(`Created ${type}: ${title}`)

    // Reset form
    setTitle('')
    setType('task')
    setPriority(2)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-create-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-slate-900 rounded-xl shadow-2xl border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 id="quick-create-title" className="text-lg font-semibold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" />
            Quick Create Bead
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Title input */}
          <div>
            <label htmlFor="bead-title" className="sr-only">
              Title
            </label>
            <input
              ref={inputRef}
              id="bead-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              autoComplete="off"
            />
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Type</label>
            <div className="flex gap-2">
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setType(option.value)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
                    ${
                      type === option.value
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                    }
                  `}
                  aria-pressed={type === option.value}
                >
                  {option.icon}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Priority selector */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Priority</label>
            <div className="flex gap-2">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPriority(option.value)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
                    ${
                      priority === option.value
                        ? 'bg-slate-700 border-white/30 text-white'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                    }
                  `}
                  aria-pressed={priority === option.value}
                >
                  <span className={`w-2 h-2 rounded-full ${option.color}`} />
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Rig indicator */}
          {defaultRig && (
            <div className="text-sm text-slate-500">
              Creating in: <span className="text-slate-300">{defaultRig}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 bg-slate-800/50 rounded-b-xl">
          <div className="text-sm text-slate-500">
            <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">
              {formatShortcut('Enter', ['meta'])}
            </kbd>
            {' '}to create
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to manage quick create modal state with keyboard shortcut
 */
export function useQuickCreate() {
  const [isOpen, setIsOpen] = useState(false)

  // Open with Cmd+N
  useKeyboardShortcut({
    ...shortcuts.quickCreate,
    onTrigger: () => setIsOpen(true),
    enabled: !isOpen,
  })

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }
}
