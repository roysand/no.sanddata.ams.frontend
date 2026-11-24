import { screen, waitFor } from '@testing-library/react'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { LIVE_STATES, liveState, serveLiveState } from '../../test/evCharger'
import { CarChargingCard } from './EvChargerStateCard'

describe('CarChargingCard on the Now page (spec 017)', () => {
  it('shows the state, the figures and how long ago it was read while the car charges', async () => {
    server.use(serveLiveState(liveState()).handler)
    renderWithQuery(<CarChargingCard locationId="l1" />)

    const tile = await screen.findByRole('region', { name: 'Car charging' })
    expect(tile).toHaveTextContent('Charging')
    expect(tile).toHaveTextContent(
      /4,4 kW · 13,0 kWh this charge · charging since (24\.11\. )?16:37 · plugged in at (24\.11\. )?15:52/,
    )
    expect(tile).toHaveTextContent(/updated /)
  })

  it.each(['connected', 'finished', 'noCar', 'offline', 'unknown'] as const)(
    'shows nothing when %s',
    async (state) => {
      const live = serveLiveState(liveState({ state, ...LIVE_STATES[state] }))
      server.use(live.handler)
      renderWithQuery(<CarChargingCard locationId="l1" />)

      await waitFor(() => expect(live.calls.state).toBe(1))
      expect(screen.queryByRole('region', { name: 'Car charging' })).not.toBeInTheDocument()
    },
  )

  it('shows nothing when the state is unavailable', async () => {
    const live = serveLiveState({ status: 503, code: 'EvCharger.Unavailable' })
    server.use(live.handler)
    renderWithQuery(<CarChargingCard locationId="l1" />)

    await waitFor(() => expect(live.calls.state).toBe(1))
    expect(screen.queryByRole('region', { name: 'Car charging' })).not.toBeInTheDocument()
  })
})
