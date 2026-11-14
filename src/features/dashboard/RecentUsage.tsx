import { useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { isolatedDot } from './chartDots'
import { formatClock, formatNok } from './format'
import { useRecentUsage } from './hooks'
import { RECENT_HOURS, buildRecentUsage } from './series'

const config = {
  current: { label: `Last ${RECENT_HOURS} hours`, color: 'var(--usage)' },
  previous: { label: 'Yesterday', color: 'var(--usage-ghost)' },
} satisfies ChartConfig

const kwh = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 })
const kw = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 })

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

/** Usage and cost over the last three hours, set against the same three hours yesterday. */
export function RecentUsage({ locationId }: { locationId: string }) {
  const { data, isLoading, error } = useRecentUsage(locationId)
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
            <dt className="sr-only">Energy used</dt>
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
                  ? 'Cost, some hours have no price'
                  : 'Cost'}
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

        <p
          className="mt-3 flex min-h-12 items-center rounded-xl bg-muted px-3.5 text-sm"
          aria-live="polite"
        >
          {shown ? (
            <span>
              <b>{shown.label}</b> ·{' '}
              {shown.current === null ? 'no reading' : <b>{kw.format(shown.current)} kW</b>}
              {usage.hasPrevious && shown.previous !== null && (
                <span className="text-muted-foreground">
                  {' '}
                  · yesterday {kw.format(shown.previous)} kW
                </span>
              )}
            </span>
          ) : (
            'Touch the chart to see values.'
          )}
        </p>
      </CardContent>
    </Card>
  )
}
