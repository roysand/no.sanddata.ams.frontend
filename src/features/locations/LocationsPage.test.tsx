import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { LocationsPage } from './LocationsPage'
import type { LocationRole, LocationSummary } from './types'

const location = (id: string, name: string, role: LocationRole): LocationSummary => ({
  id,
  name,
  address: 'Somewhere 1',
  zone: 'NO1',
  serialNumber: `SN-${id}`,
  hasNorgesPriceAgreement: false,
  isActive: true,
  role,
  meters: [],
})

function card(name: string) {
  return screen.getByText(name).closest('[data-slot="card"]') as HTMLElement
}

describe('LocationsPage roles', () => {
  it('lists a shared location with a Viewer badge and no actions, and an owned one with Add meter', async () => {
    server.use(
      http.get('*/api/locations', () =>
        HttpResponse.json([location('l1', 'Home', 'Owner'), location('l2', 'Cabin', 'Viewer')]),
      ),
    )
    renderWithQuery(<LocationsPage />)

    await screen.findByText('Cabin')

    const home = within(card('Home'))
    expect(home.getByText('Owner')).toBeInTheDocument()
    expect(home.getByRole('button', { name: 'Add meter' })).toBeInTheDocument()

    const cabin = within(card('Cabin'))
    expect(cabin.getByText('Viewer')).toBeInTheDocument()
    expect(cabin.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows Edit and Edit comment to an owner, an Inactive badge on an inactive location, nothing to a viewer', async () => {
    const meter = { id: 'm1', locationId: 'l1', deviceId: 'AA:BB', comment: null, isActive: true }
    server.use(
      http.get('*/api/locations', () =>
        HttpResponse.json([
          { ...location('l1', 'Home', 'Owner'), isActive: false, meters: [meter] },
          {
            ...location('l2', 'Cabin', 'Viewer'),
            meters: [{ ...meter, id: 'm2', locationId: 'l2' }],
          },
        ]),
      ),
    )
    renderWithQuery(<LocationsPage />)

    await screen.findByText('Cabin')

    const home = within(card('Home'))
    expect(home.getByText('Inactive')).toBeInTheDocument()
    expect(home.getByRole('button', { name: 'Edit Home' })).toBeInTheDocument()
    expect(home.getByRole('button', { name: 'Edit comment for AA:BB' })).toBeInTheDocument()

    const cabin = within(card('Cabin'))
    expect(cabin.queryByRole('button')).not.toBeInTheDocument()
  })

  it('does not count shared locations towards the limit of four', async () => {
    server.use(
      http.get('*/api/locations', () =>
        HttpResponse.json(['a', 'b', 'c', 'd'].map((id) => location(id, `Shared ${id}`, 'Viewer'))),
      ),
    )
    renderWithQuery(<LocationsPage />)

    await screen.findByText('Shared a')
    expect(screen.getByRole('button', { name: 'Add location' })).toBeEnabled()
    expect(screen.queryByText(/maximum of 4 locations/)).not.toBeInTheDocument()
  })
})
