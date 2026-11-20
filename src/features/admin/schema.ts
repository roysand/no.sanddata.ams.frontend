import { z } from 'zod'
import { addYearsToDate, osloToday } from '../dashboard'
import { decimalsOf, parseAmount } from './norgesPris'
import { percentDecimals, percentToFraction } from './pricing'
import type { CapacityStepTableInput, PriceRateKind } from './types'

// Same rules as the API's password validator, so mistakes are caught before the request.
const password = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Enter a valid email address').max(100),
  password,
})

export type CreateUserFormValues = z.infer<typeof createUserSchema>

export const resetPasswordSchema = z.object({ newPassword: password })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

// Same rules as the API's AddNorgesPrisRateValidator (0..100, at most 4 decimals), so mistakes are caught before the
// request. People type Norwegian decimals, so a comma is accepted.
const AMOUNT_MAX = 100
const AMOUNT_DECIMALS = 4

export const amountField = (label: string, max = AMOUNT_MAX) =>
  z.string().trim().min(1, `${label} is required`).superRefine(amountRules(label, max))

/** An amount that may be left empty; empty means "keep what is stored". */
export const optionalAmountField = (label: string, max = AMOUNT_MAX) =>
  z
    .string()
    .trim()
    .superRefine((text, ctx) => {
      if (text !== '') amountRules(label, max)(text, ctx)
    })

function amountRules(label: string, max: number) {
  return (text: string, ctx: z.RefinementCtx) => {
    const value = parseAmount(text)
    if (value === null) {
      ctx.addIssue({
        code: 'custom',
        message: text.startsWith('-')
          ? `${label} cannot be negative`
          : `${label} must be a number, for example 0,50`,
      })
    } else if (value > max) {
      ctx.addIssue({
        code: 'custom',
        message: `${label} can be at most ${max}`,
      })
    } else if (decimalsOf(text) > AMOUNT_DECIMALS) {
      ctx.addIssue({
        code: 'custom',
        message: `${label} can have at most ${AMOUNT_DECIMALS} decimals`,
      })
    }
  }
}

/**
 * Form values are text, as typed. `today` is the Norwegian calendar date (`yyyy-MM-dd`): a start date on or before it
 * rewrites how past hours are priced, so the person must confirm it. The API enforces this too and refuses without
 * `confirmPastDate`.
 */
export function createNorgesPrisRateSchema(today: string) {
  return z
    .object({
      validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a start date'),
      ratePerKwh: amountField('Rate'),
      confirmPast: z.boolean(),
    })
    .refine((values) => values.validFrom > today || values.confirmPast, {
      message: 'Confirm that costs shown for past hours will be recalculated',
      path: ['confirmPast'],
    })
}

export type NorgesPrisRateFormValues = z.infer<ReturnType<typeof createNorgesPrisRateSchema>>

// ---- electricity price data (same limits as the API validators of the Pricing endpoints) ------------------------

const START_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a start date')

/** Id of the chosen grid tariff, or `none` to clear it. */
export const NO_TARIFF = 'none'

const MONTHLY_FEE_MAX = 10_000

export const locationPricingSchema = z.object({
  gridTariffId: z.string().min(1, 'Choose a tariff or None'),
  supplierMarkupPerKwh: amountField('Markup'),
  // Same rule as the API's Validation.InvalidMonthlyFee: 0..10 000 with at most 4 decimals. Empty keeps the stored fee.
  supplierMonthlyFee: optionalAmountField('Monthly fee', MONTHLY_FEE_MAX),
  electricityTaxExempt: z.boolean(),
  vatExempt: z.boolean(),
  isHolidayHome: z.boolean(),
})

export type LocationPricingFormValues = z.infer<typeof locationPricingSchema>

export const gridTariffSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'A name is required')
    .max(100, 'The name can be at most 100 characters'),
})

export type GridTariffFormValues = z.infer<typeof gridTariffSchema>

/** A start date of today or earlier rewrites how past hours are priced, so it must be confirmed. */
const isConfirmedWhenPast =
  (today: string) => (values: { validFrom: string; confirmPast: boolean }) =>
    values.validFrom > today || values.confirmPast

const CONFIRM_PAST_ERROR = {
  message: 'Confirm that costs shown for past hours will be recalculated',
  path: ['confirmPast'],
}

