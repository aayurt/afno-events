import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowRight, Calendar, MapPin, Search } from 'lucide-react'
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
    limit: 12,
    depth: 1,
    sort: '-startDatetime',
  })

  const events = result.docs as any[]
  // Choose dominant headliner event (or latest)
  const featuredEvent = events[0]
  const listEvents = events.slice(1, 7)
  const featuredCover = featuredEvent ? getCardImageUrl(featuredEvent.coverImage) : null

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* 🟢 Split-Plane Hero Section */}
      <section className="relative border-b border-border overflow-hidden pt-8 pb-16 lg:py-20">
        {/* Subtle Ambient Glows */}
        <div className="absolute top-1/4 left-1/6 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-secondary/15 rounded-full blur-[130px] pointer-events-none -z-10" />

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
                    <div className="aspect-[4/3] rounded-2xl bg-muted/60 relative overflow-hidden mb-5 border border-border">
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
                        Featured Event
                      </div>
                      <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs font-mono font-bold px-3 py-1 rounded-xl">
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
                      <div className="text-xs font-semibold text-emerald-500">
                        ● Open for Booking
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

      {/* 🟢 Live Trending Grid Section */}
      <section className="py-16 bg-background w-full" id="events">
        <div className="container px-4 sm:px-6 space-y-10">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">Trending Across the UK</h2>
              <p className="text-sm text-muted-foreground mt-1">Confirmed diaspora dates with instant QR passes.</p>
            </div>
            <Link href="/app/events">
              <Button variant="ghost" className="text-xs font-semibold hover:text-primary">
                View All {events.length} Events &rarr;
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listEvents.map((event: any) => {
              const coverUrl = getCardImageUrl(event.coverImage)

              return (
                <Link key={event.id} href={`/app/events/${event.slug || event.id}`}>
                  <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 border-border rounded-2xl bg-card/60 backdrop-blur-sm flex flex-col justify-between h-full">
                    <div>
                      <div className="aspect-[16/10] bg-muted relative overflow-hidden border-b border-border">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Calendar className="w-8 h-8 opacity-20" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-md text-foreground text-xs font-mono font-bold px-3 py-1 rounded-lg border border-border">
                          {event.pricing?.type === 'paid' ? event.pricing.priceRange || 'Paid' : 'Free'}
                        </div>
                      </div>

                      <CardHeader className="p-5 space-y-2">
                        <div className="flex items-center text-xs font-semibold text-primary">
                          <Calendar size={14} className="mr-1.5" />
                          {event.startDatetime
                            ? new Date(event.startDatetime).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Date TBD'}
                        </div>
                        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">
                          {event.title}
                        </CardTitle>
                        {event.location?.location && (
                          <CardDescription className="flex items-center text-xs text-muted-foreground truncate">
                            <MapPin size={14} className="mr-1.5 flex-shrink-0" />
                            {event.location.location.split(',')[0]}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </div>

                    <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t border-border/40 mt-4">
                      <span className="text-xs text-muted-foreground">General Entry</span>
                      <span className="text-xs font-bold text-foreground group-hover:text-primary underline">
                        Tickets &rarr;
                      </span>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>

        </div>
      </section>

      {/* 🟢 Dual Platform & App Showcase (Clean, Anti-slop) */}
      <section className="border-t border-border py-16 bg-muted/20">
        <div className="container px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* For Ticket Buyers */}
          <div className="bg-card border border-border p-8 rounded-3xl flex flex-col justify-between space-y-6">
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-primary font-bold">
                FOR COMMUNITY & FANS
              </span>
              <h3 className="text-2xl font-black mt-2">Get passes straight to your Apple Wallet.</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Never search through spam emails for a ticket PDF again. Download Afno Events on iOS for 1-tap gate scans, attendee circles with friends, and gate location notifications.
              </p>
            </div>
            <div className="flex items-center gap-4 pt-4">
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold text-xs px-6 py-3">
                  Download on App Store
                </Button>
              </a>
              <span className="text-xs text-muted-foreground">Android app in active review</span>
            </div>
          </div>

          {/* For Organisers */}
          <div className="bg-card border border-border p-8 rounded-3xl flex flex-col justify-between space-y-6">
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-secondary font-bold">
                FOR UK ORGANISERS & PROMOTERS
              </span>
              <h3 className="text-2xl font-black mt-2">Promote & sell to 15,000+ UK Nepalis.</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Free event listings, automated Stripe payouts, door scanner app for gate volunteers, and multi-tenant organiser profiles. Start selling in minutes.
              </p>
            </div>
            <div className="flex items-center gap-4 pt-4">
              <Link href="/contact-us">
                <Button size="lg" className="rounded-xl bg-primary text-primary-foreground hover:brightness-110 font-bold text-xs px-6 py-3 shadow-lg shadow-primary/20">
                  Sign Up Your Event
                </Button>
              </Link>
              <Link href="/contact-us" className="text-xs text-muted-foreground hover:text-foreground underline">
                Speak with Team
              </Link>
            </div>
          </div>

        </div>
      </section>

    </div>
  )
}