import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { useTodayHourlyCost } from './hooks'
import {
  formatClock,
  formatKwh,
  formatNok,
  hoursSinceOsloMidnight,
  modelLabel,
  otherModel,
} from './format'

export function HourlyCostChart({ locationId }: { locationId: string }) {
  const { data, isLoading, error } = useTodayHourlyCost(locationId)
  const items = data?.items ?? []
  const model = items[0]?.pricingModel ?? 'Spot'

  const config = {
    actual: { label: `${modelLabel(model)} (your plan)`, color: '#2563eb' },
    comparison: { label: modelLabel(otherModel(model)), color: '#f59e0b' },
  } satisfies ChartConfig

  // One row per hour since Oslo midnight, so hours without readings show as gaps instead of disappearing.
  const byHour = new Map(items.map((item) => [new Date(item.hourStart).getTime(), item]))
  const rows = hoursSinceOsloMidnight(new Date()).map((hour) => {
    const item = byHour.get(hour.getTime())
    return {
      hour: formatClock(hour.toISOString()),
      actual: item?.actual?.cost ?? null,
      comparison: item?.comparison?.cost ?? null,
    }
  })

  const totalKwh = items.reduce((sum, item) => sum + item.consumptionKwh, 0)
  const total = (pick: 'actual' | 'comparison') =>
    items.reduce((sum, item) => sum + (item[pick]?.cost ?? 0), 0)
  const incomplete = items.some((item) => item.actual === null)

  return (
    <Card className="bg-white/95 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Cost per hour today</CardTitle>
        <CardDescription>
          {items.length > 0
            ? `${formatKwh(totalKwh)} so far · ${formatNok(total('actual'))} on your plan${incomplete ? ' (some hours have no price yet)' : ''} · ${formatNok(total('comparison'))} on ${modelLabel(otherModel(model))}`
            : 'Hours are shown in Norwegian time.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">{error.message}</p>}
        {data && items.length === 0 && (
          <p className="text-sm text-muted-foreground">No consumption recorded yet today.</p>
        )}
        {items.length > 0 && (
          <ChartContainer config={config} className="h-64 w-full">
            <BarChart data={rows}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v: number) => `${v.toFixed(1)} kr`}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value) => formatNok(Number(value))} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="actual"
                fill="var(--color-actual)"
                radius={3}
                isAnimationActive={false}
              />
              <Bar
                dataKey="comparison"
                fill="var(--color-comparison)"
                radius={3}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
