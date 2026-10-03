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
import { useDailyCost } from './hooks'
import { formatDay, formatNok, lastOsloDays, modelLabel, otherModel } from './format'

export function DailyCostChart({ locationId }: { locationId: string }) {
  const { data, isLoading, error } = useDailyCost(locationId)
  const items = data?.items ?? []
  const model = items[0]?.pricingModel ?? 'Spot'

  const config = {
    actual: { label: `${modelLabel(model)} (your plan)`, color: '#2563eb' },
    comparison: { label: modelLabel(otherModel(model)), color: '#f59e0b' },
  } satisfies ChartConfig

  // Always show the last 7 Oslo days, so days without readings are visible gaps.
  const byDate = new Map(items.map((item) => [item.date, item]))
  const rows = lastOsloDays(new Date(), 7).map((date) => ({
    day: formatDay(date),
    actual: byDate.get(date)?.actual?.cost ?? null,
    comparison: byDate.get(date)?.comparison?.cost ?? null,
  }))

  return (
    <Card className="bg-white/95 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Cost per day, last 7 days</CardTitle>
        <CardDescription>
          Days run from midnight to midnight Norwegian time. A day without a bar has no price data
          for that plan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">{error.message}</p>}
        {data && items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No consumption recorded in the last 7 days.
          </p>
        )}
        {items.length > 0 && (
          <ChartContainer config={config} className="h-64 w-full">
            <BarChart data={rows}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v: number) => `${v.toFixed(0)} kr`}
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
