import { http, HttpResponse } from 'msw'
import type { EvChargerLiveState } from '../features/dashboard/types'

/** Roy's charge at Hjemme on 2026-11-24, read at 19:34 Oslo: charging since 16:37, plugged in at 15:52. */
export function liveState(overrides: Partial<EvChargerLiveState> = {}): EvChargerLiveState {
  return {
    state: 'charging',
    online: true,
    powerKw: 4.41,
    sessionKwh: 12.962,
    pluggedInAt: '2026-11-24T14:52:03Z',
    chargingSince: '2026-11-24T15:37:41Z',
    lastReportedAt: '2026-11-24T18:33:10Z',
    readAt: '2026-11-24T18:34:02Z',
    ...overrides,
  }
}

/** The figures each state carries, per the API's contract (spec 021). */
export const LIVE_STATES: Record<EvChargerLiveState['state'], Partial<EvChargerLiveState>> = {
  charging: {},
  connected: { powerKw: null, chargingSince: null },
  finished: { powerKw: null, chargingSince: null, sessionKwh: 24.6 },
  noCar: { powerKw: null, sessionKwh: null, pluggedInAt: null, chargingSince: null },
  unknown: { powerKw: null, pluggedInAt: null, chargingSince: null },
  offline: {
    online: false,
    powerKw: null,
    sessionKwh: null,
    pluggedInAt: null,
    chargingSince: null,
    lastReportedAt: '2026-11-24T13:10:00Z',
  },
  noCharger: {
    online: null,
    powerKw: null,
    sessionKwh: null,
    pluggedInAt: null,
    chargingSince: null,
    lastReportedAt: null,
    readAt: null,
  },
}

/** Answers the state request with `body`, or with `status` and an API error. Counts the requests. */
export function serveLiveState(
  body: EvChargerLiveState | { status: number; code: string } = liveState(),
) {
  const calls = { state: 0 }
  const handler = http.get('*/api/locations/:id/ev-charger/state', () => {
    calls.state++
    return 'status' in body
      ? HttpResponse.json(
          { code: body.code, message: 'The car charger is not available right now.' },
          { status: body.status },
        )
      : HttpResponse.json(body)
  })
  return { handler, calls }
}
