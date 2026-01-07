import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const TmuxPanel = lazy(() =>
  import('../components/TmuxPanel').then((mod) => ({ default: mod.TmuxPanel }))
)

export const Route = createFileRoute('/tmux')({
  component: TmuxPage,
  ssr: false, // Disable SSR for this route - Tauri only works client-side
})

function TmuxPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto">
        <Suspense
          fallback={
            <div className="p-6 flex items-center justify-center text-slate-400">
              Loading Tmux Panel...
            </div>
          }
        >
          <TmuxPanel />
        </Suspense>
      </div>
    </div>
  )
}
