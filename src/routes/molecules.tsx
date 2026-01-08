import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const MoleculeVisualizer = lazy(() =>
  import('../components/MoleculeVisualizer').then((mod) => ({
    default: mod.MoleculeVisualizer,
  }))
)

export const Route = createFileRoute('/molecules')({
  component: MoleculesPage,
  ssr: false, // Disable SSR - Tauri only works client-side
})

function MoleculesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-slate-900 text-slate-400">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            Loading Molecule Visualizer...
          </div>
        </div>
      }
    >
      <MoleculeVisualizer />
    </Suspense>
  )
}
