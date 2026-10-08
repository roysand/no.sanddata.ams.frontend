import { createUserSchema, resetPasswordSchema } from './schema'

const valid = {
  firstName: 'Ola',
  lastName: 'Nordmann',
  email: 'ola@example.com',
  password: 'Passw0rd!',
}

describe('createUserSchema', () => {
  it('accepts a valid user', () => {
    expect(createUserSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = createUserSchema.safeParse({ ...valid, email: 'nope' })
    expect(result.success).toBe(false)
  })

  it.each([
    ['Sh0rt!', 'at least 8 characters'],
    ['password1!', 'uppercase'],
    ['PASSWORD1!', 'lowercase'],
    ['Password!!', 'number'],
    ['Password12', 'special character'],
  ])('rejects password %s', (password, message) => {
    const result = resetPasswordSchema.safeParse({ newPassword: password })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain(message)
  })
})
