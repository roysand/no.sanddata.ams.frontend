import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createUser,
  deleteUser,
  getUsers,
  resetPassword,
  setAdmin,
  setLocationLink,
  setUserActive,
} from './api'

export const PAGE_SIZE = 10

const USERS_KEY = ['admin', 'users']

export function useUsers(page: number, search: string) {
  return useQuery({
    queryKey: [...USERS_KEY, page, search],
    queryFn: () => getUsers(page, PAGE_SIZE, search),
    placeholderData: keepPreviousData,
  })
}

/** All user-changing actions; each refreshes the user list when it succeeds. */
export function useUserActions() {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: USERS_KEY })

  return {
    create: useMutation({ mutationFn: createUser, onSuccess: refresh }),
    remove: useMutation({ mutationFn: deleteUser, onSuccess: refresh }),
    active: useMutation({
      mutationFn: (v: { user: Parameters<typeof setUserActive>[0]; isActive: boolean }) =>
        setUserActive(v.user, v.isActive),
      onSuccess: refresh,
    }),
    admin: useMutation({
      mutationFn: (v: { userId: string; isAdmin: boolean }) => setAdmin(v.userId, v.isAdmin),
      onSuccess: refresh,
    }),
    link: useMutation({
      mutationFn: (v: { userId: string; locationId: string; linked: boolean }) =>
        setLocationLink(v.userId, v.locationId, v.linked),
      onSuccess: refresh,
    }),
    password: useMutation({
      mutationFn: (v: { userId: string; newPassword: string }) =>
        resetPassword(v.userId, v.newPassword),
    }),
  }
}
