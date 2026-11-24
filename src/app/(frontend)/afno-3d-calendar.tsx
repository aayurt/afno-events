'use client'

import React, { useState, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Sparkles,
  Ticket,
  ArrowRight,
  X,
  ExternalLink
} from 'lucide-react'
import { getCardImageUrl } from '@/utilities/getCardImageUrl'
import { displayPriceRange } from '@/utilities/pricing'

interface EventItem {
  id: string | number
  title: string
  slug?: string
  startDatetime?: string | null
  endDatetime?: string | null
  coverImage?: any
  location?: {
    location?: string
  }
  pricing?: {
    type?: 'free' | 'paid'
    ticketTypes?: any[]
    priceRange?: any
  }
  isBookable?: boolean
  tags?: string[]
}

interface Afno3DCalendarProps {
  events: EventItem[]
}

export function Afno3DCalendar({ events }: Afno3DCalendarProps) {
  // Find current or nearest event month as initial view
  const initialDate = useMemo(() => {
    const now = new Date()
    // If there are future events, default to the month of the first future event
    const futureEvent = events
      .filter((e) => e.startDatetime && new Date(e.startDatetime).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.startDatetime!).getTime() - new Date(b.startDatetime!).getTime())[0]

    if (futureEvent?.startDatetime) {
      const d = new Date(futureEvent.startDatetime)
      return new Date(d.getFullYear(), d.getMonth(), 1)
    }

    // Otherwise check latest event
    const anyEvent = events
      .filter((e) => e.startDatetime)
      .sort((a, b) => new Date(b.startDatetime!).getTime() - new Date(a.startDatetime!).getTime())[0]

    if (anyEvent?.startDatetime) {
      const d = new Date(anyEvent.startDatetime)
      return new Date(d.getFullYear(), d.getMonth(), 1)
    }

    return new Date(now.getFullYear(), now.getMonth(), 1)
  }, [events])

  const [currentMonth, setCurrentMonth] = useState<Date>(initialDate)
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: Date; events: EventItem[] } | null>(null)

  // 3D Perspective Stage tracking
  const calendarRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!calendarRef.current) return
    const rect = calendarRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Gentle 3D perspective tilt
    const maxTilt = 4
    const rx = ((y - centerY) / centerY) * -maxTilt
    const ry = ((x - centerX) / centerX) * maxTilt
    setTilt({ rx, ry })
  }, [])

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 })
  }

  // Month navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    setSelectedDayEvents(null)
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    setSelectedDayEvents(null)
  }

  // Group events by date string (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, EventItem[]> = {}
    events.forEach((ev) => {
      if (!ev.startDatetime) return
      const d = new Date(ev.startDatetime)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!map[key]) map[key] = []
      map[key].push(ev)
    })
    return map
  }, [events])

  // Calendar Days computation (Monday to Sunday)
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Convert getDay() (0=Sun..6=Sat) to Monday-based (0=Mon..6=Sun)
    let startDayOfWeek = firstDay.getDay() - 1
    if (startDayOfWeek === -1) startDayOfWeek = 6

    const days: Array<{
      date: Date
      isCurrentMonth: boolean
      dateKey: string
      events: EventItem[]
      isToday: boolean
    }> = []

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      days.push({
        date: d,
        isCurrentMonth: false,
        dateKey: key,
        events: eventsByDate[key] || [],
        isToday: false,
      })
    }

    // Current month days
    const today = new Date()
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i)
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      days.push({
        date: d,
        isCurrentMonth: true,
        dateKey: key,
        events: eventsByDate[key] || [],
        isToday: key === todayKey,
      })
    }

    // Next month padding (complete grid to 35 or 42 cells)
    const totalCells = days.length > 35 ? 42 : 35
    const remaining = totalCells - days.length
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      days.push({
        date: d,
        isCurrentMonth: false,
        dateKey: key,
        events: eventsByDate[key] || [],
        isToday: false,
      })
    }

    return days
  }, [currentMonth, eventsByDate])

  const monthYearLabel = currentMonth.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  // Count events in active month
  const activeMonthEventCount = useMemo(() => {
    let count = 0
    calendarDays.forEach((day) => {
      if (day.isCurrentMonth) count += day.events.length
    })
    return count
  }, [calendarDays])

  const weekDayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

  return (
    <div className="w-full relative">
      {/* 3D Perspective Stage Container */}
      <div
        ref={calendarRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full transition-transform duration-300 ease-out"
        style={{
          perspective: '1400px',
        }}
      >
        <div
          className="w-full rounded-[16px] sm:rounded-[20px] bg-slate-950 border border-alpine-500/35 dark:border-alpine-400/35 shadow-2xl p-4 sm:p-6 lg:p-8 relative overflow-hidden"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`,
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px -10px rgba(220, 21, 60, 0.25)',
          }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-alpine-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-alpine-600/10 rounded-full blur-[90px] pointer-events-none" />

          {/* Calendar Header: Month Switcher & Statistics */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-alpine-500/20 text-alpine-400 border border-alpine-400/30">
                  <Sparkles size={11} />
                  <span>3D Interactive Calendar</span>
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {activeMonthEventCount} {activeMonthEventCount === 1 ? 'Event' : 'Events'} This Month
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-white uppercase">
                {monthYearLabel}
              </h3>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                aria-label="Previous Month"
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/15 active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                onClick={() => setCurrentMonth(new Date(initialDate))}
                className="px-3 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-semibold transition-all border border-white/15 active:scale-95"
              >
                Today
              </button>

              <button
                onClick={nextMonth}
                aria-label="Next Month"
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/15 active:scale-95"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Weekday Strip */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-4 pb-2 text-center relative z-10">
            {weekDayLabels.map((day, idx) => (
              <div
                key={day}
                className={`text-[10px] sm:text-xs font-mono font-bold tracking-wider ${
                  idx >= 5 ? 'text-alpine-400' : 'text-slate-400'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 3D Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 relative z-10">
            {calendarDays.map((cell, idx) => {
              const hasEvents = cell.events.length > 0
              const primaryEvent = cell.events[0]
              const coverUrl = primaryEvent ? getCardImageUrl(primaryEvent.coverImage) : null
              const isSelected = selectedDayEvents?.dateKey === cell.dateKey

              return (
                <div
                  key={`${cell.dateKey}-${idx}`}
                  onClick={() => {
                    if (hasEvents) {
                      setSelectedDayEvents({ date: cell.date, events: cell.events, dateKey: cell.dateKey } as any)
                    }
                  }}
                  className={`relative group rounded-[8px] sm:rounded-[10px] aspect-[4/5] sm:aspect-square flex flex-col justify-between p-1.5 sm:p-2 border transition-all duration-300 ${
                    !cell.isCurrentMonth
                      ? 'opacity-30 border-white/5 bg-slate-900/30'
                      : hasEvents
                      ? 'border-alpine-500/50 bg-slate-900/90 cursor-pointer shadow-lg hover:border-alpine-400 hover:scale-[1.04] hover:z-20 hover:shadow-alpine-500/30'
                      : 'border-white/10 bg-slate-900/40 hover:bg-slate-900/70'
                  } ${isSelected ? 'ring-2 ring-alpine-500 border-alpine-400 z-20 scale-[1.03]' : ''}`}
                  style={{
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Event Background Poster Thumbnail */}
                  {hasEvents && coverUrl && (
                    <div className="absolute inset-0 rounded-[8px] sm:rounded-[10px] overflow-hidden pointer-events-none">
                      <img
                        src={coverUrl}
                        alt={primaryEvent.title}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-85 group-hover:scale-105 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30" />
                    </div>
                  )}

                  {/* Day Number Header */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    <span
                      className={`text-xs sm:text-sm font-mono font-bold leading-none ${
                        cell.isToday
                          ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-alpine-600 text-white flex items-center justify-center shadow-xs'
                          : cell.isCurrentMonth
                          ? hasEvents
                            ? 'text-white font-black drop-shadow-md'
                            : 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>

                    {/* Multi-event count badge */}
                    {cell.events.length > 1 && (
                      <span className="w-4 h-4 rounded-full bg-alpine-600 text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-xs">
                        {cell.events.length}
                      </span>
                    )}
                  </div>

                  {/* Cell Footer Metadata / Event Title */}
                  {hasEvents && (
                    <div className="relative z-10 space-y-0.5">
                      <div className="text-[8px] sm:text-[10px] font-sans font-bold text-white line-clamp-1 drop-shadow-md group-hover:text-alpine-300 transition-colors">
                        {primaryEvent.title}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[7px] sm:text-[9px] font-mono font-bold uppercase text-alpine-300 drop-shadow-sm">
                          {primaryEvent.pricing?.type === 'paid' ? 'Tickets' : 'Free'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Quick Date Inspector Drawer / Modal */}
          {selectedDayEvents && selectedDayEvents.events.length > 0 && (
            <div className="mt-6 p-4 sm:p-5 rounded-[12px] bg-slate-900 border border-alpine-500/40 relative z-20 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-alpine-600 text-white flex items-center justify-center">
                    <CalendarIcon size={14} />
                  </div>
                  <h4 className="text-sm sm:text-base font-sans font-bold text-white">
                    Events on {selectedDayEvents.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedDayEvents(null)}
                  className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Event Cards inside Selected Day */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedDayEvents.events.map((ev) => {
                  const cover = getCardImageUrl(ev.coverImage)
                  const price =
                    ev.pricing?.type === 'paid'
                      ? displayPriceRange(ev.pricing?.ticketTypes, ev.pricing?.priceRange)
                      : 'Free Entry'

                  return (
                    <Link
                      key={ev.id}
                      href={`/app/events/${ev.slug || ev.id}`}
                      className="group flex gap-3 p-2.5 rounded-[10px] bg-slate-950/90 border border-white/10 hover:border-alpine-500 transition-all shadow-sm"
                    >
                      <div className="w-16 h-20 rounded-[6px] overflow-hidden bg-slate-800 shrink-0 relative">
                        {cover ? (
                          <img src={cover} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500">
                            <CalendarIcon size={18} />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-between flex-1 min-w-0">
                        <div>
                          <span className="text-[9px] font-mono uppercase text-alpine-400 font-bold tracking-wider">
                            {ev.tags?.[0] || 'Community Event'}
                          </span>
                          <h5 className="text-xs font-sans font-bold text-white line-clamp-1 group-hover:text-alpine-300 transition-colors">
                            {ev.title}
                          </h5>
                          {ev.location?.location && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate mt-0.5 font-sans">
                              <MapPin size={10} className="shrink-0 text-slate-500" />
                              <span className="truncate">{ev.location.location.split(',')[0]}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-white/10">
                          <span className="text-[10px] font-mono font-bold text-white flex items-center gap-1">
                            <Ticket size={10} className="text-alpine-400" />
                            {price}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-alpine-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            Book <ArrowRight size={10} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Calendar Bottom Strip */}
          <div className="mt-5 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-alpine-500" />
                Featured UK Events
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Confirmed Dates
              </span>
            </div>

            <Link
              href="/app/events"
              className="inline-flex items-center gap-1 text-alpine-400 hover:text-alpine-300 font-semibold"
            >
              <span>Explore Complete Event Directory</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
