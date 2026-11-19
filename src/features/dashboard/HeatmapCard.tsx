import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatKwh } from './format'
import {
  cellName,
  HEATMAP_WEEKS,
  hourRange,
  level,
  WEEKDAYS,
  type HeatCell,
  type Heatmap,
} from './heatmap'
import { useHeatmap } from './hooks'

/**
 * One hue, light to dark for low to high use (in dark mode the high end is the bright one): the usage colour mixed
 * into the muted surface. The lowest cell keeps a little colour so it never reads as "no data".
 */
const shade = (fraction: number) =>
  `color-mix(in oklab, var(--usage) ${Math.round(12 + fraction * 88)}%, var(--muted))`

/**
 * When in the week the home uses the most: the average kWh of each hour of each weekday over the last 4 finished
 * weeks, from the hourly use the API already gives.
 */
export function HeatmapCard({ locationId }: { locationId: string }) {
  const { data, isLoading, error } = useHeatmap(locationId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-extrabold">Usage by hour and weekday</CardTitle>
        <p className="text-sm text-muted-foreground">
          Average kWh in each hour, the last {HEATMAP_WEEKS} weeks
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-96 w-full" aria-label="Loading usage by hour and weekday" />
        ) : error ? (
          <p className="py-4 text-center text-sm text-destructive">{error.message}</p>
        ) : !data ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No readings in the last {HEATMAP_WEEKS} weeks.
          </p>
        ) : (
          <HeatGrid map={data} />
        )}
      </CardContent>
    </Card>
  )
}

function HeatGrid({ map }: { map: Heatmap }) {
  const [active, setActive] = useState<HeatCell | null>(null)

  return (
    <div className="space-y-3">
      <p className="text-sm">
        Most use: <b>{cellName(map.highest)}</b>, {formatKwh(map.max)}. Least:{' '}
        {cellName(map.lowest)}, {formatKwh(map.min)}.
      </p>

      {/* Visual only; the same figures are in the table below for screen readers. */}
      <div
        aria-hidden="true"
        className="grid gap-[2px] text-[10px] text-muted-foreground"
        style={{ gridTemplateColumns: '2rem repeat(7, minmax(0, 1fr))' }}
        onPointerLeave={() => setActive(null)}
      >
        <span />
        {WEEKDAYS.map((day) => (
          <span key={day} className="pb-1 text-center font-semibold">
            {day}
          </span>
        ))}
        {map.rows.map((cells, hour) => (
          <HourRow key={hour} hour={hour} cells={cells} map={map} onPick={setActive} />
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-hidden="true">
        <span className="tabular-nums">{formatKwh(map.min)}</span>
        <span
          className="h-2 flex-1 rounded-full"
          style={{ background: `linear-gradient(to right, ${shade(0)}, ${shade(1)})` }}
        />
        <span className="tabular-nums">{formatKwh(map.max)}</span>
      </div>

      <p
        className="flex min-h-10 items-center rounded-xl bg-muted px-3.5 text-sm"
        aria-live="polite"
      >
        {active ? (
          <span>
            <b>{cellName(active)}</b> ·{' '}
            {active.kwh === null ? 'no readings' : `${formatKwh(active.kwh)} on average`}
          </span>
        ) : (
          'Touch a square to see its value.'
        )}
      </p>

      <table className="sr-only">
        <caption>Average kWh in each hour of each weekday, the last {HEATMAP_WEEKS} weeks</caption>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            {WEEKDAYS.map((day) => (
              <th key={day} scope="col">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {map.rows.map((cells, hour) => (
            <tr key={hour}>
              <th scope="row">{hourRange(hour)}</th>
              {cells.map((cell) => (
                <td key={cell.weekday}>{cell.kwh === null ? '–' : formatKwh(cell.kwh)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HourRow({
  hour,
  cells,
  map,
  onPick,
}: {
  hour: number
  cells: HeatCell[]
  map: Heatmap
  onPick: (cell: HeatCell) => void
}) {
  return (
    <>
      <span className="pr-1 text-right leading-none tabular-nums">
        {hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}
      </span>
      {cells.map((cell) => (
        <span
          key={cell.weekday}
          title={`${cellName(cell)}: ${cell.kwh === null ? 'no readings' : formatKwh(cell.kwh)}`}
          className="h-3.5 rounded-[2px]"
          style={{
            background:
              cell.kwh === null ? 'transparent' : shade(level(cell.kwh, map.min, map.max)),
          }}
          onPointerEnter={() => onPick(cell)}
          onClick={() => onPick(cell)}
        />
      ))}
    </>
  )
}
