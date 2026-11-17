import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, type JsonBodyType } from 'msw'
import { vi } from 'vitest'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { osloDate } from '../../test/dates'
import { AddPriceRateDialog } from './AddPriceRateDialog'
import type { PriceRateKind } from './types'

interface Posted {
  kind: PriceRateKind
  validFrom: string
  value: number
  confirmPastDate: boolean
}

function serveAdd(status = 201, body: JsonBodyType = {}) {
  const posted: Posted[] = []
  server.use(
    http.post('*/api/admin/price-rates', async ({ request }) => {
      posted.push((await request.json()) as Posted)
      return HttpResponse.json(body, { status })
    }),
  )
  return posted
}

function setup(kind: PriceRateKind) {
  const onClose = vi.fn()
  renderWithQuery(<AddPriceRateDialog priceKind={kind} onClose={onClose} />)
  return { onClose }
}

function fill(date: string, value: string) {
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: date } })
  fireEvent.change(screen.getByLabelText(/^(Value|VAT|Limit)/), { target: { value } })
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Add rate' }))

describe('AddPriceRateDialog', () => {
  it.each([
    ['ElectricityTax', 'Add Electricity tax rate', 'Value (kr/kWh)'],
    ['EnovaFee', 'Add Enova fee rate', 'Value (kr/kWh)'],
    ['Vat', 'Add VAT rate', 'VAT (%)'],
    ['NorgesPrisCapHome', 'Add Norgespris monthly limit (home) rate', 'Limit (kWh per month)'],
    [
      'NorgesPrisCapHolidayHome',
      'Add Norgespris monthly limit (holiday home) rate',
      'Limit (kWh per month)',
    ],
  ] as const)('is titled and labelled for %s', (kind, title, label) => {
    setup(kind)

    expect(screen.getByRole('dialog', { name: title })).toBeInTheDocument()
    expect(screen.getByLabelText(label)).toBeInTheDocument()
  })

  it('posts a fee for its kind as a number, without a confirmation, and closes', async () => {
    const posted = serveAdd()
    const { onClose } = setup('ElectricityTax')

    fill(osloDate(30), '0,0713')
    await save()

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(posted).toEqual([
      { kind: 'ElectricityTax', validFrom: osloDate(30), value: 0.0713, confirmPastDate: false },
    ])
  })

  it('sends the Enova fee with its own kind', async () => {
    const posted = serveAdd()
    const { onClose } = setup('EnovaFee')

    fill(osloDate(30), '0.01')
    await save()

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(posted[0]).toMatchObject({ kind: 'EnovaFee', value: 0.01 })
  })

  it.each([
    ['25', 0.25],
    ['25,5', 0.255],
    ['12.34', 0.1234],
    ['0', 0],
    ['100', 1],
  ])('sends VAT typed as %s percent as the fraction %d', async (typed, fraction) => {
    const posted = serveAdd()
    const { onClose } = setup('Vat')

    fill(osloDate(30), typed)
    await save()

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(posted[0]).toMatchObject({ kind: 'Vat', value: fraction })
  })

  it('shows what is wrong with a fee and sends nothing', async () => {
    const posted = serveAdd()
    setup('ElectricityTax')

    fill('', '-1')
    await save()

    expect(await screen.findByText('Pick a start date')).toBeInTheDocument()
    expect(screen.getByText('Value cannot be negative')).toBeInTheDocument()
    expect(posted).toHaveLength(0)
  })

  it('shows what is wrong with a VAT percentage and sends nothing', async () => {
    const posted = serveAdd()
    setup('Vat')

    fill(osloDate(30), '125')
    await save()

    expect(
      await screen.findByText('VAT must be a percentage from 0 to 100, for example 25'),
    ).toBeInTheDocument()
    expect(posted).toHaveLength(0)
  })

  it('shows the message from the API and stays open when it refuses', async () => {
    serveAdd(409, { errors: { generalErrors: ['Another rate already starts on this date'] } })
    const { onClose } = setup('ElectricityTax')

    fill(osloDate(30), '0,08')
    await save()

    expect(await screen.findByText('Another rate already starts on this date')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  describe('a start date of today or earlier', () => {
    it.each([
      ['a fee', 'ElectricityTax', '0,08', 0.08],
      ['VAT', 'Vat', '25', 0.25],
    ] as const)(
      'for %s needs the box ticked, then sends the confirmation',
      async (_what, kind, typed, value) => {
        const u = userEvent.setup()
        const posted = serveAdd()
        const { onClose } = setup(kind)

        fill(osloDate(-1), typed)

        expect(await screen.findByRole('alert')).toHaveTextContent(
          'Costs shown for past hours will be recalculated',
        )

        await u.click(screen.getByRole('button', { name: 'Add rate' }))
        expect(
          await screen.findByText('Confirm that costs shown for past hours will be recalculated'),
        ).toBeInTheDocument()
        expect(posted).toHaveLength(0)

        await u.click(screen.getByRole('checkbox'))
        await u.click(screen.getByRole('button', { name: 'Add rate' }))

        await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
        expect(posted).toEqual([{ kind, validFrom: osloDate(-1), value, confirmPastDate: true }])
      },
    )

    it('warns for today too', async () => {
      setup('EnovaFee')

      fill(osloDate(0), '0,01')

      expect(await screen.findByRole('alert')).toBeInTheDocument()
    })

    it('shows the 409 message when the date is not newer than the newest row', async () => {
      const u = userEvent.setup()
      serveAdd(409, {
        errors: {
          generalErrors: [
            'A rate that starts today or earlier must start after every existing rate',
          ],
        },
      })
      const { onClose } = setup('ElectricityTax')

      fill(osloDate(-400), '0,08')
      await u.click(await screen.findByRole('checkbox'))
      await u.click(screen.getByRole('button', { name: 'Add rate' }))

      expect(
        await screen.findByText(
          'A rate that starts today or earlier must start after every existing rate',
        ),
      ).toBeInTheDocument()
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  it('shows no warning for tomorrow', () => {
    setup('Vat')

    fill(osloDate(1), '25')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('does not send a confirmation ticked for a past date after the date moves to the future', async () => {
    const u = userEvent.setup()
    const posted = serveAdd()
    const { onClose } = setup('ElectricityTax')

    fill(osloDate(-1), '0,08')
    await u.click(await screen.findByRole('checkbox'))
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: osloDate(10) } })
    await u.click(screen.getByRole('button', { name: 'Add rate' }))

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(posted[0].confirmPastDate).toBe(false)
  })

  describe('a Norgespris monthly limit', () => {
    it('posts the limit in kWh per month with its kind', async () => {
      const posted = serveAdd()
      const { onClose } = setup('NorgesPrisCapHolidayHome')

      fill(osloDate(30), '1000')
      await save()

      await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
      expect(posted).toEqual([
        {
          kind: 'NorgesPrisCapHolidayHome',
          validFrom: osloDate(30),
          value: 1000,
          confirmPastDate: false,
        },
      ])
    })

    it.each([
      ['0', 'Limit must be above 0'],
      ['100000', 'Limit can be at most 99999'],
    ])('refuses %s and sends nothing', async (value, message) => {
      const posted = serveAdd()
      setup('NorgesPrisCapHome')

      fill(osloDate(30), value)
      await save()

      expect(await screen.findByText(message)).toBeInTheDocument()
      expect(posted).toHaveLength(0)
    })
  })
})
