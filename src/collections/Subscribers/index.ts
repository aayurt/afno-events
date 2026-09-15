import type { CollectionConfig } from 'payload'
import { anyone } from '@/access/anyone'
import { isSuperAdminAccess } from '@/access/isSuperAdmin'

export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  access: {
    create: anyone,
    read: isSuperAdminAccess,
    update: isSuperAdminAccess,
    delete: isSuperAdminAccess,
  },
  admin: {
    useAsTitle: 'email',
    group: 'Audience',
    defaultColumns: ['email', 'status', 'createdAt'],
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Unsubscribed', value: 'unsubscribed' },
      ],
      defaultValue: 'active',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
