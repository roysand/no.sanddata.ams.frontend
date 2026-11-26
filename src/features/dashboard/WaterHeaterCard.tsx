import { useContext, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatAge, formatCelsius, formatKw, formatOsloDateTime } from './format'
import { isNotFound, useNow, useWaterHeaterState } from './hooks'
import type { WaterHeaterState } from './types'
import { AuthContext } from '../auth/context'
import { WaterHeaterTank } from './WaterHeaterTank'
import { HighDemandSwitch } from './HighDemandSwitch'

/** The API calls a reading stale after 15 minutes; between fetches the card counts on from the last answer. */
const STALE_AFTER_SECONDS = 900

const MODE_LABEL: Partial<Record<WaterHeaterState['specialMode']['mode'], string>> = {
  Holiday: 'Holiday',
  // OSO's status calls it Supercharge; its app and our switch call it High Demand (spec 020).
  Supercharge: 'High Demand',
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * The OSO water heater's live state: hot water left, temperatures, heating, special mode and how old the reading is.
 * Renders nothing for a location without a heater.
 */
export function WaterHeaterCard({ locationId }: { locationId: string }) {
  const { data, error, isLoading, dataUpdatedAt } = useWaterHeaterState(locationId)
  const now = useNow(30_000)
  // The switch is for Admins only (the API answers 403 to others). Read without `useAuth`, so the card still renders
  // where there is no signed-in context, and then shows no switch.
  const isAdmin = useContext(AuthContext)?.roles.includes('Admin') ?? false

  if (isNotFound(error)) return null

  if (isLoading) {
    return (
      <Card aria-label="Loading water heater" aria-busy="true">
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card role="region" aria-label="Water heater">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-extrabold">Water heater</CardTitle>
        {data && MODE_LABEL[data.specialMode.mode] && (
          <Badge variant="secondary">{MODE_LABEL[data.specialMode.mode]}</Badge>
        )}
      </CardHeader>
      <CardContent>
        {/* After an error the old figures are not shown as if they were current. */}
        {error || !data ? (
          <p className="text-sm text-destructive">{error?.message ?? 'No reading'}</p>
        ) : (
          <HeaterFigures
            state={data}
            ageSeconds={data.ageSeconds + Math.max(now - dataUpdatedAt, 0) / 1000}
            control={isAdmin ? <HighDemandSwitch locationId={locationId} state={data} /> : null}
          />
        )}
      </CardContent>
    </Card>
  )
}

function HeaterFigures({
  state,
  ageSeconds,
  control,
}: {
  state: WaterHeaterState
  ageSeconds: number
  /** The High Demand switch, for Admins. */
  control: ReactNode
}) {
  const { hotWater, temperatures, specialMode } = state
  const { availableLitres40: available, maxLitres40: max } = hotWater
  const hasLitres = available !== null && max !== null && max > 0
  const percent = hasLitres ? Math.min(Math.max(available / max, 0), 1) * 100 : null

  const tank = {
    top: temperatures.topCelsius,
    mid: temperatures.midCelsius,
    low: temperatures.lowCelsius,
  }
  const hasTank = hasLitres || Object.values(tank).some((t) => t !== null)

  // The tank shows the temperatures rounded, as OSO does; screen readers get them in full.
  const readout = [
    tank.top !== null ? `top ${formatCelsius(tank.top)}` : null,
    tank.mid !== null ? `middle ${formatCelsius(tank.mid)}` : null,
    tank.low !== null ? `bottom ${formatCelsius(tank.low)}` : null,
  ].filter((part) => part !== null)

  const status = [
    state.isHeating ? `Heating · ${formatKw(state.powerKw)}` : 'Not heating',
    state.setPointCelsius !== null ? `set to ${formatCelsius(state.setPointCelsius)}` : null,
  ].filter((part) => part !== null)

  const isOld = state.isStale || ageSeconds > STALE_AFTER_SECONDS
  const showMode = MODE_LABEL[specialMode.mode] !== undefined && specialMode.end !== null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 space-y-4">
          {hasLitres && (
            <div>
              <p className="text-4xl font-extrabold tabular-nums">
                {available} <span className="text-xl font-bold">l</span>
              </p>
              <p className="text-xs text-muted-foreground">of {max} l · 40 °C water</p>
            </div>
          )}
          {hotWater.showers !== null && (
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {hotWater.showers}{' '}
                <span className="text-base font-semibold">
                  {hotWater.showers === 1 ? 'shower' : 'showers'}
                </span>
              </p>
              {hotWater.baths !== null && (
                <p className="text-xs text-muted-foreground">
                  or {plural(hotWater.baths, 'bath', 'baths')}
                </p>
              )}
            </div>
          )}
          {hotWater.showers === null && hotWater.baths !== null && (
            <p className="text-sm">{plural(hotWater.baths, 'bath', 'baths')}</p>
          )}
        </div>

        {hasTank && (
          <div
            {...(hasLitres && {
              role: 'meter',
              'aria-valuemin': 0,
              'aria-valuemax': max,
              'aria-valuenow': available,
              'aria-valuetext': `${available} of ${max} l, ${Math.round(percent!)} %`,
            })}
            aria-label="Hot water"
          >
            <WaterHeaterTank temperatures={tank} percent={percent} isHeating={state.isHeating} />
            {readout.length > 0 && <span className="sr-only">Tank: {readout.join(', ')}</span>}
          </div>
        )}
      </div>

      <p className="text-sm font-medium">{status.join(' · ')}</p>

      {control}

      {showMode && (
        <p className="text-sm">
          {MODE_LABEL[specialMode.mode]} until {formatOsloDateTime(specialMode.end!)}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {formatAge(ageSeconds)}
        {isOld && <span className="text-destructive"> · Reading is old</span>}
        {!state.isOnline && <span className="text-destructive"> · Heater is offline</span>}
      </p>
    </div>
  )
}
