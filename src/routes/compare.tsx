import { createFileRoute, Link } from '@tanstack/react-router'
import { RigComparisonView } from '../components/RigComparisonView'
import { ArrowLeft, GitCompare } from 'lucide-react'

export const Route = createFileRoute('/compare')({ component: ComparePage })

function ComparePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <div className="border-l border-slate-600 h-6" />
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-rose-500" />
              <h1 className="text-xl font-bold text-white">Rig Comparison</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              Compare rig status side-by-side
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <RigComparisonView className="min-h-[calc(100vh-12rem)]" />
      </main>
    </div>
  )
}
