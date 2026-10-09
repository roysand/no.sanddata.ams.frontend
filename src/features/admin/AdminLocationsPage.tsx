import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AdminLocation } from '../locations'
import { AdminLocationDialog } from './AdminLocationDialog'
import { useAdminLocations } from './hooks'

function ownerOf(location: AdminLocation) {
  return location.users?.find((user) => user.role === 'Owner')
}

function viewerCount(location: AdminLocation) {
  return location.users?.filter((user) => user.role === 'Viewer').length
}

/** Every location in the system, for administrators. */
export function AdminLocationsPage() {
  const locations = useAdminLocations()
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<AdminLocation | null>(null)

  const needle = filter.trim().toLowerCase()
  const shown = (locations.data ?? []).filter(
    (location) =>
      !needle ||
      location.name.toLowerCase().includes(needle) ||
      location.address.toLowerCase().includes(needle),
  )

  return (
    <div className="mx-auto max-w-6xl">
      <Card className="bg-white/95 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-xl">Locations</CardTitle>
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by name or address"
            className="w-64"
            aria-label="Filter locations"
          />
        </CardHeader>

        <CardContent className="space-y-4">
          {locations.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {locations.error && <p className="text-sm text-destructive">{locations.error.message}</p>}

          {locations.data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Viewers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((location) => {
                  const owner = ownerOf(location)
                  return (
                    <TableRow key={location.id}>
                      <TableCell>
                        <div className="font-medium">{location.name}</div>
                        <div className="text-xs text-muted-foreground">{location.address}</div>
                      </TableCell>
                      <TableCell className="text-sm">{owner ? owner.email : '—'}</TableCell>
                      <TableCell className="text-sm">{viewerCount(location) ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={location.isActive ? 'secondary' : 'outline'}>
                          {location.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Edit ${location.name}`}
                          onClick={() => setEditing(location)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {shown.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No locations found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && <AdminLocationDialog location={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
