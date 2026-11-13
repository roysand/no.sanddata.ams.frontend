import { formatNok } from '../dashboard'
import type { LocationSummary } from './summary'

const kw = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const kwh = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })

function Sparkline({ values }: { values: number[] }) {
  const w = 84
  const h = 28
  const max = Math.max(...values, 0)
  if (values.length < 2 || max === 0) return <svg width={w} height={h} aria-hidden="true" />
  const path = values
    .map((value, i) => {
      const x = (i * w) / (values.length - 1)
      const y = h - 3 - (value / max) * (h - 6)
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join('')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <path
        d={path}
        fill="none"
        stroke="var(--usage)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LocationSummaryCard({
  summary,
  periodLabel,
  onOpen,
}: {
  summary: LocationSummary
  periodLabel: string
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${summary.name}: ${summary.powerKw === null ? 'no recent reading' : `${kw.format(summary.powerKw)} kilowatts now`}. Open details`}
      className="flex w-full min-h-16 flex-col gap-1 rounded-2xl border bg-card p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex items-center justify-between gap-3">
        <b className="truncate text-base">{summary.name}</b>
        <Sparkline values={summary.trend} />
      </span>
      <span className="text-sm text-muted-foreground">
        {summary.usesNorgesPris ? 'Norgespris' : 'Spot price'}
      </span>
      <span className="mt-1 grid grid-cols-3 gap-2">
        <span>
          <b className="block text-[0.95rem] font-extrabold tabular-nums">
            {summary.powerKw === null ? '–' : `${kw.format(summary.powerKw)} kW`}
          </b>
          <span className="text-xs text-muted-foreground">now</span>
        </span>
        <span>
          <b className="block text-[0.95rem] font-extrabold tabular-nums">
            {kwh.format(summary.kwh)} kWh
          </b>
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        </span>
        <span>
          <b className="block text-[0.95rem] font-extrabold tabular-nums">
            {summary.cost === null ? '–' : formatNok(summary.cost)}
          </b>
          <span className="text-xs text-muted-foreground">
            {summary.cost === null
              ? 'price not available yet'
              : summary.incomplete
                ? 'cost, incomplete'
                : 'cost'}
          </span>
        </span>
      </span>
      <span aria-hidden="true" className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-usage"
          style={{ width: `${summary.sharePercent}%` }}
        />
      </span>
      <span className="text-xs text-muted-foreground">{summary.sharePercent}% of total use</span>
    </button>
  )
}
