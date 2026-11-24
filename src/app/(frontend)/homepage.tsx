import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowRight, Calendar, MapPin, Search, Sparkles, ShieldCheck, QrCode, Ticket } from 'lucide-react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import { getCardImageUrl } from '@/utilities/getCardImageUrl'
import { displayPriceRange } from '@/utilities/pricing'
import { APP_STORE_URL } from '@/utilities/constants'
import { NewsletterSection } from '@/components/NewsletterSection'
import { Afno3DPass } from './afno-3d-pass'

export default async function HomePage() {
  const payload = await getPayload({ config: configPromise })

  // 1. Fetch only enabled events
  const result = await payload.find({
    collection: 'events',
    where: { 
      enabled: { equals: true },
    },
    limit: 30,
    depth: 1,
    sort: 'startDatetime',
  })

  const allEvents = result.docs as any[]
  const nowMs = Date.now()

  // Helper to check whether an event is bookable (not expired and isBookable !== false)
  const isEventBookable = (ev: any) => {
    const eventTime = ev.startDatetime ? new Date(ev.startDatetime).getTime() : 0
    const isExpired = eventTime > 0 && eventTime < nowMs
    const bookableFlag = ev.isBookable ?? true
    return !isExpired && bookableFlag
  }

  // Helper to check whether an event is expired
  const isEventExpired = (ev: any) => {
    const eventTime = ev.startDatetime ? new Date(ev.startDatetime).getTime() : 0
    return eventTime > 0 && eventTime < nowMs
  }

  // Sort events chronologically: nearest upcoming first
  const sortedEvents = [...allEvents].sort((a, b) => {
    const timeA = a.startDatetime ? new Date(a.startDatetime).getTime() : Infinity
    const timeB = b.startDatetime ? new Date(b.startDatetime).getTime() : Infinity
    return timeA - timeB
  })

  // Upcoming bookable events (future + isBookable: true)
  const upcomingBookableEvents = sortedEvents.filter(isEventBookable)

  // Spotlight shows strictly the NEAREST BOOKABLE event (fallback to first event if none bookable)
  const featuredEvent = upcomingBookableEvents[0] || sortedEvents[0]
  const marqueeEvents = sortedEvents

  const featuredCover = featuredEvent ? getCardImageUrl(featuredEvent.coverImage) : null
  const featuredIsBookable = featuredEvent ? isEventBookable(featuredEvent) : false
  const featuredIsExpired = featuredEvent ? isEventExpired(featuredEvent) : false

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-white dark:bg-slate-950 selection:bg-primary selection:text-white">
      
      {/* Inline CSS animation for the infinite marquee */}
      <style>{`
        @keyframes marqueeScroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-track {
          display: flex;
          width: max-content;
          animation: marqueeScroll 45s linear infinite;
        }
        .animate-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* 🟢 Hero Section: Top Headline & Search + Wide 3D Afno VIP Pass Showcase */}
      <section className="relative border-b border-alpine-500/20 dark:border-alpine-400/20 overflow-hidden pt-8 pb-16 lg:py-20 bg-white dark:bg-slate-950">
        {/* Subtle Ambient Radial Brand Glows */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-alpine-500/10 rounded-full blur-[150px] pointer-events-none -z-10" />
        <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-alpine-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />

        <div className="container px-4 sm:px-6">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-alpine-50 dark:bg-alpine-950/50 border border-alpine-500/30 text-alpine-700 dark:text-alpine-300 text-xs font-mono font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-alpine-500 animate-pulse" />
              Official Digital Ticketing & Verified Passes
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-sans font-black tracking-tight leading-[1.08] text-slate-900 dark:text-slate-100">
                Elevate Your Events. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-alpine-600 via-rose-500 to-alpine-500">
                  Connect the Community.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl font-sans mx-auto">
                Bringing Nepali concerts, cultural festivals, live sports, and community gatherings across the UK into one verified, transparent pass platform.
              </p>
            </div>

            {/* Integrated Search Box — light blush background with white inputs */}
            <div className="space-y-3 w-full max-w-2xl">
              <form action="/app/events" method="GET" className="bg-alpine-50/70 dark:bg-slate-900 border border-alpine-500/35 dark:border-alpine-400/35 p-2 rounded-[8px] shadow-card flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center px-3 gap-2 bg-white dark:bg-slate-800 rounded-[6px] border border-alpine-500/20 py-1.5 sm:py-0">
                  <Search className="text-alpine-600 dark:text-alpine-400 w-4 h-4 flex-shrink-0" />
                  <input 
                    type="text"
                    name="q" 
                    placeholder="Search artist, festival, or venue..." 
                    className="bg-transparent text-xs sm:text-sm w-full border-0 outline-none focus:outline-none focus:ring-0 focus:border-0 p-0 h-9 placeholder:text-slate-400 text-slate-900 dark:text-slate-100 shadow-none ring-0 appearance-none font-sans" 
                  />
                </div>
                <div className="w-full sm:w-44 flex items-center px-3 gap-2 bg-white dark:bg-slate-800 rounded-[6px] border border-alpine-500/20 py-1.5 sm:py-0">
                  <MapPin className="text-alpine-600 dark:text-alpine-400 w-3.5 h-3.5 flex-shrink-0" />
                  <select name="city" className="bg-transparent text-xs w-full border-0 outline-none focus:outline-none focus:ring-0 focus:border-0 text-slate-800 dark:text-slate-200 cursor-pointer appearance-none shadow-none ring-0 font-sans">
                    <option value="" className="bg-white dark:bg-slate-900">All UK Cities</option>
                    <option value="London" className="bg-white dark:bg-slate-900">London</option>
                    <option value="Aldershot" className="bg-white dark:bg-slate-900">Aldershot</option>
                    <option value="Reading" className="bg-white dark:bg-slate-900">Reading</option>
                    <option value="Wembley" className="bg-white dark:bg-slate-900">Wembley</option>
                    <option value="Farnborough" className="bg-white dark:bg-slate-900">Farnborough</option>
                    <option value="Ashford" className="bg-white dark:bg-slate-900">Ashford</option>
                  </select>
                </div>
                <Button type="submit" className="bg-alpine-600 hover:bg-alpine-700 text-white font-mono font-bold text-xs px-6 py-2.5 rounded-[6px] shadow-trail hover:shadow-card-hover transition-all flex-shrink-0 h-10">
                  Find Events
                </Button>
              </form>

              {/* Interactive Quick City Filter Tag Bar */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[11px] font-mono uppercase text-muted-foreground tracking-wider mr-1">
                  Popular:
                </span>
                {[
                  { name: 'London', query: 'London' },
                  { name: 'Aldershot', query: 'Aldershot' },
                  { name: 'Reading', query: 'Reading' },
                  { name: 'Wembley', query: 'Wembley' },
                  { name: 'Farnborough', query: 'Farnborough' },
                ].map((city) => (
                  <Link
                    key={city.name}
                    href={`/app/events?q=${encodeURIComponent(city.query)}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-white/80 dark:bg-slate-800/80 hover:bg-alpine-50 dark:hover:bg-slate-700 border border-alpine-500/25 text-slate-700 dark:text-slate-300 hover:text-alpine-600 dark:hover:text-alpine-400 font-mono text-[11px] tracking-wide transition-all shadow-xs"
                  >
                    <MapPin size={10} className="text-alpine-500" />
                    {city.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Verified Metrics Strip */}
            <div className="grid grid-cols-3 gap-8 sm:gap-14 pt-4 border-t border-alpine-500/20 w-full max-w-xl">
              <div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">{marqueeEvents.length}+</div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold mt-0.5">Live Events</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">8</div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold mt-0.5">UK Cities</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-alpine-600 dark:text-alpine-400 tabular-nums">0%</div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold mt-0.5">Listing Fee</div>
              </div>
            </div>

            {/* 3D Interactive Holographic Brand Pass Showcase */}
            <div className="w-full pt-4">
              <Afno3DPass />
            </div>

          </div>
        </div>
      </section>

      {/* 🟢 THE FEATURE: Infinite Smooth-Scrolling Poster Marquee Carousel */}
      <section className="py-14 overflow-hidden relative border-b border-alpine-500/20 dark:border-alpine-400/20 group bg-white dark:bg-slate-950">
        
        <div className="container px-4 sm:px-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-alpine-600 dark:text-alpine-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
              <Sparkles size={14} />
              Confirmed Community Calendar
            </div>
            <h2 className="text-3xl font-sans font-black tracking-tight text-slate-900 dark:text-slate-100">Trending Across the UK</h2>
          </div>
          <Link href="/app/events">
            <Button variant="ghost" className="text-xs font-mono font-semibold text-alpine-600 dark:text-alpine-400 hover:text-alpine-700 hover:bg-alpine-50 dark:hover:bg-slate-800 rounded-[4px] group">
              Browse Full Catalog 
              <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Subtle Edge Mask Gradients */}
        <div className="absolute top-16 bottom-0 left-0 w-24 sm:w-40 bg-gradient-to-r from-white dark:from-slate-950 via-white/80 dark:via-slate-950/80 to-transparent z-20 pointer-events-none" />
        <div className="absolute top-16 bottom-0 right-0 w-24 sm:w-40 bg-gradient-to-l from-white dark:from-slate-950 via-white/80 dark:via-slate-950/80 to-transparent z-20 pointer-events-none" />

        {/* Infinite Moving Marquee Track */}
        <div className="animate-marquee-track gap-5 pl-6">
          
          {/* Repeat set 3x to guarantee seamless infinite movement across all viewport sizes */}
          {[...marqueeEvents, ...marqueeEvents, ...marqueeEvents].map((event: any, idx: number) => {
            const coverUrl = getCardImageUrl(event.coverImage)
            const bookable = isEventBookable(event)
            const expired = isEventExpired(event)

            return (
              <Link 
                key={`${event.id}-${idx}`} 
                href={`/app/events/${event.slug || event.id}`}
                className="w-64 sm:w-72 h-[380px] sm:h-[420px] rounded-[10px] overflow-hidden shrink-0 relative group shadow-card transition-all duration-300 cursor-pointer border border-alpine-500/35 dark:border-alpine-400/35 hover:border-alpine-500 hover:shadow-card-hover hover:scale-[1.02]"
              >
                {/* Full-bleed poster image */}
                {coverUrl ? (
                  <img 
                    src={coverUrl} 
                    alt={event.title} 
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${expired ? 'grayscale contrast-75 opacity-60' : ''}`} 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-alpine-50 dark:bg-slate-900">
                    <Calendar className="w-12 h-12 text-alpine-400/30" />
                  </div>
                )}

                {/* Dark gradient scrim at the bottom (matches screenshot gradient) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-5 flex flex-col justify-end pointer-events-none" />

                {/* Bottom-aligned text content */}
                <div className="absolute inset-x-0 bottom-0 p-5 space-y-1 text-left z-10">
                  {/* Meta line: Date • Location in bright alpine crimson */}
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-alpine-400 drop-shadow-md">
                    <span>
                      {event.startDatetime
                        ? new Date(event.startDatetime).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          }).toUpperCase()
                        : 'UPCOMING'}
                    </span>
                    {event.location?.location && (
                      <>
                        <span> • </span>
                        <span>{event.location.location.split(',')[0].toUpperCase()}</span>
                      </>
                    )}
                  </div>

                  {/* High-contrast bold title */}
                  <h3 className="text-lg font-sans font-black text-white leading-tight drop-shadow-md group-hover:text-gray-200 transition-colors line-clamp-2">
                    {event.title}
                  </h3>

                  {/* Clean unbadged price or status text */}
                  <div className="pt-1 flex items-center justify-between border-t border-white/10">
                    <span className="text-xs font-mono font-bold text-gray-200 drop-shadow-sm">
                      {expired 
                        ? 'Expired' 
                        : event.pricing?.type === 'paid' 
                          ? displayPriceRange(event.pricing?.ticketTypes, event.pricing?.priceRange)
                          : 'Free'}
                    </span>

                    {bookable && (
                      <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Book →
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtle top badge if expired */}
                {expired && (
                  <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-[3px] border border-white/10">
                    Past
                  </div>
                )}
              </Link>
            )
          })}

        </div>
      </section>

      {/* 🟢 Dual Platform & App Showcase — White Canvas with Light Blush Cards */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="container px-4 sm:px-6 space-y-16">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* FOR COMMUNITY & FANS */}
            <div className="bg-alpine-50/60 dark:bg-slate-900 border border-alpine-500/25 dark:border-alpine-400/25 p-8 sm:p-10 rounded-[12px] flex flex-col justify-between space-y-8 shadow-card hover:shadow-card-hover hover:border-alpine-500/50 transition-all">
              <div className="space-y-4">
                <span className="text-xs uppercase font-mono tracking-widest text-alpine-600 dark:text-alpine-400 font-bold flex items-center gap-2">
                  <QrCode size={16} />
                  FOR COMMUNITY & FANS
                </span>
                <h3 className="text-2xl sm:text-3xl font-sans font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Get passes straight to your Apple Wallet.
                </h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                  Never search through spam emails for a ticket PDF again. Download Afno Events on iOS for 1-tap gate scans, attendee circles with friends, and gate location notifications.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t border-alpine-500/15">
                <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="rounded-[4px] bg-slate-900 text-white hover:bg-slate-800 font-mono font-bold text-xs px-6 py-3 transition-all shadow-trail hover:shadow-card">
                    Download on App Store
                  </Button>
                </a>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Android app in active review
                </span>
              </div>
            </div>

            {/* FOR UK ORGANISERS & PROMOTERS */}
            <div className="bg-alpine-50/60 dark:bg-slate-900 border border-alpine-500/25 dark:border-alpine-400/25 p-8 sm:p-10 rounded-[12px] flex flex-col justify-between space-y-8 shadow-card hover:shadow-card-hover hover:border-alpine-500/50 transition-all">
              <div className="space-y-4">
                <span className="text-xs uppercase font-mono tracking-widest text-alpine-600 dark:text-alpine-400 font-bold flex items-center gap-2">
                  <ShieldCheck size={16} />
                  FOR UK ORGANISERS & PROMOTERS
                </span>
                <h3 className="text-2xl sm:text-3xl font-sans font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Promote & sell to 15,000+ UK Nepalis.
                </h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                  Free event listings, automated Stripe payouts, door scanner app for gate volunteers, and multi-tenant organiser profiles. Start selling in minutes.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t border-alpine-500/15">
                <Link href="/organiser/events/new">
                  <Button size="lg" className="rounded-[4px] bg-alpine-600 text-white hover:bg-alpine-700 font-mono font-bold text-xs px-6 py-3 shadow-trail hover:shadow-card transition-all">
                    Sign Up Your Event
                  </Button>
                </Link>
                <Link href="/contact-us" className="text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-alpine-600 dark:hover:text-alpine-400 transition-colors underline">
                  Speak with Team
                </Link>
              </div>
            </div>
          </div>

          {/* 🟢 Newsletter & Event Drop Alerts */}
          <NewsletterSection />

        </div>
      </section>

    </div>
  )
}