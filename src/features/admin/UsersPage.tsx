import { useState, type FormEvent } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { ApiError } from '../../lib/apiClient'
import { useAuth } from '../auth/useAuth'
import { useLocations } from '../locations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AddLocationDialog } from './AddLocationDialog'
import { AddMeterDialog } from './AddMeterDialog'
import { CreateUserDialog } from './CreateUserDialog'
import { DeleteUserDialog } from './DeleteUserDialog'
import { PAGE_SIZE, useUserActions, useUsers } from './hooks'
import { ResetPasswordDialog } from './ResetPasswordDialog'
import { userLocationOptions } from './locationOptions'
import type { AdminUser } from './types'

type DialogState =
  | { kind: 'create' }
  | { kind: 'addLocation'; user: AdminUser }
  | { kind: 'addMeter'; user: AdminUser }
  | { kind: 'password'; user: AdminUser }
  | { kind: 'delete'; user: AdminUser }
  | null

export function UsersPage() {
  const { email: myEmail } = useAuth()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<DialogState>(null)
  const [error, setError] = useState<string | null>(null)

  const users = useUsers(page, search)
  const locations = useLocations()
  const actions = useUserActions()

  // Run an action; show the server's message above the table if it is refused (e.g. the last admin).
  const run = async (action: Promise<unknown>) => {
    setError(null)
    try {
      await action
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong')
    }
  }

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const data = users.data

  return (
    <div className="mx-auto max-w-6xl">
      <Card className="bg-white/95 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-xl">Users</CardTitle>
          <div className="flex items-center gap-2">
            <form onSubmit={submitSearch} className="flex gap-2">
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search name or email"
                className="w-56"
                aria-label="Search users"
              />
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>
            <Button onClick={() => setDialog({ kind: 'create' })}>Add user</Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {users.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {users.error && <p className="text-sm text-destructive">{users.error.message}</p>}

          {data && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Locations</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((user) => {
                    const isSelf = user.email.toLowerCase() === myEmail?.toLowerCase()
                    const isAdmin = user.roles.includes('Admin')

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                            {isSelf && (
                              <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <Badge
                                key={role}
                                variant={role === 'Admin' ? 'default' : 'secondary'}
                              >
                                {role}
                              </Badge>
                            ))}
                            {!user.isActive && <Badge variant="outline">Inactive</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {locations.data?.length ? (
                            <div className="flex flex-col gap-1">
                              {locations.data.map((location) => (
                                <label
                                  key={location.id}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <Checkbox
                                    checked={user.locationIds.includes(location.id)}
                                    onCheckedChange={(checked) =>
                                      run(
                                        actions.link.mutateAsync({
                                          userId: user.id,
                                          locationId: location.id,
                                          linked: checked === true,
                                        }),
                                      )
                                    }
                                    disabled={actions.link.isPending}
                                  />
                                  {location.name}
                                </label>
                              ))}
                              {userLocationOptions(user)
                                .filter(
                                  (option) => !locations.data?.some((l) => l.id === option.id),
                                )
                                .map((option) => (
                                  <span key={option.id} className="text-sm text-muted-foreground">
                                    {option.name}
                                  </span>
                                ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {user.locations.join(', ') || '—'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Actions for ${user.email}`}
                              >
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setDialog({ kind: 'addLocation', user })}
                              >
                                Add location
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={user.locationIds.length === 0}
                                title={
                                  user.locationIds.length === 0 ? 'Add a location first' : undefined
                                }
                                onClick={() => setDialog({ kind: 'addMeter', user })}
                              >
                                Add meter
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={isSelf && isAdmin}
                                onClick={() =>
                                  run(
                                    actions.admin.mutateAsync({
                                      userId: user.id,
                                      isAdmin: !isAdmin,
                                    }),
                                  )
                                }
                              >
                                {isAdmin ? 'Remove admin' : 'Make admin'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={isSelf}
                                onClick={() =>
                                  run(
                                    actions.active.mutateAsync({ user, isActive: !user.isActive }),
                                  )
                                }
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={isSelf}
                                onClick={() => setDialog({ kind: 'password', user })}
                              >
                                Reset password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={isSelf}
                                className="text-destructive"
                                onClick={() => setDialog({ kind: 'delete', user })}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {data.users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {data.totalCount} user{data.totalCount === 1 ? '' : 's'}
                  {data.totalCount > PAGE_SIZE
                    ? ` · page ${data.pageNumber} of ${data.totalPages}`
                    : ''}
                </span>
                {data.totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Location checkboxes list your own locations; other locations the user has are shown
                as text. You cannot change your own role, status or password here, or delete
                yourself.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {dialog?.kind === 'create' && <CreateUserDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'addLocation' && (
        <AddLocationDialog user={dialog.user} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'addMeter' && (
        <AddMeterDialog user={dialog.user} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'password' && (
        <ResetPasswordDialog user={dialog.user} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteUserDialog user={dialog.user} onClose={() => setDialog(null)} />
      )}
    </div>
  )
}
