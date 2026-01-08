import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SetupWizard } from '../components/SetupWizard'

export const Route = createFileRoute('/setup')({
  component: SetupPage,
})

function SetupPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-12 px-6">
      <SetupWizard
        onComplete={() => {
          navigate({ to: '/' })
        }}
      />
    </div>
  )
}
