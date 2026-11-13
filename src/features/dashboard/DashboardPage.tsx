import { Link, Navigate } from 'react-router-dom'
import { SELF_SERVICE_ENABLED, useSelectedLocation } from '../locations'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { NowCard } from './NowCard'
import { PriceTimeline } from './PriceTimeline'
import { UsageChart } from './UsageChart'

export function DashboardPage() {
  const { all, selected, isLoading, error } = useSelectedLocation()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-sm text-destructive">{error.message}</CardContent>
      </Card>
    )
  }

  if (all.length === 0) {
    if (SELF_SERVICE_ENABLED) return <Navigate to="/setup" replace />
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          No locations are linked to your account yet. Ask an administrator to give you access.
        </CardContent>
      </Card>
    )
  }

  // Owners also receive their inactive locations (to reactivate them under My locations); the dashboard
  // shows only active ones.
  if (!selected) {
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          All your locations are inactive. Activate one under{' '}
          <Link to="/locations/manage" className="underline">
            My locations
          </Link>
          .
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <NowCard locationId={selected.id} />
      <PriceTimeline locationId={selected.id} />
      <UsageChart locationId={selected.id} />
    </div>
  )
}
