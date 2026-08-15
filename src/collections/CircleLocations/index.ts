import type { CollectionConfig } from 'payload'

export const CircleLocations: CollectionConfig = {
  slug: 'circle-locations',
  admin: {
    group: 'Users',
    hidden: true,
  },
  access: {
    create: ({ req }) => !!req.user,
    read: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
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
      name: 'lat',
      type: 'number',
      required: true,
      admin: {
        description: 'Latitude of the member',
      },
    },
    {
      name: 'lng',
      type: 'number',
      required: true,
      admin: {
        description: 'Longitude of the member',
      },
    },
    {
      name: 'accuracy',
      type: 'number',
      admin: {
        description: 'Position accuracy in meters',
      },
    },
    {
      name: 'heading',
      type: 'number',
      admin: {
        description: 'Compass heading in degrees (optional)',
      },
    },
    {
      name: 'visibleTo',
      type: 'json',
      defaultValue: ['all'],
      admin: {
        description: "Who can see this location: ['all'] or an array of user ids",
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      admin: {
        description: 'When sharing auto-stops (time-limited sharing). Empty = until stopped.',
      },
    },
  ],
  timestamps: true,
}
