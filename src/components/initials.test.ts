import { initialsOf } from './initials'

describe('initialsOf', () => {
  it('uses the first letters of the first two name parts', () => {
    expect(initialsOf('ola.nordmann@example.com')).toBe('ON')
    expect(initialsOf('kari_anne-hansen@example.com')).toBe('KA')
  })

  it('uses the first two letters of a single-part name', () => {
    expect(initialsOf('roy@example.com')).toBe('RO')
  })
})
