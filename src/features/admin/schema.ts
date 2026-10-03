import { z } from 'zod'

// Same rules as the API's password validator, so mistakes are caught before the request.
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[\W_]/, 'Password must contain at least one special character')

export const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Enter a valid email address').max(100),
  password,
})

export type CreateUserFormValues = z.infer<typeof createUserSchema>

export const resetPasswordSchema = z.object({ newPassword: password })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
