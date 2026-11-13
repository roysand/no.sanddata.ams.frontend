import { useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { usePeriodData } from './hooks'
import { formatNok } from './format'
import type { Period, Unit } from './periods'
import { buildUsageSeries, type UsageSeries } from './series'

const STORAGE_KEY = 'ams.chart'
const PERIODS: Period[] = ['day', 'week', 'month', 'year']

function readPrefs(): { period: Period; unit: Unit } {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      period?: string
      unit?: string
    }
    return {
      period: PERIODS.find((p) => p === parsed.period) ?? 'day',
      unit: parsed.unit === 'nok' ? 'nok' : 'kwh',
    }
  } catch {
    return { period: 'day', unit: 'kwh' }
  }
}

const kwhFormat = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })
const kwhFormatWhole = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })
const format = (unit: Unit, value: number) =>
  unit === 'nok'
    ? formatNok(value)
    : `${(value >= 1000 ? kwhFormatWhole : kwhFormat).format(value)} kWh`

const config = {
  current: { label: 'This period', color: 'var(--usage)' },
  previous: { label: 'Previous period', color: 'var(--usage-ghost)' },
} satisfies ChartConfig

export function UsageChart({ locationId, large = false }: { locationId: string; large?: boolean }) {
  const [prefs, setPrefs] = useState(readPrefs)
  const [active, setActive] = useState<number | null>(null)
  const { period, unit } = prefs
  const { data, isLoading, error } = usePeriodData(locationId, period)

  const update = (next: Partial<typeof prefs>) => {
    const value = { ...prefs, ...next }
    setPrefs(value)
    setActive(null)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // Storage can be blocked; the choice then lasts until the page is closed.
    }
  }

  const controls = (
    <div className="mt-3 space-y-2">
      <Segmented
        label="Period"
        value={period}
        onChange={(value) => update({ period: value })}
        options={[
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
          { value: 'year', label: 'Year' },
        ]}
      />
      <Segmented
        label="Unit"
        value={unit}
        onChange={(value) => update({ unit: value })}
        options={[
          { value: 'kwh', label: 'kWh' },
          { value: 'nok', label: 'NOK' },
        ]}
      />
    </div>
  )

  const header = (
    <CardHeader>
      <CardTitle className="text-base font-extrabold">
        {large ? 'Usage and cost' : 'Usage'}
      </CardTitle>
      {controls}
    </CardHeader>
  )

  if (isLoading) {
    return (
      <Card aria-busy="true" aria-label="Loading usage">
        {header}
        <CardContent>
          <Skeleton className="h-52 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        {header}
        <CardContent className="py-4 text-center text-sm text-destructive">
          {error?.message ?? 'Could not load usage'}
        </CardContent>
      </Card>
    )
  }

  const { plan } = data
  const series: UsageSeries = buildUsageSeries(
    plan.current.slots,
    data.current,
    plan.previous.slots,
    data.previous,
    unit,
  )
  const kwhSeries =
    unit === 'nok'
      ? buildUsageSeries(
          plan.current.slots,
          data.current,
          plan.previous.slots,
          data.previous,
          'kwh',
        )
      : series

  if (!series.hasCurrent) {
    return (
      <Card>
        {header}
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          {unit === 'nok' && kwhSeries.hasCurrent ? (
            <>
              <p className="text-base font-semibold text-foreground">Cost needs prices</p>
              Prices are not available yet. Switch to kWh to see your usage.
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-foreground">Nothing to chart yet</p>
              Usage appears here after the first readings arrive.
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  const rows = series.points.map((point) => ({
    label: point.label,
    current: point.current,
    previous: point.previous,
  }))
  const tickEvery = period === 'day' ? 6 : period === 'week' ? 1 : period === 'month' ? 7 : 2
  const shown = active !== null ? series.points[active] : null
  const delta = series.deltaPercent

  const move = (step: number) =>
    setActive((index) =>
      Math.min(Math.max((index ?? (step > 0 ? -1 : rows.length)) + step, 0), rows.length - 1),
    )

  return (
    <Card>
      {header}
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {plan.current.title} so far
            </p>
            <p className="text-3xl font-extrabold tracking-tight tabular-nums">
              {format(unit, series.total)}
            </p>
          </div>
          {delta !== null && (
            <span
              className={`rounded-full px-2.5 py-1 text-sm font-bold whitespace-nowrap ${
                delta <= 0
                  ? 'bg-price-cheap-soft text-price-cheap'
                  : 'bg-price-expensive-soft text-price-expensive'
              }`}
            >
              {delta <= 0 ? '▼' : '▲'} {Math.abs(Math.round(delta))}% vs{' '}
              {plan.previous.title.toLowerCase()}
            </span>
          )}
        </div>

        <div
          role="group"
          aria-label={`${unit === 'kwh' ? 'Energy use' : 'Cost'}, ${plan.current.title} compared with ${plan.previous.title}. Use the arrow keys to move between points.`}
          tabIndex={0}
          className="mt-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') {
              event.preventDefault()
              move(1)
            }
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              move(-1)
            }
          }}
        >
          <ChartContainer config={config} className="h-52 w-full">
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
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={tickEvery - 1}
                minTickGap={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(value: number) => String(Math.round(value * 10) / 10)}
              />
              <Line
                dataKey="previous"
                type="monotone"
                stroke="var(--usage-ghost)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
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
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ChartContainer>
        </div>

        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-4 bg-usage" />
            {plan.current.title}
          </li>
          {series.hasPrevious && (
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-0 w-4 border-t-2 border-dashed border-usage-ghost"
              />
              {plan.previous.title}
            </li>
          )}
        </ul>

        <p
          className="mt-3 flex min-h-12 items-center rounded-xl bg-muted px-3.5 text-sm"
          aria-live="polite"
        >
          {shown ? (
            <span>
              <b>{shown.label}</b> ·{' '}
              {shown.current === null ? 'no data yet' : <b>{format(unit, shown.current)}</b>}
              {series.hasPrevious && shown.previous !== null && (
                <span className="text-muted-foreground">
                  {' '}
                  · {plan.previous.title.toLowerCase()} {format(unit, shown.previous)}
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
