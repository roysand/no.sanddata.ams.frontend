import { useState } from 'react'
import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Segmented } from '@/components/ui/segmented'
import { lastOsloDays } from './format'
import { MAX_HOURLY_DAYS, buildExport, exportFileName, saveCsv, type Resolution } from './exportCsv'

const DAY_MS = 86_400_000
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1

/** Why the chosen dates cannot be exported, or null when they can. */
function problem(from: string, to: string, today: string, resolution: Resolution): string | null {
  if (!from || !to) return 'Choose both dates.'
  if (from > to) return 'The first date must not be after the last.'
  if (to > today) return 'The last date cannot be in the future.'
  if (resolution === 'hour' && daysBetween(from, to) > MAX_HOURLY_DAYS)
    return `Hour by hour covers at most ${MAX_HOURLY_DAYS} days. Choose a shorter range or Day by day.`
  return null
}

/** Usage and cost for a chosen range as a CSV file, for a spreadsheet or for checking the bill. */
export function ExportCard({
  locationId,
  locationName,
}: {
  locationId: string
  locationName: string
}) {
  const today = lastOsloDays(new Date(), 1)[0]
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`)
  const [to, setTo] = useState(today)
  const [resolution, setResolution] = useState<Resolution>('hour')
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'busy' }
    | { kind: 'done'; rows: number }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' })

  const invalid = problem(from, to, today, resolution)

  const download = async () => {
    if (invalid) return
    setStatus({ kind: 'busy' })
    try {
      const { csv, rows } = await buildExport(locationId, from, to, resolution)
      saveCsv(exportFileName(locationName, from, to, resolution), csv)
      setStatus({ kind: 'done', rows })
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'The export failed. Try again.',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-extrabold">Export to CSV</CardTitle>
        <p className="text-sm text-muted-foreground">
          Usage and cost for {locationName}, for a spreadsheet or for checking your bill.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="export-from">From</Label>
            <Input
              id="export-from"
              type="date"
              value={from}
              max={today}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="export-to">To</Label>
            <Input
              id="export-to"
              type="date"
              value={to}
              max={today}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>

        <Segmented
          label="Rows"
          value={resolution}
          onChange={setResolution}
          options={[
            { value: 'hour', label: 'Hour by hour' },
            { value: 'day', label: 'Day by day' },
          ]}
        />

        {invalid && <p className="text-sm text-destructive">{invalid}</p>}

        <Button
          className="h-11 w-full text-sm font-bold"
          disabled={!!invalid || status.kind === 'busy'}
          onClick={download}
        >
          <DownloadIcon aria-hidden="true" />
          {status.kind === 'busy' ? 'Preparing the file…' : 'Download CSV'}
        </Button>

        <p className="text-sm" aria-live="polite">
          {status.kind === 'done' &&
            (status.rows === 0
              ? 'The file has no rows: there are no readings in that range.'
              : `Downloaded ${status.rows} rows.`)}
          {status.kind === 'error' && <span className="text-destructive">{status.message}</span>}
        </p>

        <p className="text-xs text-muted-foreground">
          Cost includes VAT, the grid charge and taxes, but not the supplier&apos;s monthly fee or
          the grid capacity charge. The file uses semicolons and decimal commas, as Excel expects
          with Norwegian settings.
        </p>
      </CardContent>
    </Card>
  )
}
