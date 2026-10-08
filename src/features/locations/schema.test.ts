import { locationSchema, meterSchema } from './schema'

const validLocation = {
  name: 'Cabin',
  address: 'Hyttevegen 1',
  serialNumber: 'SN-1',
  zone: 'NO1',
  hasNorgesPriceAgreement: false,
  isActive: true,
}

describe('locationSchema', () => {
  it('accepts a valid location', () => {
    expect(locationSchema.safeParse(validLocation).success).toBe(true)
  })

  it.each(['name', 'address', 'serialNumber'] as const)('requires %s', (field) => {
    expect(locationSchema.safeParse({ ...validLocation, [field]: '  ' }).success).toBe(false)
  })

  it.each(['name', 'address', 'serialNumber'] as const)('allows %s up to 100 characters', (field) => {
    expect(locationSchema.safeParse({ ...validLocation, [field]: 'x'.repeat(100) }).success).toBe(true)
    expect(locationSchema.safeParse({ ...validLocation, [field]: 'x'.repeat(101) }).success).toBe(false)
  })

  it.each(['NO1', 'NO2', 'NO3', 'NO4', 'NO5'])('accepts zone %s', (zone) => {
    expect(locationSchema.safeParse({ ...validLocation, zone }).success).toBe(true)
  })

  it.each(['NO6', 'SE3', 'no1', ''])('rejects zone "%s"', (zone) => {
    expect(locationSchema.safeParse({ ...validLocation, zone }).success).toBe(false)
  })
})

describe('meterSchema', () => {
  const validMeter = { locationId: 'abc', deviceId: '58:CF:79:9C:93:AE' }

  it('accepts a meter without a comment', () => {
    expect(meterSchema.safeParse(validMeter).success).toBe(true)
  })

  it('requires a location and a device id', () => {
    expect(meterSchema.safeParse({ ...validMeter, locationId: '' }).success).toBe(false)
    expect(meterSchema.safeParse({ ...validMeter, deviceId: ' ' }).success).toBe(false)
  })

  it('limits device id to 100 and comment to 200 characters', () => {
    expect(meterSchema.safeParse({ ...validMeter, deviceId: 'x'.repeat(101) }).success).toBe(false)
    expect(meterSchema.safeParse({ ...validMeter, comment: 'x'.repeat(200) }).success).toBe(true)
    expect(meterSchema.safeParse({ ...validMeter, comment: 'x'.repeat(201) }).success).toBe(false)
  })
})
