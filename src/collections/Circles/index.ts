import type { CollectionConfig } from 'payload'
import crypto from 'crypto'
import { checkRateLimit, rateLimitedResponse } from '@/utilities/rateLimit'
import {
  sendFCMNotification,
  sendFCMTopicNotification,
} from '@/utilities/sendFCMNotification'
import { shouldFireAlert } from '@/utilities/cooldowns'

const isCircleMember = (circle: any, userId: any): boolean =>
  (circle.members || []).some((m: any) => {
    const uid = typeof m.user === 'object' ? m.user.id : m.user
    return String(uid) === String(userId)
  })

// ─── Live sharing + nearby alerts ────────────────────────────────────────────
// Radius (m) within which a member is considered "nearby". Configurable via env.
const NEARBY_RADIUS_M = Number(process.env.CIRCLE_NEARBY_RADIUS_M || 500)
// How long to wait before alerting the same pair again (avoids spam every 12s).
const NEARBY_ALERT_COOLDOWN_MS = 30 * 60 * 1000

// Geofence around a circle event's venue; entering it triggers an "arrived" push.
const GEOFENCE_RADIUS_M = Number(process.env.CIRCLE_GEOFENCE_RADIUS_M || 200)
// Don't re-alert the same member for the same event within this window.
const GEOFENCE_COOLDOWN_MS = 60 * 60 * 1000

// Normalizes the client's visibleTo payload into a stored array of user ids.
// `['all']` (or 'all' / 'everyone') means visible to every circle member.
const normalizeVisibleTo = (raw: any): string[] => {
  if (Array.isArray(raw)) {
    if (raw.some((v) => v === 'all' || v === 'everyone')) return ['all']
    const ids = raw.map(String).filter((v) => /^\d+$/.test(v))
    return [...new Set(ids)]
  }
  if (raw === 'all' || raw === 'everyone') return ['all']
  return ['all']
}

