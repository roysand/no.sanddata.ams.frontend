import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatKwh, formatNok, formatOsloDate, osloMonth } from './format'
import { useMonthlyBill, useTodayHourlyCost } from './hooks'
import { dayStart } from './periods'
import { monthToNow, shareOf, sumParts } from './waterHeater'
import type { WaterHeaterPart } from './types'

const NO_DATA = 'No measurements yet'

const kwhAndCost = (part: WaterHeaterPart) =>
  part.cost === null ? formatKwh(part.kwh) : `${formatKwh(part.kwh)} · ${formatNok(part.cost)}`

/**
 * How much energy and money water heating took today and this month (API spec 012). Today is the sum of today's hourly
 * parts, the same ones the day chart draws; the month starts from the bill's part. Both come from the queries the Now page uses,
 * so moving between the tabs is served from the cache.
 *
 * The bill stops at the start of the running hour, so the month adds today's hours after the bill's last one. It then
 * always includes all of today, whenever each query last refreshed.
 */
export function WaterHeaterEnergyCard({ locationId }: { locationId: string }) {
  const month = osloMonth(new Date())
  const today = useTodayHourlyCost(locationId)
  const bill = useMonthlyBill(locationId, month, true)
  const monthPart = bill.data ? monthToNow(bill.data.waterHeater, today.data?.items ?? []) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-extrabold">Energy</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Today</dt>
          <dd className="text-right font-semibold tabular-nums">
            <Row isLoading={today.isLoading} failed={!!today.error} label="today">
              {today.data && <TodayText items={today.data.items} />}
            </Row>
          </dd>
          <dt className="text-muted-foreground">This month</dt>
          <dd className="text-right font-semibold tabular-nums">
            <Row isLoading={bill.isLoading} failed={!!bill.error} label="this month">
              {bill.data &&
                (monthPart ? (
                  <>
                    {kwhAndCost(monthPart)}
                    {formatOsloDate(monthPart.firstHourUtc) !==
                      formatOsloDate(dayStart(`${month}-01`).toISOString()) && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        since {formatOsloDate(monthPart.firstHourUtc)}
                      </span>
                    )}
                  </>
                ) : (
                  NO_DATA
                ))}
            </Row>
          </dd>
        </dl>
      </CardContent>
    </Card>
  )
}

function Row({
  isLoading,
  failed,
  label,
  children,
}: {
  isLoading: boolean
  failed: boolean
  label: string
  children: ReactNode
}) {
  if (isLoading) return <Skeleton className="ml-auto h-5 w-32" aria-label={`Loading ${label}`} />
  if (failed) return <span className="font-normal text-muted-foreground">Could not load</span>
  return <>{children}</>
}

function TodayText({
  items,
}: {
  items: { consumptionKwh: number; waterHeater: WaterHeaterPart | null }[]
}) {
  const part = sumParts(items.map((item) => item.waterHeater))
  if (!part) return <>{NO_DATA}</>
  const share = shareOf(
    part.kwh,
    items.reduce((sum, item) => sum + item.consumptionKwh, 0),
  )
  return (
    <>
      {kwhAndCost(part)}
      {share !== null && ` · ${Math.round(share * 100)} % of today's use`}
    </>
  )
}
