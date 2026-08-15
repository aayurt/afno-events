import type { CollectionConfig } from 'payload'

export const CircleAlerts: CollectionConfig = {
  slug: 'circle-alerts',
  admin: {
    group: 'Users',
    hidden: true,
  },
  access: {
    // Rows are written by the notification helpers server-side.
    create: () => false,
    read: ({ req }) => (req.user ? { user: { equals: req.user.id } } : false),
    update: ({ req }) => (req.user ? { user: { equals: req.user.id } } : false),
    delete: ({ req }) => (req.user ? { user: { equals: req.user.id } } : false),
  },
  endpoints: [
    {
      path: '/mark-all-read',
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        try {
          await req.payload.update({
            collection: 'circle-alerts' as any,
            where: {
              user: { equals: req.user.id },
              read: { equals: false },
            },
            data: { read: true },
            overrideAccess: true,
          })
          return Response.json({ success: true })
        } catch (error: any) {
          req.payload.logger.error(`Error marking alerts read: ${error.message}`)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
  ],
  fields: [
    {
      name: 'circle',
      type: 'relationship',
      relationTo: 'circles',
      required: true,
      index: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Live sharing', value: 'live_sharing' },
        { label: 'Nearby', value: 'nearby' },
        { label: 'Geofence', value: 'geofence' },
      ],
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'body',
      type: 'textarea',
    },
    {
      name: 'read',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
  ],
  timestamps: true,
}
