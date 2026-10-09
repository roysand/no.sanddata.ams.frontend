import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDeactivateDialog } from './ConfirmDeactivateDialog'

describe('ConfirmDeactivateDialog', () => {
  it('warns about the consequence and names the location', () => {
    render(<ConfirmDeactivateDialog locationName="Cabin" onConfirm={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText('Deactivate Cabin?')).toBeInTheDocument()
    expect(screen.getByText(/stops accepting sensor readings/)).toBeInTheDocument()
  })

  it('confirms only when asked to', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(
      <ConfirmDeactivateDialog locationName="Cabin" onConfirm={onConfirm} onCancel={onCancel} />,
    )

    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('keeps the location active when cancelled', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(
      <ConfirmDeactivateDialog locationName="Cabin" onConfirm={onConfirm} onCancel={onCancel} />,
    )

    await user.click(screen.getByRole('button', { name: 'Keep active' }))

    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
