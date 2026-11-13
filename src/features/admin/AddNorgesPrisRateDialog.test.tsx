import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, type JsonBodyType } from 'msw'
import { vi } from 'vitest'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { lastOsloDays } from '../dashboard/format'
import { AddNorgesPrisRateDialog } from './AddNorgesPrisRateDialog'

/** A Norwegian calendar date relative to today, as yyyy-MM-dd. */
function osloDate(offsetDays: number): string {
  const [y, m, d] = lastOsloDays(new Date(), 1)[0].split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + offsetDays)).toISOString().slice(0, 10)
}

interface Posted {
  validFrom: string
  ratePerKwh: number
  taxPerKwh: number
  confirmPastDate: boolean
}

function serveAdd(status = 201, body: JsonBodyType = {}) {
  const posted: Posted[] = []
  server.use(
    http.post('*/api/admin/norgespris', async ({ request }) => {
      posted.push((await request.json()) as Posted)
      return HttpResponse.json(body, { status })
    }),
  )
  return posted
}

function setup() {
  const onClose = vi.fn()
  renderWithQuery(<AddNorgesPrisRateDialog onClose={onClose} />)
  return { onClose }
}

function fill(date: string, rate: string, tax: string) {
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: date } })
  fireEvent.change(screen.getByLabelText('Rate (kr/kWh)'), { target: { value: rate } })
  fireEvent.change(screen.getByLabelText('Tax (kr/kWh)'), { target: { value: tax } })
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Add rate' }))

describe('AddNorgesPrisRateDialog', () => {
  it('posts a future rate without a confirmation and closes', async () => {
    const posted = serveAdd()
    const { onClose } = setup()

    fill(osloDate(30), '0,50', '0')
    await save()

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(posted).toEqual([
      { validFrom: osloDate(30), ratePerKwh: 0.5, taxPerKwh: 0, confirmPastDate: false },
    ])
  })

  it('reads amounts typed with a comma as numbers', async () => {
    const posted = serveAdd()
    const { onClose } = setup()

    fill(osloDate(30), '0,4567', '0,01')
    await save()

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(posted[0]).toMatchObject({ ratePerKwh: 0.4567, taxPerKwh: 0.01 })
  })

  it('shows what is wrong under each field and sends nothing', async () => {
    const posted = serveAdd()
    setup()

    fill('', '-1', '0,12345')
    await save()

    expect(await screen.findByText('Pick a start date')).toBeInTheDocument()
    expect(screen.getByText('Rate cannot be negative')).toBeInTheDocument()
    expect(screen.getByText('Tax can have at most 4 decimals')).toBeInTheDocument()
    expect(posted).toHaveLength(0)
  })

  it('shows the message from the API and stays open when it refuses', async () => {
    serveAdd(409, {
      errors: { generalErrors: ['Another Norgespris rate already starts on this date'] },
    })
    const { onClose } = setup()

    fill(osloDate(30), '0,50', '0')
    await save()

    expect(
      await screen.findByText('Another Norgespris rate already starts on this date'),
    ).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Add rate' })).toBeInTheDocument()
  })

  describe('a start date of today or earlier', () => {
    it.each([
      ['yesterday', -1],
      ['today', 0],
    ])('warns for %s and blocks saving until the box is ticked', async (_label, offset) => {
      const u = userEvent.setup()
      const posted = serveAdd()
      const { onClose } = setup()

      fill(osloDate(offset), '0,50', '0')

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
      expect(posted).toEqual([
        { validFrom: osloDate(offset), ratePerKwh: 0.5, taxPerKwh: 0, confirmPastDate: true },
      ])
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

      fill(osloDate(-400), '0,50', '0')
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

  it('shows no warning for tomorrow', async () => {
    setup()

    fill(osloDate(1), '0,50', '0')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('does not send a confirmation ticked for a past date after the date moves to the future', async () => {
    const u = userEvent.setup()
    const posted = serveAdd()
    const { onClose } = setup()

    fill(osloDate(-1), '0,50', '0')
    await u.click(await screen.findByRole('checkbox'))
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: osloDate(10) } })
    await u.click(screen.getByRole('button', { name: 'Add rate' }))

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(posted[0].confirmPastDate).toBe(false)
  })
})
