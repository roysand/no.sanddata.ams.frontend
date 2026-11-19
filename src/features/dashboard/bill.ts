import { formatKwh2 } from './format'
import type { BillLine, BillPart, BillProjection, MonthlyBill } from './types'

export const PART_TITLES: Record<BillPart['name'], string> = {
  Strom: 'Strøm (supplier)',
  Nettleie: 'Nettleie (grid)',
}

/** English name, and the name on a Fjordkraft/Elvia invoice to help the comparison. */
const NAMES: Record<string, { name: string; invoice: string }> = {
  SupplierMonthlyFee: { name: 'Monthly fee', invoice: 'Månedlig fastbeløp' },
  SpotEnergy: { name: 'Energy at spot price', invoice: 'Din strømpris' },
  SupplierMarkup: { name: 'Markup', invoice: 'Påslag' },
  GridEnergyDay: { name: 'Grid energy, weekdays 06–22', invoice: 'Energiledd dag' },
  GridEnergyNight: { name: 'Grid energy, nights and weekends', invoice: 'Energiledd natt/helg' },
  CapacityCharge: { name: 'Capacity charge', invoice: 'Fastledd' },
  ElectricityTax: { name: 'Electricity tax', invoice: 'Elavgift' },
  EnovaFee: { name: 'Enova fee', invoice: 'Energifondet' },
  NorgesPrisCredit: { name: 'Norgespris credit', invoice: 'Norgespris' },
}

/** A code this app does not know is shown by its code, so a new line from the API never disappears. */
export const lineName = (code: string) => NAMES[code]?.name ?? code
export const invoiceName = (code: string): string | null => NAMES[code]?.invoice ?? null

const twoDecimals = new Intl.NumberFormat('nb-NO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** "240,31 kWh" or "1 month". */
export const formatQuantity = (line: BillLine) =>
  line.unit === 'Month' ? `${line.quantity} month` : formatKwh2(line.quantity)

/** "155,52 øre/kWh" or "34,00 kr/month", including VAT as the invoice; null when there is no price. */
export function formatUnitPrice(line: BillLine): string | null {
  if (!line.set || line.unitPrice === null) return null
  return line.unit === 'Month'
    ? `${twoDecimals.format(line.unitPrice)} kr/month`
    : `${twoDecimals.format(line.unitPrice * 100)} øre/kWh`
}

/** 0.25 -> "25 %" */
export const formatVatRate = (rate: number) => `${Math.round(rate * 100)} %`

/** How many whole days of use the projection rests on; a few hours count as 1, none as 0. */
function basisDays(projection: BillProjection): number {
  if (projection.basedOnHours === 0) return 0
  return Math.max(1, Math.round(projection.basedOnDays))
}

const FULL_BASIS_DAYS = 7

/** Fewer than 7 days of use behind the projection (a new location, or few readings). */
export const isUncertain = (projection: BillProjection | null) =>
  projection !== null && basisDays(projection) < FULL_BASIS_DAYS

/** What the rest of the month is estimated from; null for a final bill. */
export function basisText(projection: BillProjection | null): string | null {
  if (projection === null) return null
  const days = basisDays(projection)
  if (days === 0) {
    return 'No use yet to estimate from, so the rest of the month only has the fixed amounts.'
  }
  if (days >= FULL_BASIS_DAYS) return 'Estimated from the last 7 days of use.'
  return `Based on ${days} ${days === 1 ? 'day' : 'days'} of use, so the estimate is uncertain.`
}

const setLines = (bill: MonthlyBill) =>
  [...bill.strom.lines, ...bill.nettleie.lines].filter((l) => l.set)

/**
 * No VAT on this location. The bill has no flag for it, and the Norgespris credit always has 0 % VAT, so it is
 * exempt when every line that is set, and at least one besides the credit, has 0 % VAT.
 */
export function isVatExemptBill(bill: MonthlyBill): boolean {
  const lines = setLines(bill)
  return lines.some((l) => l.code !== 'NorgesPrisCredit') && lines.every((l) => l.vatRate === 0)
}

/** A month before the first reading still gets a bill, with no hours. */
export const hasReadings = (bill: MonthlyBill) => bill.hours.withReadings > 0

/** Why the bill is incomplete, in the order of the lines; empty for a complete bill. */
export function incompleteReasons(bill: MonthlyBill): string[] {
  const reasons: string[] = []
  for (const line of [...bill.strom.lines, ...bill.nettleie.lines]) {
    if (!line.set) reasons.push(`${lineName(line.code)} not set`)
    else if (!line.complete) {
      reasons.push(`${lineName(line.code)} may be too low: some hours have no price`)
    }
  }
  const unpriced = bill.hours.withReadings - bill.hours.priced
  if (unpriced > 0) {
    reasons.push(
      `${unpriced} ${unpriced === 1 ? 'hour' : 'hours'} with readings could not be priced`,
    )
  }
  return reasons
}
