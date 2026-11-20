import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Area, Bar, CartesianGrid, ComposedChart, LabelList, Line, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { usePeriodData } from './hooks'
import { formatNok } from './format'
import { periodPlan, type Period, type Unit } from './periods'
import { buildUsageSeries, type UsageSeries } from './series'
import { isolatedDot } from './chartDots'

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

/** Bar labels: whole numbers, rounded up, so a small value never reads as 0. */
const barLabelFormat = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })
const barLabel = (value: number) => barLabelFormat.format(Math.ceil(value))

interface BarLabelProps {
  x?: number | string
  y?: number | string
  width?: number | string
  height?: number | string
  value?: number | string | boolean | null
}

/**
 * The value written in its bar. It sits across the top of the bar when the bar is wide enough,
 * turns on its side for narrow bars, and moves just above the bar when the bar is too short.
 */
function BarValue({ x = 0, y = 0, width = 0, height = 0, value }: BarLabelProps) {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (value === '') return null
  const text = barLabel(Number(value))
  const [bx, by, bw, bh] = [Number(x), Number(y), Number(width), Number(height)]
  const fontSize = 10
  const textLength = text.length * fontSize * 0.62 + 4
  const cx = bx + bw / 2

  if (bw >= textLength) {
    const inside = bh >= fontSize + 6
    return (
      <text
        x={cx}
        y={inside ? by + fontSize + 2 : by - 4}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight={700}
        className={inside ? 'fill-white' : 'fill-foreground'}
      >
        {text}
      </text>
    )
  }

  const inside = bh >= textLength + 2
  const ty = inside ? by + 3 : by - 3
  return (
    <text
      x={cx}
      y={ty}
      transform={`rotate(-90 ${cx} ${ty})`}
      textAnchor={inside ? 'end' : 'start'}
      dominantBaseline="central"
      fontSize={fontSize}
      fontWeight={700}
      className={inside ? 'fill-white' : 'fill-foreground'}
    >
      {text}
    </text>
  )
}

const config = {
  current: { label: 'This period', color: 'var(--usage)' },
  previous: { label: 'Previous period', color: 'var(--usage-ghost)' },
  heater: { label: 'Water heating', color: 'var(--water-heater)' },
  car: { label: 'Car charging', color: 'var(--ev-charger)' },
  rest: { label: 'Everything else', color: 'var(--usage)' },
} satisfies ChartConfig

