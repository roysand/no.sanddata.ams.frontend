import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { formatLitres, hotWaterRows, hotWaterView, type HotWaterRow } from './hotWater'
import { useHotWater } from './hooks'
import type { HotWaterPeriod } from './types'

const PERIODS: { value: HotWaterPeriod; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

/** A label on every n-th bar: every 3 hours, every day of a week, every 5 days of a month, every month. */
const TICK_EVERY: Record<HotWaterPeriod, number> = { day: 3, week: 1, month: 5, year: 1 }

const chartConfig = {
  litresFull: { label: 'Hot water', color: 'var(--water-heater)' },
  litresPartial: { label: 'Partly recorded', color: 'var(--water-heater)' },
} satisfies ChartConfig

const NOTE =
  "Litres of water at 40 °C (V40), worked out from the tank's hot water. Small draws, such as a hand wash, are counted, so the total can be higher than the OSO app's."

/**
 * The hot water used, as the OSO app's "Consumption (V40)" chart (spec 018): a bar per hour, day or month of the
 * chosen period, its total, and the arrows to step back. Gaps stay gaps; partly recorded parts are paler.
 */
export function HotWaterCard({ locationId }: { locationId: string }) {
  const [period, setPeriod] = useState<HotWaterPeriod>('day')
  const [offset, setOffset] = useState(0)
  const now = new Date()
  const view = hotWaterView(period, offset, now)
  const { data, error, isLoading, isPlaceholderData } = useHotWater(
    locationId,
    period,
    view.date,
    offset === 0,
  )

  const choose = (next: HotWaterPeriod) => {
    setPeriod(next)
    setOffset(0)
  }

  const header = (
    <CardHeader>
      <CardTitle className="text-base font-extrabold">Hot water used</CardTitle>
      <Segmented
        className="mt-3"
        label="Period"
        value={period}
        onChange={choose}
        options={PERIODS}
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Previous ${period}`}
          disabled={!view.canGoBack || isPlaceholderData}
          onClick={() => setOffset(offset - 1)}
        >
          <ChevronLeft />
        </Button>
        <span className="text-sm font-semibold" aria-live="polite">
          {view.title}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Next ${period}`}
          disabled={offset === 0}
          onClick={() => setOffset(offset + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </CardHeader>
  )

  let body
  if (isLoading) {
    body = <Skeleton className="h-56 w-full" aria-label="Loading hot water used" />
  } else if (error || !data) {
    body = (
      <p className="py-4 text-center text-sm text-destructive">
        The hot water used can&apos;t be shown right now.
      </p>
    )
  } else if (data.totalLitres === null) {
    body = (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {period === 'day' && offset === 0
          ? 'No hot water recorded yet today.'
          : `No hot water recorded for ${view.inline}. The record starts on 24 Nov 2026.`}
      </p>
    )
  } else {
    const rows = hotWaterRows(data, now)
    body = (
      <>
        <p className="text-sm text-muted-foreground">
          Total V40 used{' '}
          <span className="text-2xl font-extrabold text-foreground tabular-nums">
            {formatLitres(data.totalLitres)}
          </span>
          {offset === 0 && ' so far'}
        </p>
        <HotWaterChart rows={rows} period={period} title={view.title} total={data.totalLitres} />
      </>
    )
  }

  return (
    <section aria-label="Hot water used">
      <Card>
        {header}
        <CardContent className="space-y-3">
          {body}
          <p className="text-xs text-muted-foreground">{NOTE}</p>
        </CardContent>
      </Card>
    </section>
  )
}

function HotWaterChart({
  rows,
  period,
  title,
  total,
}: {
  rows: HotWaterRow[]
  period: HotWaterPeriod
  title: string
  total: number
}) {
  const largest = rows.reduce<HotWaterRow | null>(
    (best, row) => (row.litres !== null && row.litres > (best?.litres ?? 0) ? row : best),
    null,
  )
  const labels = new Map(rows.map((row) => [row.key, row.label]))
  const hasPartial = rows.some((row) => row.partial)

  return (
    <figure
      aria-label={`Hot water used, ${title}: ${formatLitres(total)} in total${largest ? `, most at ${largest.span}` : ''}`}
    >
      <ChartContainer config={chartConfig} className="aspect-auto h-48 w-full">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            vertical={false}
            stroke="var(--muted-foreground)"
            strokeOpacity={0.6}
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="key"
            tickLine={false}
            axisLine={false}
            interval={TICK_EVERY[period] - 1}
            tickFormatter={(key: string) => labels.get(key) ?? ''}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
            tickFormatter={(value: number) => `${value}`}
          />
          <ChartTooltip
            cursor={{ fill: 'var(--muted)' }}
            content={({ active, label }) => {
              const row = rows.find((r) => r.key === label)
              if (!active || !row || row.litres === null) return null
              return (
                <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                  <p className="font-medium">{row.span}</p>
                  <p className="tabular-nums">{formatLitres(row.litres)}</p>
                  {row.partial && row.sampledShare !== null && (
                    <p className="text-muted-foreground">
                      Recorded {Math.round(row.sampledShare * 100)} % of the time
                    </p>
                  )}
                </div>
              )
            }}
          />
          <Bar
            dataKey="litresFull"
            stackId="litres"
            fill="var(--color-litresFull)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            isAnimationActive={false}
          />
          <Bar
            dataKey="litresPartial"
            stackId="litres"
            fill="var(--color-litresPartial)"
            fillOpacity={0.45}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
      {hasPartial && (
        <figcaption className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-water-heater opacity-45" />
          Paler: partly recorded, likely too low
        </figcaption>
      )}
    </figure>
  )
}
