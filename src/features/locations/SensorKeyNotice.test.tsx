import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SensorKeyNotice } from './SensorKeyNotice'

describe('SensorKeyNotice', () => {
  it('shows the key with a warning that it is shown only once', () => {
    render(<SensorKeyNotice apiKey="abc123" />)

    expect(screen.getByText('abc123')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/only once/i)
  })

  it('copies the key to the clipboard and confirms', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(<SensorKeyNotice apiKey="abc123" />)

    await user.click(screen.getByRole('button', { name: 'Copy key' }))

    expect(writeText).toHaveBeenCalledWith('abc123')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })
})
