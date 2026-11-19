import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { hasReadings } from './bill'
import { BillInvoice } from './BillView'
import { addMonths, formatMonth, osloMonth } from './format'
import { useMonthlyBill } from './hooks'

/**
 * The bill of a month line by line, laid out as the invoice so it can be checked against it. Opens on the last
 * finished month; the current month is shown as an estimate. Stepping back stops at a month without readings, since
 * the app does not know when the first reading was.
 */
export function BillCard({ locationId }: { locationId: string }) {
  const current = osloMonth(new Date())
  const [month, setMonth] = useState(() => addMonths(current, -1))
  const isCurrent = month >= current
  const { data, isLoading, error } = useMonthlyBill(locationId, month, isCurrent)
  const atStart = isLoading || (data !== undefined && !hasReadings(data))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base font-extrabold">
          Bill
          {data && hasReadings(data) && (
            <Badge variant="secondary">{data.status === 'Final' ? 'Final' : 'Estimate'}</Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            disabled={atStart}
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-28 text-center text-sm font-semibold">{formatMonth(month)}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next month"
            disabled={isCurrent}
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" aria-label="Loading the bill" />
        ) : error || !data ? (
          <p className="py-4 text-center text-sm text-destructive">
            {error?.message ?? 'Could not load the bill'}
          </p>
        ) : !hasReadings(data) ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No readings in {formatMonth(month)}.
          </p>
        ) : (
          <BillInvoice bill={data} />
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Laid out as the invoice: the supplier part (Strøm) and the grid part (Nettleie). Prices
          per unit include VAT.
        </p>
      </CardContent>
    </Card>
  )
}
