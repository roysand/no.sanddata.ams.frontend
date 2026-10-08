import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { AddLocationDialog } from './AddLocationDialog'
import type { AdminUser } from './types'

const user: AdminUser = {
  id: 'u1',
  firstName: 'Roy',
  lastName: 'Sand',
  email: 'roy@sanddata.no',
  isActive: true,
  roles: ['User'],
  locations: [],
  locationIds: [],
}

const created = {
  location: {
    id: 'loc-1',
    name: 'Cabin',
    address: 'Hyttevegen 1',
    serialNumber: 'SN-1',
    zone: 'NO3',
    isActive: true,
    hasNorgesPriceAgreement: false,
    meters: [],
  },
  apiKey: 'SECRET-SENSOR-KEY',
}

async function fillAndSubmit(u: ReturnType<typeof userEvent.setup>) {
  await u.type(screen.getByLabelText('Name'), 'Cabin')
  await u.type(screen.getByLabelText('Address'), 'Hyttevegen 1')
  await u.type(screen.getByLabelText('Serial number'), 'SN-1')
  await u.click(screen.getByRole('combobox', { name: 'Price zone' }))
  await u.click(await screen.findByRole('option', { name: 'NO3' }))
  await u.click(screen.getByRole('button', { name: 'Add location' }))
}

describe('AddLocationDialog', () => {
  it('creates the location, links it to the chosen user and shows the key once', async () => {
    const calls: string[] = []
    server.use(
      http.post('*/api/admin/locations', () => {
        calls.push('create')
        return HttpResponse.json(created, { status: 201 })
      }),
      http.put('*/api/users/u1/locations/loc-1', () => {
        calls.push('link')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const u = userEvent.setup()
    renderWithQuery(<AddLocationDialog user={user} onClose={vi.fn()} />)

    await fillAndSubmit(u)

    expect(await screen.findByText('SECRET-SENSOR-KEY')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/only once/i)
    expect(calls).toEqual(['create', 'link'])
  })

  it('does not show the key again after the dialog is closed and reopened', async () => {
    server.use(
      http.post('*/api/admin/locations', () => HttpResponse.json(created, { status: 201 })),
      http.put('*/api/users/u1/locations/loc-1', () => new HttpResponse(null, { status: 204 })),
    )
    const u = userEvent.setup()
    const { unmount } = renderWithQuery(<AddLocationDialog user={user} onClose={vi.fn()} />)
    await fillAndSubmit(u)
    await screen.findByText('SECRET-SENSOR-KEY')
    unmount()

    renderWithQuery(<AddLocationDialog user={user} onClose={vi.fn()} />)

    expect(screen.queryByText('SECRET-SENSOR-KEY')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('')
  })

  it('shows a duplicate serial number message and keeps the typed values', async () => {
    server.use(
      http.post('*/api/admin/locations', () =>
        HttpResponse.json(
          {
            code: 'Location.SerialNumberExists',
            message: 'Another location already uses this serial number',
          },
          { status: 409 },
        ),
      ),
    )
    const u = userEvent.setup()
    renderWithQuery(<AddLocationDialog user={user} onClose={vi.fn()} />)

    await fillAndSubmit(u)

    expect(await screen.findByRole('alert')).toHaveTextContent('already uses this serial number')
    expect(screen.getByLabelText('Serial number')).toHaveValue('SN-1')
  })

  it('offers to retry the link, without creating the location twice', async () => {
    let creates = 0
    let linkAttempts = 0
    server.use(
      http.post('*/api/admin/locations', () => {
        creates++
        return HttpResponse.json(created, { status: 201 })
      }),
      http.put('*/api/users/u1/locations/loc-1', () => {
        linkAttempts++
        return linkAttempts === 1
          ? HttpResponse.json({ code: 'Boom', message: 'Link failed' }, { status: 500 })
          : new HttpResponse(null, { status: 204 })
      }),
    )
    const u = userEvent.setup()
    renderWithQuery(<AddLocationDialog user={user} onClose={vi.fn()} />)
    await fillAndSubmit(u)

    expect(await screen.findByText(/not linked to this user/i)).toBeInTheDocument()
    expect(screen.getByText('SECRET-SENSOR-KEY')).toBeInTheDocument()

    await u.click(screen.getByRole('button', { name: 'Retry link' }))

    expect(await screen.findByText('The location was added and linked.')).toBeInTheDocument()
    expect(creates).toBe(1)
    expect(linkAttempts).toBe(2)
  })
})
