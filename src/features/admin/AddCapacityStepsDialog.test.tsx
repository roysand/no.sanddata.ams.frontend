import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { AddCapacityStepsDialog } from './AddCapacityStepsDialog'
import type { CapacityStepTableInput, GridTariff } from './types'

const elvia: GridTariff = { id: 'tariff-elvia', name: 'Elvia, household', rates: [] }

function setup(answer: () => Response = () => HttpResponse.json({}, { status: 201 })) {
  const sent: CapacityStepTableInput[] = []
  server.use(
    http.post('*/api/admin/grid-tariffs/:id/capacity-steps', async ({ request }) => {
      sent.push((await request.json()) as CapacityStepTableInput)
      return answer()
    }),
  )
  const onClose = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <AddCapacityStepsDialog tariff={elvia} onClose={onClose} />
    </QueryClientProvider>,
  )
  return { sent, onClose, u: userEvent.setup() }
}

const upTo = (step: number) => screen.getByRole('textbox', { name: `Step ${step} up to (kW)` })
const amount = (step: number) =>
  screen.getByRole('textbox', { name: `Step ${step} amount per month` })

/** Fills a table of `rows` ([upper kW, amount]); the last row's upper kW is not typed (it is open). */
async function fill(u: ReturnType<typeof userEvent.setup>, rows: [string, string][]) {
  for (let i = 2; i < rows.length; i++) {
    await u.click(screen.getByRole('button', { name: 'Add step' }))
  }
  for (const [i, [upper, value]] of rows.entries()) {
    if (i < rows.length - 1) await u.type(upTo(i + 1), upper)
    await u.type(amount(i + 1), value)
  }
}

describe('AddCapacityStepsDialog', () => {
  it('sends the published amounts including VAT as amounts excluding VAT, with the derived lower bounds', async () => {
    const { sent, onClose, u } = setup()
    await u.type(screen.getByLabelText('Start date'), '2099-07-01')
    await u.click(screen.getByLabelText('Amounts include VAT (divide by 1,25)'))
    await fill(u, [
      ['2', '150'],
      ['5', '250'],
      ['10', '420'],
      ['', '675'],
    ])

    expect(screen.getByLabelText('Step 3 excl. VAT')).toHaveTextContent('336,00')

    await u.click(screen.getByRole('button', { name: 'Add steps' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(sent).toEqual([
      {
        validFrom: '2099-07-01',
        confirmPastDate: false,
        steps: [
          { lowerKw: 0, upperKw: 2, monthlyAmount: 120 },
          { lowerKw: 2, upperKw: 5, monthlyAmount: 200 },
          { lowerKw: 5, upperKw: 10, monthlyAmount: 336 },
          { lowerKw: 10, upperKw: null, monthlyAmount: 540 },
        ],
      },
    ])
  })

  it('shows the lower bound of each row and an open last row', async () => {
    const { u } = setup()
    await u.type(upTo(1), '2,5')

    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent(/^0/)
    expect(rows[2]).toHaveTextContent(/^2,5/)
    expect(rows[2]).toHaveTextContent('and above')
  })

  it('refuses an upper limit that is not above where the step starts', async () => {
    const { sent, u } = setup()
    await u.type(screen.getByLabelText('Start date'), '2099-07-01')
    await u.click(screen.getByRole('button', { name: 'Add step' }))
    await fill(u, [
      ['5', '100'],
      ['3', '200'],
      ['', '300'],
    ])
    await u.click(screen.getByRole('button', { name: 'Add steps' }))

    expect(await screen.findByText('Must be above where the step starts')).toBeInTheDocument()
    expect(sent).toHaveLength(0)
  })

  it('asks for the confirmation when the start date has passed', async () => {
    const { sent, u } = setup()
    await u.type(screen.getByLabelText('Start date'), '2026-01-01')
    await fill(u, [
      ['2', '120'],
      ['', '200'],
    ])
    await u.click(screen.getByRole('button', { name: 'Add steps' }))

    expect(
      await screen.findByText('Confirm that costs shown for past hours will be recalculated'),
    ).toBeInTheDocument()
    expect(sent).toHaveLength(0)

    await u.click(
      screen.getByLabelText('I understand that costs shown for past hours will be recalculated'),
    )
    await u.click(screen.getByRole('button', { name: 'Add steps' }))
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0].confirmPastDate).toBe(true)
  })

  it('keeps the input and shows the server message when the API refuses the table', async () => {
    const { onClose, u } = setup(() =>
      HttpResponse.json({ message: 'A table with this start date exists' }, { status: 409 }),
    )
    await u.type(screen.getByLabelText('Start date'), '2099-07-01')
    await fill(u, [
      ['2', '120'],
      ['', '200'],
    ])
    await u.click(screen.getByRole('button', { name: 'Add steps' }))

    expect(await screen.findByText('A table with this start date exists')).toBeInTheDocument()
    expect(amount(1)).toHaveValue('120')
    expect(onClose).not.toHaveBeenCalled()
  })
})
