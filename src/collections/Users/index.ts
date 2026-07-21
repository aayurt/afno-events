// src/collections/Users/index.ts (vanilla starter uses folder-based collections)
import type { CollectionConfig } from 'payload'
import { betterAuthStrategy } from '@delmaredigital/payload-better-auth'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { tenantsArrayField } from '@payloadcms/plugin-multi-tenant/fields'
import { isAdmin } from '@/access/admin'
import { isSuperAdminAccess } from '@/access/isSuperAdmin'
import { updateAndDeleteAccess } from './access/updateAndDelete'
import { readAccess } from './access/read'

const defaultTenantArrayField = tenantsArrayField({
  tenantsArrayFieldName: 'tenants',
  tenantsArrayTenantFieldName: 'tenant',
  tenantsCollectionSlug: 'tenants',
  arrayFieldAccess: {},
  tenantFieldAccess: {},
  rowFields: [
    {
      name: 'roles',
      type: 'select',
      defaultValue: ['tenant-viewer', 'tenant-admin'],
      hasMany: true,
      options: ['tenant-admin', 'tenant-viewer'],
      required: true,
      hidden: true
    },
  ],
})
export const Users: CollectionConfig = {
  slug: 'users',
  trash: true,
  auth: {
    disableLocalStrategy: true,
    strategies: [betterAuthStrategy()],
    useAPIKey: true,
  },
  access: {
    // read: ({ req }) => {
    //   if (!req.user) return false
    //   if (req.user.role === 'admin') return true
    //   return { id: { equals: req.user.id } }
    // },
    create: () => true,
    delete: updateAndDeleteAccess,
    read: readAccess,
    update: updateAndDeleteAccess,
    admin: isAdmin,
  },
  admin: {
    group: 'Users',
    hidden: ({ user }) => {
      if (!user) return true
      if (user.role === 'super-admin') return false
      return true
    },
  },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true },
    { name: 'emailVerified', type: 'checkbox', defaultValue: false },
    { name: 'name', type: 'text' },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      // required: true,
    },
    {
      name: 'phoneNumber',
      type: 'text',
      // required: true,
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'user',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Admin', value: 'admin' },
        { label: 'Super Admin', value: 'super-admin' },
      ],
    },
    {
      name: 'gender',
      type: 'select',
      options: [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Other', value: 'other' },
        { label: 'Prefer Not to Say', value: 'prefer-not-to-say' },
      ],
      defaultValue: 'prefer-not-to-say',
    },
    {
      name: 'language',
      type: 'select',
      defaultValue: 'en',
      options: [
        { label: 'English (UK)', value: 'en' },
        { label: 'Nepali', value: 'ne' },
      ],
      admin: { description: 'Interface language preference' },
    },
    {
      name: 'notifications',
      type: 'group',
      fields: [
        { name: 'push', type: 'checkbox', defaultValue: true, label: 'Push notifications' },
        { name: 'email', type: 'checkbox', defaultValue: true, label: 'Email notifications' },
      ],
      admin: { description: 'Notification preferences' },
    },
    {
      name: 'fcmTokens',
      type: 'json',
      defaultValue: [],
      admin: {
        description: 'FCM device tokens for push notifications',
      },
    },
    {
      ...defaultTenantArrayField,
      label: 'Tenants',
      admin: {
        ...(defaultTenantArrayField?.admin || {}),
        position: 'sidebar',
      },
    },
  ],
  endpoints: [
    {
      path: '/avatar',
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let formData: FormData
        try {
          formData = await req.formData()
        } catch {
          return Response.json({ error: 'Failed to parse form data' }, { status: 400 })
        }

        const file = formData.get('file') as File | null
        if (!file) {
          return Response.json({ error: 'file is required' }, { status: 400 })
        }

        try {
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          const tmpDir = os.tmpdir()
          const tmpPath = path.join(tmpDir, `avatar-${Date.now()}-${file.name}`)
          fs.writeFileSync(tmpPath, buffer)

          const resolveTenant = (val: any): string | number | null => {
            if (!val) return null
            return typeof val === 'object' ? val.id : val
          }

          let tenantId = resolveTenant((req.user as any).tenant)

          if (!tenantId) {
            const userDoc = await req.payload.findByID({
              collection: 'users',
              id: req.user.id,
              depth: 1,
            })
            const userTenant = Array.isArray(userDoc.tenants) && userDoc.tenants.length > 0
              ? userDoc.tenants[0].tenant
              : null
            tenantId = resolveTenant(userTenant)
          }

          const mediaData: any = { alt: `${req.user.name || 'User'}'s avatar` }
          if (tenantId) mediaData.tenant = tenantId

          const mediaDoc = await req.payload.create({
            collection: 'media',
            data: mediaData,
            filePath: tmpPath,
          })

          try { fs.unlinkSync(tmpPath) } catch {}

          await req.payload.update({
            collection: 'users',
            id: req.user.id,
            data: { image: mediaDoc.id, ...(tenantId ? { tenant: tenantId } : {}) },
          })

          return Response.json({
            url: mediaDoc.url,
            id: mediaDoc.id,
          })
        } catch (error: any) {
          req.payload.logger.error(`Avatar upload error: ${error.message}`)
          return Response.json({ error: error.message }, { status: 500 })
        }
      },
    },
    {
      path: '/register-fcm-token',
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let body: { token?: string }
        try {
          body = await req.json()
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        if (!body.token || typeof body.token !== 'string') {
          return Response.json({ error: 'token is required' }, { status: 400 })
        }

        try {
          const user = await req.payload.findByID({
            collection: 'users',
            id: req.user.id,
          })

          const tokens: string[] = Array.isArray((user as any).fcmTokens)
            ? (user as any).fcmTokens
            : []

          if (!tokens.includes(body.token)) {
            tokens.push(body.token)
            await req.payload.update({
              collection: 'users',
              id: req.user.id,
              data: { fcmTokens: tokens },
            })
          }

          return Response.json({ success: true })
        } catch (error) {
          req.payload.logger.error(`Error registering FCM token: ${error}`)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
    {
      path: '/unregister-fcm-token',
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let body: { token?: string }
        try {
          body = await req.json()
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        if (!body.token || typeof body.token !== 'string') {
          return Response.json({ error: 'token is required' }, { status: 400 })
        }

        try {
          const user = await req.payload.findByID({
            collection: 'users',
            id: req.user.id,
          })

          const tokens: string[] = Array.isArray((user as any).fcmTokens)
            ? (user as any).fcmTokens
            : []

          const filtered = tokens.filter((t) => t !== body.token)
          await req.payload.update({
            collection: 'users',
            id: req.user.id,
            data: { fcmTokens: filtered },
          })

          return Response.json({ success: true })
        } catch (error) {
          req.payload.logger.error(`Error unregistering FCM token: ${error}`)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (data.email) {
          data.email = data.email.toLowerCase()
        }
        if (!req.user) {
          data.role = 'user'
        }
        if (req.user && !(isAdmin({ req }) || isSuperAdminAccess({ req }))) {
          data.role = 'user'
        }
        if (operation === 'create') {
          // Only apply if tenants array is missing or empty
          if (!data.tenants || data.tenants.length === 0) {
            const getTenant = await req.payload.find({
              collection: 'tenants',
              where: {
                slug: {
                  equals: 'default',
                },
              },
              limit: 1,
            })

            if (getTenant.docs[0]) {
              data.tenants = [
                {
                  tenant: getTenant.docs[0].id,
                  roles: ['tenant-viewer'],
                },
              ]
              // Also set the singular tenant field added by the multi-tenant plugin
              data.tenant = getTenant.docs[0].id
            } else {
              req.payload.logger.warn(
                'No "default" tenant found. User created without tenant assignment.',
              )
            }
          }
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          // await req.payload.create({
          //   collection: 'notifications',
          //   data: {
          //     user: doc.id,
          //     title: 'Welcome to Afno Event!',
          //     message: `Hello ${doc.name || 'there'}! We're excited to have you here. Start exploring events now!`,
          //     type: 'info',
          //   },
          // })
        }
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        // 1. Delete notifications
        await req.payload.delete({
          collection: 'notifications',
          where: {
            user: { equals: id },
          },
          overrideAccess: true,
        });

        // 2. Delete linked Better Auth accounts
        // Note: Better Auth usually uses 'userId' as a string field 
        // unless you mapped it as a relationship named 'user'. 
        // Check your 'accounts' collection fields!
        await req.payload.delete({
          collection: 'accounts',
          where: {
            user: { equals: id }, // Change to userId if that's the field name
          },
          overrideAccess: true,
        });

        // 3. Clear this specific user's preferences only
        // This prevents the "Failed query" crash by specifically 
        // targeting the preference entries.
        await req.payload.delete({
          collection: 'payload-preferences',
          where: {
            'user.value': { equals: id },
            'user.relationTo': { equals: 'users' }
          },
          overrideAccess: true,
        });
      }
    ]
  },
}
