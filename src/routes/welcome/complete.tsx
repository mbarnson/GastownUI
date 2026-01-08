import { createFileRoute } from '@tanstack/react-router'
import CompletionCelebration from '../../components/welcome/CompletionCelebration'

export const Route = createFileRoute('/welcome/complete')({
  component: WelcomeCompletePage,
})

function WelcomeCompletePage() {
  const handlePathSelect = (pathId: string) => {
    console.log('Selected path:', pathId)
    // Could track analytics or perform actions before navigation
  }

  return (
    <CompletionCelebration
      completedSteps={[
        'Installed Gas Town CLI',
        'Configured your workspace',
        'Created your first rig',
        'Set up agent communication',
      ]}
      onPathSelect={handlePathSelect}
      enableVoice={true}
    />
  )
}
