import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { useLastHourPower } from './hooks'
import { formatClock } from './format'

const config = { watts: { label: 'Power', color: '#16a34a' } } satisfies ChartConfig

export function PowerChart({ locationId }: { locationId: string }) {
  const { data, isLoading, error } = useLastHourPower(locationId)

  // Energy per minute (kWh) -> average power over that minute (W): kWh * 60 min * 1000.
  const rows = (data?.items ?? []).map((item) => ({
    time: formatClock(item.periodStart),
    watts: Math.round(item.consumptionKwh * 60_000),
  }))

  return (
    <Card className="bg-white/95 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Power, last hour</CardTitle>
        <CardDescription>Average power per minute. Updates every minute.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">{error.message}</p>}
        {data && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No readings in the last hour.</p>
        )}
        {rows.length > 0 && (
          <ChartContainer config={config} className="h-56 w-full">
            <AreaChart data={rows}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={32} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v: number) => `${v} W`}
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value} W`} />} />
              <Area
                dataKey="watts"
                type="monotone"
                stroke="var(--color-watts)"
                fill="var(--color-watts)"
                fillOpacity={0.2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
