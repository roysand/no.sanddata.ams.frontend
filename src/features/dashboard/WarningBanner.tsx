import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LocationSummary } from '../locations'
import { formatKw, formatRate, osloMonth } from './format'
import {
  useCapacityCharge,
  useCurrentHourCost,
  useLastHourPower,
  useNorgesPrisStatus,
  useNow,
  useTodayHourlyCost,
  useTomorrowPrices,
  useUsualPower,
} from './hooks'
import {
  expensiveHours,
  limitWarning,
  needsTomorrow,
  type ExpensiveHours,
  type LimitWarning,
} from './norgesPris'
import { capacityWarning, usageWarning } from './warnings'

/** A step limit as it is spoken: "10 kW", or "7,5 kW". */
const stepKw = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })
/** A month's kWh, whole: "1 240 kWh". */
const wholeKwh = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })
const monthKwh = (kwh: number) => `${wholeKwh.format(kwh)} kWh`
/** The Oslo date the limit resets: "1 December". */
const resetDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Oslo',
})
const twoDigits = (hour: number) => String(hour).padStart(2, '0')
/** At most this many hour ranges, then a count of the rest, so a line fits in two on a phone (FR-006). */
const MAX_RANGES = 3

interface Line {
  key: string
  urgent: boolean
  content: ReactNode
  /** The location to select when the line is followed; the selected one's capacity and usage lines leave it out. */
  locationId?: string
}

/** One limit line, worded as contracts/ui.md. */
function limitText(name: string, w: LimitWarning): ReactNode {
  switch (w.kind) {
    case 'over':
      return (
        <>
          <span className="font-semibold">
            {name} is over its Norgespris limit: {wholeKwh.format(w.kwhSoFar)} of{' '}
            {monthKwh(w.limitKwh)}.
          </span>{' '}
          The kWh above it are priced at spot price until {resetDate.format(new Date(w.resetsAt))}.
        </>
      )
    case 'approaching': {
      const soFar = `${name}: ${wholeKwh.format(w.kwhSoFar)} of ${monthKwh(w.limitKwh)} this month`
      if (w.reachedIn === 'today' || w.reachedIn === 'tomorrow') {
        return `${soFar}. At this pace the limit is reached ${w.reachedIn}.`
      }
      if (typeof w.reachedIn === 'number') {
        return `${soFar}. At this pace the limit is reached in about ${w.reachedIn} days.`
      }
      if (w.projectedKwh !== null)
        return `${soFar}, expected to end at ${monthKwh(w.projectedKwh)}.`
      return `${soFar}.`
    }
    case 'projected':
      return (
        `${name} is expected to use ${monthKwh(w.projectedKwh)} this month, above the ` +
        `Norgespris limit of ${monthKwh(w.limitKwh)}. The kWh above it are priced at spot price.`
      )
  }
}

