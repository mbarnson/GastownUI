import { useState } from 'react'
import {
  Plus,
  Code,
  FileText,
  GitBranch,
  CheckSquare,
  MessageSquare,
  Workflow,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type { Step, Formula } from '../types/formula'
import { createStep } from '../types/formula'

interface StepTemplate {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  category: string
}

const stepTemplates: StepTemplate[] = [
  {
    id: 'design',
    title: 'Design',
    description: 'Design and plan the implementation approach',
    icon: <FileText className="w-4 h-4" />,
    category: 'Planning',
  },
  {
    id: 'implement',
    title: 'Implement',
    description: 'Write the code to implement the feature',
    icon: <Code className="w-4 h-4" />,
    category: 'Development',
  },
  {
    id: 'test',
    title: 'Test',
    description: 'Write and run tests for the implementation',
    icon: <CheckSquare className="w-4 h-4" />,
    category: 'Development',
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Code review and feedback incorporation',
    icon: <Search className="w-4 h-4" />,
    category: 'Quality',
  },
  {
    id: 'submit',
    title: 'Submit',
    description: 'Submit the work for merge',
    icon: <GitBranch className="w-4 h-4" />,
    category: 'Completion',
  },
  {
    id: 'branch',
    title: 'Branch',
    description: 'Conditional branching based on outcome',
    icon: <Workflow className="w-4 h-4" />,
    category: 'Control Flow',
  },
  {
    id: 'notify',
    title: 'Notify',
    description: 'Send notification or message',
    icon: <MessageSquare className="w-4 h-4" />,
    category: 'Communication',
  },
  {
    id: 'custom',
    title: 'Custom Step',
    description: 'Create a custom step with your own title',
    icon: <Plus className="w-4 h-4" />,
    category: 'Custom',
  },
]

interface StepPaletteProps {
  formula: Formula
  onFormulaChange: (formula: Formula) => void
}

export default function StepPalette({
  formula,
  onFormulaChange,
}: StepPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Planning', 'Development'])
  )
  const [customTitle, setCustomTitle] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Group templates by category
  const categories = stepTemplates.reduce(
    (acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = []
      }
      acc[template.category].push(template)
      return acc
    },
    {} as Record<string, StepTemplate[]>
  )

  // Filter templates by search
  const filteredCategories = Object.entries(categories).reduce(
    (acc, [category, templates]) => {
      const filtered = templates.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
      if (filtered.length > 0) {
        acc[category] = filtered
      }
      return acc
    },
    {} as Record<string, StepTemplate[]>
  )

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  // Add a step from template
  const addStep = (template: StepTemplate, customTitleOverride?: string) => {
    const title = customTitleOverride || template.title
    const description = customTitleOverride
      ? 'Custom step'
      : template.description

    // Find a good position (offset from last step or center)
    let position = { x: 100, y: 100 }
    if (formula.steps.length > 0) {
      const lastStep = formula.steps[formula.steps.length - 1]
      position = {
        x: lastStep.position.x + 50,
        y: lastStep.position.y + 100,
      }
    }

    const newStep = createStep(title, position, description)
    onFormulaChange({
      ...formula,
      steps: [...formula.steps, newStep],
    })

    setShowCustomInput(false)
    setCustomTitle('')
  }

  // Handle drag start for template
  const handleDragStart = (
    e: React.DragEvent,
    template: StepTemplate
  ) => {
    e.dataTransfer.setData('template', JSON.stringify(template))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-white font-semibold mb-3">Step Palette</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search steps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Templates */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(filteredCategories).map(([category, templates]) => (
          <div key={category} className="mb-2">
            <button
              onClick={() => toggleCategory(category)}
              className="flex items-center gap-2 w-full p-2 text-slate-400 hover:text-white transition-colors"
            >
              {expandedCategories.has(category) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="text-xs font-medium uppercase tracking-wide">
                {category}
              </span>
            </button>

            {expandedCategories.has(category) && (
              <div className="space-y-1 ml-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, template)}
                    onClick={() => {
                      if (template.id === 'custom') {
                        setShowCustomInput(true)
                      } else {
                        addStep(template)
                      }
                    }}
                    className="flex items-center gap-3 p-2 bg-slate-900/50 hover:bg-slate-700 rounded-lg cursor-grab transition-colors group"
                  >
                    <div className="p-1.5 bg-slate-700 group-hover:bg-cyan-600 rounded text-slate-400 group-hover:text-white transition-colors">
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {template.title}
                      </p>
                      <p className="text-slate-500 text-xs truncate">
                        {template.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Custom step input */}
        {showCustomInput && (
          <div className="p-3 bg-slate-900 border border-slate-600 rounded-lg mt-2">
            <input
              type="text"
              placeholder="Enter step title..."
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customTitle.trim()) {
                  addStep(stepTemplates.find((t) => t.id === 'custom')!, customTitle.trim())
                }
                if (e.key === 'Escape') {
                  setShowCustomInput(false)
                  setCustomTitle('')
                }
              }}
              autoFocus
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (customTitle.trim()) {
                    addStep(stepTemplates.find((t) => t.id === 'custom')!, customTitle.trim())
                  }
                }}
                disabled={!customTitle.trim()}
                className="flex-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowCustomInput(false)
                  setCustomTitle('')
                }}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drag hint */}
      <div className="p-3 border-t border-slate-700 text-center">
        <p className="text-slate-500 text-xs">
          Drag steps to canvas or click to add
        </p>
      </div>
    </div>
  )
}
