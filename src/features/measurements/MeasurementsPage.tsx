import { useAuth } from '../auth/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MeasurementsPage() {
  const { email, logout } = useAuth()

  return (
    <div className="min-h-screen p-8">
      <Card className="mx-auto max-w-4xl bg-white/95 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Measurements</CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{email}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data yet.</p>
        </CardContent>
      </Card>
    </div>
  )
}
