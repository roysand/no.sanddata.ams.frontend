import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from './ThemeProvider'
import { useTheme } from './themeContext'

function Probe() {
  const { preference, resolved, cycle } = useTheme()
  return (
    <button onClick={cycle}>
      {preference}/{resolved}
    </button>
  )
}

function mockDevice(dark: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: dark && query.includes('dark'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('follows a dark device by default', () => {
    mockDevice(true)
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    expect(screen.getByRole('button')).toHaveTextContent('system/dark')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('cycles system, light, dark and remembers an explicit choice', async () => {
    mockDevice(true)
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('light/light')
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('ams.theme')).toBe('light')

    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('dark/dark')
    expect(localStorage.getItem('ams.theme')).toBe('dark')

    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('system/dark')
    expect(localStorage.getItem('ams.theme')).toBeNull()
  })

  it('restores a stored choice on load', () => {
    mockDevice(false)
    localStorage.setItem('ams.theme', 'dark')
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    expect(screen.getByRole('button')).toHaveTextContent('dark/dark')
  })

  it('still works when storage is blocked', async () => {
    mockDevice(false)
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button'))

    expect(screen.getByRole('button')).toHaveTextContent('light/light')
    vi.restoreAllMocks()
  })
})