/** The grid rates are entered excluding taxes and VAT; a start date of today or earlier needs the confirmation. */
export function createGridTariffRateSchema(today: string) {
  return z
    .object({
      validFrom: START_DATE,
      dayRatePerKwh: amountField('Day rate'),
      nightRatePerKwh: amountField('Night rate'),
      confirmPast: z.boolean(),
    })
    .refine(isConfirmedWhenPast(today), CONFIRM_PAST_ERROR)
}

export type GridTariffRateFormValues = z.infer<ReturnType<typeof createGridTariffRateSchema>>

/** VAT is typed as a percentage (0 to 100, at most two decimals); the form sends it as a fraction. */
const vatPercentField = z
  .string()
  .trim()
  .min(1, 'VAT is required')
  .superRefine((text, ctx) => {
    if (text.startsWith('-')) {
      ctx.addIssue({ code: 'custom', message: 'VAT cannot be negative' })
    } else if (percentToFraction(text) === null) {
      ctx.addIssue({
        code: 'custom',
        message:
          percentDecimals(text) > 2
            ? 'VAT can have at most 2 decimals'
            : 'VAT must be a percentage from 0 to 100, for example 25',
      })
    }
  })

// Same limit as the API's MaxCapKwh: a Norgespris monthly limit is above 0 and at most 99 999 kWh.
const CAP_MAX_KWH = 99_999

export const isCapKind = (kind: PriceRateKind) =>
  kind === 'NorgesPrisCapHome' || kind === 'NorgesPrisCapHolidayHome'

const capField = amountField('Limit', CAP_MAX_KWH).refine((text) => parseAmount(text) !== 0, {
  message: 'Limit must be above 0',
})

/** The electricity tax and the Enova fee are NOK per kWh; VAT is a percentage; the limits are kWh per month. */
export function createPriceRateSchema(today: string, kind: PriceRateKind) {
  return z
    .object({
      validFrom: START_DATE,
      value: kind === 'Vat' ? vatPercentField : isCapKind(kind) ? capField : amountField('Value'),
      confirmPast: z.boolean(),
    })
    .refine(isConfirmedWhenPast(today), CONFIRM_PAST_ERROR)
}

export type PriceRateFormValues = z.infer<ReturnType<typeof createPriceRateSchema>>

// ---- capacity steps (same rules as the API's AddCapacityStepsValidator) -----------------------------------------

const STEP_MAX = 99_999
const MAX_STEPS = 50
/** Grid companies publish the amounts including 25 % VAT; the API takes them excluding VAT. */
const VAT_FACTOR = 1.25

/**
 * The step rows hold only the upper kW and the amount: each row starts where the previous one ends (0 for the first)
 * and the last row has no upper limit, so a table always starts at 0, has no gaps and ends open, as the API requires.
 * The last row's `upperKw` is ignored.
 */
export function createCapacityStepsSchema(today: string) {
  return z
    .object({
      validFrom: START_DATE,
      confirmPast: z.boolean(),
      amountsIncludeVat: z.boolean(),
      rows: z
        .array(z.object({ upperKw: z.string(), amount: amountField('Amount', STEP_MAX) }))
        .min(1, 'Add at least one step')
        .max(MAX_STEPS, `A table can have at most ${MAX_STEPS} steps`),
    })
    .superRefine((values, ctx) => {
      let lower = 0
      values.rows.slice(0, -1).forEach((row, i) => {
        const path = ['rows', i, 'upperKw']
        const upper = parseAmount(row.upperKw)
        if (row.upperKw.trim() === '') {
          ctx.addIssue({ code: 'custom', path, message: 'Up to (kW) is required' })
        } else if (upper === null) {
          ctx.addIssue({ code: 'custom', path, message: 'Up to (kW) must be a number' })
        } else if (upper <= lower) {
          ctx.addIssue({ code: 'custom', path, message: 'Must be above where the step starts' })
        } else if (upper > STEP_MAX) {
          ctx.addIssue({ code: 'custom', path, message: `Can be at most ${STEP_MAX}` })
        } else if (decimalsOf(row.upperKw) > AMOUNT_DECIMALS) {
          ctx.addIssue({ code: 'custom', path, message: 'Can have at most 4 decimals' })
        }
        lower = upper ?? lower
      })
    })
    .refine(isConfirmedWhenPast(today), CONFIRM_PAST_ERROR)
}

