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
