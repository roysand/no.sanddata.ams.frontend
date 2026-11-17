import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, type JsonBodyType } from 'msw'
import { vi } from 'vitest'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { osloDate } from '../../test/dates'
import { AddGridTariffRateDialog } from './AddGridTariffRateDialog'
import type { GridTariff } from './types'

const tariff: GridTariff = { id: 'tariff-elvia', name: 'Elvia, household', rates: [] }

interface Posted {
  tariffId: string
  body: {
    validFrom: string
    dayRatePerKwh: number
    nightRatePerKwh: number
    confirmPastDate: boolean
  }
}

function serveAdd(status = 201, body: JsonBodyType = {}) {
  const posted: Posted[] = []
  server.use(
    http.post('*/api/admin/grid-tariffs/:id/rates', async ({ params, request }) => {
      posted.push({ tariffId: String(params.id), body: (await request.json()) as Posted['body'] })
      return HttpResponse.json(body, { status })
    }),
  )
  return posted
}

function setup() {
  const onClose = vi.fn()
  renderWithQuery(<AddGridTariffRateDialog tariff={tariff} onClose={onClose} />)
  return { onClose }
}

function fill(date: string, day: string, night: string) {
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: date } })
  fireEvent.change(screen.getByLabelText(/^Day rate/), { target: { value: day } })
  fireEvent.change(screen.getByLabelText(/^Night and weekend rate/), { target: { value: night } })
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Add rate' }))

describe('AddGridTariffRateDialog', () => {
  it('says that the rates are entered excluding taxes and VAT', () => {
    setup()

    expect(screen.getByText(/excluding taxes and VAT/)).toBeInTheDocument()
    expect(screen.getByText(/added separately/)).toBeInTheDocument()
  })

  it('names the tariff in the title', () => {
    setup()

    expect(screen.getByRole('dialog', { name: 'Add rate to Elvia, household' })).toBeInTheDocument()
  })

  it('posts a future rate to the tariff without a confirmation, and closes', async () => {
    const posted = serveAdd()
    const { onClose } = setup()

    fill(osloDate(30), '0,3641', '0,2641')
    await save()

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(posted).toEqual([
      {
        tariffId: 'tariff-elvia',
        body: {
          validFrom: osloDate(30),
          dayRatePerKwh: 0.3641,
          nightRatePerKwh: 0.2641,
          confirmPastDate: false,
        },
      },
    ])
  })

  it('shows what is wrong under each field and sends nothing', async () => {
    const posted = serveAdd()
    setup()

    fill('', '-1', '0,12345')
    await save()

    expect(await screen.findByText('Pick a start date')).toBeInTheDocument()
    expect(screen.getByText('Day rate cannot be negative')).toBeInTheDocument()
    expect(screen.getByText('Night rate can have at most 4 decimals')).toBeInTheDocument()
    expect(posted).toHaveLength(0)
  })

  it('shows the message from the API and stays open when it refuses', async () => {
    serveAdd(409, { errors: { generalErrors: ['Another rate already starts on this date'] } })
    const { onClose } = setup()

    fill(osloDate(30), '0,30', '0,20')
    await save()

    expect(await screen.findByText('Another rate already starts on this date')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  describe('a start date of today or earlier', () => {
    it.each([
      ['yesterday', -1],
      ['today', 0],
    ])('warns for %s and blocks saving until the box is ticked', async (_label, offset) => {
      const u = userEvent.setup()
      const posted = serveAdd()
      const { onClose } = setup()

      fill(osloDate(offset), '0,30', '0,20')

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Costs shown for past hours will be recalculated',
      )

      await u.click(screen.getByRole('button', { name: 'Add rate' }))
      expect(
        await screen.findByText('Confirm that costs shown for past hours will be recalculated'),
      ).toBeInTheDocument()
      expect(posted).toHaveLength(0)
      expect(onClose).not.toHaveBeenCalled()

      await u.click(screen.getByRole('checkbox'))
      await u.click(screen.getByRole('button', { name: 'Add rate' }))

      await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
      expect(posted[0].body).toEqual({
        validFrom: osloDate(offset),
        dayRatePerKwh: 0.3,
        nightRatePerKwh: 0.2,
        confirmPastDate: true,
      })
    })

    it('shows the 409 message when the date is not newer than the newest rate', async () => {
      const u = userEvent.setup()
      serveAdd(409, {
        errors: {
          generalErrors: [
            'A rate that starts today or earlier must start after every existing rate',
          ],
        },
      })
      const { onClose } = setup()

      fill(osloDate(-400), '0,30', '0,20')
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
    setup()

    fill(osloDate(1), '0,30', '0,20')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('does not send a confirmation ticked for a past date after the date moves to the future', async () => {
    const u = userEvent.setup()
    const posted = serveAdd()
    const { onClose } = setup()

    fill(osloDate(-1), '0,30', '0,20')
    await u.click(await screen.findByRole('checkbox'))
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: osloDate(10) } })
    await u.click(screen.getByRole('button', { name: 'Add rate' }))

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(posted[0].body.confirmPastDate).toBe(false)
  })
})
