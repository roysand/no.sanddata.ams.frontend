import { useState } from 'react'
import { Bar, BarChart, Cell, ReferenceLine, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentHourCost, useDayPrices } from './hooks'
import { formatClock, formatRate, lastOsloDays } from './format'
import { addDays } from './periods'
import { buildPriceDay, priceTicks, type PriceHour, type PriceLevel } from './priceLevel'

const config = { rate: { label: 'Price per kWh', color: 'var(--usage)' } } satisfies ChartConfig

const LEVEL_TEXT: Record<PriceLevel, string> = {
  cheap: 'cheap',
  normal: 'normal',
  expensive: 'expensive',
}

/** How an hour's spot price compares with the flat Norgespris rate. */
function againstNorgespris(rate: number, norgesRate: number | null): string {
  if (norgesRate === null) return ''
  if (Math.abs(rate - norgesRate) < 0.005) return ' · same as Norgespris'
  return rate < norgesRate ? ' · below Norgespris' : ' · above Norgespris'
}

const axisRate = new Intl.NumberFormat('nb-NO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function describe(hour: PriceHour, norgesRate: number | null, tomorrow = false): string {
  const when = `${tomorrow ? 'Tomorrow ' : ''}${formatClock(hour.hourStart)}`
  if (hour.rate === null) return `${when} · price not available yet`
  return `${when} · ${formatRate(hour.rate)} · ${LEVEL_TEXT[hour.level!]}${
    hour.isBest ? ' · best hour' : ''
  }${againstNorgespris(hour.rate, norgesRate)}${hour.isCurrent ? ' · now' : ''}`
}

