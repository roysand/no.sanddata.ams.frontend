export interface RatedHour {
  hourStart: string
  /** NOK per kWh, null when the price is not known yet. */
  rate: number | null
  tomorrow: boolean
}

export interface PriceWindow {
  hours: RatedHour[]
  /** Start of the first hour. */
  start: string
  /** End of the last hour. */
  end: string
  /** The average rate over the window, NOK per kWh. */
  average: number
}

export interface CheapestResult {
  best: PriceWindow
  /** The window that starts with the current hour, or null when it cannot be priced. */
  now: PriceWindow | null
}

const HOUR_MS = 3_600_000

function windowAt(hours: RatedHour[], first: number, length: number): PriceWindow | null {
  const slice = hours.slice(first, first + length)
  if (slice.length < length || slice.some((hour) => hour.rate === null)) return null
  const last = slice[slice.length - 1]
  return {
    hours: slice,
    start: slice[0].hourStart,
    end: new Date(new Date(last.hourStart).getTime() + HOUR_MS).toISOString(),
    average: slice.reduce((sum, hour) => sum + (hour.rate as number), 0) / length,
  }
}

/**
 * The cheapest run of `length` whole hours in a row, starting with the current hour or later. Hours without a
 * price cannot be part of a run. On a tie the earliest run wins, so nobody waits longer than needed. Null when no
 * run of that length can be priced.
 */
export function cheapestWindow(
  hours: RatedHour[],
  length: number,
  now: Date,
): CheapestResult | null {
  const upcoming = hours.filter(
    (hour) => new Date(hour.hourStart).getTime() + HOUR_MS > now.getTime(),
  )
  let best: PriceWindow | null = null
  for (let first = 0; first + length <= upcoming.length; first++) {
    const candidate = windowAt(upcoming, first, length)
    // A small tolerance so rounding noise does not push the start later.
    if (candidate && (!best || candidate.average < best.average - 1e-9)) best = candidate
  }
  if (!best) return null
  return { best, now: windowAt(upcoming, 0, length) }
}
