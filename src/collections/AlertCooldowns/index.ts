import type { CollectionConfig } from 'payload'

export const AlertCooldowns: CollectionConfig = {
  slug: 'alert-cooldowns',
  admin: {
    group: 'System',
    hidden: true,
  },
  access: {
    create: () => false,
    read: () => false,
    update: () => false,
    delete: () => false,
    // Admin panel access is guarded by the collection-level access above.
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Unique cooldown key, e.g. nearby:12:34:56',
      },
    },
    {
      name: 'firedAt',
      type: 'date',
      required: true,
      admin: {
        description: 'When the alert last fired; used to enforce the cooldown window',
      },
    },
  ],
  timestamps: true,
}
