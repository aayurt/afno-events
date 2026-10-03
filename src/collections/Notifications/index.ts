import { isSuperAdminAccess } from '@/access/isSuperAdmin'
import type { CollectionConfig } from 'payload'
import { updateAndDeleteAccess } from '../Users/access/updateAndDelete'

export const Notifications: CollectionConfig = {
    slug: 'notifications',
    admin: {
        useAsTitle: 'title',
        defaultColumns: ['title', 'user', 'type', 'read', 'createdAt'],
        group: 'Users',
        hidden: ({ user }) => {
            if (!user) return true
            if (user.role === 'super-admin') return false
            return true
        },
    },
    endpoints: [
        {
            path: '/mark-all-read',
            method: 'post',
            handler: async (req) => {
                // Prefer Payload's own auth (same as circle-alerts endpoint);
                // fall back to resolving the Better Auth session from cookies.
                let user: any = (req as any).user
                if (!user) {
                    try {
                        const authResult = await req.payload.auth({
                            headers: req.headers,
                            canSetHeaders: false,
                        })
                        user = authResult?.user ?? null
                    } catch (err) {
                        req.payload.logger.error(`mark-all-read session resolve failed: ${err}`)
                        user = null
                    }
                }

                if (!user) {
                    return Response.json({ error: 'Unauthorized' }, { status: 401 })
                }

                // Better Auth hands serial IDs back as strings ("28") but the
                // postgres adapter compares relationship columns as numbers —
                // coerce so the where clause actually matches the user's rows.
                const rawId = (user as any).id
                const userId = typeof rawId === 'string' && /^\d+$/.test(rawId) ? parseInt(rawId, 10) : rawId

                try {
                    const result = await req.payload.update({
                        collection: 'notifications',
                        where: {
                            and: [
                                {
                                    user: {
                                        equals: userId,
                                    },
                                },
                                {
                                    read: {
                                        equals: false,
                                    },
                                },
                            ],
                        },
                        data: {
                            read: true,
                        },
                        overrideAccess: true,
                    })

                    return Response.json({ success: true, updated: (result as any)?.docs?.length ?? 0 })
                } catch (error) {
                    req.payload.logger.error(`Error marking all notifications as read: ${error}`)
                    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
                }
            },
        },
    ],
    access: {
        create: isSuperAdminAccess,
        read: ({ req }) => {
            if (!req.user) return false
            if (req.user.role === 'super-admin') return true
            return {
                user: {
                    equals: req.user.id,
                },
            }
        },
        update: ({ req }) => {
            if (!req.user) return false
            if (req.user.role === 'super-admin') return true
            return {
                user: {
                    equals: req.user.id,
                },
            }
        },
        delete: isSuperAdminAccess,
    },
    fields: [
        {
            name: 'user',
            type: 'relationship',
            relationTo: 'users',
            required: true,
            index: true,
            admin: {
                position: 'sidebar',
            },
        },
        {
            name: 'title',
            type: 'text',
            required: true,
        },
        {
            name: 'message',
            type: 'textarea',
            required: true,
        },
        {
            name: 'type',
            type: 'select',
            defaultValue: 'info',
            options: [
        { label: 'Information', value: 'info' },
        { label: 'Event Alert', value: 'event' },
        { label: 'Reminder', value: 'reminder' },
        { label: 'System', value: 'system' },
        { label: 'Gallery', value: 'gallery' },
            ],
            admin: {
                position: 'sidebar',
            },
        },
        {
            name: 'read',
            type: 'checkbox',
            defaultValue: false,
            admin: {
                position: 'sidebar',
            },
        },
        {
            name: 'link',
            type: 'text',
            admin: {
                description: 'Optional link to redirect the user (e.g. /events/123)',
            },
        },
    ],
    timestamps: true,
}
