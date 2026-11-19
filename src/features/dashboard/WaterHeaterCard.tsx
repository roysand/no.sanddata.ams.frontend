import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatAge, formatCelsius, formatKw, formatOsloDateTime } from './format'
import { isNotFound, useNow, useWaterHeaterState } from './hooks'
import type { WaterHeaterState } from './types'

/** The API calls a reading stale after 15 minutes; between fetches the card counts on from the last answer. */
const STALE_AFTER_SECONDS = 900

const MODE_LABEL: Partial<Record<WaterHeaterState['specialMode']['mode'], string>> = {
  Holiday: 'Holiday',
  Supercharge: 'Supercharge',
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * The OSO water heater's live state: hot water left, temperatures, heating, special mode and how old the reading is.
 * Renders nothing for a location without a heater.
 */
export function WaterHeaterCard({ locationId }: { locationId: string }) {
  const { data, error, isLoading, dataUpdatedAt } = useWaterHeaterState(locationId)
  const now = useNow(30_000)

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
          />
        )}
      </CardContent>
    </Card>
  )
}

function HeaterFigures({ state, ageSeconds }: { state: WaterHeaterState; ageSeconds: number }) {
  const { hotWater, temperatures, specialMode } = state
  const { availableLitres40: available, maxLitres40: max } = hotWater
  const hasLitres = available !== null && max !== null && max > 0
  const fill = hasLitres ? Math.min(Math.max(available / max, 0), 1) * 100 : 0

  const supply = [
    hotWater.showers !== null ? plural(hotWater.showers, 'shower', 'showers') : null,
    hotWater.baths !== null ? plural(hotWater.baths, 'bath', 'baths') : null,
  ].filter((part) => part !== null)

  const details = [
    temperatures.midCelsius !== null ? `middle ${formatCelsius(temperatures.midCelsius)}` : null,
    temperatures.lowCelsius !== null ? `bottom ${formatCelsius(temperatures.lowCelsius)}` : null,
    state.setPointCelsius !== null ? `set to ${formatCelsius(state.setPointCelsius)}` : null,
  ].filter((part) => part !== null)

  const isOld = state.isStale || ageSeconds > STALE_AFTER_SECONDS
  const showMode = MODE_LABEL[specialMode.mode] !== undefined && specialMode.end !== null

  return (
    <div className="space-y-4">
      {hasLitres && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold tabular-nums">
              {available} of {max} l
            </span>
            <span className="text-xs text-muted-foreground">40 °C water</span>
          </div>
          <div
            role="meter"
            aria-label="Hot water"
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={available}
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${fill}%` }} />
          </div>
        </div>
      )}

      {supply.length > 0 && <p className="text-sm">{supply.join(' · ')}</p>}

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        {temperatures.topCelsius !== null && (
          <div>
            <p className="text-xs text-muted-foreground">Top of the tank</p>
            <p className="text-xl font-bold tabular-nums">
              {formatCelsius(temperatures.topCelsius)}
            </p>
          </div>
        )}
        <p className="text-sm font-medium">
          {state.isHeating ? `Heating · ${formatKw(state.powerKw)}` : 'Not heating'}
        </p>
      </div>
      {details.length > 0 && <p className="text-xs text-muted-foreground">{details.join(' · ')}</p>}

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
