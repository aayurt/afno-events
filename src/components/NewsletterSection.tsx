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
    <div className="rounded-[2.5rem] bg-gradient-to-r from-card via-card/90 to-card border border-border/80 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-secondary/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-2xl mx-auto text-center space-y-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <BellRing size={14} className="animate-bounce" />
          Never Miss A Drop
        </div>

        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Be the First to Know When UK Events Drop.
        </h2>

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Get notified for presale access to headline arena concerts, Nepali festivals, and exclusive nightlife across London, Aldershot, and Reading. 1-click unsubscribe anytime.
        </p>

        {status === 'success' ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center gap-2 text-emerald-500 font-semibold text-sm animate-in fade-in zoom-in-95">
            <CheckCircle2 size={18} />
            <span>{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..."
              required
              className="h-12 rounded-xl bg-background/80 border-border px-4 text-sm focus-visible:ring-primary shadow-inner"
            />
            <Button
              type="submit"
              disabled={status === 'loading'}
              className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:brightness-110 shadow-lg shadow-primary/25 shrink-0"
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
          <p className="text-xs text-rose-500 font-medium">{message}</p>
        )}

        <p className="text-[11px] text-muted-foreground/70">
          We respect your privacy. No spam, only genuine UK community events.
        </p>
      </div>
    </div>
  )
}
