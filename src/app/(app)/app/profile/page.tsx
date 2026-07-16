'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient, signOut } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Heart, LogOut, MapPin, Ticket, User, Loader2, CreditCard, CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight, Languages, Bell, Shield } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersTotalPages, setOrdersTotalPages] = useState(1)
  const [ordersTotalDocs, setOrdersTotalDocs] = useState(0)
  const [paidOrdersCount, setPaidOrdersCount] = useState(0)
  const [tab, setTab] = useState<'profile' | 'favorites' | 'orders'>('profile')

  useEffect(() => {
    document.title = 'Profile | Afno Events'
  }, [])

  const ORDERS_PER_PAGE = 10

  useEffect(() => {
    async function load() {
      const result = await authClient.getSession()
      const user = result.data?.user
      setSession(user)

      if (user) {
        try {
          const [favRes, ordRes, paidRes] = await Promise.all([
            fetch(`/api/favorites?where[user][equals]=${user.id}&depth=2&limit=50`),
            fetch(`/api/orders?where[buyer][equals]=${user.id}&depth=2&limit=${ORDERS_PER_PAGE}&page=${ordersPage}&sort=-createdAt`),
            fetch(`/api/orders?where[buyer][equals]=${user.id}&where[status][equals]=paid&limit=1&depth=0`),
          ])
          const favData = await favRes.json()
          const ordData = await ordRes.json()
          const paidData = await paidRes.json()
          setFavorites(favData.docs || [])
          setOrders(ordData.docs || [])
          setOrdersTotalPages(ordData.totalPages || 1)
          setOrdersTotalDocs(ordData.totalDocs || 0)
          setPaidOrdersCount(paidData.totalDocs || 0)
        } catch {}
      }

      setLoading(false)
    }
    load()
  }, [ordersPage])

function OrdersTab({ orders, ordersPage, ordersTotalPages, onPageChange }: { orders: any[], ordersPage: number, ordersTotalPages: number, onPageChange: (p: number) => void }) {
  const totalPaid = orders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.totalAmount || 0), 0)
  const activeCount = orders.filter(o => o.status === 'paid' || o.status === 'pending').length
  const pendingCount = orders.filter(o => o.status === 'pending').length
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length

  const statusStyles: Record<string, string> = {
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          <Ticket size={32} className="mx-auto mb-4 opacity-30" />
          <p>No orders yet</p>
          <Link href="/app/events" className="text-primary hover:underline mt-2 block text-sm">
            Browse events
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Spent', value: `£${totalPaid.toFixed(2)}`, icon: CreditCard, color: 'text-primary' },
          { label: 'Active Tickets', value: activeCount.toString(), icon: CheckCircle, color: 'text-green-600' },
          { label: 'Pending Orders', value: pendingCount.toString(), icon: Clock, color: 'text-yellow-600' },
          { label: 'Cancelled', value: cancelledCount.toString(), icon: XCircle, color: 'text-red-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon size={20} className={color} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground truncate">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Event Details</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Tickets</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Order ID</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <Link href={`/app/orders/${order.id}/success`} className="block">
                      <p className="font-semibold truncate max-w-[200px]">
                        {typeof order.event === 'object' ? order.event.title : `Order #${order.id}`}
                      </p>
                      {typeof order.event === 'object' && order.event.location?.location && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {order.event.location.location}
                        </p>
                      )}
                    </Link>
                  </td>
                  <td className="p-4 text-muted-foreground hidden md:table-cell">
                    {order.items?.map((i: any) => `${i.quantity}x ${i.ticketType}`).join(', ') || '-'}
                  </td>
                  <td className="p-4 text-muted-foreground font-mono text-xs hidden lg:table-cell">
                    #{order.id}
                  </td>
                  <td className="p-4 text-muted-foreground hidden md:table-cell">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusStyles[order.status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-primary">
                    £{order.totalAmount?.toFixed(2) || '0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {ordersTotalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => onPageChange(ordersPage - 1)}
            disabled={ordersPage <= 1}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: ordersTotalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                p === ordersPage
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border hover:bg-muted'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => onPageChange(ordersPage + 1)}
            disabled={ordersPage >= ordersTotalPages}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

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
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{paidOrdersCount}</p>
                <p className="text-sm text-muted-foreground">Events Attended this year</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const langLabel = session.language === 'ne' ? 'Nepali' : 'English (UK)'
                const notifValue = session.notifications?.push && session.notifications?.email
                  ? 'Push & Email'
                  : session.notifications?.push
                  ? 'Push'
                  : session.notifications?.email
                  ? 'Email'
                  : 'Off'
                return [
                  { label: 'Language', value: langLabel, icon: Languages },
                  { label: 'Notifications', value: notifValue, icon: Bell },
                  { label: 'Security', value: 'Manage password & 2FA', icon: Shield },
                ]
              })().map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{value}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs">Manage</Button>
                </div>
              ))}
            </CardContent>
          </Card>

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

          {orders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Registration History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-4 font-medium text-muted-foreground">Event Name</th>
                        <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((order: any) => (
                        <tr key={order.id} className="border-b border-border last:border-0">
                          <td className="p-4">
                            <p className="font-medium truncate max-w-[200px]">
                              {typeof order.event === 'object' ? order.event.title : `Order #${order.id}`}
                            </p>
                          </td>
                          <td className="p-4 text-muted-foreground hidden sm:table-cell">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                          <td className="p-4 text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                              order.status === 'paid'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : order.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : order.status === 'cancelled'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === 'favorites' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">My Saved Events</h2>
              <p className="text-sm text-muted-foreground">Manage your shortlisted favorites and upcoming interests.</p>
            </div>
          </div>

          {favorites.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <Heart size={32} className="mx-auto mb-4 opacity-30" />
                <p>No favorites yet</p>
                <div className="mt-4">
                  <Link href="/app/events">
                    <Button variant="outline" className="gap-2">
                      Explore Events <ChevronRight size={16} />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
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
              <div className="text-center py-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">Looking for more?</p>
                <Link href="/app/events">
                  <Button variant="outline" className="gap-2">
                    Browse Event Catalog <ChevronRight size={16} />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'orders' && <OrdersTab orders={orders} ordersPage={ordersPage} ordersTotalPages={ordersTotalPages} onPageChange={setOrdersPage} />}
    </div>
  )
}
