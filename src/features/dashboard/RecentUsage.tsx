import { useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { isolatedDot } from './chartDots'
import { formatClock } from './format'
import { useRecentUsage } from './hooks'
import { buildRecentUsage } from './series'

const config = {
  current: { label: 'Last 2 hours', color: 'var(--usage)' },
  previous: { label: 'Yesterday', color: 'var(--usage-ghost)' },
} satisfies ChartConfig

const kwh = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 })
const kw = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 })

/** Usage over the last two hours, set against the same two hours yesterday. */
export function RecentUsage({ locationId }: { locationId: string }) {
  const { data, isLoading, error } = useRecentUsage(locationId)
  const [active, setActive] = useState<number | null>(null)

  const header = (
    <CardHeader>
      <CardTitle className="text-base font-extrabold">Last 2 hours</CardTitle>
    </CardHeader>
  )

  if (isLoading) {
    return (
      <Card aria-busy="true" aria-label="Loading the last 2 hours">
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

  const usage = buildRecentUsage(
    data.current,
    data.previous,
    data.startMs,
    data.previousStartMs,
    new Date(),
    (ms) => formatClock(new Date(ms).toISOString()),
  )

  if (!usage.hasCurrent) {
    return (
      <Card>
        {header}
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          <p className="text-base font-semibold text-foreground">No readings in the last 2 hours</p>
          Check that the meter is connected.
        </CardContent>
      </Card>
    )
  }

  const rows = usage.points
  const shown = active !== null ? rows[active] : null
  const delta = usage.deltaPercent

  return (
    <Card>
      {header}
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl font-extrabold tracking-tight tabular-nums">
            {kwh.format(usage.totalKwh)}
            <span className="ml-1.5 text-base font-semibold tracking-normal text-muted-foreground">
              kWh
            </span>
          </p>
          {delta !== null && (
            <span
              className={`rounded-full px-2.5 py-1 text-sm font-bold whitespace-nowrap ${
                delta <= 0
                  ? 'bg-price-cheap-soft text-price-cheap'
                  : 'bg-price-expensive-soft text-price-expensive'
              }`}
            >
              {delta <= 0 ? '▼' : '▲'} {Math.abs(Math.round(delta))}% vs yesterday
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {usage.hasPrevious
            ? `Yesterday, same two hours: ${kwh.format(usage.previousKwh)} kWh`
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
            Last 2 hours
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
