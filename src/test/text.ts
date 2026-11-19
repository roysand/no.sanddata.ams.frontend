/**
 * Text as a person reads it: `nb-NO` number formats use a no-break space before `kr` and as thousands separator, and
 * U+2212 as the minus sign. Tests compare against plain spaces and `-`.
 */
export const plain = (text: string | null | undefined) =>
  (text ?? '').replace(/\s/g, ' ').replace(/−/g, '-')
