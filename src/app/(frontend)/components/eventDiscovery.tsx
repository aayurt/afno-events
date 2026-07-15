import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Calendar, MapPin, Search } from 'lucide-react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'

export default async function EventDiscovery() {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'events',
    where: { enabled: { equals: true } },
    limit: 6,
    depth: 1,
    sort: '-startDatetime',
  })

  const events = result.docs as any[]

  return (
    <section className="py-20 bg-background relative">
      <div className="container space-y-12">
        <form action="/app/events" method="GET" className="max-w-5xl mx-auto -mt-32 relative z-20 bg-card/80 backdrop-blur-sm p-6 rounded-3xl shadow-2xl border border-border flex flex-col items-center gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input name="q" placeholder="Search events..." className="pl-12 h-14 bg-background/50 border-none rounded-2xl" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input placeholder="All Locations" className="pl-12 h-14 bg-background/50 border-none rounded-2xl" />
            </div>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input type="date" name="date" placeholder="Select Date" className="pl-12 h-14 bg-background/50 border-none rounded-2xl" />
            </div>
          </div>
          <Button type="submit" size="lg" className="h-14 px-12 w-full lg:w-auto rounded-2xl text-lg font-bold">Search</Button>
        </form>

        <div className="flex flex-col md:flex-row justify-between items-center pt-12 gap-6">
          <h2 className="text-4xl font-bold tracking-tight">Trending Events</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
            {['All', 'Music', 'Technology', 'Sports', 'Arts'].map((cat) => (
              <Link key={cat} href={`/app/events${cat !== 'All' ? `?tag=${cat.toLowerCase()}` : ''}`}>
                <Button type="button" variant="ghost" className="rounded-full px-6 hover:bg-primary hover:text-primary-foreground transition-all">
                  {cat}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No events available yet
            </div>
          ) : (
            events.map((event: any) => {
              const coverUrl = typeof event.coverImage === 'object' && event.coverImage?.url
                ? event.coverImage.url
                : null

              return (
                <Link key={event.id} href={`/app/events/${event.slug || event.id}`}>
                  <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-500 border-border rounded-2xl bg-card/30 backdrop-blur-sm">
                    <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                          <Calendar size={64} className="opacity-10 group-hover:scale-110 transition-transform duration-700" />
                        </div>
                      )}
                      <div className="absolute top-4 right-4 z-10 bg-primary/90 backdrop-blur-md text-primary-foreground px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                        {event.pricing?.type === 'paid' ? event.pricing.priceRange || 'Paid' : 'Free'}
                      </div>
                    </div>
                    <CardHeader className="space-y-3">
                      <div className="flex items-center text-sm font-semibold text-primary">
                        <Calendar size={16} className="mr-2" />
                        {event.startDatetime
                          ? new Date(event.startDatetime).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Date TBD'}
                      </div>
                      <CardTitle className="text-2xl leading-tight group-hover:text-primary transition-colors cursor-pointer">
                        {event.title}
                      </CardTitle>
                      {event.location?.location && (
                        <CardDescription className="flex items-center text-base">
                          <MapPin size={16} className="mr-2 text-muted-foreground" />
                          {event.location.location}
                        </CardDescription>
                      )}
                    </CardHeader>
                    {event.tags && event.tags.length > 0 && (
                      <CardContent className="flex gap-2 flex-wrap pt-0">
                        {event.tags.slice(0, 3).map((t: string) => (
                          <span key={t} className="text-xs bg-secondary/50 px-2 py-0.5 rounded-full">
                            {t}
                          </span>
                        ))}
                      </CardContent>
                    )}
                  </Card>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
