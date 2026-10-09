import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { SetupWizard } from './SetupWizard'
import type { LocationSummary } from './types'

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

const cabin: LocationSummary = {
  id: 'loc-1',
  name: 'Cabin',
  address: 'Hyttevegen 1',
  zone: 'NO3',
  meters: [],
}

function renderWizard() {
  return renderWithQuery(
    <MemoryRouter>
      <SetupWizard />
    </MemoryRouter>,
  )
}

async function fillLocation(u: ReturnType<typeof userEvent.setup>) {
  await u.type(await screen.findByLabelText('Name'), 'Cabin')
  await u.type(screen.getByLabelText('Address'), 'Hyttevegen 1')
  await u.type(screen.getByLabelText('Serial number'), 'SN-1')
  await u.click(screen.getByRole('combobox', { name: 'Price zone' }))
  await u.click(await screen.findByRole('option', { name: 'NO3' }))
  await u.click(screen.getByRole('button', { name: 'Add location' }))
}

describe('SetupWizard', () => {
  it('walks through location, one-time key and meter', async () => {
    let locations: LocationSummary[] = []
    const posted: string[] = []
    server.use(
      http.get('*/api/locations', () => HttpResponse.json(locations)),
      http.post('*/api/locations', () => {
        posted.push('location')
        locations = [cabin]
        return HttpResponse.json(created, { status: 201 })
      }),
      http.post('*/api/meters', async ({ request }) => {
        posted.push('meter')
        const body = (await request.json()) as { locationId: string; deviceId: string }
        expect(body).toMatchObject({ locationId: 'loc-1', deviceId: 'AA:BB' })
        return HttpResponse.json({ id: 'm1', ...body, isActive: true })
      }),
    )
    const u = userEvent.setup()
    renderWizard()

    await fillLocation(u)

    expect(await screen.findByText('SECRET-SENSOR-KEY')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/only once/i)

    await u.click(screen.getByRole('button', { name: /I have saved the key/ }))
    expect(screen.queryByText('SECRET-SENSOR-KEY')).not.toBeInTheDocument()

    await u.type(await screen.findByLabelText('Device id'), 'AA:BB')
    await u.click(screen.getByRole('button', { name: 'Add meter' }))

    expect(await screen.findByText('All set')).toBeInTheDocument()
    expect(posted).toEqual(['location', 'meter'])
  })

  it('resumes at the meter step when a location has no meter', async () => {
    const posted: string[] = []
    server.use(
      http.get('*/api/locations', () => HttpResponse.json([cabin])),
      http.post('*/api/locations', () => {
        posted.push('location')
        return HttpResponse.json(created, { status: 201 })
      }),
    )
    renderWizard()

    expect(await screen.findByText(/Step 2 of 2/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Serial number')).not.toBeInTheDocument()
    expect(posted).toEqual([])
  })

  it('does not create the location twice when the user leaves after step 1 and returns', async () => {
    let locations: LocationSummary[] = []
    let creates = 0
    server.use(
      http.get('*/api/locations', () => HttpResponse.json(locations)),
      http.post('*/api/locations', () => {
        creates += 1
        locations = [cabin]
        return HttpResponse.json(created, { status: 201 })
      }),
    )
    const u = userEvent.setup()
    const first = renderWizard()
    await fillLocation(u)
    await screen.findByText('SECRET-SENSOR-KEY')
    first.unmount()

    renderWizard()

    expect(await screen.findByText(/Step 2 of 2/)).toBeInTheDocument()
    expect(screen.queryByText('SECRET-SENSOR-KEY')).not.toBeInTheDocument()
    expect(creates).toBe(1)
  })

  it('shows the reason and keeps the values when the serial number is taken', async () => {
    server.use(
      http.get('*/api/locations', () => HttpResponse.json([])),
      http.post('*/api/locations', () =>
        HttpResponse.json(
          { message: 'Duplicate', errors: { generalErrors: ['Serial number SN-1 is already in use'] } },
          { status: 409 },
        ),
      ),
    )
    const u = userEvent.setup()
    renderWizard()

    await fillLocation(u)

    expect(await screen.findByRole('alert')).toHaveTextContent(/already in use/)
    expect(screen.getByLabelText('Serial number')).toHaveValue('SN-1')
    expect(screen.queryByText('SECRET-SENSOR-KEY')).not.toBeInTheDocument()
  })

  it('shows the limit message instead of the form at the maximum number of locations', async () => {
    const full = ['a', 'b', 'c', 'd'].map((id) => ({
      ...cabin,
      id,
      meters: [{ id: `m-${id}`, locationId: id, deviceId: 'X', comment: null, isActive: true }],
    }))
    server.use(http.get('*/api/locations', () => HttpResponse.json(full)))
    renderWizard()

    expect(await screen.findByText(/maximum of 4 locations/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Serial number')).not.toBeInTheDocument()
  })
})
