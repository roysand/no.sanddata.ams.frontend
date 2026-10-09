import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { AuthContext, type AuthContextValue } from '../auth/context'
import { UsersPage } from './UsersPage'

const auth: AuthContextValue = {
  isAuthenticated: true,
  isLoading: false,
  email: 'admin@sanddata.no',
  roles: ['Admin'],
  login: async () => {},
  logout: () => {},
}

const roy = {
  id: 'u1',
  firstName: 'Roy',
  lastName: 'Sand',
  email: 'roy@sanddata.no',
  isActive: true,
  roles: ['User'],
  locations: ['Cabin'],
  locationIds: ['loc-roy'],
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
    // The administrator's own locations: they do not include roy's.
    http.get('*/api/locations', () =>
      HttpResponse.json([
        { id: 'loc-admin', name: 'Office', address: 'A', zone: 'NO1', meters: [] },
      ]),
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
    setup([{ ...roy, locations: [], locationIds: [] }])

    await u.click(await screen.findByRole('button', { name: 'Actions for roy@sanddata.no' }))

    expect(await screen.findByRole('menuitem', { name: 'Add location' })).toBeInTheDocument()
  })

  it("shows a user's locations that are not the administrator's own", async () => {
    setup()

    expect(await screen.findByText('Cabin')).toBeInTheDocument()
    expect(screen.getByText('Office')).toBeInTheDocument()
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
    setup([{ ...roy, locations: [], locationIds: [] }])

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
