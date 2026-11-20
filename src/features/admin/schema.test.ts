import {
  createUserSchema,
  defaultKeyExpiresOn,
  keyExpirySchema,
  resetPasswordSchema,
  waterHeaterSchema,
} from './schema'

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

describe('waterHeaterSchema', () => {
  // A date a year ahead, so these cases test only the pair.
  const pair = {
    deviceId: '4b88147ab00649499d',
    subscriptionKey: 'a1b2c3d4e5',
    keyExpiresOn: defaultKeyExpiresOn(),
  }
  const messages = (input: Partial<typeof pair>) => {
    const result = waterHeaterSchema.safeParse({ ...pair, ...input })
    return result.success ? [] : result.error.issues.map((issue) => issue.message)
  }

  it('accepts a valid pair', () => {
    expect(waterHeaterSchema.safeParse(pair).success).toBe(true)
  })

  it('requires both fields', () => {
    expect(messages({ deviceId: '' })).toContain('Device id is required')
    expect(messages({ subscriptionKey: '' })).toContain('Subscription key is required')
  })

  it('rejects a key with a space', () => {
    expect(messages({ subscriptionKey: 'abc def' })).toContain('The key cannot contain spaces')
  })

  it('rejects a device id that is not hexadecimal', () => {
    expect(messages({ deviceId: '4b88zz' })).toContain('Device id can only contain 0-9 and a-f')
  })

  it('allows at most 200 characters in each field', () => {
    expect(messages({ deviceId: 'a'.repeat(201) })).toContain('At most 200 characters')
    expect(messages({ subscriptionKey: 'a'.repeat(201) })).toContain('At most 200 characters')
    expect(messages({ deviceId: 'a'.repeat(200), subscriptionKey: 'a'.repeat(200) })).toEqual([])
  })

  it('trims the device id but not the key', () => {
    const result = waterHeaterSchema.safeParse({ ...pair, deviceId: ' 4B8814ab ' })
    expect(result.success && result.data.deviceId).toBe('4B8814ab')
    expect(messages({ subscriptionKey: ' key' })).toContain('The key cannot contain spaces')
  })
})

describe('the water heater key expiry date', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-20T10:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  const ok = (keyExpiresOn: string) => keyExpirySchema.safeParse({ keyExpiresOn }).success
  const message = (keyExpiresOn: string) => {
    const result = keyExpirySchema.safeParse({ keyExpiresOn })
    return result.success ? null : result.error.issues[0].message
  }

  it('must be after today in Oslo', () => {
    expect(message('2026-11-20')).toBe('The key must be valid after today')
    expect(ok('2026-11-21')).toBe(true)
  })

  it('may be at most five years ahead', () => {
    expect(ok('2031-11-20')).toBe(true)
    expect(message('2031-11-21')).toBe('At most five years ahead')
  })

  it('must be a real date', () => {
    expect(message('2027-02-30')).toBe('Enter a date')
    expect(message('')).toBe('Enter a date')
  })

  it('defaults to one year from today, and is part of the connect form', () => {
    expect(defaultKeyExpiresOn()).toBe('2027-11-20')
    expect(
      waterHeaterSchema.safeParse({
        deviceId: '4b88',
        subscriptionKey: 'k',
        keyExpiresOn: '2026-11-20',
      }).success,
    ).toBe(false)
  })
})
