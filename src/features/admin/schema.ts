import { z } from 'zod'
import { decimalsOf, parseAmount } from './norgesPris'
import { percentDecimals, percentToFraction } from './pricing'
import type { PriceRateKind } from './types'

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
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .superRefine((text, ctx) => {
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
    })

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

export const locationPricingSchema = z.object({
  gridTariffId: z.string().min(1, 'Choose a tariff or None'),
  supplierMarkupPerKwh: amountField('Markup'),
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

/** The electricity tax and the Enova fee are NOK per kWh; VAT is a percentage. */
export function createPriceRateSchema(today: string, kind: PriceRateKind) {
  return z
    .object({
      validFrom: START_DATE,
      value: kind === 'Vat' ? vatPercentField : amountField('Value'),
      confirmPast: z.boolean(),
    })
    .refine(isConfirmedWhenPast(today), CONFIRM_PAST_ERROR)
}

export type PriceRateFormValues = z.infer<ReturnType<typeof createPriceRateSchema>>
