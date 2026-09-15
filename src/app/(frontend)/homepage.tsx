import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowRight, Calendar, MapPin, Search, Sparkles, ShieldCheck, QrCode } from 'lucide-react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import { getCardImageUrl } from '@/utilities/getCardImageUrl'
import { APP_STORE_URL } from '@/utilities/constants'
import { NewsletterSection } from '@/components/NewsletterSection'

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
    <div className="flex flex-col min-h-screen overflow-x-hidden selection:bg-primary selection:text-white">
      
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

      {/* 🟢 Split-Hero: Left Brand/Search & Right Spotlight Card */}
      <section className="relative border-b border-border/80 overflow-hidden pt-8 pb-16 lg:py-20">
        {/* Subtle Ambient Radial Brand Glows */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/15 rounded-full blur-[150px] pointer-events-none -z-10" />
        <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-secondary/20 rounded-full blur-[140px] pointer-events-none -z-10" />

        <div className="container px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left 7 Cols: Brand Message, Search Bar, Community Stats */}
            <div className="lg:col-span-7 space-y-8 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                The Home for UK Nepalese Events
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08]">
                  Elevate Your Events. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-rose-400 to-secondary">
                    Connect the Community.
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
                  Bringing Nepali concerts, cultural gatherings, summer festivals, and club nights across Britain into one verified ticketing platform.
                </p>
              </div>

              {/* Integrated Search Box */}
              <form action="/app/events" method="GET" className="bg-card border border-border p-2.5 rounded-2xl shadow-xl flex flex-col sm:flex-row gap-2 max-w-xl">
                <div className="flex-1 flex items-center px-3 gap-2 border-b sm:border-b-0 sm:border-r border-border pb-2 sm:pb-0">
                  <Search className="text-muted-foreground w-4 h-4 flex-shrink-0" />
                  <input 
                    type="text"
                    name="q" 
                    placeholder="Search artist, festival, or venue..." 
                    className="bg-transparent text-sm w-full border-0 outline-none focus:outline-none focus:ring-0 focus:border-0 p-0 h-9 placeholder:text-muted-foreground/60 text-foreground shadow-none ring-0 appearance-none" 
                  />
                </div>
                <div className="w-full sm:w-44 flex items-center px-3 gap-2 border-b sm:border-b-0 sm:border-r border-border pb-2 sm:pb-0">
                  <MapPin className="text-muted-foreground w-3.5 h-3.5 flex-shrink-0" />
                  <select className="bg-transparent text-xs w-full border-0 outline-none focus:outline-none focus:ring-0 focus:border-0 text-foreground cursor-pointer appearance-none shadow-none ring-0">
                    <option className="bg-card">All UK Cities</option>
                    <option className="bg-card">London</option>
                    <option className="bg-card">Aldershot</option>
                    <option className="bg-card">Reading</option>
                    <option className="bg-card">Wembley</option>
                  </select>
                </div>
                <Button type="submit" className="bg-primary text-primary-foreground font-bold text-xs px-6 py-2.5 rounded-xl hover:brightness-110 shadow-md shadow-primary/20 transition-all flex-shrink-0">
                  Find Events
                </Button>
              </form>

              {/* Verified Metrics Strip */}
              <div className="grid grid-cols-3 gap-6 pt-4 border-t border-border/80 max-w-xl">
                <div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight">{marqueeEvents.length}+</div>
                  <div className="text-xs text-muted-foreground uppercase font-medium mt-0.5">Live Events</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight">8</div>
                  <div className="text-xs text-muted-foreground uppercase font-medium mt-0.5">UK Cities</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-primary">0%</div>
                  <div className="text-xs text-muted-foreground uppercase font-medium mt-0.5">Listing Fee</div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Nearest Bookable Event Spotlight Card in the image's sleek full-bleed style */}
            {featuredEvent && (
              <div className="lg:col-span-5">
                <Link href={`/app/events/${featuredEvent.slug || featuredEvent.id}`}>
                  <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] rounded-[2rem] overflow-hidden border border-primary/50 shadow-2xl group cursor-pointer bg-card hover:border-primary transition-all duration-300">
                    
                    {/* Full-bleed background poster */}
                    {featuredCover ? (
                      <img 
                        src={featuredCover} 
                        alt={featuredEvent.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Calendar className="w-16 h-16 text-muted-foreground/40" />
                      </div>
                    )}

                    {/* Gradient scrim overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

                    {/* Top status badges */}
                    <div className="absolute top-5 left-5 flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-lg">
                        {featuredIsBookable ? 'Featured Spotlight' : featuredIsExpired ? 'Past Event' : 'Featured'}
                      </span>
                    </div>

                    {/* Bottom-aligned metadata & typography directly matching the design */}
                    <div className="absolute inset-x-0 bottom-0 p-6 space-y-1.5 text-left">
                      {/* Coral-red metadata line: [DAY MONTH] • [LOCATION] */}
                      <div className="text-xs font-bold uppercase tracking-wider text-[#FF2A55] flex items-center gap-1.5 drop-shadow-md">
                        <span>
                          {featuredEvent.startDatetime
                            ? new Date(featuredEvent.startDatetime).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                              }).toUpperCase()
                            : 'DATE TBD'}
                        </span>
                        {featuredEvent.location?.location && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">
                              {featuredEvent.location.location.split(',')[0].toUpperCase()}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Heavy, clean title */}
                      <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow-md group-hover:text-gray-200 transition-colors">
                        {featuredEvent.title}
                      </h2>

                      {/* Clean inline price & booking status */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm font-semibold text-gray-200 font-mono drop-shadow-sm">
                          {featuredEvent.pricing?.type === 'paid' ? featuredEvent.pricing.priceRange || 'Paid' : 'Free Entry'}
                        </span>

                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Open for Booking →
                        </span>
                      </div>
                    </div>

                  </div>
                </Link>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* 🟢 THE FEATURE: Infinite Smooth-Scrolling Poster Marquee Carousel in the exact image card style */}
      <section className="py-14 overflow-hidden relative border-b border-border/80 group">
        
        <div className="container px-4 sm:px-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles size={14} />
              Confirmed Community Calendar
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Trending Across the UK</h2>
          </div>
          <Link href="/app/events">
            <Button variant="ghost" className="text-xs font-semibold hover:text-primary group">
              Browse Full Catalog 
              <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Subtle Edge Mask Gradients */}
        <div className="absolute top-16 bottom-0 left-0 w-24 sm:w-40 bg-gradient-to-r from-background via-background/80 to-transparent z-20 pointer-events-none" />
        <div className="absolute top-16 bottom-0 right-0 w-24 sm:w-40 bg-gradient-to-l from-background via-background/80 to-transparent z-20 pointer-events-none" />

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
                className="w-64 sm:w-72 h-[380px] sm:h-[420px] rounded-2xl sm:rounded-[1.4rem] overflow-hidden shrink-0 relative group shadow-2xl transition-all duration-300 cursor-pointer border border-border hover:border-primary/70 hover:scale-[1.02]"
              >
                {/* Full-bleed poster image */}
                {coverUrl ? (
                  <img 
                    src={coverUrl} 
                    alt={event.title} 
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${expired ? 'grayscale contrast-75 opacity-60' : ''}`} 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-card">
                    <Calendar className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}

                {/* Dark gradient scrim at the bottom (matches screenshot gradient) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-5 flex flex-col justify-end pointer-events-none" />

                {/* Bottom-aligned text content */}
                <div className="absolute inset-x-0 bottom-0 p-5 space-y-1 text-left z-10">
                  {/* Meta line: Date • Location in bright coral-red */}
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#FF2A55] drop-shadow-md">
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
                  <h3 className="text-lg font-black text-white leading-tight drop-shadow-md group-hover:text-gray-200 transition-colors line-clamp-2">
                    {event.title}
                  </h3>

                  {/* Clean unbadged price or status text */}
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-300 drop-shadow-sm">
                      {expired 
                        ? 'Expired' 
                        : event.pricing?.type === 'paid' 
                          ? event.pricing.priceRange || 'Paid' 
                          : 'Free'}
                    </span>

                    {bookable && (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Book →
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtle top badge if expired */}
                {expired && (
                  <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-muted-foreground text-[10px] font-mono px-2 py-0.5 rounded border border-white/10">
                    Past
                  </div>
                )}
              </Link>
            )
          })}

        </div>
      </section>

      {/* 🟢 Dual Platform & App Showcase */}
      <section className="py-20 bg-muted/20">
        <div className="container px-4 sm:px-6 space-y-16">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* FOR COMMUNITY & FANS */}
            <div className="bg-card text-card-foreground border border-border p-8 sm:p-10 rounded-[2.5rem] flex flex-col justify-between space-y-8 shadow-lg hover:border-primary/40 transition-all">
              <div className="space-y-4">
                <span className="text-xs uppercase font-mono tracking-widest text-primary font-bold flex items-center gap-2">
                  <QrCode size={16} />
                  FOR COMMUNITY & FANS
                </span>
                <h3 className="text-3xl font-black tracking-tight text-foreground">
                  Get passes straight to your Apple Wallet.
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Never search through spam emails for a ticket PDF again. Download Afno Events on iOS for 1-tap gate scans, attendee circles with friends, and gate location notifications.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t border-border/70">
                <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold text-xs px-8 py-3.5 hover:scale-105 active:scale-95 transition-all shadow-md">
                    Download on App Store
                  </Button>
                </a>
                <span className="text-xs text-muted-foreground font-medium">
                  Android app in active review
                </span>
              </div>
            </div>

            {/* FOR UK ORGANISERS & PROMOTERS */}
            <div className="bg-card text-card-foreground border border-border p-8 sm:p-10 rounded-[2.5rem] flex flex-col justify-between space-y-8 shadow-lg hover:border-secondary/40 transition-all">
              <div className="space-y-4">
                <span className="text-xs uppercase font-mono tracking-widest text-secondary font-bold flex items-center gap-2">
                  <ShieldCheck size={16} />
                  FOR UK ORGANISERS & PROMOTERS
                </span>
                <h3 className="text-3xl font-black tracking-tight text-foreground">
                  Promote & sell to 15,000+ UK Nepalis.
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Free event listings, automated Stripe payouts, door scanner app for gate volunteers, and multi-tenant organiser profiles. Start selling in minutes.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t border-border/70">
                <Link href="/contact-us">
                  <Button size="lg" className="rounded-xl bg-primary text-primary-foreground hover:brightness-110 font-bold text-xs px-8 py-3.5 shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all">
                    Sign Up Your Event
                  </Button>
                </Link>
                <Link href="/contact-us" className="text-xs text-muted-foreground hover:text-foreground font-medium underline">
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