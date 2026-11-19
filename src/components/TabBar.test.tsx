import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TabBar } from './TabBar'

function renderTabs(path: string, hasMultipleLocations: boolean, hasWaterHeater = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TabBar hasMultipleLocations={hasMultipleLocations} hasWaterHeater={hasWaterHeater} />
    </MemoryRouter>,
  )
}

describe('TabBar', () => {
  it('offers Now, History and Location, and marks the current page', () => {
    renderTabs('/history', false)

    expect(screen.getByRole('link', { name: 'Now' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'History' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Location' })).toHaveAttribute('href', '/locations')
  })

  it('calls the last tab "All locations" for a user with several locations', () => {
    renderTabs('/', true)

    expect(screen.getByRole('link', { name: 'All locations' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Now' })).toHaveAttribute('aria-current', 'page')
  })

  it('keeps the last tab current on the location management page too', () => {
    renderTabs('/locations/manage', false)

    expect(screen.getByRole('link', { name: 'Location' })).toHaveAttribute('aria-current', 'page')
  })

  it('has no Heater tab for a location without a water heater', () => {
    renderTabs('/', false)

    expect(screen.queryByRole('link', { name: 'Heater' })).not.toBeInTheDocument()
  })

  it('adds a Heater tab before Location when the location has a water heater', () => {
    renderTabs('/water-heater', false, true)

    const tabs = screen.getAllByRole('link').map((link) => link.textContent)
    expect(tabs).toEqual(['Now', 'History', 'Heater', 'Location'])
    expect(screen.getByRole('link', { name: 'Heater' })).toHaveAttribute('aria-current', 'page')
  })
})
