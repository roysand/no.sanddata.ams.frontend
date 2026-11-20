import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../auth/useAuth'
import { formatKwh, formatMonth, formatNok, formatOsloDate } from './format'
import { dayStart } from './periods'
import {
  formatQuantity,
  formatUnitPrice,
  formatVatRate,
  incompleteReasons,
  invoiceName,
  isVatExemptBill,
  lineName,
  PART_TITLES,
} from './bill'
import type { BillAmounts, BillLine, BillPart, MonthlyBill } from './types'

/**
 * How much of a line or bill to show. `invoice` (History) has every column of the invoice: quantity, price per unit
 * and VAT rate per line, and the amounts excluding VAT and the VAT per part. `brief` (the dashboard card) has the
 * quantity and the amount. Amounts are always the API's, never added up here.
 */
export type BillDetail = 'invoice' | 'brief'

const SUM_TITLES: Record<BillPart['name'], string> = {
  Strom: 'Sum Strøm',
  Nettleie: 'Sum Nettleie',
}

/** "so far 210,10 kr · rest of the month 163,63 kr", for an estimate. */
export function SplitText({ amounts }: { amounts: Pick<BillAmounts, 'soFar' | 'projected'> }) {
  return (
    <span className="text-xs text-muted-foreground">
      so far {formatNok(amounts.soFar)} · rest of the month {formatNok(amounts.projected)}
    </span>
  )
}

function Line({ line, detail }: { line: BillLine; detail: BillDetail }) {
  const unitPrice = formatUnitPrice(line)
  const invoice = invoiceName(line.code)
  const facts =
    detail === 'invoice' && line.set
      ? [formatQuantity(line), unitPrice && `× ${unitPrice}`, `VAT ${formatVatRate(line.vatRate)}`]
      : [formatQuantity(line)]

  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <span className="block text-sm font-medium">
          {lineName(line.code)}
          {invoice && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">({invoice})</span>
          )}
        </span>
        <span className="block text-xs text-muted-foreground">
          {facts.filter(Boolean).join(' ')}
        </span>
        {line.set && line.projected !== null && line.projected !== 0 && line.soFar !== null && (
          <SplitText amounts={{ soFar: line.soFar, projected: line.projected }} />
        )}
      </div>
      <div className="shrink-0 text-right">
        {line.set && line.amount !== null ? (
          <>
            <span className="block text-sm font-semibold tabular-nums">
              {formatNok(line.amount)}
            </span>
            {!line.complete && (
              <Badge variant="outline" className="text-destructive">
                may be too low
              </Badge>
            )}
          </>
        ) : (
          <Badge variant="outline">Not set</Badge>
        )}
      </div>
    </li>
  )
}

/** "333,86 kr excl. VAT + 83,47 kr VAT" */
function VatSplit({ amounts }: { amounts: BillAmounts }) {
  return (
    <span className="block text-xs text-muted-foreground">
      {formatNok(amounts.amountExclVat)} excl. VAT + {formatNok(amounts.vat)} VAT
    </span>
  )
}

/** The lines of one part and its subtotal. */
export function BillPartView({
  bill,
  part,
  detail,
}: {
  bill: MonthlyBill
  part: BillPart
  detail: BillDetail
}) {
  const exempt = isVatExemptBill(bill)
  const estimate = bill.status === 'Estimate'
  return (
    <div>
      <ul className="divide-y divide-border">
        {part.lines.map((line) => (
          <Line key={line.code} line={line} detail={detail} />
        ))}
      </ul>
      <div className="flex items-start justify-between gap-3 border-t border-border pt-2">
        <div>
          <span className="block text-sm font-semibold">{SUM_TITLES[part.name]}</span>
          {detail === 'invoice' && !exempt && <VatSplit amounts={part} />}
          {estimate && <SplitText amounts={part} />}
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {formatNok(part.amount)}
        </span>
      </div>
    </div>
  )
}

