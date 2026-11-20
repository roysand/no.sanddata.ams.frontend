import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import type { AdminLocation } from '../locations'
import { EvChargerSection } from './EvChargerSection'
import type { EvChargerSettings, ZaptecCharger } from './types'

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

const CHARGERS: ZaptecCharger[] = [
  { chargerId: 'c-1', name: 'Garasje', installationId: 'i-1', installationName: 'Hjemme' },
  { chargerId: 'c-2', name: 'Carport', installationId: 'i-2', installationName: 'Hytta' },
]

const settingsFor = (charger: ZaptecCharger, includeInTotals = false): EvChargerSettings => ({
  locationId: 'loc-1',
  chargerId: charger.chargerId,
  chargerName: charger.name,
  installationId: charger.installationId,
  installationName: charger.installationName,
  connectedAt: '2026-11-18T10:00:00Z',
  readUpTo: '2026-11-20T18:15:00Z',
  includeInTotals,
})

const PATH = '*/api/admin/locations/:id/ev-charger'
const LIST = '*/api/admin/ev-chargers'

const error = (status: number, message: string, code?: string) =>
  HttpResponse.json({ errors: { generalErrors: [message] }, code }, { status })

/** A fake API holding one connection; `put` and `list` decide the answers. */
function setup({
  connected = null,
  put,
  list = () => HttpResponse.json(CHARGERS),
}: {
  connected?: EvChargerSettings | null
  put?: (chargerId: string) => Response | Promise<Response>
  list?: () => Response
} = {}) {
  let current = connected
  const bodies: unknown[] = []
  let deletes = 0
  server.use(
    http.get(LIST, list),
    http.get(PATH, () =>
      current ? HttpResponse.json(current) : error(404, 'No car charger connected'),
    ),
    http.put(PATH, async ({ request }) => {
      const body = (await request.json()) as { chargerId: string }
      bodies.push(body)
      if (put) return put(body.chargerId)
      const charger = CHARGERS.find((c) => c.chargerId === body.chargerId)!
      current = settingsFor(charger)
      return HttpResponse.json(current)
    }),
    http.delete(PATH, () => {
      deletes++
      current = null
      return new HttpResponse(null, { status: 204 })
    }),
  )
  renderWithQuery(<EvChargerSection location={home} />)
  return { bodies, deletes: () => deletes }
}

const section = () => screen.getByRole('region', { name: 'Car charger' })

describe('EvChargerSection', () => {
  it('says when no charger is connected and offers Connect', async () => {
    setup()
    expect(await screen.findByText('No car charger connected')).toBeInTheDocument()
    expect(within(section()).getByRole('button', { name: 'Connect' })).toBeInTheDocument()
  })

  it('shows the connected charger, when it was connected and whether it is counted', async () => {
    setup({ connected: settingsFor(CHARGERS[0], true) })
    expect(await screen.findByText('Garasje · Hjemme')).toBeInTheDocument()
    expect(within(section()).getByText(/connected 18\.11\.2026/)).toBeInTheDocument()
    expect(within(section()).getByText(/counted with the house/)).toBeInTheDocument()
    expect(within(section()).getByRole('button', { name: 'Replace' })).toBeInTheDocument()
    expect(within(section()).getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })

  it('says "not counted" when the car is not counted with the house', async () => {
    setup({ connected: settingsFor(CHARGERS[0], false) })
    expect(await screen.findByText(/not counted/)).toBeInTheDocument()
  })

  it('connects the charger picked from the list', async () => {
    const user = userEvent.setup()
    const { bodies } = setup()
    await user.click(await screen.findByRole('button', { name: 'Connect' }))

    const dialog = await screen.findByRole('dialog', { name: 'Connect a car charger to Hjemme' })
    await user.click(await within(dialog).findByRole('radio', { name: 'Carport · Hytta' }))
    await user.click(within(dialog).getByRole('button', { name: 'Connect charger' }))

    expect(await screen.findByText('Carport · Hytta')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(bodies).toEqual([{ chargerId: 'c-2' }])
  })

  it('asks for a charger when none is picked, and sends nothing', async () => {
    const user = userEvent.setup()
    const { bodies } = setup()
    await user.click(await screen.findByRole('button', { name: 'Connect' }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByRole('radio', { name: 'Garasje · Hjemme' })

    await user.click(within(dialog).getByRole('button', { name: 'Connect charger' }))

    expect(await within(dialog).findByText('Pick a charger')).toBeInTheDocument()
    expect(bodies).toEqual([])
  })

  it("shows the API's message when the server's Zaptec sign-in is not set up", async () => {
    const user = userEvent.setup()
    setup({
      list: () =>
        error(503, 'The Zaptec sign-in is not set up on the server', 'EvCharger.NotConfigured'),
    })
    await user.click(await screen.findByRole('button', { name: 'Connect' }))

    const dialog = await screen.findByRole('dialog')
    expect(
      await within(dialog).findByText('The Zaptec sign-in is not set up on the server'),
    ).toBeInTheDocument()
    expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument()
  })

  it('says when the sign-in sees no chargers', async () => {
    const user = userEvent.setup()
    setup({ list: () => HttpResponse.json([]) })
    await user.click(await screen.findByRole('button', { name: 'Connect' }))

    expect(
      await screen.findByText("The server's Zaptec sign-in sees no chargers."),
    ).toBeInTheDocument()
  })

  it('keeps the dialog open with the message when the charger is in use elsewhere', async () => {
    const user = userEvent.setup()
    setup({
      put: () =>
        error(409, 'This charger is connected to another location', 'EvCharger.ChargerInUse'),
    })
    await user.click(await screen.findByRole('button', { name: 'Connect' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(await within(dialog).findByRole('radio', { name: 'Garasje · Hjemme' }))
    await user.click(within(dialog).getByRole('button', { name: 'Connect charger' }))

    expect(
      await within(dialog).findByText('This charger is connected to another location'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('replaces a connected charger', async () => {
    const user = userEvent.setup()
    const { bodies } = setup({ connected: settingsFor(CHARGERS[0]) })
    await user.click(await screen.findByRole('button', { name: 'Replace' }))

    const dialog = await screen.findByRole('dialog', {
      name: 'Replace the car charger at Hjemme',
    })
    await user.click(await within(dialog).findByRole('radio', { name: 'Carport · Hytta' }))
    await user.click(within(dialog).getByRole('button', { name: 'Replace charger' }))

    expect(await screen.findByText('Carport · Hytta')).toBeInTheDocument()
    expect(bodies).toEqual([{ chargerId: 'c-2' }])
  })

  it('removes the connection after asking', async () => {
    const user = userEvent.setup()
    const { deletes } = setup({ connected: settingsFor(CHARGERS[0], true) })
    await user.click(await screen.findByRole('button', { name: 'Remove' }))

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText(/Charging already read is kept, and the car is no longer counted/),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Remove charger' }))

    expect(await screen.findByText('No car charger connected')).toBeInTheDocument()
    expect(deletes()).toBe(1)
  })
})
