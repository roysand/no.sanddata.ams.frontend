import { canEdit, ownedLocations } from './access'

describe('access', () => {
  it('lets owners edit and viewers not', () => {
    expect(canEdit({ role: 'Owner' })).toBe(true)
    expect(canEdit({ role: 'Viewer' })).toBe(false)
  })

  it('keeps only the owned locations', () => {
    const locations = [
      { id: 'a', role: 'Owner' as const },
      { id: 'b', role: 'Viewer' as const },
      { id: 'c', role: 'Owner' as const },
    ]

    expect(ownedLocations(locations).map((l) => l.id)).toEqual(['a', 'c'])
  })
})
