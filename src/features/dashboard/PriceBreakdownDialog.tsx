import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '../auth/useAuth'
import { isAboveCap } from './cap'
import { formatClock, formatKrPerKwh, formatKwh, modelLabel, otherModel } from './format'
import type { CurrentHourCost, CurrentRateCost, PriceParts, PricingModel } from './types'

interface Row {
  label: string
  hint?: string
  /** What a plan shows in this row. */
  value: (parts: PriceParts) => string
  strong?: boolean
}

const ROWS: Row[] = [
  { label: 'Energy', value: (p) => formatKrPerKwh(p.energy) },
  { label: 'Supplier markup', value: (p) => formatKrPerKwh(p.markup) },
  {
    label: 'Grid charge',
    value: (p) => (p.grid === null ? 'Not set' : formatKrPerKwh(p.grid)),
  },
  { label: 'Taxes', hint: 'Electricity tax and Enova fee', value: (p) => formatKrPerKwh(p.taxes) },
  { label: 'VAT', value: (p) => formatKrPerKwh(p.vat) },
  { label: 'Total, incl. VAT', value: (p) => formatKrPerKwh(p.total), strong: true },
]

interface Column {
  title: string
  parts: PriceParts
}

/**
 * The columns of one plan. A Norgespris hour that crosses the monthly limit gets two: the kWh within the limit and the
 * kWh above it, priced at spot (only the second when the whole hour is above).
 */
function planColumns(
  model: PricingModel,
  rate: CurrentRateCost | null,
): { columns: Column[]; split?: CurrentRateCost & { cap: NonNullable<CurrentRateCost['cap']> } } {
  if (!rate?.parts) return { columns: [] }
  if (model !== 'NorgesPris' || !isAboveCap(rate) || !rate.cap) {
    return { columns: [{ title: modelLabel(model), parts: rate.parts }] }
  }
  const cap = rate.cap
  const above = {
    title: `Above limit, spot (${formatKwh(cap.kwhAboveCap)})`,
    parts: cap.aboveCapParts,
  }
  return {
    columns:
      cap.kwhWithinCap > 0
        ? [
            {
              title: `Norgespris, within limit (${formatKwh(cap.kwhWithinCap)})`,
              parts: rate.parts,
            },
            above,
          ]
        : [above],
    split: { ...rate, cap },
  }
}

/**
 * What one kWh costs this hour, part by part, for the location's plan and for the other plan. The figures are the API's;
 * nothing is recomputed here.
 */
export function PriceBreakdownDialog({
  current,
  onClose,
}: {
  current: CurrentHourCost
  onClose: () => void
}) {
  const { roles } = useAuth()
  const isAdmin = roles.includes('Admin')
  if (!current.actual?.parts) return null

  const own = planColumns(current.pricingModel, current.actual)
  const other = planColumns(otherModel(current.pricingModel), current.comparison)
  const columns = [...own.columns, ...other.columns]
  const split = own.split ?? other.split
  const gridMissing = columns.some((column) => !column.parts.gridSet)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What is in the price</DialogTitle>
          <DialogDescription>
            One kWh at {formatClock(current.hourStart)} today, part by part.
          </DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead />
              {columns.map((column) => (
                <TableHead key={column.title} className="text-right">
                  {column.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => (
              <TableRow key={row.label} className={row.strong ? 'font-bold' : undefined}>
                <TableCell>
                  {row.label}
                  {row.hint && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {row.hint}
                    </span>
                  )}
                </TableCell>
                {columns.map((column) => (
                  <TableCell key={column.title} className="text-right tabular-nums">
                    {row.value(column.parts)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {split && (
          <p role="note" className="text-sm">
            {split.cap.kwhWithinCap === 0
              ? 'The whole hour is above the Norgespris monthly limit, so it is priced at spot. '
              : 'The Norgespris monthly limit was reached this hour: the kWh above it are priced at spot. '}
            Norgespris rate this hour, blended: {formatKrPerKwh(split.ratePerKwh)}.
          </p>
        )}

        {gridMissing && (
          <p role="note" className="text-sm text-destructive">
            The grid charge has not been set for this location yet, so these prices leave it out and
            come out too low.{' '}
            {isAdmin ? (
              <Link to="/admin/location-pricing" className="underline">
                Set it on the Location pricing page
              </Link>
            ) : (
              'Ask an administrator to set it.'
            )}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Energy, markup, grid charge and taxes are excluding VAT; the total includes VAT. The
          supplier&apos;s monthly fee is not included, and the grid capacity charge is a monthly
          amount shown in its own card. The expected bill for the month includes both.
        </p>
      </DialogContent>
    </Dialog>
  )
}

/** The "What is in the price" button of the right-now card; absent when the API sent no parts. */
export function PriceBreakdownButton({ current }: { current: CurrentHourCost }) {
  const [open, setOpen] = useState(false)
  if (!current.actual?.parts) return null

  return (
    <>
      <Button
        variant="link"
        size="sm"
        className="mt-2 h-auto p-0 text-sm"
        onClick={() => setOpen(true)}
      >
        What is in the price
      </Button>
      {open && <PriceBreakdownDialog current={current} onClose={() => setOpen(false)} />}
    </>
  )
}
