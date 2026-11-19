import { Navigate } from 'react-router-dom'
import { SELF_SERVICE_ENABLED, useSelectedLocation } from '../locations'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BillCard } from './BillCard'
import { ExportCard } from './ExportCard'
import { HeatmapCard } from './HeatmapCard'
import { StandbyCard } from './StandbyCard'
import { UsageChart } from './UsageChart'

/** The usage chart given the whole screen, the standby usage, usage by hour and weekday, the bill of each month and the CSV export. */
export function HistoryPage() {
  const { all, selected, isLoading, error } = useSelectedLocation()

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" aria-busy="true" />
  if (error) {
    return (
      <Card>
        <CardContent className="text-sm text-destructive">{error.message}</CardContent>
      </Card>
    )
  }
  if (all.length === 0 && SELF_SERVICE_ENABLED) return <Navigate to="/setup" replace />
  if (!selected) {
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          No active location to show history for.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <UsageChart locationId={selected.id} large />
      <StandbyCard locationId={selected.id} />
      <HeatmapCard locationId={selected.id} />
      <BillCard locationId={selected.id} />
      <ExportCard locationId={selected.id} locationName={selected.name} />
    </div>
  )
}