const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const distanceLabel = (meters: number): string =>
  meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`

/** Alert recipients: every member except [excludeUserId], honoring push prefs. */
type AlertTarget = { userId: string; name: string; tokens: string[] }

const memberAlertTargets = (circle: any, excludeUserId: any): AlertTarget[] => {
  const targets: AlertTarget[] = []
  for (const m of circle.members || []) {
    const user = m.user
    if (!user || typeof user !== 'object') continue
    if (String(user.id) === String(excludeUserId)) continue
    if (user.notifications?.push === false) continue
    const tokens = Array.isArray(user.fcmTokens)
      ? user.fcmTokens.filter((t: any) => typeof t === 'string' && t.length > 0)
      : []
    targets.push({
      userId: String(user.id),
      name: user.name || 'A member',
      tokens,
    })
  }
  return targets
}

/** Stores an in-app alert row so users have history beyond the push. */
const createAlert = async (
  req: any,
  data: {
    circle: any
    user: any
    type: 'live_sharing' | 'nearby' | 'geofence'
    title: string
    body?: string
  },
): Promise<void> => {
  try {
    await req.payload.create({
      collection: 'circle-alerts' as any,
      data,
      overrideAccess: true,
    })
  } catch (error: any) {
    req.payload.logger.error(`Error storing circle alert: ${error.message}`)
  }
}

/** Push to the whole circle when a member starts sharing their live location. */
const notifyCircleOfLiveSharing = async (
  req: any,
  circle: any,
  sharerName: string,
): Promise<void> => {
  const targets = memberAlertTargets(circle, req.user.id)
  if (!targets.length) return
  const name = circle.name || 'Circle'
  const title = `Live location in ${name}`
  const body = `${sharerName} started sharing their live location`
  for (const target of targets) {
    if (target.tokens.length) {
      try {
        await sendFCMNotification({
          tokens: target.tokens,
          notification: { title, body, type: 'circle' },
        })
      } catch (error: any) {
        req.payload.logger.error(`Error sending live-sharing alert: ${error.message}`)
      }
    }
    await createAlert(req, {
      circle: circle.id,
      user: target.userId,
      type: 'live_sharing',
      title,
      body,
    })
  }
}

/** Push to members within [NEARBY_RADIUS_M] of the poster, rate-limited per pair. */
const notifyNearbyMembers = async (
  req: any,
  circle: any,
  myLat: number,
  myLng: number,
  sharerName: string,
): Promise<void> => {
  try {
    const others = await req.payload.find({
      collection: 'circle-locations' as any,
      depth: 0,
      where: {
        circle: { equals: circle.id },
        user: { not_equals: req.user.id },
      },
      limit: 50,
    })
    const circleId = String(circle.id)
    const targets = memberAlertTargets(circle, req.user.id)
    for (const loc of others.docs) {
      // Skip members whose time-limited sharing has already expired.
      if (loc.expiresAt && new Date(loc.expiresAt).getTime() <= Date.now()) continue
      const otherLat = Number(loc.lat)
      const otherLng = Number(loc.lng)
      if (!Number.isFinite(otherLat) || !Number.isFinite(otherLng)) continue
      const meters = haversineMeters(myLat, myLng, otherLat, otherLng)
      if (meters > NEARBY_RADIUS_M) continue

      const otherUserId = loc.user
      if (otherUserId == null) continue
      const pair = [String(req.user.id), String(otherUserId)].sort().join(':')
      if (!(await shouldFireAlert(req.payload, `nearby:${circleId}:${pair}`, NEARBY_ALERT_COOLDOWN_MS))) {
        continue
      }

      const target = targets.find((t) => t.userId === String(otherUserId))
      if (!target) continue

      const name = circle.name || 'Circle'
      const title = `Nearby in ${name}`
      const body = `${sharerName} is ${distanceLabel(meters)} away from you`
      if (target.tokens.length) {
        try {
          await sendFCMNotification({
            tokens: target.tokens,
            notification: { title, body, type: 'circle' },
          })
        } catch (error: any) {
          req.payload.logger.error(`Error sending nearby alert: ${error.message}`)
        }
      }
      await createAlert(req, {
        circle: circle.id,
        user: target.userId,
        type: 'nearby',
        title,
        body,
      })
    }
  } catch (error: any) {
    req.payload.logger.error(`Error sending nearby alert: ${error.message}`)
  }
}

/** Push to the circle when a member enters the geofence of one of the circle's events. */
const notifyEventArrivals = async (
  req: any,
  circle: any,
  myLat: number,
  myLng: number,
  sharerName: string,
): Promise<void> => {
  try {
    const eventRefs = Array.isArray(circle.events) ? circle.events : []
    if (!eventRefs.length) return
    const eventIds = eventRefs
      .map((e: any) => (typeof e === 'object' && e !== null ? e.id : e))
      .filter((id: any) => id != null)
    if (!eventIds.length) return

    const events = await req.payload.find({
      collection: 'events' as any,
      depth: 0,
      where: { id: { in: eventIds } },
      limit: 50,
      overrideAccess: true,
    })

    const circleId = String(circle.id)
    for (const ev of events.docs) {
      const lat = Number(ev.location?.latitude)
      const lng = Number(ev.location?.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      const meters = haversineMeters(myLat, myLng, lat, lng)
      if (meters > GEOFENCE_RADIUS_M) continue

      const key = `${circleId}:${ev.id}:${req.user.id}`
      if (!(await shouldFireAlert(req.payload, `geofence:${key}`, GEOFENCE_COOLDOWN_MS))) {
        continue
      }

      const title = ev.title || 'the event'
      const alertTitle = `Arrived at ${title}`
      const alertBody = `${sharerName} is at ${title}`
      for (const target of memberAlertTargets(circle, req.user.id)) {
        if (target.tokens.length) {
          try {
            await sendFCMNotification({
              tokens: target.tokens,
              notification: { title: alertTitle, body: alertBody, type: 'circle' },
            })
          } catch (error: any) {
            req.payload.logger.error(`Error sending arrival alert: ${error.message}`)
          }
        }
        await createAlert(req, {
          circle: circle.id,
          user: target.userId,
          type: 'geofence',
          title: alertTitle,
          body: alertBody,
        })
      }
    }
  } catch (error: any) {
    req.payload.logger.error(`Error sending event arrival alert: ${error.message}`)
  }
}

export const Circles: CollectionConfig = {
  slug: 'circles',
  admin: {
    useAsTitle: 'name',
    group: 'Users',
  },
  access: {
    create: ({ req }) => !!req.user,
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'super-admin') return true
      return {
        'members.user': { equals: req.user.id },
      }
    },
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'super-admin') return true
      return {
        creator: { equals: req.user.id },
      }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'super-admin') return true
      return {
        creator: { equals: req.user.id },
      }
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'creator',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      defaultValue: ({ user }: { user: any }) => user?.id,
    },
    {
      name: 'members',
      type: 'array',
      labels: { singular: 'Member', plural: 'Members' },
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        {
          name: 'role',
          type: 'select',
          defaultValue: 'member',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Member', value: 'member' },
          ],
        },
      ],
    },
    {
      name: 'events',
      type: 'relationship',
      relationTo: 'events',
      hasMany: true,
    },
    {
      name: 'inviteCode',
      type: 'text',
      unique: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create') {
          const code = crypto.randomBytes(4).toString('hex')
          data.inviteCode = code
          if (!data.members || data.members.length === 0) {
            data.members = [{ user: data.creator, role: 'admin' }]
          }
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, previousDoc }) => {
        if (operation === 'update' && previousDoc) {
          const prevDoc = previousDoc as any
          const currDoc = doc as any
          const prevIds = (prevDoc.members || []).map((m: any) =>
            typeof m.user === 'object' ? m.user.id : m.user,
          ).sort().join(',')
          const currIds = (currDoc.members || []).map((m: any) =>
            typeof m.user === 'object' ? m.user.id : m.user,
          ).sort().join(',')
          if (prevIds !== currIds) {
            const name = currDoc.name || 'Circle'
            try {
              await sendFCMTopicNotification({
                topic: `circle-${doc.id}`,
                notification: {
                  title: 'Circle updated',
                  body: `Circle "${name}" has new members.`,
                },
              })
            } catch (_) {}
          }
        }
      },
    ],
  },
  endpoints: [
    {
      path: '/my',
      method: 'get',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        try {
          const circles = await req.payload.find({
            collection: 'circles' as any,
            depth: 1,
            where: {
              'members.user': { equals: req.user.id },
            },
            sort: '-updatedAt',
          })
          return Response.json(circles)
        } catch (error: any) {
          req.payload.logger.error(`Error fetching my circles: ${error.message}`)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/location',
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const id = (req.routeParams as any)?.id
        if (!id) {
          return Response.json({ error: 'Missing circle id' }, { status: 400 })
        }
        const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
        const rl = checkRateLimit(`circle-loc:${req.user.id}:${id}:${ip}`, 30)
        if (!rl.allowed) return rateLimitedResponse()

        let body: {
          lat?: number
          lng?: number
          accuracy?: number
          heading?: number
          visibleTo?: string[] | string
          expiresAt?: string | number | null
        }
        try {
          body = (await req.json!()) as {
            lat?: number
            lng?: number
            accuracy?: number
            heading?: number
            visibleTo?: string[] | string
            expiresAt?: string | number | null
          }
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const lat = Number(body.lat)
        const lng = Number(body.lng)
        if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
          return Response.json({ error: 'Invalid latitude' }, { status: 400 })
        }
        if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
          return Response.json({ error: 'Invalid longitude' }, { status: 400 })
        }

        try {
          const circle = await req.payload.findByID({
            collection: 'circles' as any,
            id,
            depth: 2,
            overrideAccess: true,
          }) as any
          if (!circle) {
            return Response.json({ error: 'Circle not found' }, { status: 404 })
          }
          if (!isCircleMember(circle, req.user.id)) {
            return Response.json({ error: 'Not a member of this circle' }, { status: 403 })
          }

          const existing = await req.payload.find({
            collection: 'circle-locations' as any,
            where: {
              circle: { equals: id },
              user: { equals: req.user.id },
            },
            limit: 1,
            overrideAccess: true,
          })

          const data: any = {
            circle: id,
            user: req.user.id,
            lat,
            lng,
            accuracy: body.accuracy != null ? Number(body.accuracy) : undefined,
            heading: body.heading != null ? Number(body.heading) : undefined,
          }
          if (body.visibleTo !== undefined) {
            data.visibleTo = normalizeVisibleTo(body.visibleTo)
          }
          if (body.expiresAt !== undefined) {
            if (body.expiresAt === null) {
              data.expiresAt = null
            } else {
              const t = new Date(body.expiresAt).getTime()
              if (!Number.isFinite(t)) {
                return Response.json({ error: 'Invalid expiresAt' }, { status: 400 })
              }
              if (t <= Date.now()) {
                return Response.json(
                  { error: 'expiresAt must be in the future' },
                  { status: 400 },
                )
              }
              data.expiresAt = new Date(t).toISOString()
            }
          }

          const wasSharing = !!existing.docs?.[0]

          let doc
          if (existing.docs?.[0]) {
            doc = await req.payload.update({
              collection: 'circle-locations' as any,
              id: existing.docs[0].id,
              data,
              overrideAccess: true,
            })
          } else {
            doc = await req.payload.create({
              collection: 'circle-locations' as any,
              data,
              overrideAccess: true,
            })
          }

          const sharerName = req.user.name || 'Someone'
          // Live-sharing alert: only on the off→on transition (new row created).
          if (!wasSharing) {
            await notifyCircleOfLiveSharing(req, circle, sharerName)
          }
          // Nearby alert (distance-sort alert) with per-pair cooldown.
          await notifyNearbyMembers(req, circle, lat, lng, sharerName)
          // Geofence "arrived at event" alert.
          await notifyEventArrivals(req, circle, lat, lng, sharerName)

          return Response.json(doc)
        } catch (error: any) {
          req.payload.logger.error(`Error updating circle location: ${error.message}`)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/locations',
      method: 'get',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const id = (req.routeParams as any)?.id
        if (!id) {
          return Response.json({ error: 'Missing circle id' }, { status: 400 })
        }
        try {
          const circle = await req.payload.findByID({
            collection: 'circles' as any,
            id,
            depth: 0,
            overrideAccess: true,
          }) as any
          if (!circle) {
            return Response.json({ error: 'Circle not found' }, { status: 404 })
          }
          if (!isCircleMember(circle, req.user.id)) {
            return Response.json({ error: 'Not a member of this circle' }, { status: 403 })
          }
          const locations = await req.payload.find({
            collection: 'circle-locations' as any,
            depth: 2,
            where: {
              circle: { equals: id },
            },
            sort: '-updatedAt',
            limit: 100,
            overrideAccess: true,
          })

          const now = Date.now()
          const isExpired = (d: any): boolean =>
            !!d.expiresAt && new Date(d.expiresAt).getTime() <= now
          const rowUserId = (d: any): any =>
            d.user && typeof d.user === 'object' ? d.user.id : d.user

          // Per-member privacy: hide rows the requester isn't allowed to see,
          // and treat time-limited rows past expiry as no longer sharing.
          const docs = locations.docs.filter((d: any) => {
            if (isExpired(d)) return false
            if (String(rowUserId(d)) === String(req.user!.id)) return true
            const vis = Array.isArray(d.visibleTo) ? d.visibleTo : ['all']
            if (vis.includes('all') || vis.includes('everyone')) return true
            return vis.some((v: any) => String(v) === String(req.user!.id))
          })

          // Distance-sort: nearest members first, from the requester's own position.
          const mine = docs.find((d: any) => String(rowUserId(d)) === String(req.user!.id))
          if (mine) {
            docs.sort((a: any, b: any) => {
              const da = haversineMeters(mine.lat, mine.lng, a.lat, a.lng)
              const db = haversineMeters(mine.lat, mine.lng, b.lat, b.lng)
              return da - db
            })
          }

          // Viewers: members who are live (sharing right now) and allowed to
          // see the requester per the requester's own visibleTo setting.
          const mineVis = Array.isArray(mine?.visibleTo) ? mine.visibleTo : ['all']
          const viewers = locations.docs
            .filter((d: any) => {
              if (String(rowUserId(d)) === String(req.user!.id)) return false
              if (isExpired(d)) return false
              // "Live" = last update within 60s (matches the client's staleAfter).
              if (new Date(d.updatedAt).getTime() < now - 60_000) return false
              if (mineVis.includes('all')) return true
              return mineVis.some((v: any) => String(v) === String(rowUserId(d)))
            })
            .map((d: any) => {
              const u = d.user || {}
              return {
                id: u.id,
                name: u.name ?? null,
                image: u.image && typeof u.image === 'object' ? u.image.url ?? null : null,
              }
            })

          return Response.json({ ...locations, docs, viewers })
        } catch (error: any) {
          req.payload.logger.error(`Error fetching circle locations: ${error.message}`)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/location-preview',
      method: 'get',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const id = (req.routeParams as any)?.id
        if (!id) {
          return Response.json({ error: 'Missing circle id' }, { status: 400 })
        }
        try {
          const circle = await req.payload.findByID({
            collection: 'circles' as any,
            id,
            depth: 2,
            overrideAccess: true,
          }) as any
          if (!circle) {
            return Response.json({ error: 'Circle not found' }, { status: 404 })
          }
          if (!isCircleMember(circle, req.user.id)) {
            return Response.json({ error: 'Not a member of this circle' }, { status: 403 })
          }
          const myRow = await req.payload.find({
            collection: 'circle-locations' as any,
            where: {
              circle: { equals: id },
              user: { equals: req.user.id },
            },
            limit: 1,
            overrideAccess: true,
          })
          const mineVis = Array.isArray(myRow.docs?.[0]?.visibleTo)
            ? myRow.docs[0].visibleTo
            : ['all']
          const members = (circle.members || [])
            .filter((m: any) => m.user && typeof m.user === 'object')
            .map((m: any) => {
              const u = m.user
              return {
                id: u.id,
                name: u.name ?? null,
                image: u.image && typeof u.image === 'object' ? u.image.url ?? null : null,
                canSeeMe:
                  mineVis.includes('all') ||
                  mineVis.some((v: any) => String(v) === String(u.id)),
              }
            })
          return Response.json({ members })
        } catch (error: any) {
          req.payload.logger.error(`Error fetching location preview: ${error.message}`)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/location',
      method: 'delete',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const id = (req.routeParams as any)?.id
        if (!id) {
          return Response.json({ error: 'Missing circle id' }, { status: 400 })
        }
        try {
          const circle = await req.payload.findByID({
            collection: 'circles' as any,
            id,
            depth: 0,
            overrideAccess: true,
          }) as any
          if (!circle) {
            return Response.json({ error: 'Circle not found' }, { status: 404 })
          }
          if (!isCircleMember(circle, req.user.id)) {
            return Response.json({ error: 'Not a member of this circle' }, { status: 403 })
          }
          await req.payload.delete({
            collection: 'circle-locations' as any,
            where: {
              circle: { equals: id },
              user: { equals: req.user.id },
            },
            overrideAccess: true,
          })
          return Response.json({ success: true })
        } catch (error: any) {
          req.payload.logger.error(`Error stopping location sharing: ${error.message}`)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/messages',
      method: 'get',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const id = (req.routeParams as any)?.id
        if (!id) {
          return Response.json({ error: 'Missing circle id' }, { status: 400 })
        }
        try {
          const circle = await req.payload.findByID({
            collection: 'circles' as any,
            id,
            depth: 0,
            overrideAccess: true,
          }) as any
          if (!circle) {
            return Response.json({ error: 'Circle not found' }, { status: 404 })
          }
          const isMember = (circle.members || []).some((m: any) => {
            const uid = typeof m.user === 'object' ? m.user.id : m.user
            return String(uid) === String(req.user!.id)
          })
          if (!isMember) {
            return Response.json({ error: 'Not a member of this circle' }, { status: 403 })
          }
          const messages = await req.payload.find({
            collection: 'circle-messages' as any,
            depth: 1,
            where: {
              circle: { equals: id },
            },
            sort: 'createdAt',
            limit: 200,
          })
          return Response.json(messages)
        } catch (error: any) {
          req.payload.logger.error(`Error fetching circle messages: ${error.message}`)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/messages',
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const id = (req.routeParams as any)?.id
        if (!id) {
          return Response.json({ error: 'Missing circle id' }, { status: 400 })
        }
        let body: { message?: string }
        try {
          body = (await req.json!()) as { message?: string }
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }
        const message = (body?.message || '').trim()
        if (!message) {
          return Response.json({ error: 'message is required' }, { status: 400 })
        }
        if (message.length > 2000) {
          return Response.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 })
        }
        try {
          const circle = await req.payload.findByID({
            collection: 'circles' as any,
            id,
            depth: 0,
            overrideAccess: true,
          }) as any
          if (!circle) {
            return Response.json({ error: 'Circle not found' }, { status: 404 })
          }
          const isMember = (circle.members || []).some((m: any) => {
            const uid = typeof m.user === 'object' ? m.user.id : m.user
            return String(uid) === String(req.user!.id)
          })
          if (!isMember) {
            return Response.json({ error: 'Not a member of this circle' }, { status: 403 })
          }
          const doc = await req.payload.create({
            collection: 'circle-messages' as any,
            data: {
              circle: id,
              sender: req.user.id,
              message,
            },
            depth: 1,
          })
          const name = circle.name || 'Circle'
          try {
            await sendFCMTopicNotification({
              topic: `circle-${id}`,
              notification: {
                title: `New message in ${name}`,
                body: `${req.user.name || 'Someone'}: ${message.length > 120 ? message.slice(0, 120) + '…' : message}`,
                type: 'circle',
              },
            })
          } catch (_) {}
          return Response.json(doc)
        } catch (error: any) {
          req.payload.logger.error(`Error sending circle message: ${error.message}`)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
    {
      path: '/join-by-code',
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        let body: { code?: string }
        try {
          body = (await req.json!()) as { code?: string }
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }
        const code = (body?.code || '').trim().toLowerCase()
        if (!code) {
          return Response.json({ error: 'Invite code is required' }, { status: 400 })
        }
        try {
          const found = await req.payload.find({
            collection: 'circles' as any,
            where: { inviteCode: { equals: code } },
            depth: 1,
            limit: 1,
            overrideAccess: true,
          })
          const circle = found.docs?.[0]
          if (!circle) {
            return Response.json({ error: 'Invalid invite code' }, { status: 404 })
          }
          const alreadyMember = (circle.members || []).some((m: any) => {
            const uid = typeof m.user === 'object' ? m.user.id : m.user
            return String(uid) === String(req.user!.id)
          })
          if (alreadyMember) {
            return Response.json({ error: 'Already a member' }, { status: 409 })
          }
          const updated = await req.payload.update({
            collection: 'circles' as any,
            id: circle.id,
            data: {
              members: [
                ...(circle.members || []),
                { user: req.user.id, role: 'member' },
              ],
            },
            overrideAccess: true,
          })
          const name = circle.name || 'Circle'
          try {
            await sendFCMTopicNotification({
              topic: `circle-${circle.id}`,
              notification: {
                title: 'New member',
                body: `${req.user.name || 'Someone'} joined "${name}"`,
              },
            })
          } catch (_) {}
          return Response.json(updated)
        } catch (error: any) {
          req.payload.logger.error(`Error joining circle by code: ${error.message}`)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/join',
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const id = (req.routeParams as any)?.id
        if (!id) {
          return Response.json({ error: 'Missing circle id' }, { status: 400 })
        }
        try {
          const circle = await req.payload.findByID({
            collection: 'circles' as any,
            id,
            depth: 1,
            overrideAccess: true,
          }) as any
          if (!circle) {
            return Response.json({ error: 'Circle not found' }, { status: 404 })
          }
          const alreadyMember = (circle.members || []).some((m: any) => {
            const uid = typeof m.user === 'object' ? m.user.id : m.user
            return String(uid) === String(req.user!.id)
          })
          if (alreadyMember) {
            return Response.json({ error: 'Already a member' }, { status: 409 })
          }
          const updated = await req.payload.update({
            collection: 'circles' as any,
            id,
            data: {
              members: [
                ...(circle.members || []),
                { user: req.user.id, role: 'member' },
              ],
            },
            overrideAccess: true,
          })
          const name = circle.name || 'Circle'
          try {
            await sendFCMTopicNotification({
              topic: `circle-${id}`,
              notification: {
                title: 'New member',
                body: `${req.user.name || 'Someone'} joined "${name}"`,
              },
            })
          } catch (_) {}
          return Response.json(updated)
        } catch (error: any) {
          req.payload.logger.error(`Error joining circle: ${error.message}`)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/leave',
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const id = (req.routeParams as any)?.id
        if (!id) {
          return Response.json({ error: 'Missing circle id' }, { status: 400 })
        }
        try {
          const circle = await req.payload.findByID({
            collection: 'circles' as any,
            id,
            depth: 1,
            overrideAccess: true,
          }) as any
          if (!circle) {
            return Response.json({ error: 'Circle not found' }, { status: 404 })
          }
          const filtered = (circle.members || []).filter((m: any) => {
            const uid = typeof m.user === 'object' ? m.user.id : m.user
            return String(uid) !== String(req.user!.id)
          })
          const updated = await req.payload.update({
            collection: 'circles' as any,
            id,
            data: { members: filtered },
            overrideAccess: true,
          })
          // Stop sharing location when leaving the circle
          await req.payload.delete({
            collection: 'circle-locations' as any,
            where: {
              circle: { equals: id },
              user: { equals: req.user.id },
            },
            overrideAccess: true,
          })
          return Response.json(updated)
        } catch (error: any) {
          req.payload.logger.error(`Error leaving circle: ${error.message}`)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
  ],
  timestamps: true,
}
