'use client'

import { useState, useEffect, useCallback } from 'react'
import { useScopedI18n } from '@/locales/client'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Lock, Camera, Upload, X, ImageIcon, Clock } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'

function GalleryClient({ event, photos: initialPhotos }: { event: any; photos: any[] }) {
  const t = useScopedI18n('gallery')
  const searchParams = useSearchParams()
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [unlockLoading, setUnlockLoading] = useState(false)
  const [photos, setPhotos] = useState<any[]>(initialPhotos)
  const [myPendingPhotos, setMyPendingPhotos] = useState<any[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const refetchPhotos = useCallback(async (userId?: string) => {
    try {
      const approvedRes = await fetch(
        `/api/event-photos?where[event][equals]=${event.id}&where[status][equals]=approved&limit=100&sort=-createdAt&depth=1`,
      )
      const approvedData = await approvedRes.json()
      if (approvedData.docs) setPhotos(approvedData.docs)

      if (userId) {
        const pendingRes = await fetch(
          `/api/event-photos?where[event][equals]=${event.id}&where[uploader][equals]=${userId}&where[status][equals]=pending&limit=20&sort=-createdAt&depth=1`,
        )
        const pendingData = await pendingRes.json()
        if (pendingData.docs) setMyPendingPhotos(pendingData.docs)
      }
    } catch {}
  }, [event.id])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const session = await authClient.getSession()
      if (cancelled) return
      const currentUser = session.data?.user
      setUser(currentUser)

      if (searchParams.get('unlock') === 'success') {
        setIsUnlocked(true)
        router.replace(`/app/events/${event.slug || event.id}/gallery`, undefined)
      } else if (currentUser) {
        try {
          const params = new URLSearchParams({
            depth: '0',
            limit: '1',
            'where[event][equals]': event.id.toString(),
            'where[status][equals]': 'paid',
          })
          const res = await fetch(`/api/gallery-access?${params}`)
          const data = await res.json()
          if (!cancelled) setIsUnlocked(data.docs?.length > 0)
        } catch {}
      }
      if (!cancelled) {
        setLoading(false)
        refetchPhotos(currentUser?.id)
      }
    })()
    return () => { cancelled = true }
  }, [event.id, searchParams, router, refetchPhotos])

  const handleUnlock = async () => {
    if (!user) {
      window.location.href = `/app/auth/login?redirect=/app/events/${event.slug || event.id}/gallery`
      return
    }

    setUnlockLoading(true)
    try {
      const res = await fetch('/api/gallery-access/initiate-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id }),
      })
      const data = await res.json()
      if (data.alreadyUnlocked) {
        setIsUnlocked(true)
      } else if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Unlock failed', err)
    } finally {
      setUnlockLoading(false)
    }
  }

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) return
    setUploading(true)
    try {
      for (const file of uploadedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('eventId', event.id.toString())
        formData.append('data', JSON.stringify({ eventId: event.id.toString() }))

        await fetch('/api/event-photos/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
      }
      setUploadedFiles([])
      setUploadSuccess(true)
      await refetchPhotos(user?.id)
    } catch (err) {
      console.error('Upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 py-12">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const allPhotos = [...myPendingPhotos, ...photos]

  return (
    <div>
      {uploadSuccess && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-300">
          {t('requestSent')}
        </div>
      )}

      {allPhotos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
          {allPhotos.map((photo: any) => {
            const isPending = photo.status === 'pending'
            return (
              <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-muted relative group">
                {isUnlocked || isPending ? (
                  typeof photo.image === 'object' && photo.image.url ? (
                    <img
                      src={photo.image.url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <ImageIcon className="text-muted-foreground/40" size={48} />
                    </div>
                  )
                ) : photo.blurredPreview ? (
                  <img
                    src={photo.blurredPreview}
                    alt=""
                    className="w-full h-full object-cover blur-lg scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="text-muted-foreground/40" size={48} />
                  </div>
                )}
                {!isUnlocked && !isPending && (
                  <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
                )}
                {isPending && (
                  <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-2">
                    <div className="bg-black/60 rounded-full p-2">
                      <Clock className="text-white" size={20} />
                    </div>
                    <span className="text-white text-xs font-medium bg-black/50 px-3 py-1 rounded-full">
                      {t('pendingApproval')}
                    </span>
                  </div>
                )}
                {photo.uploader && !isPending && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs">
                      {t('photoBy', { name: typeof photo.uploader === 'object' ? photo.uploader.name || 'Anonymous' : 'Anonymous' })}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Camera size={64} className="text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {isUnlocked ? t('noPhotos') : t('lockedTitle')}
          </h2>
          <p className="text-muted-foreground max-w-md mb-8">
            {isUnlocked ? '' : t('lockedDescription')}
          </p>
        </div>
      )}

      {!isUnlocked && (
        <div className="flex flex-col items-center gap-4 py-12 border-t border-border">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="text-primary" size={28} />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{t('unlockPrice', { price: event.galleryPrice || '2.99' })}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('lockedDescription')}</p>
          </div>
          <Button size="lg" className="rounded-xl" onClick={handleUnlock} disabled={unlockLoading}>
            {unlockLoading ? <Loader2 className="animate-spin" /> : <Lock size={16} className="mr-2" />}
            {t('unlockButton')}
          </Button>
        </div>
      )}

      {user && (
        <div className="border-t border-border pt-8 mt-8">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Camera size={20} className="text-primary" />
              <div>
                <h3 className="font-semibold">{t('uploadPhotos')}</h3>
                <p className="text-sm text-muted-foreground">{t('uploadSubtext')}</p>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {uploadedFiles.map((file, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setUploadedFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById('gallery-upload-input')?.click()}
            >
              <Upload size={32} className="mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">{t('dropZone')}</p>
              <input
                id="gallery-upload-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setUploadedFiles((prev) => [...prev, ...files].slice(0, 5))
                }}
              />
            </div>

            {uploadedFiles.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  {uploadedFiles.length} of 5 photos selected
                </span>
                <Button className="rounded-xl" onClick={handleUpload} disabled={uploading}>
                  {uploading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                  {t('uploadButton')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { GalleryClient }
