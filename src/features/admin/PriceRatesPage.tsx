import { useState } from 'react'
import { Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AddPriceRateDialog } from './AddPriceRateDialog'
import { DeletePriceRateDialog } from './DeletePriceRateDialog'
import { usePriceRates } from './hooks'
import { formatAmount, formatRateDate } from './norgesPris'
import { formatKwhPerMonth, formatPercent, kindLabel } from './pricing'
import { isCapKind } from './schema'
import { RateStatusBadge } from './RateStatusBadge'
import type { PriceRate, PriceRateKind } from './types'

const KINDS: PriceRateKind[] = [
  'ElectricityTax',
  'EnovaFee',
  'Vat',
  'NorgesPrisCapHome',
  'NorgesPrisCapHolidayHome',
]

type DialogState =
  { kind: 'add'; priceKind: PriceRateKind } | { kind: 'delete'; rate: PriceRate } | null

const formatValue = (rate: PriceRate) =>
  rate.kind === 'Vat'
    ? formatPercent(rate.value)
    : isCapKind(rate.kind)
      ? formatKwhPerMonth(rate.value)
      : formatAmount(rate.value)

/**
 * The national values the price is made of besides the energy and the grid tariff: the electricity tax and the Enova
 * fee (NOK per kWh) and VAT (a percentage). Each has start dates; a new row takes over from its start date.
 */
export function PriceRatesPage() {
  const rates = usePriceRates()
  const [dialog, setDialog] = useState<DialogState>(null)
  const close = () => setDialog(null)

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card className="bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Taxes and VAT</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            These are added to every price. When the state changes one of them, add a row with the
            date it starts; hours before that date keep the old value.
          </p>
          {rates.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {rates.error && <p className="text-sm text-destructive">{rates.error.message}</p>}
        </CardContent>
      </Card>

      {rates.data &&
        KINDS.map((priceKind) => {
          const rows = rates.data.filter((rate) => rate.kind === priceKind)
          return (
            <Card key={priceKind} className="bg-card shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle className="text-lg">{kindLabel(priceKind)}</CardTitle>
                <Button
                  variant="outline"
                  aria-label={`Add ${kindLabel(priceKind)} rate`}
                  onClick={() => setDialog({ kind: 'add', priceKind })}
                >
                  Add rate
                </Button>
              </CardHeader>
              <CardContent>
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rows yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Valid from</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-16" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((rate) => (
                        <TableRow
                          key={rate.id}
                          aria-current={rate.status === 'InEffect' ? 'true' : undefined}
                          className={
                            rate.status === 'InEffect' ? 'bg-accent/50 font-medium' : undefined
                          }
                        >
                          <TableCell>{formatRateDate(rate.validFrom)}</TableCell>
                          <TableCell>{formatValue(rate)}</TableCell>
                          <TableCell>
                            <RateStatusBadge status={rate.status} />
                          </TableCell>
                          <TableCell>
                            {rate.status === 'Upcoming' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete ${kindLabel(rate.kind)} from ${formatRateDate(rate.validFrom)}`}
                                onClick={() => setDialog({ kind: 'delete', rate })}
                              >
                                <Trash2Icon className="size-4" aria-hidden="true" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )
        })}

      {dialog?.kind === 'add' && (
        <AddPriceRateDialog priceKind={dialog.priceKind} onClose={close} />
      )}
      {dialog?.kind === 'delete' && <DeletePriceRateDialog rate={dialog.rate} onClose={close} />}
    </div>
  )
}
