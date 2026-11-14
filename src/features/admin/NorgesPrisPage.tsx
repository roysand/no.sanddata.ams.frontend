import { useState } from 'react'
import { Trash2Icon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { AddNorgesPrisRateDialog } from './AddNorgesPrisRateDialog'
import { DeleteNorgesPrisRateDialog } from './DeleteNorgesPrisRateDialog'
import { useNorgesPrisRates } from './hooks'
import { formatAmount, formatRateDate } from './norgesPris'
import type { NorgesPrisRate, NorgesPrisStatus } from './types'

type DialogState = { kind: 'add' } | { kind: 'delete'; rate: NorgesPrisRate } | null

function StatusBadge({ status }: { status: NorgesPrisStatus }) {
  if (status === 'InEffect') return <Badge>In effect</Badge>
  if (status === 'Upcoming') return <Badge variant="outline">Upcoming</Badge>
  return <Badge variant="secondary">Superseded</Badge>
}

/** The Norgespris rates and when each starts, for administrators. */
export function NorgesPrisPage() {
  const rates = useNorgesPrisRates()
  const [dialog, setDialog] = useState<DialogState>(null)
  const close = () => setDialog(null)

  return (
    <div className="mx-auto max-w-4xl">
      <Card className="bg-card shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-xl">Norgespris</CardTitle>
          <Button onClick={() => setDialog({ kind: 'add' })}>Add rate</Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A rate applies from its start date until a later rate takes over. The same rates are
            used for every location.
          </p>

          {rates.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {rates.error && <p className="text-sm text-destructive">{rates.error.message}</p>}
          {rates.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No rates yet</p>
          )}

          {rates.data && rates.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Valid from</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.data.map((rate) => (
                  <TableRow
                    key={rate.id}
                    aria-current={rate.status === 'InEffect' ? 'true' : undefined}
                    className={rate.status === 'InEffect' ? 'bg-accent/50 font-medium' : undefined}
                  >
                    <TableCell>{formatRateDate(rate.validFrom)}</TableCell>
                    <TableCell>{formatAmount(rate.ratePerKwh)}</TableCell>
                    <TableCell>{formatAmount(rate.taxPerKwh)}</TableCell>
                    <TableCell>{formatAmount(rate.totalPerKwh)}</TableCell>
                    <TableCell>
                      <StatusBadge status={rate.status} />
                    </TableCell>
                    <TableCell>
                      {rate.status === 'Upcoming' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete rate from ${formatRateDate(rate.validFrom)}`}
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

      {dialog?.kind === 'add' && <AddNorgesPrisRateDialog onClose={close} />}
      {dialog?.kind === 'delete' && (
        <DeleteNorgesPrisRateDialog rate={dialog.rate} onClose={close} />
      )}
    </div>
  )
}
