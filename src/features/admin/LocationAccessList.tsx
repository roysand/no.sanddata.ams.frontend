import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AdminLocation, LocationRole } from '../locations'
import { useUserActions, useUsers } from './hooks'

/** Who has access to a location and in which role; the administrator adds viewers and changes roles here. */
export function LocationAccessList({ location }: { location: AdminLocation }) {
  const { link } = useUserActions()
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const needle = search.trim()
  const found = useUsers(1, needle)

  const access = location.users ?? []
  const linkedIds = new Set(access.map((user) => user.userId))
  // Someone already linked is not offered again, so a duplicate cannot be added from here.
  const candidates = needle
    ? (found.data?.users ?? []).filter((user) => !linkedIds.has(user.id))
    : []

  const change = async (userId: string, linked: boolean, role?: LocationRole) => {
    setError(null)
    try {
      await link.mutateAsync({ userId, locationId: location.id, linked, role })
    } catch (failure) {
      // For example 409 when removing or demoting the last owner: show the server's message, change nothing.
      setError(failure instanceof Error ? failure.message : 'Could not change the access')
    }
  }

  return (
    <section className="space-y-3" aria-label="Access">
      <h3 className="text-sm font-medium">Access</h3>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {access.map((user) => (
          <li key={user.userId} className="flex items-center justify-between gap-2 text-sm">
            <span>
              {user.firstName} {user.lastName}
              <span className="block text-xs text-muted-foreground">{user.email}</span>
            </span>
            <span className="flex items-center gap-2">
              <Badge variant={user.role === 'Owner' ? 'default' : 'secondary'}>{user.role}</Badge>
              {user.role === 'Viewer' ? (
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Make ${user.email} owner`}
                  onClick={() => change(user.userId, true, 'Owner')}
                >
                  Make owner
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Make ${user.email} viewer`}
                  onClick={() => change(user.userId, true, 'Viewer')}
                >
                  Make viewer
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                aria-label={`Remove ${user.email}`}
                onClick={() => change(user.userId, false)}
              >
                Remove
              </Button>
            </span>
          </li>
        ))}
        {access.length === 0 && <li className="text-sm text-muted-foreground">Nobody yet.</li>}
      </ul>

      <div className="space-y-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Find a user by name or email"
          aria-label="Find a user"
        />
        <ul className="space-y-1">
          {candidates.map((user) => (
            <li key={user.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {user.firstName} {user.lastName}
                <span className="block text-xs text-muted-foreground">{user.email}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                aria-label={`Add ${user.email} as viewer`}
                onClick={() => change(user.id, true, 'Viewer')}
              >
                Add as viewer
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
