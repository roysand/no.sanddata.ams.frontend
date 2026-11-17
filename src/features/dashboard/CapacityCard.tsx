import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '../auth/useAuth'
import { averageLabel, isVatExempt, peakLabel, stepLabel } from './capacity'
import { addMonths, formatKw, formatMonth, formatNok, osloMonth } from './format'
import { useCapacityCharge } from './hooks'
import type { CapacityCharge } from './types'

/**
 * The grid capacity charge (kapasitetsledd) of a month: the step that the average of the three highest daily peaks
 * falls in, the amount, and the peaks behind it. The figures are the API's; nothing is recomputed here.
 */
export function CapacityCard({ locationId }: { locationId: string }) {
  const current = osloMonth(new Date())
  const [month, setMonth] = useState(current)
  const isCurrent = month >= current
  const { data, isLoading, error } = useCapacityCharge(locationId, month, isCurrent)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-extrabold">Capacity charge</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous month"
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
          <Skeleton className="h-24 w-full" aria-label="Loading the capacity charge" />
        ) : error || !data ? (
          <p className="py-4 text-center text-sm text-destructive">
            {error?.message ?? 'Could not load the capacity charge'}
          </p>
        ) : data.set ? (
          <Charge charge={data} />
        ) : (
          <NotSet month={month} />
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          The grid company charges this per month from the average of the highest hour on each of
          the three days with the most use.
        </p>
      </CardContent>
    </Card>
  )
}

function Charge({ charge }: { charge: CapacityCharge }) {
  const exempt = isVatExempt(charge)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-extrabold tracking-tight tabular-nums">
          {formatNok(charge.amount ?? 0)}
        </span>
        <span className="text-sm text-muted-foreground">
          {exempt ? 'No VAT for this location' : 'incl. VAT'}
        </span>
        {charge.provisional && <Badge variant="secondary">Provisional</Badge>}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Step</dt>
          <dd className="font-semibold">{charge.step ? stepLabel(charge.step) : '–'}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {averageLabel(charge.peaks.length)}
          </dt>
          <dd className="font-semibold tabular-nums">
            {charge.averageKw === null ? '–' : formatKw(charge.averageKw)}
          </dd>
        </div>
      </dl>

      {charge.kwToNextStep !== null && (
        <p className="text-sm">{formatKw(charge.kwToNextStep)} below the next step</p>
      )}

      <div>
        <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
          The peaks behind it
        </h3>
        <ul className="mt-1 space-y-0.5 text-sm tabular-nums">
          {charge.peaks.map((peak) => (
            <li key={peak.hourStartUtc} className="flex justify-between gap-4">
              <span>{peakLabel(peak)}</span>
              <span className="font-semibold">{formatKw(peak.kw)}</span>
            </li>
          ))}
        </ul>
      </div>

      {charge.provisional && (
        <p className="text-xs text-muted-foreground">
          A higher peak later this month can raise the step.
        </p>
      )}
    </div>
  )
}

function NotSet({ month }: { month: string }) {
  const { roles } = useAuth()
  const isAdmin = roles.includes('Admin')
  return (
    <div className="py-2 text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">
        Capacity charge not available for {formatMonth(month)}.
      </p>
      <p>
        The location needs a grid tariff with capacity steps for the month, and readings.{' '}
        {isAdmin ? (
          <>
            Set them under{' '}
            <Link to="/admin/grid-tariffs" className="underline">
              Grid tariffs
            </Link>{' '}
            and{' '}
            <Link to="/admin/location-pricing" className="underline">
              Location pricing
            </Link>
            .
          </>
        ) : (
          'Ask an administrator.'
        )}
      </p>
    </div>
  )
}