export type CapacityStepsFormValues = z.infer<ReturnType<typeof createCapacityStepsSchema>>

/** An amount as the API takes it: excluding VAT, at most 4 decimals. */
export function amountExclVat(text: string, includesVat: boolean): number {
  const value = Number(text.trim().replace(',', '.'))
  return includesVat ? Math.round((value / VAT_FACTOR) * 10_000) / 10_000 : value
}

/** The lower kW of each row: 0 for the first, the previous row's upper kW after that. */
export function lowerBounds(rows: { upperKw: string }[]): number[] {
  return rows.map((_, i) => (i === 0 ? 0 : (parseAmount(rows[i - 1].upperKw) ?? 0)))
}

/** The request for form values that passed the schema. */
export function toCapacityStepTableInput(
  values: CapacityStepsFormValues,
  startsInThePast: boolean,
): CapacityStepTableInput {
  const lowers = lowerBounds(values.rows)
  const last = values.rows.length - 1
  return {
    validFrom: values.validFrom,
    steps: values.rows.map((row, i) => ({
      lowerKw: lowers[i],
      upperKw: i === last ? null : Number(row.upperKw.trim().replace(',', '.')),
      monthlyAmount: amountExclVat(row.amount, values.amountsIncludeVat),
    })),
    confirmPastDate: startsInThePast && values.confirmPast,
  }
}

/** A real calendar date in yyyy-MM-dd: 2027-02-30 is not one. */
function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/** The water heater key's expiry date offered by default: OSO keys are valid for one year. */
export const defaultKeyExpiresOn = () => addYearsToDate(osloToday(), 1)

/** The date picker's limits, as hints: from tomorrow to five years ahead (the schema still checks). */
export function keyExpiryLimits(today = osloToday()): { min: string; max: string } {
  const [y, m, d] = today.split('-').map(Number)
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
  return { min: tomorrow, max: addYearsToDate(today, 5) }
}

// The last day the OSO key is valid. Mirrors API spec 015 FR-003: after today in Oslo and at most five years ahead.
// Dates compare as yyyy-MM-dd strings, and today is read when the form is validated.
const keyExpiresOnField = z
  .string()
  .refine(isCalendarDate, 'Enter a date')
  .refine((value) => value > osloToday(), 'The key must be valid after today')
  .refine((value) => value <= addYearsToDate(osloToday(), 5), 'At most five years ahead')

export const keyExpirySchema = z.object({ keyExpiresOn: keyExpiresOnField })

/**
 * The API's refusal of an out-of-range date (WaterHeater.KeyExpiryOutOfRange). It arrives as a general error, so the
 * forms recognise it by this text, which must match the API's, and show it at the date field.
 */
export const KEY_EXPIRY_OUT_OF_RANGE =
  "The key's expiry date must be after today and at most five years ahead"

/** True when an API error is about the key's expiry date, so it belongs at the date field. */
export function isKeyExpiryError(code: string, message: string): boolean {
  return code === 'WaterHeater.KeyExpiryOutOfRange' || message === KEY_EXPIRY_OUT_OF_RANGE
}

export type KeyExpiryFormValues = z.infer<typeof keyExpirySchema>

// Same rules as the API's water heater validator (spec 011), so mistakes are caught before OSO is asked. The key is
// not trimmed: a stray space is reported instead of being removed silently.
const WATER_HEATER_MAX = 200

export const waterHeaterSchema = z.object({
  deviceId: z
    .string()
    .trim()
    .min(1, 'Device id is required')
    .max(WATER_HEATER_MAX, 'At most 200 characters')
    .regex(/^[0-9a-fA-F]+$/, 'Device id can only contain 0-9 and a-f'),
  subscriptionKey: z
    .string()
    .min(1, 'Subscription key is required')
    .max(WATER_HEATER_MAX, 'At most 200 characters')
    .regex(/^\S+$/, 'The key cannot contain spaces'),
  keyExpiresOn: keyExpiresOnField,
})

export type WaterHeaterFormValues = z.infer<typeof waterHeaterSchema>
