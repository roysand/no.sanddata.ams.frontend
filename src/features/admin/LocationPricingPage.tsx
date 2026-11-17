import { useState } from 'react'
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
import { EditLocationPricingDialog } from './EditLocationPricingDialog'
import { useLocationPricing } from './hooks'
import { formatAmount } from './norgesPris'
import type { LocationPricing } from './types'

/**
 * The grid tariff and supplier markup of every location, for administrators. A location without a grid tariff still
 * gets prices, but without the grid part, so it is marked until one is chosen.
 */
export function LocationPricingPage() {
  const locations = useLocationPricing()
  const [editing, setEditing] = useState<LocationPricing | null>(null)

  return (
    <div className="mx-auto max-w-4xl">
      <Card className="bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Location pricing</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The grid tariff and the supplier markup of each location. Without a grid tariff the grid
            part is left out of the location&apos;s prices, so they come out too low.
          </p>

          {locations.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {locations.error && <p className="text-sm text-destructive">{locations.error.message}</p>}
          {locations.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No locations yet</p>
          )}

          {locations.data && locations.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Grid tariff</TableHead>
                  <TableHead>Supplier markup</TableHead>
                  <TableHead>Exemptions and type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.data.map((location) => (
                  <TableRow key={location.locationId}>
                    <TableCell className="font-medium">{location.name}</TableCell>
                    <TableCell>
                      {location.gridTariffName ?? <Badge variant="outline">Not set</Badge>}
                    </TableCell>
                    <TableCell>{formatAmount(location.supplierMarkupPerKwh)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {location.electricityTaxExempt && (
                          <Badge variant="outline">Tax exempt</Badge>
                        )}
                        {location.vatExempt && <Badge variant="outline">VAT exempt</Badge>}
                        {location.isHolidayHome && <Badge variant="outline">Holiday home</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {location.isComplete ? (
                        <Badge variant="secondary">Complete</Badge>
                      ) : (
                        <Badge variant="destructive">Incomplete</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Edit pricing for ${location.name}`}
                        onClick={() => setEditing(location)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && <EditLocationPricingDialog location={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
