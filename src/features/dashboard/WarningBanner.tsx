import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LocationSummary } from '../locations'
import { formatKw, osloMonth } from './format'
import {
  useCapacityCharge,
  useCurrentHourCost,
  useLastHourPower,
  useMonthlyBill,
  useNow,
  useTodayHourlyCost,
  useUsualPower,
} from './hooks'
import { capacityWarning, norgesPrisWarning, usageWarning } from './warnings'

/** A step limit as it is spoken: "10 kW", or "7,5 kW". */
const stepKw = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })
/** A month's kWh, whole: "1 240 kWh". */
const monthKwh = (kwh: number) =>
  `${new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(kwh)} kWh`

interface Line {
  key: string
  urgent: boolean
  content: ReactNode
}

/**
 * Warnings for the selected location (spec 012), above the key reminders on every page: anyone who may see the location
 * sees them. Each rule is pure and uses figures the dashboard already reads; a warning whose figures are missing or
 * failed is simply left out, never shown as an error.
 */
export function WarningBanner({ location }: { location: LocationSummary }) {
  // Checked again every minute, so a warning comes and goes within a minute.
  const nowMs = useNow(60_000)
  const now = new Date(nowMs)
  const id = location.id
  const capacity = useCapacityCharge(id, osloMonth(now), true)
  const todayHours = useTodayHourlyCost(id)
  const currentHour = useCurrentHourCost(id)
  const minutes = useLastHourPower(id)
  const usual = useUsualPower(id, nowMs)
  const bill = useMonthlyBill(id, osloMonth(now), true)

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

  const norgesPris = norgesPrisWarning(bill.data)
  if (norgesPris) {
    const limit = monthKwh(norgesPris.limitKwh)
    lines.push({
      key: 'norgespris',
      urgent: norgesPris.passed,
      content: norgesPris.passed ? (
        <>
          <span className="font-semibold">
            {location.name} has passed the Norgespris limit of {limit} this month.
          </span>{' '}
          The rest of the month is priced at spot price.
        </>
      ) : (
        `${location.name} is expected to use ${monthKwh(norgesPris.projectedKwh)} this month, above the ` +
        `Norgespris limit of ${limit}. The kWh above it are priced at spot price.`
      ),
    })
  }

  if (lines.length === 0) return null
  return (
    <section
      role="region"
      aria-label={`Warnings for ${location.name}`}
      className="mt-2 rounded-xl border border-border bg-card p-3 text-sm"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
        <ul className="min-w-0 flex-1 space-y-1.5">
          {lines.map((line) => (
            <li key={line.key}>
              <Link
                to="/"
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
