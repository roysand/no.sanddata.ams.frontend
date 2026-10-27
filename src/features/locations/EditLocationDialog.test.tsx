import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { EditLocationDialog } from './EditLocationDialog'
import type { LocationSummary } from './types'

const home: LocationSummary = {
  id: 'loc-1',
  name: 'Home',
  address: 'Storgata 1',
  zone: 'NO3',
  serialNumber: 'SN-1',
  hasNorgesPriceAgreement: true,
  isActive: true,
  role: 'Owner',
  meters: [],
}

function setup(location = home) {
  const bodies: unknown[] = []
  const onClose = vi.fn()
  server.use(
    http.put('*/api/locations/loc-1', async ({ request }) => {
      const body = await request.json()
      bodies.push(body)
      return HttpResponse.json({ ...location, ...(body as object) })
    }),
    http.get('*/api/locations', () => HttpResponse.json([location])),
  )
  renderWithQuery(<EditLocationDialog location={location} onClose={onClose} />)
  return { bodies, onClose }
}

describe('EditLocationDialog', () => {
  it('sends only name, address and isActive', async () => {
    const u = userEvent.setup()
    const { bodies, onClose } = setup()

    const name = screen.getByLabelText('Name')
    await u.clear(name)
    await u.type(name, 'Main house')
    await u.click(screen.getByRole('button', { name: 'Save' }))

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(bodies).toEqual([{ name: 'Main house', address: 'Storgata 1', isActive: true }])
  })

  it('shows serial number, zone and Norgespris as text, not inputs', () => {
    setup()

    expect(screen.getByText('SN-1')).toBeInTheDocument()
    expect(screen.getByText('NO3')).toBeInTheDocument()
    expect(screen.queryByLabelText('Serial number')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Price zone')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Norgespris/)).not.toBeInTheDocument()
    expect(screen.queryByText(/key/i)).not.toBeInTheDocument()
  })

  it('refuses an empty name and a 101-character address before sending', async () => {
    const u = userEvent.setup()
    const { bodies } = setup()

    await u.clear(screen.getByLabelText('Name'))
    await u.clear(screen.getByLabelText('Address'))
    await u.type(screen.getByLabelText('Address'), 'x'.repeat(101))
    await u.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Address must be at most 100 characters')).toBeInTheDocument()
    expect(bodies).toEqual([])
  })

  it('warns before deactivating: cancel sends nothing, confirm sends isActive false', async () => {
    const u = userEvent.setup()
    const { bodies, onClose } = setup()

    await u.click(screen.getByRole('checkbox', { name: 'Active' }))
    await u.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Deactivate Home?')).toBeInTheDocument()

    await u.click(screen.getByRole('button', { name: 'Keep active' }))
    expect(bodies).toEqual([])

    await u.click(screen.getByRole('button', { name: 'Save' }))
    await u.click(await screen.findByRole('button', { name: 'Deactivate' }))

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(bodies).toEqual([{ name: 'Home', address: 'Storgata 1', isActive: false }])
  })

  it('reactivating shows no warning', async () => {
    const u = userEvent.setup()
    const { bodies, onClose } = setup({ ...home, isActive: false })

    await u.click(screen.getByRole('checkbox', { name: 'Active' }))
    await u.click(screen.getByRole('button', { name: 'Save' }))

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(screen.queryByText(/Deactivate/)).not.toBeInTheDocument()
    expect(bodies).toEqual([{ name: 'Home', address: 'Storgata 1', isActive: true }])
  })

  it('says so when the location can no longer be edited', async () => {
    const u = userEvent.setup()
    setup()
    server.use(
      http.put('*/api/locations/loc-1', () =>
        HttpResponse.json(
          { message: 'Not found', errors: { generalErrors: ['Location not found'] } },
          { status: 404 },
        ),
      ),
    )

    await u.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You can no longer edit this location',
    )
  })
})
