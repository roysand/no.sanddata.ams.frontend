import { z } from 'zod'
import { decimalsOf, parseAmount } from './norgesPris'

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
const NORGESPRIS_AMOUNT_MAX = 100
const NORGESPRIS_DECIMALS = 4

const norgesPrisAmount = (label: string) =>
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
      } else if (value > NORGESPRIS_AMOUNT_MAX) {
        ctx.addIssue({
          code: 'custom',
          message: `${label} can be at most ${NORGESPRIS_AMOUNT_MAX}`,
        })
      } else if (decimalsOf(text) > NORGESPRIS_DECIMALS) {
        ctx.addIssue({
          code: 'custom',
          message: `${label} can have at most ${NORGESPRIS_DECIMALS} decimals`,
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
      ratePerKwh: norgesPrisAmount('Rate'),
      taxPerKwh: norgesPrisAmount('Tax'),
      confirmPast: z.boolean(),
    })
    .refine((values) => values.validFrom > today || values.confirmPast, {
      message: 'Confirm that costs shown for past hours will be recalculated',
      path: ['confirmPast'],
    })
}

export type NorgesPrisRateFormValues = z.infer<ReturnType<typeof createNorgesPrisRateSchema>>
