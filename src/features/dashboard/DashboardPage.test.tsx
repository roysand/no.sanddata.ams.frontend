import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { DashboardPage } from './DashboardPage'

function renderDashboard() {
  return renderWithQuery(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/setup" element={<p>Setup page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  it('sends a user without locations to the setup', async () => {
    server.use(http.get('*/api/locations', () => HttpResponse.json([])))
    renderDashboard()

    expect(await screen.findByText('Setup page')).toBeInTheDocument()
  })
})
