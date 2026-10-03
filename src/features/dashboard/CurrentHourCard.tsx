import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentHourCost } from './hooks'
import { formatClock, formatKwh, formatNok, formatRate, modelLabel, otherModel } from './format'
import type { CurrentRateCost, PricingModel } from './types'

function CostBlock({
  title,
  model,
  cost,
}: {
  title: string
  model: PricingModel
  cost: CurrentRateCost | null
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="text-sm text-slate-700">{modelLabel(model)}</p>
      {cost ? (
        <>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatNok(cost.costSoFar)}</p>
          <p className="text-xs text-muted-foreground">at {formatRate(cost.ratePerKwh)}</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">Price not available yet</p>
      )}
    </div>
  )
}

export function CurrentHourCard({ locationId }: { locationId: string }) {
  const { data, isLoading, error } = useCurrentHourCost(locationId)

  const difference =
    data?.actual && data.comparison ? data.actual.costSoFar - data.comparison.costSoFar : null

  return (
    <Card className="bg-white/95 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">
          This hour so far{data ? ` (from ${formatClock(data.hourStart)})` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">{error.message}</p>}
        {data && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Used
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {formatKwh(data.consumptionKwhSoFar)}
              </p>
            </div>
            <CostBlock title="Your plan" model={data.pricingModel} cost={data.actual} />
            <CostBlock
              title="Alternative"
              model={otherModel(data.pricingModel)}
              cost={data.comparison}
            />
            {difference !== null && Math.abs(difference) >= 0.005 && (
              <p className="text-sm text-muted-foreground sm:col-span-3">
                {difference > 0
                  ? `${modelLabel(otherModel(data.pricingModel))} would be ${formatNok(difference)} cheaper this hour.`
                  : `Your plan is ${formatNok(-difference)} cheaper than ${modelLabel(otherModel(data.pricingModel))} this hour.`}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
