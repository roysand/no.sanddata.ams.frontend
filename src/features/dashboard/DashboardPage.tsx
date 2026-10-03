import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CurrentHourCard } from './CurrentHourCard'
import { DailyCostChart } from './DailyCostChart'
import { HourlyCostChart } from './HourlyCostChart'
import { LocationPicker } from './LocationPicker'
import { PowerChart } from './PowerChart'
import { useLocations } from './hooks'

const SELECTED_LOCATION_KEY = 'ams.selectedLocation'

export function DashboardPage() {
  const { data: locations, isLoading, error } = useLocations()
  const [chosenId, setChosenId] = useState<string | null>(() =>
    localStorage.getItem(SELECTED_LOCATION_KEY),
  )

  if (isLoading) return <p className="text-center text-sm text-white">Loading…</p>

  if (error) {
    return (
      <Card className="mx-auto max-w-4xl bg-white/95 shadow-lg">
        <CardContent className="pt-6 text-sm text-destructive">{error.message}</CardContent>
      </Card>
    )
  }

  if (!locations || locations.length === 0) {
    return (
      <Card className="mx-auto max-w-4xl bg-white/95 shadow-lg">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          No locations are linked to your account yet. Ask an administrator to give you access.
        </CardContent>
      </Card>
    )
  }

  // Fall back to the first location when nothing (or a location we no longer have access to) is remembered.
  const selected = locations.find((location) => location.id === chosenId) ?? locations[0]

  const choose = (locationId: string) => {
    localStorage.setItem(SELECTED_LOCATION_KEY, locationId)
    setChosenId(locationId)
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white drop-shadow">{selected.name}</h1>
          <p className="text-sm text-white/80 drop-shadow">
            {selected.address} · price zone {selected.zone}
          </p>
        </div>
        <LocationPicker locations={locations} value={selected.id} onChange={choose} />
      </div>

      <CurrentHourCard locationId={selected.id} />
      <PowerChart locationId={selected.id} />
      <HourlyCostChart locationId={selected.id} />
      <DailyCostChart locationId={selected.id} />
    </div>
  )
}
