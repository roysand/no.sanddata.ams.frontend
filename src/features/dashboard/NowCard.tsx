import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentHourCost, useDayPrices, useLastHourPower, useYesterdayHour } from './hooks'
import {
  formatClock,
  formatNok,
  formatRate,
  modelLabel,
  otherModel,
  sameHourYesterday,
} from './format'
import { buildPriceDay, priceRank, ratedHourCount, type PriceLevel } from './priceLevel'
import { currentPowerKw, hourTrend } from './series'

const PILL: Record<PriceLevel | 'none', { label: string; className: string }> = {
  cheap: { label: 'Cheap now', className: 'bg-price-cheap-soft text-price-cheap' },
  normal: { label: 'Normal price', className: 'bg-price-normal-soft text-price-normal' },
  expensive: { label: 'Expensive now', className: 'bg-price-expensive-soft text-price-expensive' },
  none: { label: 'Price not available yet', className: 'bg-muted text-muted-foreground' },
}

const kw = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`
}

export function NowCard({ locationId }: { locationId: string }) {
  const current = useCurrentHourCost(locationId)
  const power = useLastHourPower(locationId)
  const prices = useDayPrices(locationId)
  const yesterday = useYesterdayHour(locationId, current.data?.hourStart)

  if (current.isLoading) {
    return (
      <Card aria-label="Loading current usage" aria-busy="true">
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-14 w-3/5" />
          <Skeleton className="h-9 w-1/2" />
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (current.error) {
    return (
      <Card>
        <CardContent className="text-sm text-destructive">{current.error.message}</CardContent>
      </Card>
    )
  }

  const data = current.data
  const now = new Date()
  const powerKw = currentPowerKw(power.data?.items ?? [], now)
  if (!data || (powerKw === null && data.consumptionKwhSoFar === 0 && !data.actual)) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          <p className="text-base font-semibold text-foreground">No readings yet</p>
          This location has not reported any power use. Check that the meter is connected.
        </CardContent>
      </Card>
    )
  }

  const day = prices.data ? buildPriceDay(prices.data.items, now) : null
  const hourIndex = day ? day.hours.findIndex((hour) => hour.isCurrent) : -1
  const level: PriceLevel | null = hourIndex >= 0 ? day!.hours[hourIndex].level : null
  const hasPrice = data.actual !== null
  const pill = PILL[hasPrice && level ? level : 'none']
  const rank = day && hourIndex >= 0 ? priceRank(day, hourIndex) : null

  const elapsed = (now.getTime() - new Date(data.hourStart).getTime()) / 3_600_000
  const trend =
    data.actual && yesterday.data
      ? hourTrend(data.actual.costSoFar, yesterday.data, Math.min(Math.max(elapsed, 0), 1))
      : null
  const difference =
    data.actual && data.comparison ? data.actual.costSoFar - data.comparison.costSoFar : null
  // The spot (market) price now: the plan's own rate on a Spot plan, the comparison rate on Norgespris.
  const spot = data.pricingModel === 'NorgesPris' ? data.comparison : data.actual
  const spotRate = spot?.ratePerKwh ?? null

  return (
    <Card aria-label="Right now">
      <CardContent>
        <div className="flex items-center justify-between gap-3 text-xs font-bold tracking-wide text-muted-foreground uppercase">
          <span>Right now · {formatClock(now.toISOString())}</span>
          <span>{modelLabel(data.pricingModel)}</span>
        </div>

        <div className="mt-2.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-5xl leading-none font-extrabold tracking-tighter tabular-nums sm:text-6xl">
              {powerKw === null ? '–' : kw.format(powerKw)}
              <span className="ml-1.5 text-xl font-semibold tracking-normal text-muted-foreground">
                kW
              </span>
            </p>
            {powerKw === null && (
              <p className="mt-1 text-sm text-muted-foreground">No recent reading</p>
            )}

            <p
              className={`mt-4 inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-sm font-bold ${pill.className}`}
            >
              <span aria-hidden="true" className="size-2 rounded-full bg-current" />
              {pill.label}
            </p>
          </div>

          <dl className="grid shrink-0 gap-3 text-right">
            <div>
              <dd className="text-xl font-extrabold tracking-tight tabular-nums">
                {data.actual ? formatNok(data.actual.costSoFar) : '–'}
              </dd>
              <dt className="text-sm text-muted-foreground">Cost this hour</dt>
            </div>
            <div>
              <dd className="text-xl font-extrabold tracking-tight tabular-nums">
                {spotRate === null ? '–' : formatRate(spotRate)}
              </dd>
              <dt className="text-sm text-muted-foreground">
                {spotRate === null ? 'No spot price yet' : 'Spot price now'}
              </dt>
            </div>
          </dl>
        </div>

        {data.pricingModel === 'NorgesPris' && data.actual && (
          <p className="mt-3 text-sm text-muted-foreground">
            Your plan: Norgespris {formatRate(data.actual.ratePerKwh)}
          </p>
        )}

        {!hasPrice && (
          <p className="mt-2 text-sm text-muted-foreground">
            Your power use is live. Cost and price level appear as soon as today&apos;s prices
            arrive.
          </p>
        )}

        {trend && (
          <p
            className={`mt-3 flex items-center gap-1.5 text-sm font-semibold ${
              trend.direction === 'down' ? 'text-price-cheap' : 'text-price-expensive'
            }`}
          >
            {trend.direction === 'down' ? (
              <ArrowDownIcon className="size-4" aria-hidden="true" />
            ) : (
              <ArrowUpIcon className="size-4" aria-hidden="true" />
            )}
            {formatNok(trend.amount)} {trend.direction === 'down' ? 'less' : 'more'} than{' '}
            {formatClock(sameHourYesterday(new Date(data.hourStart)).toISOString())} yesterday
          </p>
        )}

        {hasPrice && (
          <p className="mt-2 text-sm text-muted-foreground">
            {rank !== null && day
              ? `${ordinal(rank)} cheapest spot price of ${ratedHourCount(day)} hours today. `
              : ''}
            {difference !== null && Math.abs(difference) >= 0.005
              ? difference > 0
                ? `${modelLabel(otherModel(data.pricingModel))} would be ${formatNok(difference)} cheaper this hour.`
                : `Your plan is ${formatNok(-difference)} cheaper than ${modelLabel(otherModel(data.pricingModel))} this hour.`
              : ''}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
