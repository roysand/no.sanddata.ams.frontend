import { userLocationOptions } from './locationOptions'
import type { AdminUser } from './types'

const user: AdminUser = {
  id: 'u1',
  firstName: 'Roy',
  lastName: 'Sand',
  email: 'roy@sanddata.no',
  isActive: true,
  roles: ['User'],
  locations: ['Cabin', 'House'],
  locationIds: ['l1', 'l2'],
}

describe('userLocationOptions', () => {
  it('pairs names with ids by position', () => {
    expect(userLocationOptions(user)).toEqual([
      { id: 'l1', name: 'Cabin' },
      { id: 'l2', name: 'House' },
    ])
  })

  it('is empty for a user without locations', () => {
    expect(userLocationOptions({ ...user, locations: [], locationIds: [] })).toEqual([])
  })

  it('falls back to the id when a name is missing', () => {
    expect(userLocationOptions({ ...user, locations: ['Cabin'] })[1]).toEqual({
      id: 'l2',
      name: 'l2',
    })
  })
})
