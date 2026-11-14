const amount = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

/** "2027-01-01" -> "01.01.2027" */
export const formatRateDate = (isoDate: string) =>
  `${isoDate.slice(8, 10)}.${isoDate.slice(5, 7)}.${isoDate.slice(0, 4)}`

/** 0.5 -> "0,50 kr/kWh"; keeps up to four decimals, the API's precision. */
export const formatAmount = (value: number) => `${amount.format(value)} kr/kWh`

/**
 * Reads an amount typed by a person: comma or dot as the decimal separator, surrounding spaces ignored.
 * Returns null for anything that is not a plain non-negative decimal number.
 */
export function parseAmount(text: string): number | null {
  const normalised = text.trim().replace(',', '.')
  return /^\d+(\.\d+)?$/.test(normalised) ? Number(normalised) : null
}

/** The number for text that already passed the schema (`parseAmount` would accept it). */
export const amountOf = (text: string): number => Number(text.trim().replace(',', '.'))

/** How many digits follow the decimal separator in the text a person typed. */
export function decimalsOf(text: string): number {
  const normalised = text.trim().replace(',', '.')
  const dot = normalised.indexOf('.')
  return dot === -1 ? 0 : normalised.length - dot - 1
}
