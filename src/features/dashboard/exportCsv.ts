import { getDailyCostRange, getHourlyCostPage } from './api'
import { modelLabel, otherModel } from './format'
import { addDays, dayStart } from './periods'
import type { DailyCostItem, HourlyCostItem } from './types'

export type Resolution = 'hour' | 'day'

/** The longest range an hourly export may cover; about 8 800 rows, five pages from the API. */
export const MAX_HOURLY_DAYS = 366
const PAGE_SIZE = 2000

// Semicolons and decimal commas: what Excel and Numbers expect with Norwegian settings.
const SEPARATOR = ';'
/** Rounds half away from zero on the decimal digits, so 1.2345 gives 1.235 (toFixed alone gives 1.234). */
function rounded(value: number, decimals: number): string {
  const shifted = Math.round(Number(`${Math.abs(value)}e${decimals}`))
  // Numbers so small that they print in exponent form (1e-7) give NaN above; they round to 0 anyway.
  if (!Number.isFinite(shifted)) return value.toFixed(decimals)
  return (Math.sign(value) * Number(`${shifted}e-${decimals}`)).toFixed(decimals)
}

const number = (value: number | null | undefined, decimals: number) =>
  value === null || value === undefined ? '' : rounded(value, decimals).replace('.', ',')

function cell(value: string): string {
  return /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

const toCsv = (rows: string[][]) =>
  rows.map((row) => row.map(cell).join(SEPARATOR)).join('\r\n') + '\r\n'

// sv-SE gives "2026-11-18 14:00", which spreadsheets read as a date and time.
const osloTime = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Oslo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function hourlyCsv(items: HourlyCostItem[]): string {
  return toCsv([
    [
      'Start (Oslo time)',
      'Start (UTC)',
      'Usage (kWh)',
      'Price model',
      'Price (kr/kWh)',
      'Cost (kr)',
      'Other model',
      'Other price (kr/kWh)',
      'Other cost (kr)',
    ],
    ...items.map((item) => [
      osloTime.format(new Date(item.hourStart)),
      new Date(item.hourStart).toISOString(),
      number(item.consumptionKwh, 3),
      modelLabel(item.pricingModel),
      number(item.actual?.ratePerKwh, 4),
      number(item.actual?.cost, 2),
      modelLabel(otherModel(item.pricingModel)),
      number(item.comparison?.ratePerKwh, 4),
      number(item.comparison?.cost, 2),
    ]),
  ])
}

export function dailyCsv(items: DailyCostItem[]): string {
  return toCsv([
    ['Date', 'Usage (kWh)', 'Price model', 'Cost (kr)', 'Other model', 'Other cost (kr)'],
    ...items.map((item) => [
      item.date,
      number(item.consumptionKwh, 3),
      modelLabel(item.pricingModel),
      number(item.actual?.cost, 2),
      modelLabel(otherModel(item.pricingModel)),
      number(item.comparison?.cost, 2),
    ]),
  ])
}

/** Every hour from the start of Oslo date `from` to the end of Oslo date `to`, page by page. */
export async function fetchHourly(
  locationId: string,
  from: string,
  to: string,
): Promise<HourlyCostItem[]> {
  const fromUtc = dayStart(from).toISOString()
  // The API includes `to`, so stop one second before the next day starts.
  const toUtc = new Date(dayStart(addDays(to, 1)).getTime() - 1000).toISOString()
  const items: HourlyCostItem[] = []
  for (let page = 1; ; page++) {
    const result = await getHourlyCostPage(locationId, fromUtc, toUtc, page, PAGE_SIZE)
    items.push(...result.items)
    if (result.items.length < PAGE_SIZE || items.length >= result.totalCount) return items
  }
}

export async function buildExport(
  locationId: string,
  from: string,
  to: string,
  resolution: Resolution,
): Promise<{ csv: string; rows: number }> {
  if (resolution === 'hour') {
    const items = await fetchHourly(locationId, from, to)
    return { csv: hourlyCsv(items), rows: items.length }
  }
  const { items } = await getDailyCostRange(locationId, from, to)
  return { csv: dailyCsv(items), rows: items.length }
}

export function exportFileName(
  locationName: string,
  from: string,
  to: string,
  resolution: Resolution,
): string {
  const slug =
    locationName
      .toLowerCase()
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'o')
      .replace(/å/g, 'a')
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'location'
  return `${slug}-${resolution === 'hour' ? 'hourly' : 'daily'}-${from}-to-${to}.csv`
}

/** Hands the file to the browser. The byte order mark makes Excel read the file as UTF-8 (æ, ø, å). */
export function saveCsv(fileName: string, csv: string) {
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before the URL is released.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
