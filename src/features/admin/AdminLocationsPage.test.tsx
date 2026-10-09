import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import type { AdminLocation } from '../locations'
import { AdminLocationsPage } from './AdminLocationsPage'

const cabin: AdminLocation = {
  id: 'loc-1',
  name: 'Cabin',
  address: 'Hyttevegen 1',
  serialNumber: 'SN-1',
  zone: 'NO3',
  isActive: true,
  hasNorgesPriceAgreement: false,
  meters: [],
  apiKey: {
    description: 'Sensor key for Cabin',
    hint: 'a972',
    isActive: true,
    expiresAt: '2028-10-08T00:00:00Z',
    status: 'Active',
  },
  users: [
    {
      userId: 'u1',
      email: 'owner@sanddata.no',
      firstName: 'Olga',
      lastName: 'Owner',
      role: 'Owner',
    },
    {
      userId: 'u2',
      email: 'viewer@sanddata.no',
      firstName: 'Vera',
      lastName: 'Viewer',
      role: 'Viewer',
    },
  ],
}

const office: AdminLocation = {
  ...cabin,
  id: 'loc-2',
  name: 'Office',
  address: 'Storgata 5',
  serialNumber: 'SN-2',
  isActive: false,
  users: undefined,
}

function setup(locations: AdminLocation[] = [cabin, office]) {
  return server.use(http.get('*/api/admin/locations', () => HttpResponse.json(locations)))
}

describe('AdminLocationsPage', () => {
  it('lists every location with owner, viewer count and status', async () => {
    setup()
    renderWithQuery(<AdminLocationsPage />)

    const cabinRow = (await screen.findByText('Cabin')).closest('tr')!
    expect(within(cabinRow).getByText('owner@sanddata.no')).toBeInTheDocument()
    expect(within(cabinRow).getByText('1')).toBeInTheDocument()
    expect(within(cabinRow).getByText('Active')).toBeInTheDocument()

    const officeRow = screen.getByText('Office').closest('tr')!
    expect(within(officeRow).getByText('Inactive')).toBeInTheDocument()
    // The API has not sent who has access yet: show a dash, not a wrong number.
    expect(within(officeRow).getAllByText('—')).toHaveLength(2)
  })

  it('narrows the list with the filter', async () => {
    setup()
    const user = userEvent.setup()
    renderWithQuery(<AdminLocationsPage />)
    await screen.findByText('Cabin')

    await user.type(screen.getByLabelText('Filter locations'), 'storgata')

    expect(screen.queryByText('Cabin')).not.toBeInTheDocument()
    expect(screen.getByText('Office')).toBeInTheDocument()
  })

  it('saves a changed price zone and refreshes the list', async () => {
    let current = cabin
    let body: unknown
    server.use(
      http.get('*/api/admin/locations', () => HttpResponse.json([current])),
      http.put('*/api/admin/locations/loc-1', async ({ request }) => {
        body = await request.json()
        current = { ...cabin, zone: 'NO5' }
        return HttpResponse.json(current)
      }),
    )
    const user = userEvent.setup()
    renderWithQuery(<AdminLocationsPage />)

    await user.click(await screen.findByRole('button', { name: 'Edit Cabin' }))
    await user.click(screen.getByRole('combobox', { name: 'Price zone' }))
    await user.click(await screen.findByRole('option', { name: 'NO5' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByRole('button', { name: 'Edit Cabin' })
    expect(body).toEqual({
      id: 'loc-1',
      name: 'Cabin',
      address: 'Hyttevegen 1',
      serialNumber: 'SN-1',
      zone: 'NO5',
      hasNorgesPriceAgreement: false,
      isActive: true,
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the key facts but never a key', async () => {
    setup()
    const user = userEvent.setup()
    renderWithQuery(<AdminLocationsPage />)

    await user.click(await screen.findByRole('button', { name: 'Edit Cabin' }))

    expect(screen.getByText(/Sensor key …a972/)).toBeInTheDocument()
  })

  it('shows the reason and keeps the values when the serial number is taken', async () => {
    setup([cabin])
    server.use(
      http.put('*/api/admin/locations/loc-1', () =>
        HttpResponse.json(
          {
            message: 'Conflict',
            errors: { generalErrors: ['Another location already uses this serial number'] },
          },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderWithQuery(<AdminLocationsPage />)

    await user.click(await screen.findByRole('button', { name: 'Edit Cabin' }))
    await user.clear(screen.getByLabelText('Serial number'))
    await user.type(screen.getByLabelText('Serial number'), 'SN-2')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/already uses this serial number/)).toBeInTheDocument()
    expect(screen.getByLabelText('Serial number')).toHaveValue('SN-2')
    expect(screen.getByRole('dialog', { name: /Edit Cabin/ })).toBeInTheDocument()
  })

  it('asks before deactivating and sends nothing when cancelled', async () => {
    setup([cabin])
    let puts = 0
    server.use(
      http.put('*/api/admin/locations/loc-1', () => {
        puts += 1
        return HttpResponse.json({ ...cabin, isActive: false })
      }),
    )
    const user = userEvent.setup()
    renderWithQuery(<AdminLocationsPage />)

    await user.click(await screen.findByRole('button', { name: 'Edit Cabin' }))
    await user.click(screen.getByLabelText('Active'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Deactivate Cabin?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep active' }))

    expect(screen.queryByText('Deactivate Cabin?')).not.toBeInTheDocument()
    expect(puts).toBe(0)
  })

  it('deactivates after confirmation', async () => {
    setup([cabin])
    let body: { isActive?: boolean } = {}
    server.use(
      http.put('*/api/admin/locations/loc-1', async ({ request }) => {
        body = (await request.json()) as { isActive?: boolean }
        return HttpResponse.json({ ...cabin, isActive: false })
      }),
    )
    const user = userEvent.setup()
    renderWithQuery(<AdminLocationsPage />)

    await user.click(await screen.findByRole('button', { name: 'Edit Cabin' }))
    await user.click(screen.getByLabelText('Active'))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(await screen.findByRole('button', { name: 'Deactivate' }))

    await screen.findByRole('button', { name: 'Edit Cabin' })
    expect(body.isActive).toBe(false)
  })
})
