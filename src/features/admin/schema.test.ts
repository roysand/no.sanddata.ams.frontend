import { createUserSchema, resetPasswordSchema } from './schema'

const valid = {
  firstName: 'Ola',
  lastName: 'Nordmann',
  email: 'ola@example.com',
  password: 'Passw0rd12!',
}

describe('createUserSchema', () => {
  it('accepts a valid user', () => {
    expect(createUserSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts a password without a special character', () => {
    expect(createUserSchema.safeParse({ ...valid, password: 'Password12' }).success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = createUserSchema.safeParse({ ...valid, email: 'nope' })
    expect(result.success).toBe(false)
  })

  it.each([
    ['Sh0rt!', 'at least 10 characters'],
    ['password1!', 'uppercase'],
    ['PASSWORD1!', 'lowercase'],
    ['Password!!', 'number'],
  ])('rejects password %s', (password, message) => {
    const result = resetPasswordSchema.safeParse({ newPassword: password })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain(message)
  })
})
