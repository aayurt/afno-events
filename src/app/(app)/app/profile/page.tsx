'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient, signOut } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Heart, LogOut, MapPin, Ticket, User, Loader2, CreditCard, CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight, Languages, Bell, Shield, Monitor, ImageIcon, Camera } from 'lucide-react'
import { useScopedI18n } from '@/locales/client'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { useTheme } from '@/providers/Theme'

export default function ProfilePage() {
  const t = useScopedI18n('profile')
  const gt = useScopedI18n('gallery')
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersTotalPages, setOrdersTotalPages] = useState(1)
  const [ordersTotalDocs, setOrdersTotalDocs] = useState(0)
  const [paidOrdersCount, setPaidOrdersCount] = useState(0)
  const [tab, setTab] = useState<'profile' | 'favorites' | 'orders' | 'images'>('profile')
  const [photos, setPhotos] = useState<any[]>([])
  const [previewPhoto, setPreviewPhoto] = useState<any>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [langOpen, setLangOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const { theme } = useTheme()
  const themeLabel = theme === null ? t('themeSystem') : theme === 'light' ? t('themeLight') : t('themeDark')

  useEffect(() => {
    document.title = `${t('profileTab')} | Afno Events`
  }, [t])

  const ORDERS_PER_PAGE = 10

  useEffect(() => {
    async function load() {
      const result = await authClient.getSession()
      const user = result.data?.user
      setSession(user)

      if (user) {
        try {
          const [favRes, ordRes, paidRes, photoRes] = await Promise.all([
            fetch(`/api/favorites?where[user][equals]=${user.id}&depth=2&limit=50`),
            fetch(`/api/orders?where[buyer][equals]=${user.id}&depth=2&limit=${ORDERS_PER_PAGE}&page=${ordersPage}&sort=-createdAt`),
            fetch(`/api/orders?where[buyer][equals]=${user.id}&where[status][equals]=paid&limit=1&depth=0`),
            fetch(`/api/event-photos?where[uploader][equals]=${user.id}&depth=2&limit=50&sort=-createdAt`),
          ])
          const favData = await favRes.json()
          const ordData = await ordRes.json()
          const paidData = await paidRes.json()
          const photoData = await photoRes.json()
          setFavorites(favData.docs || [])
          setOrders(ordData.docs || [])
          setOrdersTotalPages(ordData.totalPages || 1)
          setOrdersTotalDocs(ordData.totalDocs || 0)
          setPaidOrdersCount(paidData.totalDocs || 0)
          setPhotos(photoData.docs || [])

          if (user.image && typeof user.image === 'string' && user.image.startsWith('http')) {
            setAvatarUrl(user.image)
          } else {
            const userRes = await fetch(`/api/users/${user.id}?depth=1`)
            const userData = await userRes.json()
            if (userData.image && typeof userData.image === 'object' && userData.image.url) {
              setAvatarUrl(userData.image.url)
            }
          }
        } catch {}
      }

      setLoading(false)
    }
    load()
  }, [ordersPage])

function OrdersTab({ orders, ordersPage, ordersTotalPages, onPageChange, t }: { orders: any[], ordersPage: number, ordersTotalPages: number, onPageChange: (p: number) => void, t: any }) {
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
          <p>{t('noOrders')}</p>
          <Link href="/app/events" className="text-primary hover:underline mt-2 block text-sm">
            {t('browseEvents')}
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('totalSpent'), value: `£${totalPaid.toFixed(2)}`, icon: CreditCard, color: 'text-primary' },
          { label: t('activeTickets'), value: activeCount.toString(), icon: CheckCircle, color: 'text-green-600' },
          { label: t('pendingOrders'), value: pendingCount.toString(), icon: Clock, color: 'text-yellow-600' },
          { label: t('cancelled'), value: cancelledCount.toString(), icon: XCircle, color: 'text-red-600' },
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
                <th className="text-left p-4 font-medium text-muted-foreground">{t('eventDetails')}</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">{t('tickets')}</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">{t('orderId')}</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">{t('date')}</th>
                <th className="text-left p-4 font-medium text-muted-foreground">{t('status')}</th>
                <th className="text-right p-4 font-medium text-muted-foreground">{t('amount')}</th>
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setAvatarUrl(data.url)
      }
    } catch {}
    setAvatarUploading(false)
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="container py-12 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <div className="flex gap-4 border-b border-border pb-3">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container py-20 flex justify-center">
        <Card className="w-full max-w-md text-center p-8 space-y-6">
          <User size={48} className="mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t('signInRequired')}</h1>
            <p className="text-muted-foreground">{t('signInDescription')}</p>
          </div>
          <Link href="/app/auth/login?redirect=/app/profile">
            <Button size="lg" className="w-full">{t('signIn')}</Button>
          </Link>
          <p className="text-sm text-muted-foreground">
            {t('dontHaveAccount')}{' '}
            <Link href="/app/auth/register" className="text-primary hover:underline">{t('signUp')}</Link>
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-12 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-primary" />
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md">
              {avatarUploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={avatarUploading}
              />
            </label>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{session.name || 'User'}</h1>
            <p className="text-muted-foreground">{session.email}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut size={16} /> {t('signOut')}
        </Button>
      </div>

      <div className="flex gap-4 border-b border-border overflow-x-auto">
        {[
          { key: 'profile', label: t('profileTab'), icon: User },
          { key: 'favorites', label: `${t('favorites')} (${favorites.length})`, icon: Heart },
          { key: 'orders', label: `${t('orders')} (${orders.length})`, icon: Ticket },
          { key: 'images', label: `${t('myPhotos')} (${photos.length})`, icon: ImageIcon },
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
                <p className="text-sm text-muted-foreground">{t('eventsAttended')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('preferences')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const langLabel = session.language === 'ne' ? t('nepali') : t('english')
                const notifValue = session.notifications?.push && session.notifications?.email
                  ? t('notifPushEmail')
                  : session.notifications?.push
                  ? t('notifPush')
                  : session.notifications?.email
                  ? t('notifEmail')
                  : t('notifOff')
                return [
                  { key: 'language', label: t('language'), value: langLabel, icon: Languages, onManage: () => setLangOpen(true) },
                  { key: 'theme', label: t('theme'), value: themeLabel, icon: Monitor, onManage: () => setThemeOpen(true) },
                  { key: 'notifications', label: t('notifications'), value: notifValue, icon: Bell },
                  { key: 'security', label: t('security'), value: t('manageSecurity'), icon: Shield },
                ]
              })().map(({ label, value, icon: Icon, onManage }) => (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={onManage}
                  >
                    {t('manage')}
                  </Button>
                </div>
              ))}
              <LanguageSwitcher open={langOpen} onOpenChange={setLangOpen} />
              <ThemeSwitcher open={themeOpen} onOpenChange={setThemeOpen} t={t} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('accountDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: t('name'), value: session.name },
                  { label: t('email'), value: session.email },
                  { label: t('memberSince'), value: session.createdAt ? new Date(session.createdAt).toLocaleDateString() : '-' },
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
                <CardTitle>{t('registrationHistory')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-4 font-medium text-muted-foreground">{t('eventName')}</th>
                        <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">{t('date')}</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">{t('status')}</th>
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
              <h2 className="text-xl font-semibold">{t('mySavedEvents')}</h2>
              <p className="text-sm text-muted-foreground">{t('favDescription')}</p>
            </div>
          </div>

          {favorites.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <Heart size={32} className="mx-auto mb-4 opacity-30" />
                <p>{t('noFavorites')}</p>
                <div className="mt-4">
                  <Link href="/app/events">
                    <Button variant="outline" className="gap-2">
                      {t('exploreEvents')} <ChevronRight size={16} />
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
                <p className="text-sm text-muted-foreground mb-3">{t('lookingForMore')}</p>
                <Link href="/app/events">
                  <Button variant="outline" className="gap-2">
                    {t('browseCatalog')} <ChevronRight size={16} />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'orders' && <OrdersTab orders={orders} ordersPage={ordersPage} ordersTotalPages={ordersTotalPages} onPageChange={setOrdersPage} t={t} />}

      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <button
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors z-10"
          >
            <XCircle size={24} />
          </button>
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {previewPhoto.image?.url ? (
              <img
                src={previewPhoto.image.url}
                alt=""
                className="max-w-full max-h-[90vh] object-contain rounded-xl"
              />
            ) : (
              <div className="bg-muted rounded-xl p-20 text-muted-foreground">
                <ImageIcon size={64} className="mx-auto" />
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'images' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{t('myPhotos')}</h2>
            <p className="text-sm text-muted-foreground">{t('photosDescription')}</p>
          </div>

          {photos.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <ImageIcon size={32} className="mx-auto mb-4 opacity-30" />
                <p>{t('noPhotos')}</p>
                <Link href="/app/events">
                  <Button variant="outline" size="sm" className="mt-4">
                    {t('browseEvents')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo: any) => {
                const event = photo.event
                const image = photo.image
                const statusStyles: Record<string, string> = {
                  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                }
                const statusLabels: Record<string, string> = {
                  pending: gt('pendingApproval'),
                  approved: gt('approved'),
                  rejected: gt('rejected'),
                }
                return (
                  <Card key={photo.id} className="overflow-hidden hover:shadow-md transition-shadow h-full">
                    <button
                      onClick={() => setPreviewPhoto(photo)}
                      className="w-full text-left group"
                    >
                      <div className="relative aspect-square bg-muted">
                        {image?.url ? (
                          <img
                            src={image.url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon size={32} />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${statusStyles[photo.status] || ''}`}>
                            {statusLabels[photo.status] || photo.status}
                          </span>
                        </div>
                      </div>
                    </button>
                    <CardContent className="p-3">
                      <Link
                        href={`/app/events/${event?.id || ''}/gallery`}
                        className="text-sm font-medium truncate block hover:text-primary transition-colors"
                      >
                        {event?.title || `Event #${typeof event === 'number' ? event : ''}`}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        {photo.createdAt ? new Date(photo.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
