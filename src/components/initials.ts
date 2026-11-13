/** "ola.nordmann@example.com" -> "ON"; one-part names use their first two letters. */
export function initialsOf(email: string): string {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  return letters.toUpperCase()
}