/** "07–09 and 17–20", or the first three ranges and "and 4 more hours". */
function rangesText({ ranges, hours }: ExpensiveHours): string {
  const shown = ranges.slice(0, MAX_RANGES)
  const parts = shown.map((r) => `${twoDigits(r.fromHour)}–${twoDigits(r.toHour)}`)
  const rest = hours - shown.reduce((sum, r) => sum + r.toHour - r.fromHour, 0)
  if (ranges.length > MAX_RANGES && rest > 0)
    parts.push(`${rest} more ${rest === 1 ? 'hour' : 'hours'}`)
  return parts.length === 1
    ? parts[0]
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/**
 * Warnings above the key reminders on every page, for anyone who may see the location: the capacity and usage warnings
 * for the selected location (spec 012), then the Norgespris warnings for every active location (spec 015), each naming
 * its location. Each rule is pure; a warning whose figures are missing or failed is left out, never shown as an error.
 */
export function WarningBanner({
  location,
  locations,
  onSelect,
}: {
  location: LocationSummary
  locations: LocationSummary[]
  onSelect: (locationId: string) => void
}) {
  // Checked again every minute, so a warning comes and goes within a minute.
  const nowMs = useNow(60_000)
  const now = new Date(nowMs)
  const id = location.id
  const capacity = useCapacityCharge(id, osloMonth(now), true)
  const todayHours = useTodayHourlyCost(id)
  const currentHour = useCurrentHourCost(id)
  const minutes = useLastHourPower(id)
  const usual = useUsualPower(id, nowMs)
  const status = useNorgesPrisStatus()

  // The Norgespris locations, the selected one first, then the others by name (FR-008, research R2).
  const names = new Map(locations.map((l) => [l.id, l.name]))
  const norgesPris = (status.data?.items ?? [])
    .filter((item) => names.has(item.locationId))
    .map((item) => ({ item, name: names.get(item.locationId)!, warning: limitWarning(item, now) }))
    .sort((a, b) =>
      a.item.locationId === id
        ? -1
        : b.item.locationId === id
          ? 1
          : a.name.localeCompare(b.name, 'nb'),
    )
  // Tomorrow's prices only where the spot price changes the bill (FR-010).
  const tomorrow = useTomorrowPrices(
    norgesPris.filter((n) => needsTomorrow(n.warning)).map((n) => n.item.locationId),
    nowMs,
  )

  const lines: Line[] = []

  const step = capacityWarning({
    capacity: capacity.data,
    todayHours: todayHours.data?.items,
    currentHour: currentHour.data,
    now,
  })
  if (step) {
    const above = `${stepKw.format(step.nextStepKw)} kW`
    lines.push({
      key: 'capacity',
      urgent: true,
      content:
        step.limitKw === null ? (
          <span className="font-semibold">
            This hour has lifted the capacity step above {above}.
          </span>
        ) : (
          <>
            <span className="font-semibold">
              This hour may lift the capacity step above {above}.
            </span>{' '}
            Stay under {formatKw(step.limitKw)} for the rest of the hour.
          </>
        ),
    })
  }

  const usage = usageWarning({ minutes: minutes.data?.items, usual: usual.data, now })
  if (usage) {
    const nowText = formatKw(usage.nowKw)
    const usualText = formatKw(usage.usualKw)
    const when = `for a ${usage.weekday} at this hour`
    lines.push({
      key: 'usage',
      urgent: false,
      content:
        usage.ratio === null
          ? `${location.name} uses ${nowText} now, against the usual ${usualText} ${when}.`
          : `${location.name} uses ${nowText} now, about ${usage.ratio}× the usual ${usualText} ${when}.`,
    })
  }

  for (const { item, name, warning } of norgesPris) {
    if (!warning) continue
    lines.push({
      key: `limit-${item.locationId}`,
      urgent: warning.kind === 'over',
      content: limitText(name, warning),
      locationId: item.locationId,
    })
  }
  for (const { item, name, warning } of norgesPris) {
    if (!needsTomorrow(warning)) continue
    const expensive = expensiveHours(tomorrow[item.locationId], item.norgesPrisPricePerKwh)
    if (!expensive) continue
    lines.push({
      key: `expensive-${item.locationId}`,
      urgent: false,
      content: `${name}, tomorrow: spot price is high ${rangesText(expensive)}, up to ${formatRate(expensive.maxPrice)}.`,
      locationId: item.locationId,
    })
  }

  if (lines.length === 0) return null
  return (
    <section
      role="region"
      aria-label="Warnings"
      className="mt-2 rounded-xl border border-border bg-card p-3 text-sm"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
        <ul className="min-w-0 flex-1 space-y-1.5">
          {lines.map((line) => (
            <li key={line.key}>
              <Link
                to="/"
                onClick={line.locationId ? () => onSelect(line.locationId!) : undefined}
                data-urgent={line.urgent ? 'true' : undefined}
                className={
                  line.urgent
                    ? 'block rounded-md bg-destructive/10 px-2 py-1 text-destructive underline-offset-2 hover:underline'
                    : 'block px-2 py-1 text-muted-foreground underline-offset-2 hover:underline'
                }
              >
                {line.content}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
