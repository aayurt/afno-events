'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BellRing, CheckCircle2, Loader2, PlusCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface EventAlertFallbackProps {
  currentQuery?: string
  currentTag?: string
  isFiltered?: boolean
}

export function EventAlertFallback({ currentQuery, currentTag, isFiltered }: EventAlertFallbackProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !email.includes('@')) return

    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMessage('You\'re on the list! We\'ll alert you as soon as new events drop.')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to subscribe.')
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="space-y-6 my-8">
      {/* 1. Event Alert & Notification Card */}
      <div className="rounded-[12px] bg-alpine-50/70 dark:bg-slate-900 border border-alpine-500/35 dark:border-alpine-400/35 p-6 sm:p-10 shadow-card relative overflow-hidden text-center">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-80 h-80 bg-alpine-500/10 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-80 h-80 bg-alpine-500/5 rounded-full blur-[90px] pointer-events-none" />

        <div className="max-w-xl mx-auto space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-white dark:bg-slate-800 border border-alpine-500/30 text-alpine-700 dark:text-alpine-300 text-xs font-mono font-bold uppercase tracking-wider shadow-xs">
            <BellRing size={13} className="text-alpine-600 animate-pulse" />
            <span>Instant Event Drop Alerts</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-sans font-black tracking-tight text-slate-900 dark:text-slate-100">
            {isFiltered ? 'No Events Matching Your Search Yet' : 'Looking for Upcoming UK Events?'}
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
            New Nepali concerts, cultural festivals, sports tournaments, and club nights are added regularly. Get notified immediately when new tickets drop.
          </p>

          <form onSubmit={handleSubscribe} className="pt-2 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email for drop alerts..."
              required
              className="bg-white dark:bg-slate-800 border-alpine-500/30 focus-visible:ring-alpine-500 h-10 text-xs sm:text-sm font-sans"
            />
            <Button
              type="submit"
              disabled={status === 'loading'}
              className="bg-alpine-600 hover:bg-alpine-700 text-white font-mono font-bold text-xs px-5 h-10 shrink-0 shadow-xs"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 size={13} className="animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                'Notify Me'
              )}
            </Button>
          </form>

          {status === 'success' && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono pt-1">
              <CheckCircle2 size={14} />
              <span>{message}</span>
            </div>
          )}

          {status === 'error' && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-mono pt-1">{message}</p>
          )}

          {isFiltered && (
            <div className="pt-2">
              <Link
                href="/app/events"
                className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-alpine-600 dark:text-alpine-400 hover:underline"
              >
                Clear all filters and view full directory →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 2. Organiser Free Listing Banner */}
      <div className="rounded-[10px] border border-alpine-500/25 bg-white dark:bg-slate-900/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h4 className="font-sans font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
              Are you hosting a community event or concert?
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
            Reach thousands of UK Nepalese attendees. Publish your event, sell zero-fee tickets, and scan attendees with our built-in QR tools.
          </p>
        </div>

        <Link href="/organiser/register" className="shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            className="w-full sm:w-auto border-alpine-500/40 text-alpine-600 hover:text-alpine-700 hover:bg-alpine-50 dark:hover:bg-slate-800 font-mono font-bold text-xs gap-1.5 h-9"
          >
            <PlusCircle size={14} />
            List Event Free
          </Button>
        </Link>
      </div>
    </div>
  )
}
