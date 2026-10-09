import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SetupWizard } from './SetupWizard'

export function SetupPage() {
  return (
    <Card className="mx-auto max-w-xl bg-white/95 shadow-lg">
      <CardHeader>
        <CardTitle>Set up your location</CardTitle>
      </CardHeader>
      <CardContent>
        <SetupWizard />
      </CardContent>
    </Card>
  )
}
