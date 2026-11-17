import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SAVING_PERIOD_LABELS, formatSaving } from './format'
import { useNorgesPrisSaving } from './hooks'
import type { SavingPeriod, SavingPeriodName } from './types'

const ORDER: SavingPeriodName[] = ['Today', 'Last7Days', 'MonthToDate', 'YearToDate']

const WORD_CLASS = {
  Saved: 'text-price-cheap',
  'Extra cost': 'text-price-expensive',
  'No difference': 'text-muted-foreground',
} as const

const hours = new Intl.NumberFormat('nb-NO')

/**
 * What Norgespris saves compared with spot terms, from the API (nothing is recomputed here). A negative figure is an
 * extra cost: in cheap spot hours Norgespris is the more expensive of the two.
 */
export function SavingCard({
  locationId,
  hasNorgesPriceAgreement,
}: {
  locationId: string
  hasNorgesPriceAgreement: boolean
}) {
  const { data, isLoading, error } = useNorgesPrisSaving(locationId)

  const title = hasNorgesPriceAgreement
    ? 'What Norgespris has saved'
    : 'What Norgespris would have saved'
  const header = (
    <CardHeader>
      <CardTitle className="text-base font-extrabold">{title}</CardTitle>
    </CardHeader>
  )

  if (isLoading) {
    return (
      <Card aria-busy="true" aria-label="Loading the saving">
        {header}
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        {header}
        <CardContent className="py-4 text-center text-sm text-destructive">
          {error?.message ?? 'Could not load the saving'}
        </CardContent>
      </Card>
    )
  }

  const periods = ORDER.map((name) => data.periods.find((p) => p.period === name)).filter(
    (p): p is SavingPeriod => p !== undefined,
  )

  if (!periods.some((p) => p.hoursWithConsumption > 0)) {
    return (
      <Card>
        {header}
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          <p className="text-base font-semibold text-foreground">No readings yet</p>
          The saving appears when the meter has reported some power use.
        </CardContent>
      </Card>
    )
  }

  const partial = periods.filter((p) => p.hoursCounted < p.hoursWithConsumption)

  return (
    <Card>
      {header}
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          {periods.map((period) => {
            const saving = formatSaving(period.saving)
            return (
              <div key={period.period}>
                <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  {SAVING_PERIOD_LABELS[period.period]}
                </dt>
                <dd className="text-2xl font-extrabold tracking-tight tabular-nums">
                  {saving.amount}
                  <span className="ml-1 text-sm font-semibold tracking-normal text-muted-foreground">
                    kr
                  </span>
                </dd>
                <dd className={`text-sm font-bold ${WORD_CLASS[saving.label]}`}>{saving.label}</dd>
              </div>
            )
          })}
        </dl>

        {partial.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Hours without a spot price yet are left out:{' '}
            {partial
              .map(
                (p) =>
                  `${SAVING_PERIOD_LABELS[p.period].toLowerCase()} is based on ${hours.format(p.hoursCounted)} of ${hours.format(p.hoursWithConsumption)} hours`,
              )
              .join(', ')}
            .
          </p>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Compared at full price including VAT. The Norgespris monthly limit (5 000 kWh, 1 000 for a
          holiday home) is applied. Monthly fees are not included.
        </p>
      </CardContent>
    </Card>
  )
}
