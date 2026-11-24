'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BellRing, CheckCircle2, Loader2 } from 'lucide-react'

export function NewsletterSection() {
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
        setMessage(data.message || 'Subscribed successfully!')
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
    <div className="rounded-[12px] bg-alpine-50/70 dark:bg-slate-900 border border-alpine-500/30 dark:border-alpine-400/30 p-8 sm:p-12 shadow-card relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-alpine-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-alpine-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-2xl mx-auto text-center space-y-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-white dark:bg-slate-800 border border-alpine-500/30 text-alpine-700 dark:text-alpine-300 text-xs font-mono font-bold uppercase tracking-wider shadow-xs">
          <BellRing size={14} className="text-alpine-600 animate-bounce" />
          Never Miss A Drop
        </div>

        <h2 className="text-3xl sm:text-4xl font-sans font-black tracking-tight text-slate-900 dark:text-slate-100">
          Be the First to Know When UK Events Drop.
        </h2>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
          Get notified for presale access to headline arena concerts, Nepali festivals, and exclusive nightlife across London, Aldershot, and Reading. 1-click unsubscribe anytime.
        </p>

        {status === 'success' ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-[6px] flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono font-semibold text-xs sm:text-sm animate-in fade-in zoom-in-95">
            <CheckCircle2 size={18} />
            <span>{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..."
              required
              className="h-11 rounded-[6px] bg-white dark:bg-slate-800 border-alpine-500/30 px-3.5 text-xs font-mono focus-visible:ring-alpine-500 shadow-xs"
            />
            <Button
              type="submit"
              disabled={status === 'loading'}
              className="h-11 px-6 rounded-[6px] bg-alpine-600 text-white font-mono font-bold text-xs hover:bg-alpine-700 shadow-trail hover:shadow-card shrink-0"
            >
              {status === 'loading' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Notify Me'
              )}
            </Button>
          </form>
        )}

        {status === 'error' && (
          <p className="text-xs font-mono text-rose-500 font-medium">{message}</p>
        )}

        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          We respect your privacy. No spam, only genuine UK community events.
        </p>
      </div>
    </div>
  )
}
