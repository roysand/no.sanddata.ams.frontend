import { userLocationOptions } from './locationOptions'
import type { AdminUser } from './types'

const user: AdminUser = {
  id: 'u1',
  firstName: 'Roy',
  lastName: 'Sand',
  email: 'roy@sanddata.no',
  isActive: true,
  roles: ['User'],
  locationAccess: [
    { locationId: 'l1', name: 'Cabin', role: 'Owner' },
    { locationId: 'l2', name: 'House', role: 'Viewer' },
  ],
}

describe('userLocationOptions', () => {
  it('lists the ids with their names, whatever the role', () => {
    expect(userLocationOptions(user)).toEqual([
      { id: 'l1', name: 'Cabin' },
      { id: 'l2', name: 'House' },
    ])
  })

  it('is empty for a user without locations', () => {
    expect(userLocationOptions({ ...user, locationAccess: [] })).toEqual([])
  })
})