export function UsageChart({ locationId, large = false }: { locationId: string; large?: boolean }) {
  const [prefs, setPrefs] = useState(readPrefs)
  const [active, setActive] = useState<number | null>(null)
  // 0 = the period going on now; -1 = the one before. Not remembered: the chart always opens on now.
  const [offset, setOffset] = useState(0)
  const { period, unit } = prefs
  const { data, isLoading, isPlaceholderData, error } = usePeriodData(locationId, period, offset)
  // The title of the period asked for, shown at once while its data loads.
  const wanted = periodPlan(period, new Date(), offset).current

  const step = (by: number) => {
    setOffset((value) => Math.min(value + by, 0))
    setActive(null)
  }

  const update = (next: Partial<typeof prefs>) => {
    const value = { ...prefs, ...next }
    setPrefs(value)
    setActive(null)
    if (next.period !== undefined && next.period !== prefs.period) setOffset(0)
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

  // Stepping back stops at a period that, like the one before it, has no readings: the app does not know when the
  // first reading was, and a single empty period (the meter was off) should not block the way further back.
  const shownSeries =
    data && !isPlaceholderData
      ? buildUsageSeries(
          data.plan.current.slots,
          data.current,
          data.plan.previous.slots,
          data.previous,
          'kwh',
        )
      : null
  const atStart = shownSeries !== null && !shownSeries.hasCurrent && !shownSeries.hasPrevious

  const navigation = (
    <div className="mt-3 flex items-center justify-between gap-2">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Previous ${period}`}
        disabled={atStart || isPlaceholderData}
        onClick={() => step(-1)}
      >
        <ChevronLeft />
      </Button>
      <span className="text-sm font-semibold" aria-live="polite">
        {wanted.title}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Next ${period}`}
        disabled={offset === 0}
        onClick={() => step(1)}
      >
        <ChevronRight />
      </Button>
    </div>
  )

  const header = (
    <CardHeader>
      <CardTitle className="text-base font-extrabold">
        {large ? 'Usage and cost' : 'Usage'}
      </CardTitle>
      {controls}
      {navigation}
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
          ) : plan.offset === 0 ? (
            <>
              <p className="text-base font-semibold text-foreground">Nothing to chart yet</p>
              Usage appears here after the first readings arrive.
            </>
          ) : (
            <p className="text-base font-semibold text-foreground">
              No readings for {plan.current.title}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  const rows = series.points.map((point) => ({
    label: point.label,
    current: point.current,
    previous: point.previous,
    heater: point.heater,
    car: point.car,
    // The car as a band just under the total line in the day view: from the total without it up to the total.
    carBand:
      point.car === null || point.current === null
        ? null
        : [point.current - point.car, point.current],
    rest: point.rest,
  }))
  // Water heating and car charging are drawn only when the period has some, so the chart is unchanged without them.
  const split = series.hasHeater || series.hasCar
  const bars = period !== 'day'
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
      <CardContent
        aria-busy={isPlaceholderData}
        className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {plan.offset === 0 ? `${plan.current.title} so far` : plan.current.title}
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
              {delta <= 0 ? '▼' : '▲'} {Math.abs(Math.round(delta))}% vs {plan.previous.inline}
            </span>
          )}
        </div>

        {unit === 'nok' && (
          <p className="mt-2 text-xs text-muted-foreground">
            Cost includes VAT, the grid charge and taxes. The supplier&apos;s monthly fee and the
            grid capacity charge are not included; the bill for the month includes them.
          </p>
        )}

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
              barGap={0}
              barCategoryGap="25%"
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
              {bars ? (
                // Daily or monthly totals: the previous period and this period as two bars side
                // by side in each slot, each with its value in the bar.
                <>
                  {series.hasPrevious && (
                    <Bar
                      dataKey="previous"
                      fill="var(--usage-ghost)"
                      radius={[4, 4, 2, 2]}
                      isAnimationActive={false}
                    >
                      <LabelList dataKey="previous" content={BarValue} />
                    </Bar>
                  )}
                  {split ? (
                    // This period as one stacked bar: water heating at the bottom, everything else above it and
                    // car charging on top, with the slot's total written in it as before.
                    <>
                      {series.hasHeater && (
                        <Bar
                          dataKey="heater"
                          stackId="current"
                          fill="var(--water-heater)"
                          radius={[0, 0, 2, 2]}
                          isAnimationActive={false}
                        />
                      )}
                      <Bar
                        dataKey="rest"
                        stackId="current"
                        fill="var(--usage)"
                        radius={series.hasCar ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                        isAnimationActive={false}
                      >
                        <LabelList dataKey="current" content={BarValue} />
                      </Bar>
                      {series.hasCar && (
                        <Bar
                          dataKey="car"
                          stackId="current"
                          fill="var(--ev-charger)"
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />
                      )}
                    </>
                  ) : (
                    <Bar
                      dataKey="current"
                      fill="var(--usage)"
                      radius={[4, 4, 2, 2]}
                      isAnimationActive={false}
                    >
                      <LabelList dataKey="current" content={BarValue} />
                    </Bar>
                  )}
                </>
              ) : (
                <>
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
                  {series.hasHeater && (
                    // Water heating as a filled area under the total; hours without a part leave a gap.
                    <Area
                      dataKey="heater"
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
                  {series.hasCar && (
                    // Car charging as a band just under the total line; hours without charging leave a gap.
                    <Area
                      dataKey="carBand"
                      type="monotone"
                      stroke="var(--ev-charger)"
                      strokeWidth={1}
                      fill="var(--ev-charger)"
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
                </>
              )}
            </ComposedChart>
          </ChartContainer>
        </div>

        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={bars ? 'size-2.5 rounded-sm bg-usage' : 'h-0.5 w-4 bg-usage'}
            />
            {plan.current.title}
          </li>
          {series.hasHeater && (
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={
                  bars
                    ? 'size-2.5 rounded-sm bg-water-heater'
                    : 'h-2 w-4 rounded-sm bg-water-heater'
                }
              />
              Water heating
            </li>
          )}
          {series.hasCar && (
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={
                  bars ? 'size-2.5 rounded-sm bg-ev-charger' : 'h-2 w-4 rounded-sm bg-ev-charger'
                }
              />
              Car charging
            </li>
          )}
          {series.hasPrevious && (
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={
                  bars
                    ? 'size-2.5 rounded-sm bg-usage-ghost'
                    : 'h-0 w-4 border-t-2 border-dashed border-usage-ghost'
                }
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
              {(shown.heater !== null || shown.car !== null) && (
                <span>
                  {[
                    '',
                    shown.car !== null && `Car charging ${format(unit, shown.car)}`,
                    shown.heater !== null &&
                      `Water heating ${format(unit, shown.heater)}${shown.partly ? ' (partly measured)' : ''}`,
                    `Everything else ${format(unit, shown.rest ?? 0)}`,
                  ]
                    .filter((part) => part !== false)
                    .join(' · ')}
                </span>
              )}
              {series.hasPrevious && shown.previous !== null && (
                <span className="text-muted-foreground">
                  {' '}
                  · {plan.previous.inline} {format(unit, shown.previous)}
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
