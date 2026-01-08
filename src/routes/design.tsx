import { createFileRoute } from '@tanstack/react-router'
import { FormulaDesigner } from '../components/design'

export const Route = createFileRoute('/design')({
  component: DesignPage,
  // Disable SSR for this route - React Flow needs client-side rendering
  ssr: false,
})

function DesignPage() {
  return <FormulaDesigner />
}
