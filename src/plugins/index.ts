import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { beforeSyncWithSearch } from '@/search/beforeSync'
import { searchFields } from '@/search/fieldOverrides'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { searchPlugin } from '@payloadcms/plugin-search'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { PayloadRequest, Plugin } from 'payload'

import { isAdmin } from '@/access/admin'
import { betterAuthOptions } from '@/lib/auth/config'
import { getBaseUrl } from '@/lib/auth/getBaseUrl'
import { Config, Page, Post, User } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import {
  betterAuthCollections,
  createBetterAuthPlugin,
  payloadAdapter,
} from '@delmaredigital/payload-better-auth'
import { betterAuth } from 'better-auth'
import { resend } from '@/lib/email/resend'
import { sendVerificationEmail, sendPasswordResetEmail } from '@/emails'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { isSuperAdmin, isSuperAdminAccess } from '@/access/isSuperAdmin'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'
import { trustedOriginsValues } from '@/trustedOrigin'

const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
  return doc?.title
    ? `${doc.title} | ${process.env.NEXT_PUBLIC_APP_NAME}`
    : process.env.NEXT_PUBLIC_APP_NAME || 'Afno Event'
}

const generateURL: GenerateURL<Post | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}
const baseUrl = getBaseUrl()

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'posts'],
    overrides: {
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
      access: {
        create: isAdmin,
        update: isAdmin,
        delete: isAdmin,
      },
      admin: {
        hidden: ({ user }) => {
          if (!user) return true
          if (user.role === 'super-admin') return false
          return true
        },
      }
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formOverrides: {
      access: {
        create: isSuperAdminAccess,
        update: isSuperAdminAccess,
        delete: isSuperAdminAccess,
      },
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
      admin: {
        hidden: ({ user }) => {
          if (!user) return true
          if (user.role === 'super-admin') return false
          return true
        },
      }
    },
    formSubmissionOverrides: {
      access: {
        create: isSuperAdminAccess,
        update: isSuperAdminAccess,
        delete: isSuperAdminAccess,
      },
      admin: {
        hidden: ({ user }) => {
          if (!user) return true
          if (user.role === 'super-admin') return false
          return true
        },
      }
    },
  }),
  searchPlugin({
    collections: ['posts'],
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
      access: {
        create: isSuperAdminAccess,
        update: isSuperAdminAccess,
        delete: isSuperAdminAccess,
      },
      admin: {
        hidden: ({ user }) => {
          if (!user) return true
          if (user.role === 'super-admin') return false
          return true
        },
      }
    },

  }),
  payloadCloudPlugin(),
  betterAuthCollections({
    betterAuthOptions,
    skipCollections: ['user'], // We define Users ourselves
    customizeCollection: (modelKey, collection) => {
      return {
        ...collection,
        admin: {
          ...collection.admin,
          hidden: ({ user }) => {
            if (!user) return true
            if (user.role === 'super-admin') return false
            return true
          },
        }
      }
    }
  }),
  // Initialize Better Auth with auto-injected endpoints and admin components
  createBetterAuthPlugin({
    createAuth: (payload) =>
      betterAuth({
        ...betterAuthOptions,
        database: payloadAdapter({
          payloadClient: payload,
          // adapterConfig: { enableDebugLogs: true }, // Uncomment to enable debug logging
        }),
        emailVerification: {
          sendVerificationEmail: async ({ user, url, token }, request) => {
            await sendVerificationEmail(user.email, {
              userName: user.name,
              verifyUrl: url,
            })
          },
        },
        emailAndPassword: {
          enabled: true,
          sendResetPassword: async ({ user, url, token }, request) => {
            await sendPasswordResetEmail(user.email, {
              userName: user.name,
              resetUrl: url,
            })
          },
        },
        // For Payload's default SERIAL IDs:
        advanced: {
          database: {
            generateId: 'serial',
          },
        },
        baseURL: getBaseUrl(),
        secret: process.env.BETTER_AUTH_SECRET,
        trustedOrigins: [baseUrl, ...trustedOriginsValues], // Or use withBetterAuthDefaults() below
      }),
    admin: {
      disableLoginView: false,
      // beforeLoginComponent: "@/components/BeforeLogin",
      loginViewComponent: '@/components/auth/login-form',
      login: {
        requiredRole: 'admin',
        afterLoginPath: '/admin',
        enableForgotPassword: true,
      },
    },
  }),
  multiTenantPlugin<Config>({
    collections: {
      posts: {},
      users: {},
      media: {},
      events: {},
      'event-photos': {},
    },
    tenantField: {
      label: 'Assigned Tenant',
      access: {
        read: () => true,
        update: ({ req }: { req: PayloadRequest }) => {
          if (isSuperAdmin(req.user)) {
            return true
          }
          return getUserTenantIDs(req.user).length > 0
        },
      },
    },
    tenantsArrayField: {
      includeDefaultField: false,
    },
    userHasAccessToAllTenants: (user: User) => isSuperAdmin(user),
  }),
]
