import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { currentPowerKw, formatNok, useLocationSnapshots } from '../dashboard'
import { useSelectedLocation } from '../locations'
import { LocationSummaryCard } from './LocationSummaryCard'
import { rankLocations, summarizeLocation, totalsOf } from './summary'

type Range = 'day' | 'week' | 'month'

const LABEL: Record<Range, string> = { day: 'Today', week: 'This week', month: 'This month' }

const kw = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const kwh = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })

export function OverviewPage() {
  const { active, select } = useSelectedLocation()
  const navigate = useNavigate()
  const [range, setRange] = useState<Range>('day')
  const snapshots = useLocationSnapshots(
    active.map((location) => location.id),
    range,
  )

  const loading = snapshots.some((s) => s.period.isLoading || s.day.isLoading)
  const now = new Date()
  const summaries = active.map((location, i) => {
    const snapshot = snapshots[i]
    return summarizeLocation({
      id: location.id,
      name: location.name,
      usesNorgesPris: location.hasNorgesPriceAgreement,
      powerKw: currentPowerKw(snapshot.power.data?.items ?? [], now),
      periodRows: snapshot.period.data?.current ?? [],
      previousRows: snapshot.period.data?.previous ?? [],
      dayRows: snapshot.day.data?.current ?? [],
      daySlots: snapshot.day.data?.plan.current.slots ?? [],
      failed: !!(snapshot.period.error || snapshot.day.error || snapshot.power.error),
    })
  })
  const ranked = rankLocations(summaries)
  const totals = totalsOf(summaries)
  const nothingYet = !loading && totals.kwh === 0 && totals.powerKw === 0

  const open = (id: string) => {
    select(id)
    navigate('/')
  }

  return (
    <div className="flex flex-col gap-4">
      <Card aria-label="All locations">
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-base font-extrabold">All locations</h1>
            <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {active.length} locations
            </span>
          </div>
          <Segmented
            className="mt-3"
            label="Period"
            value={range}
            onChange={setRange}
            options={[
              { value: 'day', label: 'Today' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
          />

          {loading && <Skeleton className="mt-4 h-24 w-full" aria-busy="true" />}

          {nothingYet && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <p className="text-base font-semibold text-foreground">No readings yet</p>
              None of your locations has reported power use.
            </div>
          )}

          {!loading && !nothingYet && (
            <>
              <p className="mt-3 text-5xl leading-none font-extrabold tracking-tighter tabular-nums">
                {kw.format(totals.powerKw)}
                <span className="ml-1.5 text-lg font-semibold tracking-normal text-muted-foreground">
                  kW now
                </span>
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-3.5">
                <div>
                  <dd className="text-xl font-extrabold tracking-tight tabular-nums">
                    {kwh.format(totals.kwh)} kWh
                  </dd>
                  <dt className="text-sm text-muted-foreground">{LABEL[range]}, all locations</dt>
                </div>
                <div>
                  <dd className="text-xl font-extrabold tracking-tight tabular-nums">
                    {totals.cost === null ? '–' : formatNok(totals.cost)}
                  </dd>
                  <dt className="text-sm text-muted-foreground">
                    Cost {LABEL[range].toLowerCase()}
                    {totals.incomplete && totals.cost !== null ? ' (incomplete)' : ''}
                  </dt>
                </div>
              </dl>
              {totals.cost === null && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Cost appears when prices are available.
                </p>
              )}
              {totals.deltaPercent !== null && (
                <p
                  className={`mt-3 text-sm font-semibold ${
                    totals.deltaPercent <= 0 ? 'text-price-cheap' : 'text-price-expensive'
                  }`}
                >
                  {totals.deltaPercent <= 0 ? '▼' : '▲'} {Math.abs(Math.round(totals.deltaPercent))}
                  % {totals.deltaPercent <= 0 ? 'less' : 'more'} than the previous period
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {!loading && !nothingYet && (
        <section aria-label="By location" className="flex flex-col gap-2.5">
          <h2 className="px-1 text-base font-extrabold">By location</h2>
          {ranked.map((summary) => (
            <LocationSummaryCard
              key={summary.id}
              summary={summary}
              periodLabel={LABEL[range].toLowerCase()}
              onOpen={() => open(summary.id)}
            />
          ))}
        </section>
      )}
    </div>
  )
}
