import type { CollectionConfig } from 'payload'

import { sendFCMTopicNotification } from '@/utilities/sendFCMNotification'
import { updateAndDeleteAccess } from './access/updateAndDelete'
import { isSuperAdminAccess } from '@/access/isSuperAdmin'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  access: {
    create: isSuperAdminAccess,
    delete: updateAndDeleteAccess,
    read: () => true,
    update: updateAndDeleteAccess,
  },
  admin: {
    useAsTitle: 'name',
    group: 'Tenants',
    hidden: ({ user }) => {
      if (!user) return true
      if (user.role === 'super-admin') return false
      return true
    },
  },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        // Only send push notification if the tenant is explicitly enabled AND verified,
        // and either newly created or newly verified
        const isNewlyVerified =
          doc.enabled === true &&
          doc.verified === true &&
          (!previousDoc || previousDoc.verified !== true)

        if (isNewlyVerified && req?.payload) {
          try {
            await sendFCMTopicNotification({
              topic: 'afno-app-tenant',
              notification: {
                title: 'Keep an eye on ' + doc.name + ' events.',
                body: doc.description || 'Check out the ' + doc.name + ' events.',
                imageUrl: doc.coverImage?.url,
                id: doc.id,
              },
            })
          } catch (err) {
            console.error('FCM tenant notification error:', err)
          }
        }
        return doc
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        // delete tenant's users
        // await req.payload.delete({
        //   collection: 'users_tenants',
        //   where: {
        //     tenant: {
        //       equals: id,
        //     },
        //   },
        // })
      }
    ]
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      required: false,
      admin: {
        description:
          'If checked, the tenant will be shown on the website. If not checked, the tenant will not be shown on the website.',
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending Review', value: 'pending' },
        { label: 'Verified / Approved', value: 'verified' },
        { label: 'Rejected', value: 'rejected' },
      ],
      admin: {
        description: 'Approval status for self-registered organisers',
        position: 'sidebar',
      },
    },
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'When checked, this organiser can publish events live without admin pre-approval.',
        position: 'sidebar',
      },
    },
    {
      name: 'contactInfo',
      type: 'group',
      fields: [
        {
          name: 'phone',
          type: 'text',
          // required: true,
        },
        {
          name: 'email',
          type: 'email',
          // required: true,
        },
      ],
    },
    {
      name: 'organisationImage',
      type: 'upload',
      relationTo: 'media',
      // required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Short description/about text for the organiser page',
      },
    },
    {
      name: 'domain',
      type: 'text',
      admin: {
        description: 'Used for domain-based tenant handling',
      },
      hidden: true,
    },
    {
      name: 'slug',
      type: 'text',
      admin: {
        description: 'Used for url paths, example: /tenant-slug/page-slug',
        position: 'sidebar',
      },
      index: true,
      required: true,
    },
    {
      name: 'allowPublicRead',
      type: 'checkbox',
      admin: {
        description:
          'If checked, logging in is not required to read. Useful for building public pages.',
        position: 'sidebar',
      },
      defaultValue: false,
      index: true,
      hidden: true
    },
  ],
  // endpoints: [
  //   {
  //     path: '/by-slug/:slug',
  //     method: 'get',

  //     handler: async (req) => {
  //       const slug = req.routeParams?.slug as string

  //       const tenant = await req.payload.find({
  //         collection: 'tenants',
  //         where: {
  //           slug: {
  //             equals: slug,
  //           },
  //         },
  //         limit: 1,
  //       })
  //       if (!tenant.docs.length) {
  //         return Response.json({ message: 'Tenant not found' }, { status: 404 })
  //       }
  //       return Response.json(tenant.docs[0], { status: 200 })
  //     },
  //   },
  // ],
}
