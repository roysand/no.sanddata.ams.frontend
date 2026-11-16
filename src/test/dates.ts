import { lastOsloDays } from '../features/dashboard/format'

/** A Norwegian calendar date relative to today, as yyyy-MM-dd (what the dialogs compare a start date with). */
export function osloDate(offsetDays: number): string {
  const [y, m, d] = lastOsloDays(new Date(), 1)[0].split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + offsetDays)).toISOString().slice(0, 10)
}
