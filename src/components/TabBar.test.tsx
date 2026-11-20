import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TabBar } from './TabBar'

function renderTabs(
  path: string,
  hasMultipleLocations: boolean,
  hasWaterHeater = false,
  hasEvCharger = false,
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TabBar
        hasMultipleLocations={hasMultipleLocations}
        hasWaterHeater={hasWaterHeater}
        hasEvCharger={hasEvCharger}
      />
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

  it('has no Car tab for a location without a car charger', () => {
    renderTabs('/', false, true)

    expect(screen.queryByRole('link', { name: 'Car' })).not.toBeInTheDocument()
  })

  it('adds a Car tab after Heater when the location has a car charger', () => {
    renderTabs('/ev-charger', false, true, true)

    const tabs = screen.getAllByRole('link').map((link) => link.textContent)
    expect(tabs).toEqual(['Now', 'History', 'Heater', 'Car', 'Location'])
    expect(screen.getByRole('link', { name: 'Car' })).toHaveAttribute('href', '/ev-charger')
    expect(screen.getByRole('link', { name: 'Car' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('navigation', { name: 'Main' })).toHaveClass('grid-cols-5')
  })

  it('has one column per tab', () => {
    renderTabs('/', false, false, true)

    expect(screen.getByRole('navigation', { name: 'Main' })).toHaveClass('grid-cols-4')
  })
})
