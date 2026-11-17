import { Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCapacitySteps } from './hooks'
import { formatRateDate } from './norgesPris'
import { capacityStepLabel, formatMonthlyAmount } from './pricing'
import { RateStatusBadge } from './RateStatusBadge'
import type { CapacityStepTable, GridTariff } from './types'

/**
 * A grid tariff's capacity step tables (kapasitetsledd): the monthly amount, excluding VAT, for each step of the
 * average of the three highest daily peaks. A table is added and deleted as a whole.
 */
export function CapacityStepsSection({
  tariff,
  onAdd,
  onDelete,
}: {
  tariff: GridTariff
  onAdd: () => void
  onDelete: (table: CapacityStepTable) => void
}) {
  const { data, isLoading, error } = useCapacitySteps(tariff.id)

  return (
    <section aria-label={`Capacity steps of ${tariff.name}`} className="mt-6 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-semibold">Capacity steps</h3>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Add capacity steps to ${tariff.name}`}
          onClick={onAdd}
        >
          Add capacity steps
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No capacity steps yet</p>
      ) : (
        data.map((table) => (
          <div
            key={table.validFrom}
            aria-label={`Capacity steps from ${formatRateDate(table.validFrom)}`}
            role="group"
            className={`rounded-lg border p-3 ${table.status === 'InEffect' ? 'bg-accent/50' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                From {formatRateDate(table.validFrom)}
                <RateStatusBadge status={table.status} />
              </div>
              {table.status === 'Upcoming' && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete capacity steps from ${formatRateDate(table.validFrom)} for ${tariff.name}`}
                  onClick={() => onDelete(table)}
                >
                  <Trash2Icon className="size-4" aria-hidden="true" />
                </Button>
              )}
            </div>
            <ul className="mt-2 grid gap-x-6 gap-y-0.5 text-sm tabular-nums sm:grid-cols-2">
              {table.steps.map((step) => (
                <li key={step.lowerKw} className="flex justify-between gap-4">
                  <span>{capacityStepLabel(step.lowerKw, step.upperKw)}</span>
                  <span>{formatMonthlyAmount(step.monthlyAmount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
      <p className="text-xs text-muted-foreground">Amounts are per month, excluding VAT.</p>
    </section>
  )
}
