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

  it('reads the car charger flags as false when an older API leaves them out (spec 013)', async () => {
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
            isActive: true,
            role: 'Owner',
            meters: [],
          },
          {
            id: 'b',
            name: 'Home',
            address: 'Hjemmevegen 1',
            zone: 'NO1',
            serialNumber: 'SN-2',
            hasNorgesPriceAgreement: true,
            isActive: true,
            role: 'Owner',
            meters: [],
            hasEvCharger: true,
            includeEvCharger: true,
          },
        ]),
      ),
    )

    const [older, newer] = await getLocations()

    expect(older.hasEvCharger).toBe(false)
    expect(older.includeEvCharger).toBe(false)
    expect(newer.hasEvCharger).toBe(true)
    expect(newer.includeEvCharger).toBe(true)
  })
})
