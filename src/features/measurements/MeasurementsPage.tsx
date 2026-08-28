import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MeasurementsPage() {
  return (
    <Card className="mx-auto max-w-4xl bg-white/95 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Measurements</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">No data yet.</p>
      </CardContent>
    </Card>
  )
}
