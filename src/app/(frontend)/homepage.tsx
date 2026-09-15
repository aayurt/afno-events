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
    limit: 12,
    depth: 1,
    sort: '-startDatetime',
  })

  const events = result.docs as any[]
  const featuredEvent = events[0]
  const listEvents = events.slice(1, 7)
  const featuredCover = featuredEvent ? getCardImageUrl(featuredEvent.coverImage) : null

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden selection:bg-primary selection:text-white">
      
      {/* 🟢 Split-Hero with Cinematic Background Video & Crisp Foreground Spotlight */}
      <section className="relative min-h-[92vh] flex items-center border-b border-border/80 overflow-hidden py-16 lg:py-24">
        
        {/* Full-Bleed Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none filter brightness-[0.28] contrast-[1.1] scale-105"
        >
          <source src="/video/afno-diverse.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Multi-layered Vignette & Brand Gradients for Readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/60 z-0 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60 z-0 pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[160px] pointer-events-none z-0 animate-pulse duration-1000" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-secondary/25 rounded-full blur-[150px] pointer-events-none z-0" />

        <div className="container px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left 7 Cols: Brand Message, Interactive Search Bar, Community Stats */}
            <div className="lg:col-span-7 space-y-8 text-left">
              
              {/* Badge with subtle glowing border */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-primary/40 text-primary text-xs font-bold uppercase tracking-wider shadow-lg hover:scale-105 transition-transform duration-300">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span>The Home for UK Nepalese Events</span>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] text-white">
                  Experience the <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-rose-300 to-blue-400 drop-shadow-sm">
                    Energy & Community.
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-gray-300 leading-relaxed max-w-xl">
                  Bringing Nepali concerts, cultural festivals, sports, and club nights across the UK into one verified ticketing platform. Direct Apple Wallet passes, live gate scans, and 0% listing fee.
                </p>
              </div>

              {/* Integrated High-Contrast Search Box */}
              <form action="/app/events" method="GET" className="bg-card/90 backdrop-blur-xl border border-white/15 p-2.5 rounded-2xl shadow-2xl flex flex-col sm:flex-row gap-2 max-w-xl hover:border-primary/50 transition-colors">
                <div className="flex-1 flex items-center px-3 gap-2 border-b sm:border-b-0 sm:border-r border-border/80 pb-2 sm:pb-0">
                  <Search className="text-muted-foreground w-4 h-4 flex-shrink-0" />
                  <Input 
                    name="q" 
                    placeholder="Search artist, festival, or venue..." 
                    className="bg-transparent text-sm w-full border-none shadow-none focus-visible:ring-0 p-0 h-9 placeholder:text-muted-foreground/60 text-foreground" 
                  />
                </div>
                <div className="w-full sm:w-44 flex items-center px-3 gap-2 border-b sm:border-b-0 sm:border-r border-border/80 pb-2 sm:pb-0">
                  <MapPin className="text-muted-foreground w-3.5 h-3.5 flex-shrink-0" />
                  <select className="bg-transparent text-xs w-full outline-none text-foreground cursor-pointer">
                    <option className="bg-card">All UK Cities</option>
                    <option className="bg-card">London</option>
                    <option className="bg-card">Aldershot</option>
                    <option className="bg-card">Reading</option>
                    <option className="bg-card">Wembley</option>
                  </select>
                </div>
                <Button type="submit" className="bg-primary text-primary-foreground font-bold text-xs px-6 py-2.5 rounded-xl hover:scale-105 active:scale-95 shadow-lg shadow-primary/40 transition-all flex-shrink-0">
                  Find Events
                </Button>
              </form>

              {/* Verified Metrics Strip */}
              <div className="grid grid-cols-3 gap-6 pt-4 border-t border-white/10 max-w-xl">
                <div className="group cursor-default">
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white group-hover:text-primary transition-colors">{events.length}+</div>
                  <div className="text-xs text-gray-400 uppercase font-medium mt-0.5">Live Events</div>
                </div>
                <div className="group cursor-default">
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white group-hover:text-blue-400 transition-colors">8</div>
                  <div className="text-xs text-gray-400 uppercase font-medium mt-0.5">UK Cities</div>
                </div>
                <div className="group cursor-default">
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-primary">0%</div>
                  <div className="text-xs text-gray-400 uppercase font-medium mt-0.5">Listing Fee</div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Spotlight Featured Event Card with Real Poster Image */}
            {featuredEvent && (
              <div className="lg:col-span-5">
                <div className="relative group">
                  
                  {/* Subtle animated border aura */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 to-secondary/40 rounded-[2.7rem] blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  <Link href={`/app/events/${featuredEvent.slug || featuredEvent.id}`}>
                    <div className="relative bg-card/95 backdrop-blur-xl border border-white/15 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden group-hover:border-primary/50 transition-all duration-300">
                      
                      {/* Event Poster Image Window */}
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
                          Headliner Spotlight
                        </div>

                        <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-mono font-bold px-3 py-1.5 rounded-xl shadow-lg">
                          {featuredEvent.pricing?.type === 'paid' ? featuredEvent.pricing.priceRange || 'From £35' : 'Free Entry'}
                        </div>
                      </div>

                      {/* Event Information */}
                      <div className="space-y-2.5 text-left">
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

                        <h2 className="text-2xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {featuredEvent.title}
                        </h2>

                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {featuredEvent.description || 'Experience the UK Nepalese diaspora live concert. Instant QR digital passes delivered directly to your device.'}
                        </p>
                      </div>

                      {/* Bottom Status & CTA */}
                      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                        <div className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Open for Booking</span>
                        </div>
                        <span className="px-5 py-2.5 rounded-xl bg-foreground text-background font-bold text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-md">
                          Book Tickets &rarr;
                        </span>
                      </div>

                    </div>
                  </Link>

                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* 🟢 Live Trending Grid Section with Hover Lift */}
      <section className="py-16 bg-background w-full" id="events">
        <div className="container px-4 sm:px-6 space-y-10">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
                <Sparkles size={14} />
                Featured Schedule
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Trending Across the UK</h2>
            </div>
            <Link href="/app/events">
              <Button variant="ghost" className="text-xs font-semibold hover:text-primary group">
                View All {events.length} Events 
                <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listEvents.map((event: any) => {
              const coverUrl = getCardImageUrl(event.coverImage)

              return (
                <Link key={event.id} href={`/app/events/${event.slug || event.id}`} className="group block">
                  <Card className="overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 border-border rounded-2xl bg-card/60 backdrop-blur-sm flex flex-col justify-between h-full group-hover:border-primary/40">
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

                      <CardHeader className="p-5 space-y-2 text-left">
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

      {/* 🟢 Dual Platform & App Showcase */}
      <section className="border-t border-border py-16 bg-muted/20">
        <div className="container px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* For Ticket Buyers */}
          <div className="bg-card border border-border p-8 rounded-3xl flex flex-col justify-between space-y-6 hover:shadow-xl hover:border-border/80 transition-all">
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-primary font-bold flex items-center gap-2">
                <QrCode size={16} />
                FOR COMMUNITY & FANS
              </span>
              <h3 className="text-2xl font-black mt-3">Get passes straight to your Apple Wallet.</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Never search through spam emails for a ticket PDF again. Download Afno Events on iOS for 1-tap gate scans, attendee circles with friends, and gate location notifications.
              </p>
            </div>
            <div className="flex items-center gap-4 pt-4">
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold text-xs px-6 py-3 hover:scale-105 active:scale-95 transition-all">
                  Download on App Store
                </Button>
              </a>
              <span className="text-xs text-muted-foreground">Android app in active review</span>
            </div>
          </div>

          {/* For Organisers */}
          <div className="bg-card border border-border p-8 rounded-3xl flex flex-col justify-between space-y-6 hover:shadow-xl hover:border-border/80 transition-all">
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-secondary font-bold flex items-center gap-2">
                <ShieldCheck size={16} />
                FOR UK ORGANISERS & PROMOTERS
              </span>
              <h3 className="text-2xl font-black mt-3">Promote & sell to 15,000+ UK Nepalis.</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Free event listings, automated Stripe payouts, door scanner app for gate volunteers, and multi-tenant organiser profiles. Start selling in minutes.
              </p>
            </div>
            <div className="flex items-center gap-4 pt-4">
              <Link href="/contact-us">
                <Button size="lg" className="rounded-xl bg-primary text-primary-foreground hover:brightness-110 font-bold text-xs px-6 py-3 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
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