export function PriceTimeline({ locationId }: { locationId: string }) {
  const { data, isLoading, error } = useDayPrices(locationId)
  const tomorrowDate = addDays(lastOsloDays(new Date(), 1)[0], 1)
  const tomorrowPrices = useDayPrices(locationId, tomorrowDate)
  const current = useCurrentHourCost(locationId)
  const [selected, setSelected] = useState<number | null>(null)

  // The flat Norgespris rate: the location's own rate when it is on Norgespris, otherwise the comparison rate.
  // The current-hour query is shared with the "right now" card, so this costs no extra request.
  const norgesRate =
    current.data === undefined
      ? null
      : ((current.data.pricingModel === 'NorgesPris'
          ? current.data.actual?.ratePerKwh
          : current.data.comparison?.ratePerKwh) ?? null)

  // Tomorrow's prices are published around 13:00. Until then the API returns the hours without rates.
  const tomorrow = tomorrowPrices.data ? buildPriceDay(tomorrowPrices.data.items, new Date()) : null
  const hasTomorrow = !!tomorrow && tomorrow.hours.some((hour) => hour.rate !== null)

  const header = (
    <CardHeader>
      <div className="flex items-center justify-between gap-3">
        <CardTitle className="text-base font-extrabold">
          {hasTomorrow ? 'Price by hour, today and tomorrow' : "Today's price by hour"}
        </CardTitle>
        <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
          kr / kWh
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        On spot terms, including the grid charge, taxes and VAT.
      </p>
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

  const rows = [
    ...day.hours.map((hour) => ({ hour, tomorrow: false })),
    ...(hasTomorrow ? tomorrow.hours.map((hour) => ({ hour, tomorrow: true })) : []),
  ].map((row, i) => ({ ...row, i, rate: row.hour.rate }))
  const tomorrowStart = day.hours.length
  const currentIndex = day.hours.findIndex((hour) => hour.isCurrent)
  const shown = rows[selected ?? (currentIndex >= 0 ? currentIndex : 0)]
  const upcomingBest = day.hours.filter((hour) => hour.isBest && !hour.isPast)
  const ticks = priceTicks(Math.max(norgesRate ?? 0, ...rows.map((row) => row.rate ?? 0)))
  // A price line close to the Norgespris line is left out so the two do not blur together; its label stays.
  const step = ticks[1] - ticks[0]
  const gridLines = ticks
    .slice(1)
    .filter((tick) => norgesRate === null || Math.abs(tick - norgesRate) >= step * 0.4)
  const clockHour = (hour: PriceHour) => formatClock(hour.hourStart).slice(0, 2)
  const rated = day.hours.filter((hour) => hour.rate !== null)
  const belowNorges =
    norgesRate === null ? 0 : rated.filter((hour) => (hour.rate as number) < norgesRate).length

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
          {norgesRate !== null &&
            ` The price on spot terms is below Norgespris in ${belowNorges} of ${rated.length} hours today.`}
          {hasTomorrow
            ? tomorrow.best.length > 0 &&
              ` Best hours tomorrow: ${tomorrow.best.map((i) => formatClock(tomorrow.hours[i].hourStart)).join(', ')}.`
            : " Tomorrow's prices usually appear around 13:00."}
        </p>

        <ChartContainer config={config} className="mt-3 h-52 w-full">
          <BarChart
            data={rows}
            margin={{ top: 16, right: 4, bottom: 0, left: 0 }}
            barCategoryGap={hasTomorrow ? 1 : 2}
            onClick={(state) => {
              const index = Number(state?.activeTooltipIndex)
              if (Number.isInteger(index)) setSelected(index)
            }}
          >
            <XAxis
              dataKey="i"
              interval={0}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tickFormatter={(i: number) => {
                const label = clockHour(rows[i].hour)
                return Number(label) % (hasTomorrow ? 6 : 3) === 0 ? label : ''
              }}
            />
            <YAxis
              domain={[0, ticks[ticks.length - 1]]}
              ticks={ticks}
              width={36}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => axisRate.format(value)}
            />
            {hasTomorrow && (
              <ReferenceLine
                x={tomorrowStart}
                stroke="var(--muted-foreground)"
                strokeDasharray="2 3"
                label={{
                  value: 'Tomorrow',
                  position: 'insideTopLeft',
                  fontSize: 11,
                  fontWeight: 700,
                  fill: 'var(--muted-foreground)',
                }}
              />
            )}
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
                const hour = rows[props.index ?? -1]?.hour
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
            {/* Drawn after the bars so they show across them, also in the hours still to come. */}
            {gridLines.map((tick) => (
              <ReferenceLine
                key={tick}
                y={tick}
                stroke="var(--foreground)"
                strokeOpacity={1}
                strokeWidth={1.25}
                strokeDasharray="3 3"
              />
            ))}
            {/* Last, so it sits on top of the bars and the price lines. */}
            {norgesRate !== null && (
              <ReferenceLine
                y={norgesRate}
                ifOverflow="extendDomain"
                stroke="var(--norgespris)"
                strokeWidth={2.5}
                label={{
                  value: `Norgespris ${formatRate(norgesRate)}`,
                  position: 'insideTopLeft',
                  fontSize: 11,
                  fontWeight: 700,
                  fill: 'var(--norgespris)',
                }}
              />
            )}
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
          {norgesRate !== null && (
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-norgespris" />
              Norgespris {formatRate(norgesRate)}
            </li>
          )}
          <li>Outlined = now</li>
        </ul>

        <p
          className="mt-3 flex min-h-12 items-center rounded-xl bg-muted px-3.5 text-sm"
          aria-live="polite"
        >
          {describe(shown.hour, norgesRate, shown.tomorrow)}
        </p>

        <table className="sr-only">
          <caption>Price per hour today</caption>
          <tbody>
            {day.hours.map((hour) => (
              <tr key={hour.hourStart}>
                <th scope="row">{formatClock(hour.hourStart)}</th>
                <td>{describe(hour, norgesRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {hasTomorrow && (
          <table className="sr-only">
            <caption>Price per hour tomorrow</caption>
            <tbody>
              {tomorrow.hours.map((hour) => (
                <tr key={hour.hourStart}>
                  <th scope="row">{formatClock(hour.hourStart)}</th>
                  <td>{describe(hour, norgesRate, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
