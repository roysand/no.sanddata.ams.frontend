import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EvChargerPicture } from './EvChargerPicture'
import { liveView, type LiveView } from './evCharger'
import { isNotFound, useEvChargerState, useNow } from './hooks'

/**
 * The Car tab's top tile (spec 017): the charger drawn, what it is doing right now, its figures and how long ago it
 * was read. Asked every 3 minutes. Nothing for a location without a charger or one the user may not see.
 */
export function EvChargerStateCard({ locationId }: { locationId: string }) {
  const { data, error, isLoading } = useEvChargerState(locationId)
  const now = useNow(30_000)

  if (isNotFound(error) || data?.state === 'noCharger') return null

  if (isLoading) {
    return (
      <Card aria-label="Loading the charger's state" aria-busy="true">
        <CardContent className="space-y-3">
          <Skeleton className="mx-auto h-32 w-full max-w-sm" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  // After a failed read the last state is not shown, so an old state never looks current (research R3).
  const view = !error && data ? liveView(data, new Date(now)) : null

  return (
    <section aria-label="Charger now">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-extrabold">Charger now</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <EvChargerPicture mode={view?.picture ?? 'faded'} />
          {view ? (
            <LiveDetails view={view} />
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              The charger&apos;s state is unavailable right now.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

/** The state, its figures and how long ago it was read, centred under the Car tab's drawing. */
function LiveDetails({ view }: { view: LiveView }) {
  return (
    <div className="space-y-1 text-center">
      <p className="text-lg font-bold">{view.heading}</p>
      {view.details.length > 0 && (
        <p className="text-sm tabular-nums">{view.details.join(' · ')}</p>
      )}
      {view.age && <p className="text-xs text-muted-foreground">{view.age}</p>}
    </div>
  )
}

/**
 * The Now page's car tile (spec 017, amended 2026-11-25): the Car tab's figures on three lines with a small drawing
 * on the right, and the age; without the state's heading. Shown only while the car charges. Nothing in any other state, while loading or after a failed read. Render it only for a
 * location with a charger, so nothing is asked otherwise.
 */
export function CarChargingCard({ locationId }: { locationId: string }) {
  const { data, error } = useEvChargerState(locationId)
  const now = useNow(30_000)
  const view = !error && data?.state === 'charging' ? liveView(data, new Date(now)) : null
  if (!view) return null

  return (
    <section aria-label="Car charging">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-extrabold">Car charging</CardTitle>
        </CardHeader>
        {/* The title already says the car is charging, so the state's heading is left out (Roy, 2026-11-25). */}
        <CardContent className="flex items-center justify-between gap-4">
          <div className="min-w-0 space-y-0.5">
            {/* A line too long for a phone wraps between its parts, never inside one. */}
            {view.lines.map((parts) => (
              <p key={parts.join()} className="text-sm tabular-nums">
                {parts.map((part, i) => (
                  <span key={part}>
                    {i > 0 && ' '}
                    <span className="whitespace-nowrap">
                      {part}
                      {i < parts.length - 1 && ' ·'}
                    </span>
                  </span>
                ))}
              </p>
            ))}
            {view.age && <p className="pt-1 text-xs text-muted-foreground">{view.age}</p>}
          </div>
          <EvChargerPicture
            mode={view.picture}
            cropped
            className="block h-auto w-28 shrink-0 sm:w-36"
          />
        </CardContent>
      </Card>
    </section>
  )
}
