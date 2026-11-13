import { useState } from 'react'
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { useDayPrices } from './hooks'
import { formatClock, formatRate } from './format'
import { buildPriceDay, type PriceHour, type PriceLevel } from './priceLevel'

const config = { rate: { label: 'Price per kWh', color: 'var(--usage)' } } satisfies ChartConfig

const LEVEL_TEXT: Record<PriceLevel, string> = {
  cheap: 'cheap',
  normal: 'normal',
  expensive: 'expensive',
}

function describe(hour: PriceHour): string {
  if (hour.rate === null) return `${formatClock(hour.hourStart)} · price not available yet`
  return `${formatClock(hour.hourStart)} · ${formatRate(hour.rate)} · ${LEVEL_TEXT[hour.level!]}${
    hour.isBest ? ' · best hour' : ''
  }${hour.isCurrent ? ' · now' : ''}`
}

export function PriceTimeline({ locationId }: { locationId: string }) {
  const { data, isLoading, error } = useDayPrices(locationId)
  const [selected, setSelected] = useState<number | null>(null)

  const header = (
    <CardHeader>
      <div className="flex items-center justify-between gap-3">
        <CardTitle className="text-base font-extrabold">Today&apos;s spot price by hour</CardTitle>
        <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
          kr / kWh
        </span>
      </div>
    </CardHeader>
  )

  if (isLoading) {
    return (
      <Card aria-busy="true" aria-label="Loading today's prices">
        {header}
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }

  const day = data ? buildPriceDay(data.items, new Date()) : null
  const hasPrices = !!day && day.hours.some((hour) => hour.rate !== null)

  if (error || !day || !hasPrices) {
    return (
      <Card>
        {header}
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          <p className="text-base font-semibold text-foreground">Prices not published yet</p>
          {error
            ? error.message
            : 'Hourly prices for today usually appear in the early afternoon the day before. Check back soon.'}
        </CardContent>
      </Card>
    )
  }

  const rows = day.hours.map((hour, i) => ({ i, rate: hour.rate, hour }))
  const currentIndex = day.hours.findIndex((hour) => hour.isCurrent)
  const shown = day.hours[selected ?? (currentIndex >= 0 ? currentIndex : 0)]
  const upcomingBest = day.hours.filter((hour) => hour.isBest && !hour.isPast)

  return (
    <Card>
      {header}
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {day.best.length === 0
            ? 'Every hour costs the same today, so there are no best hours.'
            : upcomingBest.length > 0
              ? `Best hours still to come: ${upcomingBest.map((h) => formatClock(h.hourStart)).join(', ')}.`
              : "All of today's best hours have passed."}
        </p>

        <ChartContainer config={config} className="mt-3 h-40 w-full">
          <BarChart
            data={rows}
            margin={{ top: 14, right: 0, bottom: 0, left: 0 }}
            barCategoryGap={2}
            onClick={(state) => {
              const index = Number(state?.activeTooltipIndex)
              if (Number.isInteger(index)) setSelected(index)
            }}
          >
            <XAxis
              dataKey="i"
              interval={0}
              tickLine={false}
              axisLine={false}
              tickFormatter={(i: number) =>
                i % 6 === 0 ? formatClock(day.hours[i].hourStart).slice(0, 2) : ''
              }
            />
            <YAxis hide domain={[0, 'dataMax']} />
            <Bar
              dataKey="rate"
              radius={[4, 4, 2, 2]}
              isAnimationActive={false}
              label={(props: {
                x?: number | string
                y?: number | string
                width?: number | string
                index?: number
              }) => {
                const hour = day.hours[props.index ?? -1]
                if (!hour?.isBest || props.x === undefined || props.y === undefined) return <g />
                return (
                  <text
                    x={Number(props.x) + Number(props.width ?? 0) / 2}
                    y={Number(props.y) - 3}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--price-cheap)"
                    aria-hidden="true"
                  >
                    ★
                  </text>
                )
              }}
            >
              {rows.map(({ i, hour }) => (
                <Cell
                  key={i}
                  fill={hour.level ? `var(--price-${hour.level})` : 'var(--muted)'}
                  fillOpacity={hour.isPast ? 0.4 : 1}
                  stroke={hour.isCurrent ? 'var(--foreground)' : undefined}
                  strokeWidth={hour.isCurrent ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm bg-price-cheap" />
            Cheap
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm bg-price-normal" />
            Normal
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm bg-price-expensive" />
            Expensive
          </li>
          <li>★ Best hour</li>
          <li>Outlined = now</li>
        </ul>

        <p
          className="mt-3 flex min-h-12 items-center rounded-xl bg-muted px-3.5 text-sm"
          aria-live="polite"
        >
          {describe(shown)}
        </p>

        <table className="sr-only">
          <caption>Price per hour today</caption>
          <tbody>
            {day.hours.map((hour) => (
              <tr key={hour.hourStart}>
                <th scope="row">{formatClock(hour.hourStart)}</th>
                <td>{describe(hour)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
