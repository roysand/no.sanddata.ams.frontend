import { cn } from '@/lib/utils'

interface SegmentedProps<T extends string> {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  className?: string
}

/** A row of mutually exclusive choices with large touch targets (an accessible stand-in for tabs or a toggle). */
function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-muted p-1', className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'min-h-11 rounded-lg px-2.5 text-sm font-bold text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            value === option.value && 'bg-card text-foreground shadow-sm',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export { Segmented }
