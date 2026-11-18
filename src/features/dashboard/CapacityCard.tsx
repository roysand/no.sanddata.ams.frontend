import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, XAxis, YAxis } from 'recharts'
import type { LabelProps } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '../auth/useAuth'
import { averageLabel, isVatExempt, peakAxis, peakLabel, stepLabel } from './capacity'
import {
  addMonths,
  formatClock,
  formatDay,
  formatKw,
  formatMonth,
  formatNok,
  osloMonth,
} from './format'
import { useCapacityCharge } from './hooks'
import type { CapacityCharge, CapacityPeak } from './types'

/**
 * The grid capacity charge (kapasitetsledd) of a month: the step that the average of the three highest daily peaks
 * falls in, the amount, and the peaks behind it. The figures are the API's; nothing is recomputed here.
 */
export function CapacityCard({ locationId }: { locationId: string }) {
  const current = osloMonth(new Date())
  const [month, setMonth] = useState(current)
  const isCurrent = month >= current
  const { data, isLoading, error } = useCapacityCharge(locationId, month, isCurrent)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-extrabold">Tariff peaks</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-28 text-center text-sm font-semibold">{formatMonth(month)}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next month"
            disabled={isCurrent}
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" aria-label="Loading the tariff peaks" />
        ) : error || !data ? (
          <p className="py-4 text-center text-sm text-destructive">
            {error?.message ?? 'Could not load the capacity charge'}
          </p>
        ) : data.set ? (
          <Charge charge={data} />
        ) : (
          <NotSet charge={data} />
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          The grid company charges this per month from the average of the highest hour on each of
          the three days with the most use.
        </p>
      </CardContent>
    </Card>
  )
}

const chartConfig = {
  kw: { label: 'Peak', color: 'var(--usage)' },
} satisfies ChartConfig

function Charge({ charge }: { charge: CapacityCharge }) {
  const exempt = isVatExempt(charge)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-4">
      <div className="space-y-3">
        <div>
          <span className="block text-2xl font-extrabold tracking-tight tabular-nums">
            {formatNok(charge.amount ?? 0)}
          </span>
          <span className="text-sm text-muted-foreground">
            {exempt ? 'No VAT for this location' : 'incl. VAT'}
          </span>
          {charge.provisional && (
            <Badge variant="secondary" className="ml-2 align-middle">
              Provisional
            </Badge>
          )}
        </div>

        <p className="text-sm">
          <span className="text-muted-foreground">Step: </span>
          <span className="font-semibold">{charge.step ? stepLabel(charge.step) : '–'}</span>
        </p>

        {charge.kwToNextStep !== null && (
          <p className="text-sm">{formatKw(charge.kwToNextStep)} below the next step</p>
        )}

        {charge.provisional && (
          <p className="text-xs text-muted-foreground">
            A higher peak later this month can raise the step.
          </p>
        )}
      </div>

      <PeaksChart charge={charge} />
    </div>
  )
}

/** The daily peaks as bars in date order, with the average as a dashed line labelled with its value. */
function PeaksChart({ charge }: { charge: CapacityCharge }) {
  const { peaks, averageKw } = charge
  const rows = [...peaks]
    .sort((a, b) => a.hourStartUtc.localeCompare(b.hourStartUtc))
    .map((peak) => ({
      key: peak.hourStartUtc,
      day: formatDay(peak.date),
      clock: formatClock(peak.hourStartUtc),
      kw: peak.kw,
    }))
  const axis = peakAxis(peaks, charge.step)

  return (
    <figure className="min-w-0">
      <ChartContainer config={chartConfig} className="h-40 w-full" aria-hidden="true">
        <BarChart data={rows} margin={{ top: 20, right: 4, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="key"
            tickLine={false}
            axisLine={{ stroke: 'var(--muted-foreground)' }}
            interval={0}
            height={34}
            tick={(props) => <DayTick {...props} rows={rows} />}
          />
          {/* One dotted line from each y-axis label. An explicit stroke, because the chart wrapper fades the default grid
              colour to near invisible. */}
          <CartesianGrid
            vertical={false}
            horizontalValues={axis.ticks}
            stroke="var(--muted-foreground)"
            strokeOpacity={0.6}
            strokeDasharray="3 3"
          />
          <YAxis
            domain={[0, axis.max]}
            ticks={axis.ticks}
            allowDataOverflow
            tickLine={{ stroke: 'var(--muted-foreground)' }}
            tickSize={4}
            axisLine={{ stroke: 'var(--muted-foreground)' }}
            width={48}
            tickFormatter={(value: number) => `${value} kW`}
          />
          <Bar
            dataKey="kw"
            fill="var(--usage)"
            radius={[4, 4, 0, 0]}
            maxBarSize={44}
            isAnimationActive={false}
          >
            <LabelList dataKey="kw" content={BarValue} />
          </Bar>
          {averageKw !== null && (
            <ReferenceLine
              y={averageKw}
              stroke="var(--peak-average)"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={(props) => <AverageLabel {...props} text={formatKw(averageKw)} />}
            />
          )}
        </BarChart>
      </ChartContainer>
      <figcaption className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden="true" className="h-0 w-4 border-t-2 border-dashed border-peak-average" />
        {averageLabel(peaks.length)}
      </figcaption>
      <ul className="sr-only">
        {rows.map((row) => (
          <li key={row.key}>
            {row.day} {row.clock}: {formatKw(row.kw)}
          </li>
        ))}
      </ul>
    </figure>
  )
}

const barValue = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })

