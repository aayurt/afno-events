import { Calendar, ArrowRight } from 'lucide-react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AppDashboardPage() {
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
    <div className="container py-8 space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Discover</h1>
        <p className="text-muted-foreground">Events curated for you</p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Upcoming Events</h2>
          <Link href="/app/events">
            <Button variant="ghost" size="sm" className="gap-1 text-primary">
              View All <ArrowRight size={16} />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No events yet
            </div>
          ) : (
            events.map((event: any) => (
              <Link key={event.id} href={`/app/events/${event.slug || event.id}`}>
                <Card className="group overflow-hidden hover:shadow-lg transition-all rounded-2xl h-full">
                  <div className="aspect-[16/9] bg-muted overflow-hidden">
                    {event.coverImage ? (
                      <img
                        src={typeof event.coverImage === 'object' ? event.coverImage.url : ''}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                        <Calendar size={40} className="opacity-20" />
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="text-sm text-muted-foreground mb-1">
                      {event.startDatetime
                        ? new Date(event.startDatetime).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'TBD'}
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {event.title}
                    </CardTitle>
                    {event.location?.location && (
                      <CardDescription>{event.location.location}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
