import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addCapacitySteps,
  addGridTariffRate,
  addNorgesPrisRate,
  addPriceRate,
  connectEvCharger,
  connectWaterHeater,
  createGridTariff,
  createLocationForUser,
  createUser,
  deleteCapacitySteps,
  deleteGridTariffRate,
  deleteNorgesPrisRate,
  deletePriceRate,
  deleteUser,
  removeEvCharger,
  removeWaterHeater,
  rotateSensorKey,
  setWaterHeaterKeyExpiry,
  getAdminLocations,
  getCapacitySteps,
  getGridTariffs,
  getLocationPricing,
  getNorgesPrisRates,
  getPriceRates,
  getUsers,
  getKeyReminders,
  getEvChargerSettings,
  getWaterHeaterSettings,
  getZaptecChargers,
  resetPassword,
  setAdmin,
  setLocationLink,
  setLocationPricing,
  setUserActive,
  updateLocationAsAdmin,
} from './api'
import type { LocationInput, LocationRole } from '../locations'
import type { CapacityStepTableInput, LocationPricingInput, WaterHeaterInput } from './types'

export const PAGE_SIZE = 10

const USERS_KEY = ['admin', 'users']
const ADMIN_LOCATIONS_KEY = ['admin', 'locations']
const NORGESPRIS_KEY = ['admin', 'norgespris']
const LOCATION_PRICING_KEY = ['admin', 'location-pricing']
const GRID_TARIFFS_KEY = ['admin', 'grid-tariffs']
const PRICE_RATES_KEY = ['admin', 'price-rates']
const KEY_REMINDERS_KEY = ['admin', 'key-reminders']
const ONE_HOUR = 60 * 60 * 1000

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
      mutationFn: (v: {
        userId: string
        locationId: string
        linked: boolean
        role?: LocationRole
      }) => setLocationLink(v.userId, v.locationId, v.linked, v.role),
      onSuccess: () => Promise.all([refresh(), refreshLocations()]),
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
        // An inactive location's keys leave the reminder list.
        queryClient.invalidateQueries({ queryKey: KEY_REMINDERS_KEY }),
      ]),
  })
}

export function useNorgesPrisRates() {
  return useQuery({ queryKey: NORGESPRIS_KEY, queryFn: getNorgesPrisRates })
}

/**
 * Adding or deleting a rate changes how hours are priced, and costs are calculated when shown, so the cost and price
 * figures already loaded for the dashboard are refreshed too.
 */
export function useNorgesPrisActions() {
  const queryClient = useQueryClient()
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: NORGESPRIS_KEY }),
      queryClient.invalidateQueries({ queryKey: ['cost'] }),
      queryClient.invalidateQueries({ queryKey: ['prices'] }),
    ])

  return {
    add: useMutation({ mutationFn: addNorgesPrisRate, onSuccess: refresh }),
    remove: useMutation({ mutationFn: deleteNorgesPrisRate, onSuccess: refresh }),
  }
}

export function useLocationPricing() {
  return useQuery({ queryKey: LOCATION_PRICING_KEY, queryFn: getLocationPricing })
}

export function useGridTariffs() {
  return useQuery({ queryKey: GRID_TARIFFS_KEY, queryFn: getGridTariffs })
}

export function usePriceRates() {
  return useQuery({ queryKey: PRICE_RATES_KEY, queryFn: getPriceRates })
}

/**
 * Every change here alters how hours are priced, and costs are calculated when shown, so the cost and price figures
 * already loaded for the dashboard are refreshed too.
 */
function useRefreshAfterPricingChange(...keys: readonly (readonly string[])[]) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      ...keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      queryClient.invalidateQueries({ queryKey: ['cost'] }),
      queryClient.invalidateQueries({ queryKey: ['prices'] }),
    ])
}

export function useSetLocationPricing() {
  const refresh = useRefreshAfterPricingChange(LOCATION_PRICING_KEY)
  return useMutation({
    mutationFn: (v: { locationId: string; input: LocationPricingInput }) =>
      setLocationPricing(v.locationId, v.input),
    onSuccess: refresh,
  })
}

/** Tariff and rate changes; the location list shows tariff names, so it is refreshed too. */
export function useGridTariffActions() {
  const refresh = useRefreshAfterPricingChange(GRID_TARIFFS_KEY, LOCATION_PRICING_KEY)
  return {
    create: useMutation({ mutationFn: createGridTariff, onSuccess: refresh }),
    addRate: useMutation({
      mutationFn: (v: { tariffId: string; input: Parameters<typeof addGridTariffRate>[1] }) =>
        addGridTariffRate(v.tariffId, v.input),
      onSuccess: refresh,
    }),
    removeRate: useMutation({
      mutationFn: (v: { tariffId: string; rateId: string }) =>
        deleteGridTariffRate(v.tariffId, v.rateId),
      onSuccess: refresh,
    }),
  }
}

