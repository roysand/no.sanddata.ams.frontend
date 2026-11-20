import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import type { AdminLocation } from '../locations'
import { osloToday } from '../dashboard'
import { defaultKeyExpiresOn, KEY_EXPIRY_OUT_OF_RANGE } from './schema'
import { WaterHeaterSection } from './WaterHeaterSection'
import type { WaterHeaterSettings } from './types'

const home: AdminLocation = {
  id: 'loc-1',
  name: 'Hjemme',
  address: 'Gata 1',
  serialNumber: 'SN-1',
  zone: 'NO1',
  isActive: true,
  hasNorgesPriceAgreement: false,
  meters: [],
  users: [],
}

const CONNECTED: WaterHeaterSettings = {
  locationId: 'loc-1',
  deviceIdHint: '4b8814…49499d',
  connectedAt: '2026-11-20T10:00:00Z',
  updatedAt: '2026-11-20T10:00:00Z',
  keyExpiresOn: '2027-11-19',
}

const PATH = '*/api/admin/locations/:id/water-heater'

/** A fake API holding one connection; `put` decides the answer to a connect. */
function setup({
  connected = false,
  put = () => HttpResponse.json(CONNECTED),
}: {
  connected?: boolean
  put?: () => Response | Promise<Response>
} = {}) {
  let current: WaterHeaterSettings | null = connected ? CONNECTED : null
  const bodies: unknown[] = []
  let deletes = 0
  server.use(
    http.get(PATH, () =>
      current
        ? HttpResponse.json(current)
        : HttpResponse.json(
            { errors: { generalErrors: ['No water heater connected'] } },
            { status: 404 },
          ),
    ),
    http.put(PATH, async ({ request }) => {
      bodies.push(await request.json())
      const response = await put()
      if (response.ok) current = CONNECTED
      return response
    }),
    http.delete(PATH, () => {
      deletes++
      current = null
      return new HttpResponse(null, { status: 204 })
    }),
  )
  renderWithQuery(<WaterHeaterSection location={home} />)
  return { bodies, deletes: () => deletes }
}

const section = () => screen.getByRole('region', { name: 'Water heater' })

async function fill(user: ReturnType<typeof userEvent.setup>, deviceId: string, key: string) {
  await user.type(screen.getByLabelText('Device id'), deviceId)
  await user.type(screen.getByLabelText('Subscription key'), key)
}

