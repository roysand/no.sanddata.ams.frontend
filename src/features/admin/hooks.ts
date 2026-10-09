import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createLocationForUser,
  createUser,
  deleteUser,
  getAdminLocations,
  getUsers,
  resetPassword,
  setAdmin,
  setLocationLink,
  setUserActive,
  updateLocationAsAdmin,
} from './api'
import type { LocationInput } from '../locations'

export const PAGE_SIZE = 10

const USERS_KEY = ['admin', 'users']
const ADMIN_LOCATIONS_KEY = ['admin', 'locations']

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
  const refreshLocations = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['locations'] }),
      queryClient.invalidateQueries({ queryKey: ADMIN_LOCATIONS_KEY }),
    ])

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
    addLocation: useMutation({
      mutationFn: (v: { userId: string; input: LocationInput }) =>
        createLocationForUser(v.userId, v.input),
      onSuccess: () => Promise.all([refresh(), refreshLocations()]),
    }),
    password: useMutation({
      mutationFn: (v: { userId: string; newPassword: string }) =>
        resetPassword(v.userId, v.newPassword),
    }),
  }
}

export function useAdminLocations() {
  return useQuery({ queryKey: ADMIN_LOCATIONS_KEY, queryFn: getAdminLocations })
}

export function useUpdateLocationAsAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; input: LocationInput }) => updateLocationAsAdmin(v.id, v.input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_LOCATIONS_KEY }),
        queryClient.invalidateQueries({ queryKey: ['locations'] }),
        queryClient.invalidateQueries({ queryKey: USERS_KEY }),
      ]),
  })
}
