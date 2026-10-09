import { ApiError } from '../../lib/apiClient'

export interface FormServerError<F extends string> {
  /** Messages for fields the API named (matched case-insensitively). */
  fields: Partial<Record<F, string>>
  /** A message for everything else, or null when every message was shown on a field. */
  message: string | null
}

/** Splits a failed request into per-field messages and a general message. */
export function toFormServerError<F extends string>(
  error: unknown,
  fields: readonly F[],
  fallback: string,
): FormServerError<F> {
  if (!(error instanceof ApiError)) return { fields: {}, message: fallback }

  const mapped: Partial<Record<F, string>> = {}
  const unmapped: string[] = []
  for (const [key, messages] of Object.entries(error.fieldErrors ?? {})) {
    const field = fields.find((f) => f.toLowerCase() === key.toLowerCase())
    if (field) mapped[field] = messages.join(' ')
    else unmapped.push(...messages)
  }

  if (Object.keys(mapped).length === 0) return { fields: {}, message: error.message }
  return { fields: mapped, message: unmapped.length > 0 ? unmapped.join(' ') : null }
}