describe('WaterHeaterSection', () => {
  it('says when no heater is connected and offers Connect', async () => {
    setup()
    expect(await screen.findByText('No water heater connected')).toBeInTheDocument()
    expect(within(section()).getByRole('button', { name: 'Connect' })).toBeInTheDocument()
  })

  it('checks the fields before sending anything', async () => {
    const user = userEvent.setup()
    const { bodies } = setup()
    await user.click(await screen.findByRole('button', { name: 'Connect' }))
    await user.click(screen.getByRole('button', { name: 'Connect heater' }))

    expect(await screen.findByText('Device id is required')).toBeInTheDocument()
    expect(screen.getByText('Subscription key is required')).toBeInTheDocument()
    expect(bodies).toHaveLength(0)
  })

  it('shows the check with OSO, then the connected heater', async () => {
    const user = userEvent.setup()
    const { bodies } = setup({
      put: async () => {
        await delay(50)
        return HttpResponse.json(CONNECTED)
      },
    })
    await user.click(await screen.findByRole('button', { name: 'Connect' }))
    await fill(user, '4b88147ab00649499d', 'secret-key')
    await user.click(screen.getByRole('button', { name: 'Connect heater' }))

    expect(await screen.findByRole('button', { name: 'Checking with OSO…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(await screen.findByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('4b8814…49499d')).toBeInTheDocument()
    expect(screen.getByText(/20\.11\.2026/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Subscription key')).not.toBeInTheDocument()
    // The key's expiry date is sent too, one year from today unless changed (spec 011).
    expect(bodies).toEqual([
      {
        subscriptionKey: 'secret-key',
        deviceId: '4b88147ab00649499d',
        keyExpiresOn: defaultKeyExpiresOn(),
      },
    ])
  })

  it('shows a rejection from OSO and keeps what was typed', async () => {
    const user = userEvent.setup()
    setup({
      put: () =>
        HttpResponse.json(
          { errors: { generalErrors: ['OSO rejected the key or device id'] } },
          { status: 400 },
        ),
    })
    await user.click(await screen.findByRole('button', { name: 'Connect' }))
    await fill(user, '4b88147ab0', 'wrong-key')
    await user.click(screen.getByRole('button', { name: 'Connect heater' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('OSO rejected the key or device id')
    expect(screen.getByLabelText('Device id')).toHaveValue('4b88147ab0')
    expect(screen.getByLabelText('Subscription key')).toHaveValue('wrong-key')
    expect(screen.getByText('No water heater connected')).toBeInTheDocument()
  })

  it('shows a field message from the API under its field', async () => {
    const user = userEvent.setup()
    setup({
      put: () =>
        HttpResponse.json(
          { errors: { deviceId: ['The device id is not valid'] } },
          { status: 400 },
        ),
    })
    await user.click(await screen.findByRole('button', { name: 'Connect' }))
    await fill(user, 'abc', 'key')
    await user.click(screen.getByRole('button', { name: 'Connect heater' }))

    expect(await screen.findByText('The device id is not valid')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('connects in a dialog of its own', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(await screen.findByRole('button', { name: 'Connect' }))

    const dialog = screen.getByRole('dialog', { name: 'Connect water heater' })
    expect(within(dialog).getByLabelText('Device id')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Connect heater' })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens an empty form to replace a connected heater', async () => {
    const user = userEvent.setup()
    setup({ connected: true })
    await user.click(await screen.findByRole('button', { name: 'Replace' }))

    expect(screen.getByRole('dialog', { name: 'Replace water heater' })).toBeInTheDocument()

    expect(screen.getByLabelText('Device id')).toHaveValue('')
    expect(screen.getByLabelText('Subscription key')).toHaveValue('')
  })

  it('removes the heater after asking, and says the history is kept', async () => {
    const user = userEvent.setup()
    const { deletes } = setup({ connected: true })
    await user.click(await screen.findByRole('button', { name: 'Remove' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('The stored power history is kept.')
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))

    expect(await screen.findByText('No water heater connected')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deletes()).toBe(1)
  })

  it('hides the key and asks the browser not to save it', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(await screen.findByRole('button', { name: 'Connect' }))
    const key = screen.getByLabelText('Subscription key')

    expect(key).toHaveAttribute('type', 'password')
    expect(key).toHaveAttribute('autocomplete', 'off')
    expect(screen.getByLabelText('Device id')).toHaveAttribute('autocomplete', 'off')
  })
})

describe('WaterHeaterSection key expiry date', () => {
  /** A connected heater whose key is valid until `keyExpiresOn`, and the date endpoint. */
  function setupDate(keyExpiresOn: string | undefined, dateAnswer?: () => Response) {
    let current: Record<string, unknown> = { ...CONNECTED, keyExpiresOn }
    if (keyExpiresOn === undefined) delete current.keyExpiresOn
    const dateBodies: unknown[] = []
    server.use(
      http.get(PATH, () => HttpResponse.json(current)),
      http.put(`${PATH}/key-expiry`, async ({ request }) => {
        const body = (await request.json()) as { keyExpiresOn: string }
        dateBodies.push(body)
        const answer = dateAnswer?.()
        if (answer) return answer
        current = { ...current, keyExpiresOn: body.keyExpiresOn }
        return HttpResponse.json(current)
      }),
    )
    renderWithQuery(<WaterHeaterSection location={home} />)
    return { dateBodies }
  }

  const inDays = (days: number) => {
    const [y, m, d] = osloToday().split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
  }
  const shown = (date: string) => date.split('-').reverse().join('.')

  it('shows the date the key is valid until, with no badge when it is far ahead', async () => {
    setupDate('2027-11-19')

    expect(await screen.findByText(/Key valid until 19\.11\.2027/)).toBeInTheDocument()
    expect(screen.queryByText(/expires in/)).not.toBeInTheDocument()
  })

  it('marks a key that expires within 30 days', async () => {
    setupDate(inDays(10))

    expect(await screen.findByText('expires in 10 days')).toBeInTheDocument()
  })

  it('changes only the date', async () => {
    const user = userEvent.setup()
    const target = inDays(40)
    const { dateBodies } = setupDate('2027-11-19')

    await user.click(await screen.findByRole('button', { name: 'Change date' }))
    const field = screen.getByLabelText('Key valid until')
    expect(field).toHaveValue('2027-11-19')
    await user.clear(field)
    await user.type(field, target)
    await user.click(screen.getByRole('button', { name: 'Save date' }))

    expect(
      await screen.findByText(new RegExp(`Key valid until ${shown(target)}`)),
    ).toBeInTheDocument()
    expect(dateBodies).toEqual([{ keyExpiresOn: target }])
  })

  it("shows the API's refusal of the date at the field", async () => {
    const user = userEvent.setup()
    setupDate('2027-11-19', () =>
      HttpResponse.json({ errors: { generalErrors: [KEY_EXPIRY_OUT_OF_RANGE] } }, { status: 400 }),
    )

    await user.click(await screen.findByRole('button', { name: 'Change date' }))
    await user.click(screen.getByRole('button', { name: 'Save date' }))

    expect(await screen.findByText(KEY_EXPIRY_OUT_OF_RANGE)).toBeInTheDocument()
    expect(screen.getByLabelText('Key valid until')).toBeInTheDocument()
  })

  it('shows no date and no Change date against an API without it', async () => {
    setupDate(undefined)

    expect(await screen.findByText('Connected')).toBeInTheDocument()
    expect(screen.queryByText(/Key valid until/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change date' })).not.toBeInTheDocument()
  })

  it('offers one year from today in the connect dialog', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(await screen.findByRole('button', { name: 'Connect' }))

    expect(screen.getByLabelText('Key valid until')).toHaveValue(defaultKeyExpiresOn())
  })
})
