import type { PriceRateKind } from './types'

const percent = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 })

const KIND_LABELS: Record<PriceRateKind, string> = {
  ElectricityTax: 'Electricity tax',
  EnovaFee: 'Enova fee',
  Vat: 'VAT',
  NorgesPrisCapHome: 'Norgespris monthly limit (home)',
  NorgesPrisCapHolidayHome: 'Norgespris monthly limit (holiday home)',
}

export const kindLabel = (kind: PriceRateKind): string => KIND_LABELS[kind]

const kwhPerMonth = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 4 })

/** 5000 -> "5 000 kWh/month": the Norgespris monthly limits are kWh, not money. */
export const formatKwhPerMonth = (value: number) => `${kwhPerMonth.format(value)} kWh/month`

/**
 * Reads a VAT percentage typed by a person (`25`, `25,5`) and returns it as the fraction the API takes (`0.25`,
 * `0.255`). Works on the digits, so there is no floating point noise, and refuses anything that is not a plain
 * percentage from 0 to 100 with at most two decimals (the API keeps the fraction to four decimals).
 */
export function percentToFraction(text: string): number | null {
  const normalised = text.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return null

  const [whole, decimals = ''] = normalised.split('.')
  const hundredthsOfAPercent = Number(whole) * 100 + Number(`${decimals}00`.slice(0, 2))
  return hundredthsOfAPercent > 10_000 ? null : hundredthsOfAPercent / 10_000
}

/** How many digits follow the decimal separator in the percentage a person typed. */
export function percentDecimals(text: string): number {
  const normalised = text.trim().replace(',', '.')
  const dot = normalised.indexOf('.')
  return dot === -1 ? 0 : normalised.length - dot - 1
}

/** 0.255 -> "25,5 %" (a fraction shown as the percentage people think in). */
export const formatPercent = (fraction: number): string =>
  `${percent.format(Math.round(fraction * 10_000) / 100)} %`

const kw = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 4 })
const perMonth = new Intl.NumberFormat('nb-NO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

/** "5–10 kW", or "100 kW and above" for the open top step. */
export const capacityStepLabel = (lowerKw: number, upperKw: number | null) =>
  upperKw === null
    ? `${kw.format(lowerKw)} kW and above`
    : `${kw.format(lowerKw)}–${kw.format(upperKw)} kW`

/** 336 -> "336,00 kr/month" */
export const formatMonthlyAmount = (value: number) => `${perMonth.format(value)} kr/month`
