import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SetupWizard } from '../components/SetupWizard'

export const Route = createFileRoute('/setup')({
  component: SetupPage,
})

function SetupPage() {
  const navigate = useNavigate()

  const handleComplete = () => {
    navigate({ to: '/' })
  }

  return <SetupWizard onComplete={handleComplete} />
}
