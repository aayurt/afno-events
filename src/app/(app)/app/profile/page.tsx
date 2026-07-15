'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient, signOut } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Heart, LogOut, MapPin, Ticket, User, Loader2 } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [tab, setTab] = useState<'profile' | 'favorites' | 'orders'>('profile')

  useEffect(() => {
    async function load() {
      const result = await authClient.getSession()
      const user = result.data?.user
      setSession(user)

      if (user) {
        try {
          const [favRes, ordRes] = await Promise.all([
            fetch(`/api/favorites?where[user][equals]=${user.id}&depth=2&limit=50`),
            fetch(`/api/orders?where[buyer][equals]=${user.id}&depth=2&limit=50&sort=-createdAt`),
          ])
          const favData = await favRes.json()
          const ordData = await ordRes.json()
          setFavorites(favData.docs || [])
          setOrders(ordData.docs || [])
        } catch {}
      }

      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container py-20 flex justify-center">
        <Card className="w-full max-w-md text-center p-8 space-y-6">
          <User size={48} className="mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Sign in required</h1>
            <p className="text-muted-foreground">Sign in to view your profile, favorites, and orders</p>
          </div>
          <Link href="/app/auth/login?redirect=/app/profile">
            <Button size="lg" className="w-full">Sign In</Button>
          </Link>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/app/auth/register" className="text-primary hover:underline">Sign up</Link>
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-12 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User size={32} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{session.name || 'User'}</h1>
            <p className="text-muted-foreground">{session.email}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut size={16} /> Sign Out
        </Button>
      </div>

      <div className="flex gap-4 border-b border-border">
        {[
          { key: 'profile', label: 'Profile', icon: User },
          { key: 'favorites', label: `Favorites (${favorites.length})`, icon: Heart },
          { key: 'orders', label: `Orders (${orders.length})`, icon: Ticket },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Name', value: session.name },
                { label: 'Email', value: session.email },
                { label: 'Member since', value: session.createdAt ? new Date(session.createdAt).toLocaleDateString() : '-' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="font-medium">{value || '-'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'favorites' && (
        <div className="space-y-4">
          {favorites.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <Heart size={32} className="mx-auto mb-4 opacity-30" />
                <p>No favorites yet</p>
                <Link href="/app/events" className="text-primary hover:underline mt-2 block text-sm">
                  Browse events
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((fav: any) => {
                const ev = fav.event
                if (!ev || typeof ev === 'number') return null
                return (
                  <Link key={fav.id} href={`/app/events/${ev.slug || ev.id}`}>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex gap-4">
                        {ev.coverImage ? (
                          <img
                            src={typeof ev.coverImage === 'object' ? ev.coverImage.url : ''}
                            alt=""
                            className="w-20 h-20 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Calendar size={24} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{ev.title}</p>
                          {ev.startDatetime && (
                            <p className="text-sm text-muted-foreground">
                              {new Date(ev.startDatetime).toLocaleDateString()}
                            </p>
                          )}
                          {ev.location?.location && (
                            <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                              <MapPin size={12} /> {ev.location.location}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <Ticket size={32} className="mx-auto mb-4 opacity-30" />
                <p>No orders yet</p>
                <Link href="/app/events" className="text-primary hover:underline mt-2 block text-sm">
                  Browse events
                </Link>
              </CardContent>
            </Card>
          ) : (
            orders.map((order: any) => (
              <Link key={order.id} href={`/app/orders/${order.id}/success`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">
                          {typeof order.event === 'object' ? order.event.title : `Order #${order.id}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.items?.map((i: any) => `${i.quantity}x ${i.ticketType}`).join(', ') || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">£{order.totalAmount?.toFixed(2) || '0.00'}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            order.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : order.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
