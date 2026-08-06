import type { CollectionConfig } from 'payload'
import crypto from 'crypto'
import { sendFCMTopicNotification } from '@/utilities/sendFCMNotification'

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
        members: {
          contains: req.user.id,
        },
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
