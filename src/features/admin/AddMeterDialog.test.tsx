import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { AddMeterDialog } from './AddMeterDialog'
import type { AdminUser } from './types'

const user: AdminUser = {
  id: 'u1',
  firstName: 'Roy',
  lastName: 'Sand',
  email: 'roy@sanddata.no',
  isActive: true,
  roles: ['User'],
  locations: ['Cabin', 'House'],
  locationIds: ['l1', 'l2'],
}

const meter = {
  id: 'm1',
  locationId: 'l2',
  deviceId: '58:CF:79:9C:93:AE',
  meterId: null,
  meterType: null,
  comment: null,
  isActive: true,
}

async function chooseHouseAndSubmit(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByRole('combobox', { name: 'Location' }))
  await u.click(await screen.findByRole('option', { name: 'House' }))
  await u.type(screen.getByLabelText('Device id'), meter.deviceId)
  await u.click(screen.getByRole('button', { name: 'Add meter' }))
}

describe('AddMeterDialog', () => {
  it("only offers the user's own locations", async () => {
    const u = userEvent.setup()
    renderWithQuery(<AddMeterDialog user={user} onClose={vi.fn()} />)

    await u.click(screen.getByRole('combobox', { name: 'Location' }))

    expect(await screen.findByRole('option', { name: 'Cabin' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'House' })).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('registers the meter at the chosen location and confirms', async () => {
    let body: unknown
    server.use(
      http.post('*/api/meters', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(meter)
      }),
    )
    const u = userEvent.setup()
    renderWithQuery(<AddMeterDialog user={user} onClose={vi.fn()} />)

    await chooseHouseAndSubmit(u)

    expect(await screen.findByText(`Meter ${meter.deviceId} was added.`)).toBeInTheDocument()
    expect(body).toEqual({ locationId: 'l2', deviceId: meter.deviceId })
  })

  it('explains that the meter is already registered on a 409', async () => {
    server.use(
      http.post('*/api/meters', () =>
        HttpResponse.json({ code: 'Meter.DeviceIdExists', message: 'exists' }, { status: 409 }),
      ),
    )
    const u = userEvent.setup()
    renderWithQuery(<AddMeterDialog user={user} onClose={vi.fn()} />)

    await chooseHouseAndSubmit(u)

    expect(await screen.findByRole('alert')).toHaveTextContent('already registered')
    expect(screen.getByLabelText('Device id')).toHaveValue(meter.deviceId)
  })

  it('shows API validation errors on the matching field', async () => {
    server.use(
      http.post('*/api/meters', () =>
        HttpResponse.json(
          { code: 'Validation', errors: { deviceId: ['Device id is not valid'] } },
          { status: 400 },
        ),
      ),
    )
    const u = userEvent.setup()
    renderWithQuery(<AddMeterDialog user={user} onClose={vi.fn()} />)

    await chooseHouseAndSubmit(u)

    expect(await screen.findByText('Device id is not valid')).toBeInTheDocument()
    expect(screen.getByLabelText('Device id')).toHaveValue(meter.deviceId)
  })
})