export function usePriceRateActions() {
  const refresh = useRefreshAfterPricingChange(PRICE_RATES_KEY)
  return {
    add: useMutation({ mutationFn: addPriceRate, onSuccess: refresh }),
    remove: useMutation({ mutationFn: deletePriceRate, onSuccess: refresh }),
  }
}

const capacityStepsKey = (tariffId: string) => [...GRID_TARIFFS_KEY, tariffId, 'capacity-steps']

export function useCapacitySteps(tariffId: string) {
  return useQuery({
    queryKey: capacityStepsKey(tariffId),
    queryFn: () => getCapacitySteps(tariffId),
  })
}

/** Adding or deleting a table changes the capacity charge of the months it covers, so cost figures are refreshed. */
export function useCapacityStepActions(tariffId: string) {
  const refresh = useRefreshAfterPricingChange(capacityStepsKey(tariffId))
  return {
    add: useMutation({
      mutationFn: (input: CapacityStepTableInput) => addCapacitySteps(tariffId, input),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (validFrom: string) => deleteCapacitySteps(tariffId, validFrom),
      onSuccess: refresh,
    }),
  }
}

const WATER_HEATER_KEY = ['admin', 'water-heater']

/** The heater connected to a location, or `null` when none is. */
export function useWaterHeaterSettings(locationId: string) {
  return useQuery({
    queryKey: [...WATER_HEATER_KEY, locationId],
    queryFn: () => getWaterHeaterSettings(locationId),
  })
}

/**
 * Connect (or replace) and remove. Both refresh the Admin view and the dashboard card. The connect mutation holds the
 * key in its variables, so it is dropped from the mutation cache at once (`gcTime: 0`); callers also `reset()` it.
 */
export function useWaterHeaterActions(locationId: string) {
  const queryClient = useQueryClient()
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [...WATER_HEATER_KEY, locationId] }),
      queryClient.invalidateQueries({ queryKey: ['water-heater', 'state', locationId] }),
      // The location list says whether there is a heater, which shows or hides the Heater tab.
      queryClient.invalidateQueries({ queryKey: ['locations'] }),
      queryClient.invalidateQueries({ queryKey: KEY_REMINDERS_KEY }),
    ])
  return {
    connect: useMutation({
      mutationFn: (input: WaterHeaterInput) => connectWaterHeater(locationId, input),
      onSuccess: refresh,
      gcTime: 0,
    }),
    remove: useMutation({ mutationFn: () => removeWaterHeater(locationId), onSuccess: refresh }),
  }
}

/**
 * The keys due within 30 days or expired, for the reminder banner. Only administrators ask (`enabled`); an error (an
 * older API, offline) is not retried and simply shows no banner. Keys change rarely, so once an hour is enough.
 */
export function useKeyReminders(enabled: boolean) {
  return useQuery({
    queryKey: KEY_REMINDERS_KEY,
    queryFn: getKeyReminders,
    enabled,
    retry: false,
    refetchInterval: ONE_HOUR,
  })
}

/** Changes only the water heater key's expiry date, and refreshes the heater section and the reminders. */
export function useSetKeyExpiry(locationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (keyExpiresOn: string) => setWaterHeaterKeyExpiry(locationId, keyExpiresOn),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [...WATER_HEATER_KEY, locationId] }),
        queryClient.invalidateQueries({ queryKey: KEY_REMINDERS_KEY }),
      ]),
  })
}

/**
 * Replaces a location's sensor key. The new key is the mutation's `data` only: `gcTime: 0` drops it from the mutation
 * cache at once, and the dialog calls `reset()` when it closes, so it is never kept after being shown.
 */
export function useRotateSensorKey(locationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => rotateSensorKey(locationId),
    gcTime: 0,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_LOCATIONS_KEY }),
        queryClient.invalidateQueries({ queryKey: KEY_REMINDERS_KEY }),
      ]),
  })
}

const EV_CHARGER_KEY = ['admin', 'ev-charger']

/** The car charger connected to a location, or `null` when none is. */
export function useEvChargerSettings(locationId: string) {
  return useQuery({
    queryKey: [...EV_CHARGER_KEY, locationId],
    queryFn: () => getEvChargerSettings(locationId),
  })
}

/** The chargers the server's Zaptec sign-in sees, asked for only while the connect dialog is open. */
export function useZaptecChargers(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'ev-chargers'],
    queryFn: getZaptecChargers,
    enabled,
    retry: false,
    staleTime: 0,
  })
}

/**
 * Connect (or replace) and remove. Both refresh the Admin view, the location list (which shows or hides the Car tab
 * and holds the checkbox) and the Car tab's figures.
 */
export function useEvChargerActions(locationId: string) {
  const queryClient = useQueryClient()
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [...EV_CHARGER_KEY, locationId] }),
      queryClient.invalidateQueries({ queryKey: ['locations'] }),
      queryClient.invalidateQueries({ queryKey: ['ev-charger'] }),
    ])
  return {
    connect: useMutation({
      mutationFn: (chargerId: string) => connectEvCharger(locationId, chargerId),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: () => removeEvCharger(locationId), onSuccess: refresh }),
  }
}
