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
import { AddGridTariffRateDialog } from './AddGridTariffRateDialog'
import { CreateGridTariffDialog } from './CreateGridTariffDialog'
import { DeleteGridTariffRateDialog } from './DeleteGridTariffRateDialog'
import { useGridTariffs } from './hooks'
import { formatAmount, formatRateDate } from './norgesPris'
import { RateStatusBadge } from './RateStatusBadge'
import type { GridTariff, GridTariffRate } from './types'

type DialogState =
  | { kind: 'create' }
  | { kind: 'addRate'; tariff: GridTariff }
  | { kind: 'deleteRate'; tariff: GridTariff; rate: GridTariffRate }
  | null

/**
 * The grid tariffs and their rates, for administrators. A rate is the day rate and the night and weekend rate of the
 * grid company in NOK per kWh excluding taxes and VAT, valid from its start date until a later rate takes over.
 */
export function GridTariffsPage() {
  const tariffs = useGridTariffs()
  const [dialog, setDialog] = useState<DialogState>(null)
  const close = () => setDialog(null)

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card className="bg-card shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-xl">Grid tariffs</CardTitle>
          <Button onClick={() => setDialog({ kind: 'create' })}>New tariff</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Create a tariff for each grid company, add its rates, then choose it for the locations
            on the Location pricing page.
          </p>
          {tariffs.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {tariffs.error && <p className="text-sm text-destructive">{tariffs.error.message}</p>}
          {tariffs.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No tariffs yet</p>
          )}
        </CardContent>
      </Card>

      {tariffs.data?.map((tariff) => (
        <Card key={tariff.id} className="bg-card shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">{tariff.name}</CardTitle>
            <Button
              variant="outline"
              aria-label={`Add rate to ${tariff.name}`}
              onClick={() => setDialog({ kind: 'addRate', tariff })}
            >
              Add rate
            </Button>
          </CardHeader>
          <CardContent>
            {tariff.rates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rates yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Valid from</TableHead>
                    <TableHead>Day rate</TableHead>
                    <TableHead>Night and weekend rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tariff.rates.map((rate) => (
                    <TableRow
                      key={rate.id}
                      aria-current={rate.status === 'InEffect' ? 'true' : undefined}
                      className={
                        rate.status === 'InEffect' ? 'bg-accent/50 font-medium' : undefined
                      }
                    >
                      <TableCell>{formatRateDate(rate.validFrom)}</TableCell>
                      <TableCell>{formatAmount(rate.dayRatePerKwh)}</TableCell>
                      <TableCell>{formatAmount(rate.nightRatePerKwh)}</TableCell>
                      <TableCell>
                        <RateStatusBadge status={rate.status} />
                      </TableCell>
                      <TableCell>
                        {rate.status === 'Upcoming' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete rate from ${formatRateDate(rate.validFrom)} for ${tariff.name}`}
                            onClick={() => setDialog({ kind: 'deleteRate', tariff, rate })}
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
      ))}

      {dialog?.kind === 'create' && <CreateGridTariffDialog onClose={close} />}
      {dialog?.kind === 'addRate' && (
        <AddGridTariffRateDialog tariff={dialog.tariff} onClose={close} />
      )}
      {dialog?.kind === 'deleteRate' && (
        <DeleteGridTariffRateDialog tariff={dialog.tariff} rate={dialog.rate} onClose={close} />
      )}
    </div>
  )
}
