import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import type { AdminLocation } from '../locations'
import { AdminLocationsPage } from './AdminLocationsPage'

const person = (id: string, first: string) => ({
  id,
  firstName: first,
  lastName: 'Test',
  email: `${first.toLowerCase()}@sanddata.no`,
  isActive: true,
  roles: ['User'],
  locationAccess: [],
})

const cabin: AdminLocation = {
  id: 'loc-1',
  name: 'Cabin',
  address: 'Hyttevegen 1',
  serialNumber: 'SN-1',
  zone: 'NO3',
  isActive: true,
  hasNorgesPriceAgreement: false,
  meters: [],
  users: [
    { userId: 'u1', email: 'olga@sanddata.no', firstName: 'Olga', lastName: 'Test', role: 'Owner' },
    {
      userId: 'u2',
      email: 'vera@sanddata.no',
      firstName: 'Vera',
      lastName: 'Test',
      role: 'Viewer',
    },
  ],
}

interface Call {
  method: string
  path: string
  body: unknown
}

function setup(putFails = false) {
  const calls: Call[] = []
  server.use(
    http.get('*/api/admin/locations', () => HttpResponse.json([cabin])),
    http.get('*/api/users', () =>
      HttpResponse.json({
        users: [person('u1', 'Olga'), person('u2', 'Vera'), person('u3', 'Vidar')],
        totalCount: 3,
        pageNumber: 1,
        pageSize: 10,
        totalPages: 1,
      }),
    ),
    http.put('*/api/users/:userId/locations/:locationId', async ({ request, params }) => {
      const text = await request.text()
      calls.push({
        method: 'PUT',
        path: `${params.userId}/${params.locationId}`,
        body: text ? JSON.parse(text) : undefined,
      })
      if (putFails) {
        return HttpResponse.json(
          {
            message: 'Conflict',
            errors: { generalErrors: ['A location needs at least one owner'] },
          },
          { status: 409 },
        )
      }
      return new HttpResponse(null, { status: 204 })
    }),
    http.delete('*/api/users/:userId/locations/:locationId', ({ params }) => {
      calls.push({
        method: 'DELETE',
        path: `${params.userId}/${params.locationId}`,
        body: undefined,
      })
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return calls
}

async function openAccess() {
  const user = userEvent.setup()
  renderWithQuery(<AdminLocationsPage />)
  await user.click(await screen.findByRole('button', { name: 'Edit Cabin' }))
  return user
}

describe('LocationAccessList', () => {
  it('lists the owner and the viewers with their roles', async () => {
    setup()
    await openAccess()

    const access = within(await screen.findByRole('region', { name: 'Access' }))
    expect(access.getByText('olga@sanddata.no')).toBeInTheDocument()
    expect(access.getByText('vera@sanddata.no')).toBeInTheDocument()
    expect(access.getByText('Owner', { selector: '[data-slot="badge"]' })).toBeInTheDocument()
    expect(access.getByText('Viewer', { selector: '[data-slot="badge"]' })).toBeInTheDocument()
  })

  it('adds a found user as viewer and does not offer users who are already linked', async () => {
    const calls = setup()
    const user = await openAccess()

    await user.type(await screen.findByRole('textbox', { name: 'Find a user' }), 'v')

    await screen.findByRole('button', { name: 'Add vidar@sanddata.no as viewer' })
    expect(screen.queryByRole('button', { name: 'Add vera@sanddata.no as viewer' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add olga@sanddata.no as viewer' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Add vidar@sanddata.no as viewer' }))

    await vi.waitFor(() =>
      expect(calls).toContainEqual({ method: 'PUT', path: 'u3/loc-1', body: { role: 'Viewer' } }),
    )
  })

  it('changes a role by sending the new role', async () => {
    const calls = setup()
    const user = await openAccess()

    await user.click(await screen.findByRole('button', { name: 'Make vera@sanddata.no owner' }))

    await vi.waitFor(() =>
      expect(calls).toContainEqual({ method: 'PUT', path: 'u2/loc-1', body: { role: 'Owner' } }),
    )
  })

  it('removes a user with DELETE', async () => {
    const calls = setup()
    const user = await openAccess()

    await user.click(await screen.findByRole('button', { name: 'Remove vera@sanddata.no' }))

    await vi.waitFor(() =>
      expect(calls).toContainEqual({ method: 'DELETE', path: 'u2/loc-1', body: undefined }),
    )
  })

  it('shows the server message and keeps the list when a change is refused', async () => {
    setup(true)
    const user = await openAccess()

    await user.click(await screen.findByRole('button', { name: 'Make olga@sanddata.no viewer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A location needs at least one owner',
    )
    const access = within(screen.getByRole('region', { name: 'Access' }))
    expect(access.getByText('olga@sanddata.no')).toBeInTheDocument()
    expect(access.getByText('Owner', { selector: '[data-slot="badge"]' })).toBeInTheDocument()
  })
})
