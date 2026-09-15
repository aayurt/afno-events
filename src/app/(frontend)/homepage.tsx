import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowRight, Calendar, MapPin, Search, Sparkles, ShieldCheck, QrCode } from 'lucide-react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import { getCardImageUrl } from '@/utilities/getCardImageUrl'
import { APP_STORE_URL } from '@/utilities/constants'

export default async function HomePage() {
  const payload = await getPayload({ config: configPromise })

  // 1. Fetch live active events
  const result = await payload.find({
    collection: 'events',
    where: { enabled: { equals: true } },
    limit: 15,
    depth: 1,
    sort: '-startDatetime',
  })

  const events = result.docs as any[]
  const featuredEvent = events[0]
  const marqueeEvents = events.length > 0 ? events : []
  const featuredCover = featuredEvent ? getCardImageUrl(featuredEvent.coverImage) : null

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden selection:bg-primary selection:text-white">
      
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
                  <Input 
                    name="q" 
                    placeholder="Search artist, festival, or venue..." 
                    className="bg-transparent text-sm w-full border-none shadow-none focus-visible:ring-0 p-0 h-9 placeholder:text-muted-foreground/60" 
                  />
                </div>
                <div className="w-full sm:w-44 flex items-center px-3 gap-2 border-b sm:border-b-0 sm:border-r border-border pb-2 sm:pb-0">
                  <MapPin className="text-muted-foreground w-3.5 h-3.5 flex-shrink-0" />
                  <select className="bg-transparent text-xs w-full outline-none text-foreground cursor-pointer">
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
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight">{events.length}+</div>
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

            {/* Right 5 Cols: Spotlight Featured Event Card */}
            {featuredEvent && (
              <div className="lg:col-span-5">
                <Link href={`/app/events/${featuredEvent.slug || featuredEvent.id}`}>
                  <div className="bg-card border border-border/90 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden group hover:border-primary/50 transition-all duration-300">
                    <div className="aspect-[4/3] rounded-2xl bg-muted/60 relative overflow-hidden mb-5 border border-border shadow-inner">
                      {featuredCover ? (
                        <img 
                          src={featuredCover} 
                          alt={featuredEvent.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Calendar className="w-12 h-12 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-[11px] font-extrabold uppercase px-3 py-1 rounded-full shadow-lg">
                        Featured Spotlight
                      </div>
                      <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs font-mono font-bold px-3 py-1 rounded-xl shadow-lg">
                        {featuredEvent.pricing?.type === 'paid' ? featuredEvent.pricing.priceRange || 'Paid' : 'Free Entry'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-primary font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {featuredEvent.startDatetime
                            ? new Date(featuredEvent.startDatetime).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Date TBD'}
                        </span>
                        {featuredEvent.location?.location && (
                          <>
                            <span>&bull;</span>
                            <span className="text-muted-foreground truncate max-w-[180px]">
                              {featuredEvent.location.location.split(',')[0]}
                            </span>
                          </>
                        )}
                      </div>

                      <h2 className="text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {featuredEvent.title}
                      </h2>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {featuredEvent.description || 'Verified Nepalese community event in the UK. Instant mobile QR passes available.'}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                      <div className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Open for Booking</span>
                      </div>
                      <span className="px-5 py-2.5 rounded-xl bg-foreground text-background font-bold text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        Book Tickets &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* 🟢 THE FEATURE: Infinite Smooth-Scrolling Poster Marquee Carousel */}
      <section className="py-14 overflow-hidden relative border-b border-border/80 group">
        
        <div className="container px-4 sm:px-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles size={14} />
              Confirmed Community Calendar
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">Trending Across the UK</h2>
          </div>
          <Link href="/app/events">
            <Button variant="ghost" className="text-xs font-semibold hover:text-primary group">
              Browse Full Catalog 
              <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Gradient edge masks for smooth fade */}
        <div className="absolute top-16 bottom-0 left-0 w-24 sm:w-40 bg-gradient-to-r from-background via-background/80 to-transparent z-20 pointer-events-none" />
        <div className="absolute top-16 bottom-0 right-0 w-24 sm:w-40 bg-gradient-to-l from-background via-background/80 to-transparent z-20 pointer-events-none" />

        {/* Infinite CSS Animation Track */}
        <div className="flex w-max animate-[marquee_35s_linear_infinite] hover:[animation-play-state:paused] gap-6 pl-6">
          
          {/* Repeat set twice for infinite seamless loop */}
          {[...marqueeEvents, ...marqueeEvents].map((event: any, idx: number) => {
            const coverUrl = getCardImageUrl(event.coverImage)

            return (
              <Link 
                key={`${event.id}-${idx}`} 
                href={`/app/events/${event.slug || event.id}`}
                className="w-64 sm:w-72 h-[410px] rounded-3xl overflow-hidden bg-card border border-border/80 shrink-0 relative group shadow-xl hover:border-primary/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Poster Artwork Window */}
                <div className="relative w-full h-[250px] overflow-hidden bg-muted">
                  {coverUrl ? (
                    <img 
                      src={coverUrl} 
                      alt={event.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Calendar className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-white text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-white/10">
                    {event.pricing?.type === 'paid' ? event.pricing.priceRange || 'Paid' : 'Free'}
                  </div>
                </div>

                {/* Event Information */}
                <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-primary flex items-center gap-1">
                      <Calendar size={12} />
                      <span>
                        {event.startDatetime
                          ? new Date(event.startDatetime).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                            })
                          : 'Upcoming'}
                      </span>
                      {event.location?.location && (
                        <>
                          <span>&bull;</span>
                          <span className="text-muted-foreground truncate max-w-[130px]">
                            {event.location.location.split(',')[0]}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 mt-1 leading-snug">
                      {event.title}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Get Pass</span>
                    <span className="font-bold text-foreground group-hover:text-primary underline">
                      Tickets &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}

        </div>
      </section>

      {/* 🟢 Dual Platform & App Showcase (Exact Requested Copy & Hierarchy) */}
      <section className="py-20 bg-muted/20">
        <div className="container px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* FOR COMMUNITY & FANS */}
          <div className="bg-card border border-border p-8 sm:p-10 rounded-[2.5rem] flex flex-col justify-between space-y-8 shadow-lg hover:border-primary/40 transition-all">
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
          <div className="bg-card border border-border p-8 sm:p-10 rounded-[2.5rem] flex flex-col justify-between space-y-8 shadow-lg hover:border-secondary/40 transition-all">
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
      </section>

    </div>
  )
}