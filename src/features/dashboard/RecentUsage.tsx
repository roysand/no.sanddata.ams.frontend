import { useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { isolatedDot } from './chartDots'
import { formatClock, formatNok } from './format'
import { isAboveCap } from './cap'
import { useRecentUsage, useRecentWaterHeater } from './hooks'
import { RECENT_HOURS, buildRecentUsage, recentDetailText } from './series'

const config = {
  current: { label: `Last ${RECENT_HOURS} hours`, color: 'var(--usage)' },
  previous: { label: 'Yesterday', color: 'var(--usage-ghost)' },
  heaterDrawn: { label: 'Water heating', color: 'var(--water-heater)' },
} satisfies ChartConfig

const kwh = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 })

function Delta({ percent }: { percent: number | null }) {
  if (percent === null) return null
  return (
    <span
      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ${
        percent <= 0
          ? 'bg-price-cheap-soft text-price-cheap'
          : 'bg-price-expensive-soft text-price-expensive'
      }`}
    >
      {percent <= 0 ? '▼' : '▲'} {Math.abs(Math.round(percent))}% vs yesterday
    </span>
  )
}

/**
 * Usage and cost over the last three hours, set against the same three hours yesterday. For a location with a water
 * heater, water heating is drawn under the house's power (spec 014).
 */
export function RecentUsage({
  locationId,
  hasWaterHeater = false,
}: {
  locationId: string
  hasWaterHeater?: boolean
}) {
  const { data, isLoading, error } = useRecentUsage(locationId)
  const water = useRecentWaterHeater(locationId, data?.startMs, hasWaterHeater)
  const [active, setActive] = useState<number | null>(null)

  const title = `Last ${RECENT_HOURS} hours`
  const header = (
    <CardHeader>
      <CardTitle className="text-base font-extrabold">{title}</CardTitle>
    </CardHeader>
  )

  if (isLoading) {
    return (
      <Card aria-busy="true" aria-label={`Loading the ${title.toLowerCase()}`}>
        {header}
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        {header}
        <CardContent className="py-4 text-center text-sm text-destructive">
          {error?.message ?? 'Could not load recent usage'}
        </CardContent>
      </Card>
    )
  }

  const usage = buildRecentUsage({
    current: data.current,
    previous: data.previous,
    currentRates: data.currentRates,
    previousRates: data.previousRates,
    startMs: data.startMs,
    previousStartMs: data.previousStartMs,
    now: new Date(),
    label: (ms) => formatClock(new Date(ms).toISOString()),
    heater: water.data?.items,
  })

  if (!usage.hasCurrent) {
    return (
      <Card>
        {header}
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          <p className="text-base font-semibold text-foreground">
            No readings in the last {RECENT_HOURS} hours
          </p>
          Check that the meter is connected.
        </CardContent>
      </Card>
    )
  }

  const rows = usage.points
  const shown = active !== null ? rows[active] : null

  return (
    <Card>
      {header}
      <CardContent>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dd className="text-3xl font-extrabold tracking-tight tabular-nums">
              {kwh.format(usage.totalKwh)}
              <span className="ml-1 text-base font-semibold tracking-normal text-muted-foreground">
                kWh
              </span>
            </dd>
            <dt className="text-sm text-muted-foreground">Power</dt>
            <Delta percent={usage.deltaPercent} />
          </div>
          <div>
            <dd className="text-3xl font-extrabold tracking-tight tabular-nums">
              {usage.cost.cost === null ? '–' : formatNok(usage.cost.cost)}
            </dd>
            <dt className="text-sm text-muted-foreground">
              {usage.cost.cost === null
                ? 'Price not available yet'
                : usage.cost.incomplete
                  ? 'Cost incl. VAT, some hours have no price'
                  : 'Cost incl. VAT'}
            </dt>
            <Delta percent={usage.costDeltaPercent} />
          </div>
        </dl>
        <p className="mt-2 text-sm text-muted-foreground">
          {usage.hasPrevious
            ? `Yesterday, same ${RECENT_HOURS} hours: ${kwh.format(usage.previousKwh)} kWh${
                usage.previousCost.cost === null ? '' : ` · ${formatNok(usage.previousCost.cost)}`
              }`
            : 'No readings from yesterday to compare with'}
        </p>
        {usage.heaterKwh !== null && (
          <p className="mt-1 text-sm text-muted-foreground">
            Water heating: {kwh.format(usage.heaterKwh)} kWh
            {usage.heaterShare !== null &&
              ` of ${kwh.format(usage.totalKwh)} kWh (${Math.round(usage.heaterShare * 100)} %)`}
          </p>
        )}
        {data.currentRates.some(
          (row) => row.pricingModel === 'NorgesPris' && isAboveCap(row.actual),
        ) && (
          <p role="note" className="mt-1 text-sm text-muted-foreground">
            Part of this period is above the Norgespris monthly limit and priced at spot.
          </p>
        )}

        <ChartContainer config={config} className="mt-3 h-40 w-full">
          <ComposedChart
            data={rows}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              const index = Number(state?.activeTooltipIndex)
              if (Number.isInteger(index)) setActive(index)
            }}
            onClick={(state) => {
              const index = Number(state?.activeTooltipIndex)
              if (Number.isInteger(index)) setActive(index)
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={5} minTickGap={12} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(value: number) => String(Math.round(value * 10) / 10)}
            />
            <Line
              dataKey="previous"
              type="monotone"
              stroke="var(--usage-ghost)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={isolatedDot(
                rows.map((row) => row.previous),
                'var(--usage-ghost)',
              )}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
            {usage.hasHeater && (
              // Water heating as a filled area under the house's power; steps without a figure leave a gap.
              <Area
                dataKey="heaterDrawn"
                type="monotone"
                stroke="var(--water-heater)"
                strokeWidth={1}
                fill="var(--water-heater)"
                fillOpacity={0.5}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            )}
            <Area
              dataKey="current"
              type="monotone"
              stroke="var(--usage)"
              strokeWidth={2.5}
              fill="var(--usage)"
              fillOpacity={0.14}
              dot={isolatedDot(
                rows.map((row) => row.current),
                'var(--usage)',
              )}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>

        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-4 bg-usage" />
            {title}
          </li>
          {usage.hasHeater && (
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-4 rounded-sm bg-water-heater" />
              Water heating
            </li>
          )}
          {usage.hasPrevious && (
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-0 w-4 border-t-2 border-dashed border-usage-ghost"
              />
              Yesterday
            </li>
          )}
          <li>kW, average per 5 minutes</li>
        </ul>
        {water.error && (
          <p className="mt-1 text-xs text-muted-foreground">Water heating could not be loaded.</p>
        )}

        <p
          className="mt-3 flex min-h-12 items-center rounded-xl bg-muted px-3.5 text-sm"
          aria-live="polite"
        >
          {shown ? (
            <span>
              <b>{shown.label}</b> · {recentDetailText(shown, usage.hasPrevious)}
            </span>
          ) : (
            'Touch the chart to see values.'
          )}
        </p>
      </CardContent>
    </Card>
  )
}
