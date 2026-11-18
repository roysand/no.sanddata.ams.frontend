import { formatClock, formatDay } from './format'
import type { CapacityCharge, CapacityPeak } from './types'

const kw = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 4 })

/** No VAT applies when the API sends a VAT of 0 with an amount. */
export const isVatExempt = (charge: CapacityCharge) => charge.amount !== null && charge.vat === 0

/** "5–10 kW", or "100 kW and above" for the top step. */
export function stepLabel(step: { lowerKw: number; upperKw: number | null }): string {
  return step.upperKw === null
    ? `${kw.format(step.lowerKw)} kW and above`
    : `${kw.format(step.lowerKw)}–${kw.format(step.upperKw)} kW`
}

/** What the average is taken over: three days normally, fewer early in the month. */
export function averageLabel(days: number): string {
  if (days >= 3) return 'Average of the three highest days'
  return days === 1 ? 'Average of 1 day' : `Average of ${days} days`
}

/** "14.10. 18:00": the Oslo day and the hour the peak started. */
export const peakLabel = (peak: CapacityPeak) =>
  `${formatDay(peak.date)} ${formatClock(peak.hourStartUtc)}`

/**
 * The y-axis of the peaks chart: from 0 to the top of the step the average is in, so the bars read against the step.
 * A peak above that (or any peak on the open top step) raises the top to the next multiple of 5 kW. The ticks mark
 * 0, the step's bounds and the top.
 */
export function peakAxis(
  peaks: CapacityPeak[],
  step: { lowerKw: number; upperKw: number | null } | null,
): { max: number; ticks: number[] } {
  const highest = Math.max(0, ...peaks.map((peak) => peak.kw))
  const roundUp = (value: number) => Math.max(5, Math.ceil(value / 5) * 5)
  const max = step?.upperKw != null && highest <= step.upperKw ? step.upperKw : roundUp(highest)
  const ticks = [0, step?.lowerKw, step?.upperKw, max].filter(
    (tick): tick is number => tick != null && tick <= max,
  )
  return { max, ticks: [...new Set(ticks)].sort((a, b) => a - b) }
}
