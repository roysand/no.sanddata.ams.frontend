import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { AuthContext, type AuthContextValue } from '../auth/context'
import { UsersPage } from './UsersPage'
import type { AdminUser } from './types'

const auth: AuthContextValue = {
  isAuthenticated: true,
  isLoading: false,
  email: 'admin@sanddata.no',
  roles: ['Admin'],
  login: async () => {},
  logout: () => {},
}

const roy: AdminUser = {
  id: 'u1',
  firstName: 'Roy',
  lastName: 'Sand',
  email: 'roy@sanddata.no',
  isActive: true,
  roles: ['User'],
  locationAccess: [{ locationId: 'loc-roy', name: 'Cabin', role: 'Owner' }],
}

function setup(users = [roy]) {
  server.use(
    http.get('*/api/users', () =>
      HttpResponse.json({
        users,
        totalCount: users.length,
        pageNumber: 1,
        pageSize: 10,
        totalPages: 1,
      }),
    ),
  )
  return renderWithQuery(
    <AuthContext.Provider value={auth}>
      <UsersPage />
    </AuthContext.Provider>,
  )
}

describe('UsersPage location actions', () => {
  it('offers "Add location" for any user, including one without locations', async () => {
    const u = userEvent.setup()
    setup([{ ...roy, locationAccess: [] }])

    await u.click(await screen.findByRole('button', { name: 'Actions for roy@sanddata.no' }))

    expect(await screen.findByRole('menuitem', { name: 'Add location' })).toBeInTheDocument()
  })

  it("shows each of a user's locations with the role", async () => {
    setup([
      {
        ...roy,
        locationAccess: [
          { locationId: 'loc-roy', name: 'Cabin', role: 'Owner' },
          { locationId: 'loc-2', name: 'House', role: 'Viewer' },
        ],
      },
    ])

    const row = (await screen.findByText('roy@sanddata.no')).closest('tr')!
    const cabin = within(within(row).getByText('Cabin').closest('li')!)
    expect(cabin.getByText('Owner')).toBeInTheDocument()
    const house = within(within(row).getByText('House').closest('li')!)
    expect(house.getByText('Viewer')).toBeInTheDocument()
  })

  it('still lists a user without locations', async () => {
    setup([{ ...roy, locationAccess: [] }])

    expect(await screen.findByText('roy@sanddata.no')).toBeInTheDocument()
  })

  it('"Make viewer" sends PUT with the role Viewer', async () => {
    let body: unknown
    const u = userEvent.setup()
    setup()
    server.use(
      http.put('*/api/users/u1/locations/loc-roy', async ({ request }) => {
        body = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await u.click(
      await screen.findByRole('button', { name: 'Make roy@sanddata.no viewer of Cabin' }),
    )

    await vi.waitFor(() => expect(body).toEqual({ role: 'Viewer' }))
  })

  it('shows the server message when removing the last owner is refused', async () => {
    const u = userEvent.setup()
    setup()
    server.use(
      http.delete('*/api/users/u1/locations/loc-roy', () =>
        HttpResponse.json(
          {
            message: 'Conflict',
            errors: { generalErrors: ['A location needs at least one owner'] },
          },
          { status: 409 },
        ),
      ),
    )

    await u.click(await screen.findByRole('button', { name: 'Remove roy@sanddata.no from Cabin' }))

    expect(await screen.findByText('A location needs at least one owner')).toBeInTheDocument()
    expect(screen.getByText('Cabin')).toBeInTheDocument()
  })

  it('opens the add-location dialog for the chosen user', async () => {
    const u = userEvent.setup()
    setup()

    await u.click(await screen.findByRole('button', { name: 'Actions for roy@sanddata.no' }))
    await u.click(await screen.findByRole('menuitem', { name: 'Add location' }))

    expect(await screen.findByRole('dialog')).toHaveTextContent('Add location for Roy Sand')
  })

  it('does not allow adding a meter for a user without locations', async () => {
    const u = userEvent.setup()
    setup([{ ...roy, locationAccess: [] }])

    await u.click(await screen.findByRole('button', { name: 'Actions for roy@sanddata.no' }))

    expect(await screen.findByRole('menuitem', { name: 'Add meter' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('allows adding a meter for a user with a location', async () => {
    const u = userEvent.setup()
    setup()

    await u.click(await screen.findByRole('button', { name: 'Actions for roy@sanddata.no' }))
    await u.click(await screen.findByRole('menuitem', { name: 'Add meter' }))

    expect(await screen.findByRole('dialog')).toHaveTextContent('Add meter for Roy Sand')
  })
})