/** Both parts as the invoice lays them out, then the total. */
export function BillInvoice({ bill }: { bill: MonthlyBill }) {
  const exempt = isVatExemptBill(bill)
  return (
    <div className="space-y-5">
      {[bill.strom, bill.nettleie].map((part) => (
        <section key={part.name} aria-label={PART_TITLES[part.name]}>
          <h3 className="mb-1 text-sm font-semibold text-muted-foreground">
            {PART_TITLES[part.name]}
          </h3>
          <BillPartView bill={bill} part={part} detail="invoice" />
        </section>
      ))}
      <div className="flex items-start justify-between gap-3 border-t-2 border-border pt-3">
        <div>
          <span className="block font-semibold">
            Total{exempt ? '' : ' including VAT'}
            {!bill.isComplete && (
              <Badge variant="destructive" className="ml-2 align-middle">
                Incomplete
              </Badge>
            )}
          </span>
          {!exempt && <VatSplit amounts={bill.total} />}
          {bill.status === 'Estimate' && <SplitText amounts={bill.total} />}
        </div>
        <span className="shrink-0 text-lg font-bold tabular-nums">
          {formatNok(bill.total.amount)}
        </span>
      </div>
      <WaterHeaterBillNote bill={bill} />
      <EvChargerBillNote bill={bill} />
      <IncompleteNote bill={bill} />
    </div>
  )
}

/**
 * Water heating's part of the month, below the total (API spec 012). It is part of the energy cost, never a bill
 * line, and it is measured, never projected, so it is set apart in small text and adds to no sum.
 */
export function WaterHeaterBillNote({ bill }: { bill: MonthlyBill }) {
  const part = bill.waterHeater
  if (!part) return null
  const estimate = bill.status === 'Estimate'
  const fromMonthStart =
    formatOsloDate(part.firstHourUtc) === formatOsloDate(dayStart(`${bill.month}-01`).toISOString())
  const period = !fromMonthStart
    ? `since ${formatOsloDate(part.firstHourUtc)}`
    : estimate
      ? 'so far this month'
      : `in ${formatMonth(bill.month)}`
  return (
    <div className="text-xs text-muted-foreground">
      <p>
        Water heating {period}: {formatKwh(part.kwh)}
        {part.cost !== null && ` · ${formatNok(part.cost)}`}
      </p>
      {estimate && <p>Measured so far, not part of the estimate.</p>}
    </div>
  )
}

/**
 * What the car charged in the month (API spec 016), below the water heating note. The car is never priced and adds to
 * no sum: it only says whether its kWh are counted with the house's usage.
 */
export function EvChargerBillNote({ bill }: { bill: MonthlyBill }) {
  const part = bill.evCharger
  if (!part) return null
  const fromMonthStart =
    formatOsloDate(part.firstHour) === formatOsloDate(dayStart(`${bill.month}-01`).toISOString())
  const period = !fromMonthStart
    ? `since ${formatOsloDate(part.firstHour)}`
    : bill.status === 'Estimate'
      ? 'so far this month'
      : `in ${formatMonth(bill.month)}`
  return (
    <p className="text-xs text-muted-foreground">
      Car charging {period}: {formatKwh(part.kwh)} ·{' '}
      {part.included ? 'counted with the house' : 'not counted with the house'}
    </p>
  )
}

/**
 * Why the bill is incomplete, so a too-low total is not taken for the real one. An administrator gets a link to the
 * page where the missing settings are set; the link is a convenience, the API guards the page.
 */
export function IncompleteNote({ bill }: { bill: MonthlyBill }) {
  const { roles } = useAuth()
  if (bill.isComplete) return null
  const reasons = incompleteReasons(bill)

  return (
    <div className="space-y-1 rounded-md border border-destructive/40 p-3 text-sm">
      <p className="font-semibold">Without the lines that are not set.</p>
      {reasons.length > 0 && (
        <ul className="list-disc pl-5 text-muted-foreground">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      <p className="text-muted-foreground">
        {roles.includes('Admin') ? (
          <>
            Set the missing prices under{' '}
            <Link to="/admin/location-pricing" className="underline">
              Location pricing
            </Link>
            .
          </>
        ) : (
          'Ask an administrator to set the missing prices.'
        )}
      </p>
    </div>
  )
}
