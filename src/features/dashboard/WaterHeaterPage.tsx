import { Navigate } from 'react-router-dom'
import { SELF_SERVICE_ENABLED, useSelectedLocation } from '../locations'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { isNotFound, useWaterHeaterState } from './hooks'
import { WaterHeaterCard } from './WaterHeaterCard'
import { HotWaterCard } from './HotWaterCard'
import { WaterHeaterEnergyCard } from './WaterHeaterEnergyCard'

/**
 * The Heater tab: the selected location's water heater, refreshed once a minute while the page is open, and how much
 * energy and money water heating took today and this month.
 */
export function WaterHeaterPage() {
  const { all, selected, isLoading, error } = useSelectedLocation()
  // Same query (and cache) as the card; read here only to tell "no heater" apart.
  const state = useWaterHeaterState(selected?.id)

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" aria-busy="true" />
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
          No active location to show a water heater for.
        </CardContent>
      </Card>
    )
  }

  // The tab is hidden for such a location, but the page can still be reached by switching location or by URL.
  if (isNotFound(state.error)) {
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          No water heater is connected at {selected.name}. An administrator can connect one under
          Admin → Locations.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <WaterHeaterCard locationId={selected.id} />
      {/* Not before the state has said there is a heater, so a location without one makes no extra requests. */}
      {!state.isLoading && <HotWaterCard locationId={selected.id} />}
      {!state.isLoading && <WaterHeaterEnergyCard locationId={selected.id} />}
    </div>
  )
}
