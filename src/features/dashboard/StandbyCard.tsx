import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { formatClock, formatDay, formatRate } from './format'
import { useStandby } from './hooks'
import { formatWatts, STANDBY_DAYS, type Standby } from './standby'

const whole = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })
const percent = new Intl.NumberFormat('nb-NO', { style: 'percent', maximumFractionDigits: 0 })

/**
 * Standby (base load): what the home draws all the time, measured as the quietest hour of each of the last 14
 * finished days, usually at night. Everything shown is worked out from the hourly use and cost the API already gives.
 */
export function StandbyCard({ locationId }: { locationId: string }) {
  const { data, isLoading, error } = useStandby(locationId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-extrabold">Standby usage</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" aria-label="Loading the standby usage" />
        ) : error ? (
          <p className="py-4 text-center text-sm text-destructive">{error.message}</p>
        ) : !data ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Standby needs at least 3 full days of readings in the last {STANDBY_DAYS} days.
          </p>
        ) : (
          <StandbyFigures standby={data} />
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          The quietest hour of each day, usually at night: what is always on, such as the fridge and
          freezer, the router, heat pumps and floor heating keeping warm, and chargers left in.
        </p>
      </CardContent>
    </Card>
  )
}

function StandbyFigures({ standby }: { standby: Standby }) {
  return (
    <div className="space-y-3">
      <div>
        <span className="block text-2xl font-extrabold tracking-tight tabular-nums">
          {formatWatts(standby.watts)}
        </span>
        <span className="text-sm text-muted-foreground">always on, day and night</span>
      </div>

      <p className="text-sm">
        About {whole.format(standby.kwhPerYear)} kWh a year
        {standby.costPerYear !== null && standby.ratePerKwh !== null && (
          <>
            , or about <b>{whole.format(standby.costPerYear)} kr</b> at your average price of{' '}
            {formatRate(standby.ratePerKwh)}
          </>
        )}
        . That is {percent.format(standby.share)} of your use in the last {standby.days.length}{' '}
        days.
      </p>

      <QuietHoursChart standby={standby} />
    </div>
  )
}

const chartConfig = {
  watts: { label: 'Quietest hour', color: 'var(--usage)' },
} satisfies ChartConfig

function QuietHoursChart({ standby }: { standby: Standby }) {
  const rows = standby.days.map((day) => ({
    key: day.date,
    day: formatDay(day.date),
    clock: formatClock(day.hourStart),
    watts: Math.round(day.watts),
  }))

  return (
    <figure aria-label={`The quietest hour of each of the last ${rows.length} days`}>
      <ChartContainer config={chartConfig} className="aspect-auto h-40 w-full">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            vertical={false}
            stroke="var(--muted-foreground)"
            strokeOpacity={0.6}
            strokeDasharray="3 3"
          />
          <XAxis dataKey="day" tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value: number) => formatWatts(value)}
          />
          <ChartTooltip
            cursor={{ fill: 'var(--muted)' }}
            content={
              <ChartTooltipContent
                labelFormatter={(label) => {
                  const row = rows.find((r) => r.day === label)
                  return row ? `${row.day} at ${row.clock}` : String(label)
                }}
                formatter={(value) => formatWatts(Number(value))}
              />
            }
          />
          <Bar
            dataKey="watts"
            fill="var(--color-watts)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            isAnimationActive={false}
          />
          <ReferenceLine
            y={standby.watts}
            stroke="var(--peak-average)"
            strokeDasharray="4 4"
            strokeWidth={2}
          />
        </BarChart>
      </ChartContainer>
      <figcaption className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden="true" className="h-0 w-4 border-t-2 border-dashed border-peak-average" />
        Standby, the middle value of the days
      </figcaption>
      <ul className="sr-only">
        {rows.map((row) => (
          <li key={row.key}>
            {row.day} at {row.clock}: {formatWatts(row.watts)}
          </li>
        ))}
      </ul>
    </figure>
  )
}
