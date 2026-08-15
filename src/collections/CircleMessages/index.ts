import type { CollectionConfig } from 'payload'

export const CircleMessages: CollectionConfig = {
  slug: 'circle-messages',
  admin: {
    useAsTitle: 'message',
    group: 'Users',
    hidden: true,
  },
  access: {
    create: ({ req }) => !!req.user,
    read: ({ req }) => !!req.user,
    update: () => false,
    delete: () => false,
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
      name: 'sender',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      defaultValue: ({ user }: { user: any }) => user?.id,
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
    },
  ],
  timestamps: true,
}
