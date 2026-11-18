import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { cheapestWindow, type PriceWindow, type RatedHour } from './cheapest'
import { formatClock, formatRate, lastOsloDays } from './format'
import { useDayPrices } from './hooks'
import { addDays } from './periods'
import type { DayPrices } from './types'

const STORAGE_KEY = 'ams.cheapest'
const LENGTHS = ['1', '2', '3', '4'] as const
type Length = (typeof LENGTHS)[number]

function readLength(): Length {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return LENGTHS.find((length) => length === stored) ?? '3'
  } catch {
    return '3'
  }
}

function toRated(day: DayPrices | undefined, tomorrow: boolean): RatedHour[] {
  return (day?.items ?? []).map((item) => ({
    hourStart: item.hourStart,
    rate: item.ratePerKwh,
    tomorrow,
  }))
}

const percent = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })

function when(window: PriceWindow, now: Date): string {
  const first = window.hours[0]
  const startsNow = new Date(first.hourStart).getTime() <= now.getTime()
  const day = startsNow ? 'Now' : first.tomorrow ? 'Tomorrow' : 'Today'
  return `${day}, ${formatClock(window.start)}–${formatClock(window.end)}`
}

/**
 * When to run something that needs power for a few hours in a row (the car, the dishwasher, the water heater): the
 * cheapest start from now on, using the price the location pays, so the grid charge's day and night rates count too.
 */
export function CheapestTimeCard({ locationId }: { locationId: string }) {
  const [length, setLength] = useState<Length>(readLength)
  const today = useDayPrices(locationId)
  const tomorrowDate = addDays(lastOsloDays(new Date(), 1)[0], 1)
  const tomorrow = useDayPrices(locationId, tomorrowDate)

  const choose = (value: Length) => {
    setLength(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Storage can be blocked; the choice then lasts until the page is closed.
    }
  }

  const header = (
    <CardHeader>
      <CardTitle className="text-base font-extrabold">Cheapest time to use power</CardTitle>
      <Segmented
        label="How long you need power"
        className="mt-3"
        value={length}
        onChange={choose}
        options={LENGTHS.map((value) => ({ value, label: `${value} h` }))}
      />
    </CardHeader>
  )

  if (today.isLoading) {
    return (
      <Card aria-busy="true" aria-label="Loading the cheapest time">
        {header}
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  const now = new Date()
  const tomorrowHours = toRated(tomorrow.data, true)
  const hasTomorrow = tomorrowHours.some((hour) => hour.rate !== null)
  const result = cheapestWindow(
    [...toRated(today.data, false), ...tomorrowHours],
    Number(length),
    now,
  )
  const tomorrowNote = hasTomorrow
    ? null
    : "Only today's hours are known yet. Tomorrow's prices usually appear around 13:00."

  if (today.error || !result) {
    return (
      <Card>
        {header}
        <CardContent className="py-2 text-center text-sm text-muted-foreground">
          <p className="text-base font-semibold text-foreground">No time to suggest yet</p>
          {today.error
            ? today.error.message
            : `There are not ${length} hours in a row with a known price left. ${tomorrowNote ?? ''}`}
        </CardContent>
      </Card>
    )
  }

  const { best, now: fromNow } = result
  const startsNow = fromNow !== null && best.start === fromNow.start
  const saving = fromNow && !startsNow ? fromNow.average - best.average : 0

  return (
    <Card>
      {header}
      <CardContent>
        <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
          Best start
        </p>
        <p className="text-3xl font-extrabold tracking-tight tabular-nums">{when(best, now)}</p>
        <p className="mt-1 text-sm">
          Average <b>{formatRate(best.average)}</b>
          {startsNow && ' · now is the cheapest time'}
        </p>

        {saving > 0.005 && fromNow && (
          <p className="mt-3 inline-block rounded-full bg-price-cheap-soft px-2.5 py-1 text-sm font-bold text-price-cheap">
            {formatRate(saving)} cheaper than starting now (
            {percent.format((saving / fromNow.average) * 100)} %)
          </p>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Uses the price you pay, including the grid charge, taxes and VAT.
          {tomorrowNote && ` ${tomorrowNote}`}
        </p>
      </CardContent>
    </Card>
  )
}
