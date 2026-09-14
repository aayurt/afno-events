'use client'

import { useEffect, useState } from 'react'
import { CalendarPlus, CalendarX2, Radio, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScopedI18n } from '@/locales/client'
import { cn } from '@/utilities/ui'

type DatetimeProps = {
  startDatetime?: string | null
  endDatetime?: string | null
}

const MS_MIN = 60_000
const MS_DAY = 24 * 60 * MS_MIN

/**
 * Live countdown chip, mirroring the mobile "Starts in 2d 4h" / "Happening
 * now" / "Event ended" chip. Re-computes every 30s. Events without an end
 * time are treated as single-day events (over once their start day passes).
 */
export function CountdownChip({ startDatetime, endDatetime }: DatetimeProps) {
  const t = useScopedI18n('eventDetail') as (
    key: string,
    params?: Record<string, string | number>,
  ) => string
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  if (!startDatetime) return null

  const start = new Date(startDatetime).getTime()
  const end = endDatetime ? new Date(endDatetime).getTime() : null
  // No end time → single-day event, over once the start day has passed.
  const ended = end != null ? now >= end : now >= start + MS_DAY

  const diff = start - now

  let label: string
  if (ended) {
    label = t('eventEnded')
  } else if (diff <= 0) {
    label = t('happeningNow')
  } else {
    const mins = Math.floor(diff / MS_MIN)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) label = t('startsInDays', { days, hours: hours % 24 })
    else if (hours > 0) label = t('startsInHours', { hours, minutes: mins % 60 })
    else label = t('startsInMinutes', { minutes: mins })
  }

  const state = ended ? 'ended' : diff <= 0 ? 'live' : 'upcoming'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        state === 'ended' && 'bg-muted text-muted-foreground',
        state === 'live' && 'bg-green-500/10 text-green-600 dark:text-green-500',
        state === 'upcoming' && 'bg-primary/10 text-primary',
      )}
    >
      {state === 'ended' ? (
        <CalendarX2 size={14} />
      ) : state === 'live' ? (
        <Radio size={14} className="animate-pulse" />
      ) : (
        <Timer size={14} />
      )}
      {label}
    </span>
  )
}

type CalendarButtonProps = DatetimeProps & {
  title: string
  description?: string | null
  location?: string | null
}

const escapeIcs = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')

const formatIcsDate = (d: Date) =>
  d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/**
 * "Add to calendar" button that builds an .ics file on the fly and downloads
 * it — the web equivalent of the mobile Google/Apple calendar deep links.
 */
export function AddToCalendarButton({
  title,
  description,
  location,
  startDatetime,
  endDatetime,
}: CalendarButtonProps) {
  const t = useScopedI18n('eventDetail') as (
    key: string,
    params?: Record<string, string | number>,
  ) => string

  if (!startDatetime) return null

  const download = () => {
    const start = new Date(startDatetime)
    const end = endDatetime
      ? new Date(endDatetime)
      : new Date(start.getTime() + 2 * 60 * MS_MIN)
    const now = new Date()

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Afno Events//Event//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${formatIcsDate(start)}-${window.location.pathname}@afnoevents`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcs(title)}`,
      ...(description ? [`DESCRIPTION:${escapeIcs(description.slice(0, 2000))}`] : []),
      ...(location ? [`LOCATION:${escapeIcs(location)}`] : []),
      `URL:${window.location.href}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ]

    const blob = new Blob([lines.join('\r\n')], {
      type: 'text/calendar;charset=utf-8',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'event.ics'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
  }

  return (
    <Button variant="outline" size="sm" onClick={download} className="gap-2 rounded-xl">
      <CalendarPlus size={16} />
      {t('addToCalendar')}
    </Button>
  )
}
