import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidePanel } from './SidePanel'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open panel</button>
      <SidePanel open={open} onOpenChange={setOpen} title="Account">
        <button>Sign out</button>
      </SidePanel>
    </>
  )
}

describe('SidePanel', () => {
  it('opens with its title and content', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Open panel' }))

    expect(screen.getByRole('dialog', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('closes on Escape and returns focus to the control that opened it', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Open panel' })

    await user.click(opener)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('closes with the Close button', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Open panel' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps focus inside while open', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Open panel' }))
    await user.tab()
    await user.tab()
    await user.tab()

    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement)
  })
})
