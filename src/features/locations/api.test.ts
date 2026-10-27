import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { getLocations } from './api'

describe('getLocations', () => {
  it('returns the role, active flag and system fields the API sends', async () => {
    server.use(
      http.get('*/api/locations', () =>
        HttpResponse.json([
          {
            id: 'a',
            name: 'Cabin',
            address: 'Hyttevegen 1',
            zone: 'NO3',
            serialNumber: 'SN-1',
            hasNorgesPriceAgreement: false,
            isActive: false,
            role: 'Viewer',
            meters: [],
          },
        ]),
      ),
    )

    const [location] = await getLocations()

    expect(location.role).toBe('Viewer')
    expect(location.isActive).toBe(false)
    expect(location.serialNumber).toBe('SN-1')
  })
})