/**
 * The peak's kW inside the top of its bar, in the card colour so it contrasts with the bar in both themes. A bar too
 * short to hold the text gets it just above instead. The unit is on the y-axis, so it is left out to fit narrow bars.
 */
function BarValue({ x, y, width, height, value }: LabelProps) {
  const [left, top, w, h] = [x, y, width, height].map(Number)
  if (![left, top, w, h].every(Number.isFinite) || typeof value !== 'number') return null
  const fits = h >= 20
  return (
    <text
      x={left + w / 2}
      y={fits ? top + 14 : top - 4}
      textAnchor="middle"
      fontSize={11}
      fontWeight={700}
      fill={fits ? 'var(--card)' : 'var(--foreground)'}
    >
      {barValue.format(value)}
    </text>
  )
}

/** The average's value, right-aligned just above the dashed line, with a halo so it reads over a bar. */
function AverageLabel({
  viewBox,
  text,
}: {
  viewBox?: { x?: number; y?: number; width?: number }
  text: string
}) {
  if (viewBox?.x === undefined || viewBox.y === undefined) return null
  return (
    <text
      x={viewBox.x + (viewBox.width ?? 0)}
      y={viewBox.y - 5}
      textAnchor="end"
      fontSize={12}
      fontWeight={700}
      fill="var(--foreground)"
      stroke="var(--card)"
      strokeWidth={3}
      paintOrder="stroke"
    >
      {text}
    </text>
  )
}

/** The date of the peak, with the hour it happened below. */
function DayTick({
  x,
  y,
  payload,
  rows,
}: {
  x?: number | string
  y?: number | string
  payload?: { value: string }
  rows: { key: string; day: string; clock: string }[]
}) {
  const row = rows.find((r) => r.key === payload?.value)
  if (!row) return null
  return (
    <text x={x} y={y} textAnchor="middle" className="fill-muted-foreground text-xs">
      <tspan x={x} dy="0.9em" className="fill-foreground font-semibold">
        {row.day}
      </tspan>
      <tspan x={x} dy="1.2em">
        {row.clock}
      </tspan>
    </text>
  )
}

function Peaks({ peaks, title }: { peaks: CapacityPeak[]; title: string }) {
  return (
    <div>
      <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{title}</h3>
      <ul className="mt-1 space-y-0.5 text-sm tabular-nums">
        {peaks.map((peak) => (
          <li key={peak.hourStartUtc} className="flex justify-between gap-4">
            <span>{peakLabel(peak)}</span>
            <span className="font-semibold">{formatKw(peak.kw)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The charge cannot be priced. With readings the API still sends the peaks, so the step table is what is missing (no
 * grid tariff on the location, or no capacity steps on it for the month); without readings there is nothing to price.
 */
function NotSet({ charge }: { charge: CapacityCharge }) {
  const { roles } = useAuth()
  const isAdmin = roles.includes('Admin')
  const month = formatMonth(charge.month)

  if (charge.peaks.length === 0) {
    return (
      <p className="py-2 text-sm text-muted-foreground">
        <span className="block font-semibold text-foreground">No readings in {month}.</span>
        The capacity charge appears when the meter has reported some power use.
      </p>
    )
  }

  return (
    <div className="space-y-3 py-2 text-sm text-muted-foreground">
      <p>
        <span className="block font-semibold text-foreground">
          No capacity steps for this location in {month}.
        </span>
        The location needs a grid tariff with capacity steps that start on or before the first day
        of the month.{' '}
        {isAdmin ? (
          <>
            Set them under{' '}
            <Link to="/admin/grid-tariffs" className="underline">
              Grid tariffs
            </Link>{' '}
            and{' '}
            <Link to="/admin/location-pricing" className="underline">
              Location pricing
            </Link>
            .
          </>
        ) : (
          'Ask an administrator.'
        )}
      </p>
      <Peaks
        peaks={charge.peaks}
        title={charge.provisional ? 'The highest peaks so far' : 'The highest peaks'}
      />
    </div>
  )
}
