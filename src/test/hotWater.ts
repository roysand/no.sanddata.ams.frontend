import { http, HttpResponse } from 'msw'
import { addDays, dayStart } from '../features/dashboard/periods'
import type { HotWater, HotWaterItem, HotWaterPeriod } from '../features/dashboard/types'

const HOUR_MS = 3_600_000

/**
 * A day's answer for an Oslo date: one item per hour that starts before `now`, with the litres given by hour (an hour
 * left out of `litres` gets 0; `null` makes a gap) and 60 sampled minutes unless `sampled` says otherwise.
 */
export function hotWaterDay(
  date: string,
  litres: Record<number, number | null> = {},
  { now = new Date(), sampled = {} }: { now?: Date; sampled?: Record<number, number> } = {},
): HotWater {
  const from = dayStart(date).getTime()
  const to = dayStart(addDays(date, 1)).getTime()
  const items: HotWaterItem[] = []
  for (let t = from, hour = 0; t < to && t < now.getTime(); t += HOUR_MS, hour++) {
    const value = hour in litres ? litres[hour] : 0
    items.push({
      start: new Date(t).toISOString(),
      litres: value,
      sampledMinutes: value === null ? 0 : (sampled[hour] ?? 60),
    })
  }
  return answer('day', new Date(from).toISOString(), new Date(to).toISOString(), items)
}

/** An answer for any period, with the total worked out from the items as the API does. */
export function answer(
  period: HotWaterPeriod,
  from: string,
  to: string,
  items: HotWaterItem[] = [],
): HotWater {
  const withLitres = items.filter((item) => item.litres !== null)
  return {
    locationId: 'l1',
    period,
    from,
    to,
    totalLitres:
      withLitres.length === 0 ? null : withLitres.reduce((sum, i) => sum + (i.litres ?? 0), 0),
    sampledMinutes: items.reduce((sum, item) => sum + item.sampledMinutes, 0),
    items,
  }
}

/** Answers every hot water request with `reply(period, date)`, and records what was asked. */
export function serveHotWater(
  reply: (period: HotWaterPeriod, date: string) => HotWater | Response,
) {
  const asked: { period: string; date: string }[] = []
  const handler = http.get('*/api/locations/:id/water-heater/hot-water', ({ request }) => {
    const url = new URL(request.url)
    const period = url.searchParams.get('period') as HotWaterPeriod
    const date = url.searchParams.get('date') ?? ''
    asked.push({ period, date })
    const body = reply(period, date)
    return body instanceof Response ? body : HttpResponse.json(body)
  })
  return { handler, asked }
}
