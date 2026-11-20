import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { basisText, isUncertain, isVatExemptBill, PART_TITLES } from './bill'
import { BillPartView, EvChargerBillNote, IncompleteNote, WaterHeaterBillNote } from './BillView'
import { stepLabel } from './capacity'
import { formatMonth, formatNok, osloMonth } from './format'
import { useMonthlyBill } from './hooks'
import type { MonthlyBill } from './types'

/**
 * What this month's bill will probably be: what is used and charged so far, what the rest of the month will
 * probably add (from the last 7 days of use), and the fixed amounts. The figures are the API's.
 */
export function ExpectedBillCard({ locationId }: { locationId: string }) {
  const month = osloMonth(new Date())
  const { data, isLoading, error } = useMonthlyBill(locationId, month, true)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-extrabold">Expected bill</CardTitle>
        <span className="text-sm font-semibold text-muted-foreground">{formatMonth(month)}</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" aria-label="Loading the expected bill" />
        ) : error || !data ? (
          <p className="py-4 text-center text-sm text-destructive">
            {error?.message ?? 'Could not load the expected bill'}
          </p>
        ) : (
          <Estimate bill={data} />
        )}
      </CardContent>
    </Card>
  )
}

function Estimate({ bill }: { bill: MonthlyBill }) {
  const exempt = isVatExemptBill(bill)
  const basis = basisText(bill.projection)
  const step = bill.capacity.step

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="group" aria-label="Expected total">
          <span className="block text-2xl font-extrabold tracking-tight tabular-nums">
            {formatNok(bill.total.amount)}
          </span>
          <span className="text-sm text-muted-foreground">
            {exempt ? 'No VAT for this location' : 'incl. VAT'}
          </span>
          <Badge variant="secondary" className="ml-2 align-middle">
            {bill.status === 'Final' ? 'Final' : 'Estimate'}
          </Badge>
          {!bill.isComplete && (
            <Badge variant="destructive" className="ml-1 align-middle">
              Incomplete
            </Badge>
          )}
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-3 text-sm">
          <dt className="text-muted-foreground">So far</dt>
          <dd className="text-right font-semibold tabular-nums">{formatNok(bill.total.soFar)}</dd>
          <dt className="text-muted-foreground">Rest of the month</dt>
          <dd className="text-right font-semibold tabular-nums">
            {formatNok(bill.total.projected)}
          </dd>
        </dl>
      </div>

      <WaterHeaterBillNote bill={bill} />
      <EvChargerBillNote bill={bill} />

      <div className="space-y-1 text-xs text-muted-foreground">
        {basis && (
          <p className={isUncertain(bill.projection) ? 'font-semibold text-foreground' : undefined}>
            {basis}
          </p>
        )}
        {step && (
          <p>
            Capacity step {stepLabel(step)}
            {bill.capacity.provisional &&
              ', provisional: a higher peak later in the month can raise it'}
            .
          </p>
        )}
        {bill.pricingModel === 'NorgesPris' && (
          <p>
            The supplier bills the spot price and the grid company credits the difference down to
            the Norgespris rate, so Strøm is higher and Nettleie lower than what you pay net.
          </p>
        )}
      </div>

      <IncompleteNote bill={bill} />

      <div className="divide-y divide-border rounded-md border border-border">
        {[bill.strom, bill.nettleie].map((part) => (
          <details key={part.name} className="group px-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-1">
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 transition-transform group-open:rotate-180"
                />
                {PART_TITLES[part.name]}
              </span>
              <span className="tabular-nums">{formatNok(part.amount)}</span>
            </summary>
            <div className="pb-3">
              <BillPartView bill={bill} part={part} detail="brief" />
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
