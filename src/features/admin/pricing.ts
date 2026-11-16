import type { PriceRateKind } from './types'

const percent = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 })

export const kindLabel = (kind: PriceRateKind): string =>
  kind === 'ElectricityTax' ? 'Electricity tax' : kind === 'EnovaFee' ? 'Enova fee' : 'VAT'

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
