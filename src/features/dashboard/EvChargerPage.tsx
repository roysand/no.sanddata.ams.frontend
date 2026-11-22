import { useEffect, useState, type ReactNode } from 'react'
import { CheckIcon } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { SELF_SERVICE_ENABLED, useSelectedLocation, type LocationSummary } from '../locations'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { carMonth, formatDuration, sessionTimes } from './evCharger'
import { formatKwh, formatOsloDate, osloToday } from './format'
import { useCarMonth, useEvChargerInclude, useEvChargerSessions } from './hooks'

const NO_CHARGING = 'No charging yet'

/** How long "Saved" stays beside the checkbox after a change is saved. */
const SAVED_SHOWN_MS = 4000

/**
 * The Car tab (spec 013): what the selected location's car charger charged today and this month, in kWh only, and the
 * completed sessions of the last 30 days. Shown in the tab bar only for a location with a charger.
 */
export function EvChargerPage() {
  const { all, selected, isLoading, error } = useSelectedLocation()

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
          No active location to show a car charger for.
        </CardContent>
      </Card>
    )
  }
  // The tab is hidden for such a location, but the page can still be reached by switching location or by URL.
  if (!selected.hasEvCharger) {
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          No car charger is connected at {selected.name}. An administrator can connect one under
          Admin → Locations.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <ChargingCard location={selected} />
      <SessionsCard locationId={selected.id} />
    </div>
  )
}

function ChargingCard({ location }: { location: LocationSummary }) {
  const days = useCarMonth(location.id)
  const figures = days.data ? carMonth(days.data.items, osloToday()) : null

  return (
    <section aria-label="Charging">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-extrabold">Charging</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <IncludeCarCheckbox location={location} />
          {days.isLoading ? (
            <Skeleton className="h-12 w-full" aria-label="Loading charging" />
          ) : days.error ? (
            <p className="text-sm text-destructive">{days.error.message}</p>
          ) : (
            figures && (
              <>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Today</dt>
                  <dd className="text-right font-semibold tabular-nums">
                    {figures.today === null ? NO_CHARGING : formatKwh(figures.today)}
                  </dd>
                  <dt className="text-muted-foreground">This month</dt>
                  <dd className="text-right font-semibold tabular-nums">
                    {figures.month === null ? NO_CHARGING : formatKwh(figures.month)}
                    {figures.since && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        since {formatOsloDate(`${figures.since}T12:00:00Z`)}
                      </span>
                    )}
                  </dd>
                </dl>
                {figures.hoursWithoutReading > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {figures.hoursWithoutReading === 1
                      ? '1 hour of charging had no house reading and is not in the hour-by-hour chart.'
                      : `${figures.hoursWithoutReading} hours of charging had no house reading and are not in the hour-by-hour chart.`}
                  </p>
                )}
              </>
            )
          )}
          <p className="text-xs text-muted-foreground">
            A charge in progress shows here about 15 minutes after it ends.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}

function SessionsCard({ locationId }: { locationId: string }) {
  const sessions = useEvChargerSessions(locationId)
  const items = sessions.data?.items ?? []

  let body: ReactNode
  if (sessions.isLoading) body = <Skeleton className="h-24 w-full" aria-label="Loading sessions" />
  else if (sessions.error)
    body = <p className="text-sm text-destructive">{sessions.error.message}</p>
  else if (items.length === 0)
    body = (
      <p className="text-sm text-muted-foreground">
        No completed charging sessions in the last 30 days.
      </p>
    )
  else
    body = (
      <ul aria-label="Charging sessions" className="divide-y text-sm">
        {items.map((session) => {
          const times = sessionTimes(session)
          return (
            <li key={session.start} className="flex items-start justify-between gap-3 py-2">
              <span className="space-x-2">
                <span>
                  {times.date} · {times.from}–{times.to}
                </span>
                {session.estimated && <Badge variant="secondary">estimated</Badge>}
              </span>
              <span className="text-right tabular-nums">
                <span className="block font-semibold">{formatKwh(session.kwh)}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatDuration(times.minutes)}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-extrabold">Sessions, last 30 days</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  )
}

/**
 * The location's "count the car charger with the house" setting (FR-011–FR-013). It saves as soon as it is changed,
 * with "Saving…" and then "Saved" for a few seconds so the change is seen to stick. While saving it shows the value
 * being sent; after a failure it shows the location's value again. The owner check is UX only: the API answers 403.
 */
function IncludeCarCheckbox({ location }: { location: LocationSummary }) {
  const { roles } = useAuth()
  const save = useEvChargerInclude(location.id)
  const mayChange = location.role === 'Owner' || roles.includes('Admin')
  const checked = save.isPending ? save.variables : location.includeEvCharger
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (savedAt === null) return
    const timer = setTimeout(() => setSavedAt(null), SAVED_SHOWN_MS)
    return () => clearTimeout(timer)
  }, [savedAt])

  const change = (include: boolean) => {
    setSavedAt(null)
    save.mutate(include, { onSuccess: () => setSavedAt(Date.now()) })
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <Checkbox
          id="include-ev-charger"
          checked={checked}
          disabled={!mayChange || save.isPending}
          onCheckedChange={(value) => change(value === true)}
        />
        <Label htmlFor="include-ev-charger">Count the car charger with the house</Label>
        <span role="status" className="ml-auto text-xs text-muted-foreground">
          {save.isPending ? (
            'Saving…'
          ) : savedAt !== null ? (
            <span className="inline-flex items-center gap-1 text-price-cheap">
              <CheckIcon className="size-3.5" aria-hidden="true" />
              Saved
            </span>
          ) : null}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        In kWh only. Costs and the bill stay the house's own.
      </p>
      {!mayChange && (
        <p className="text-xs text-muted-foreground">Only the owner can change this.</p>
      )}
      {save.error && <p className="text-sm text-destructive">{save.error.message}</p>}
    </div>
  )
}
