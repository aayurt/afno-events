import { isAdmin } from '@/access/admin'
import { sendFCMTopicNotification } from '@/utilities/sendFCMNotification'
import { getCachedEvents } from '@/utilities/cache'
import type { CollectionConfig } from 'payload'
import { getStripe } from '@/utilities/stripe'
import { TAG_OPTIONS } from '@/config/tags'


export const Events: CollectionConfig = {
  slug: 'events',
  access: {
    create: isAdmin,
    delete: isAdmin,
    read: () => true,
    update: isAdmin,
  },
  admin: {
    useAsTitle: 'title',
    group: 'Events',
  },
  endpoints: [
    {
      path: '/cached',
      method: 'get',
      handler: async (req) => {
        try {
          const events = await getCachedEvents(req.payload)
          return Response.json(events)
        } catch (error) {
          req.payload.logger.error(`Error in /events/cached: ${error}`)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        // Sync with Stripe only if it's a paid event
        if ((operation === 'create' || operation === 'update') && data?.pricing?.type === 'paid') {
          try {
            const stripe = getStripe()
            // 1. Ensure Stripe Product exists for the Event
            let stripeProductID = data.stripeProductID

            if (!stripeProductID) {
              const product = await stripe.products.create({
                name: data.title,
                description: data.description || '',
              })
              stripeProductID = product.id
              data.stripeProductID = stripeProductID
            } else {
              await stripe.products.update(stripeProductID, {
                name: data.title,
                description: data.description || '',
              })
            }

            // 2. Sync Ticket Types to Stripe Prices
            if (data.pricing?.ticketTypes && Array.isArray(data.pricing.ticketTypes)) {
              for (const ticketType of data.pricing.ticketTypes) {
                // If price changed or it's a new ticket type, create/update Stripe Price
                // Note: Stripe Prices are immutable, so we create a new one if amount changes
                // But for simplicity, we just create a price if it doesn't exist.
                if (!ticketType.stripePriceID) {
                  const price = await stripe.prices.create({
                    unit_amount: Math.round(ticketType.price * 100), // Stripe expects cents
                    currency: 'gbp', // Defaulting to GBP for now, can be made dynamic
                    product: stripeProductID,
                    metadata: {
                      name: ticketType.name,
                    },
                  })
                  ticketType.stripePriceID = price.id
                }
                // If we want to handle price updates, we'd need to compare and create new prices
                // and archive old ones, which is standard Stripe practice.
              }
            }
          } catch (error) {
            req.payload.logger.error(`Error syncing with Stripe: ${error}`)
            // We can decide whether to block the save or just log the error
          }
        }
        // TODO: need to delete user fav of deleted before event delete

        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if ((operation === 'create' || operation === 'update') && req?.payload) {
          try {
            const users = await req.payload.find({
              collection: 'users',
              limit: 1000,
            })
            users.docs.forEach((user) => {
              req.payload.create({
                collection: 'notifications',
                data: {
                  user: user.id,
                  title: 'Check out for ' + doc.title + ' event.',
                  message: doc.description || 'Check out the ' + doc.title + ' event.',
                  type: 'event',
                  link: `/events/${doc.slug}`,
                },
              })
            })
            const ci = typeof doc.coverImage === 'object' ? doc.coverImage : null
            const imageUrl = ci?.url
            await sendFCMTopicNotification({
              topic: 'afno-app-event',
              notification: {
                title: 'Check out for ' + doc.title + ' event.',
                body: doc.description || 'Check out the ' + doc.title + ' event.',
                imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
                id: doc.id,
              },
            })
          } catch (err) {
            console.error('FCM notification failed (non-fatal):', err)
          }
        }
        return doc
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        console.log("Deleting event collection preferences")
        // await req.payload.create({
        //   collection: 'payload-preferences',
        //   data: {
        //     key: 'collection-events-1',
        //     value: {},
        //     user: {
        //       relationTo: 'users',
        //       value: 1, // Preferences usually require a user link
        //     },
        //   }
        // });
        // await req.payload.create({
        //   collection: 'payload-preferences', // Note the slug is usually hyphenated
        //   // where: {
        //   //   key: {
        //   //     equals: 'collection-events-1',
        //   //   },

        //   // }
        //   // data: {
        //   //   key: 'collection-events-1',
        //   //   value: { test: true },
        //   //   // user: {
        //   //   //   relationTo: 'users',
        //   //   //   value: 'your-user-id-here', // Preferences usually require a user link
        //   //   // },
        //   // },
        // });
        console.log("Deleted event collection preferences")

        // Deleting favs for the event
        await req.payload.delete({
          collection: 'favorites',
          where: {
            event: {
              equals: id,
            },
          },
          req
        });
      }
    ]
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      required: false,
      type: 'textarea',
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      // required: true,
    },
    {
      name: 'showcaseImages',
      type: 'array',
      admin: {
        description: 'Curated showcase images (visible on event detail page)',
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'galleryEnabled',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Enable user-submitted photo gallery for this event',
        position: 'sidebar',
      },
    },
    {
      name: 'galleryPrice',
      type: 'number',
      defaultValue: 2.99,
      admin: {
        description: 'Price in GBP to unlock the gallery (default: £2.99)',
        position: 'sidebar',
        condition: (data) => data?.galleryEnabled === true,
      },
    },
    {
      name: 'location',
      type: 'group',
      fields: [
        {
          name: 'location',
          type: 'text',
          required: false,
          admin: {
            description: 'Location of the event (Auto-set after map selection)',
            readOnly: true,
          },
        },
        {
          name: 'mapLocation',
          type: 'text',
          required: false,
          admin: {
            description: 'Map address for Google/Apple Maps',
            readOnly: true,
          },
          // hidden: true
        },
        {
          name: 'latitude',
          type: 'number',
          required: false,
          admin: {
            description: 'Latitude coordinate',
            step: 0.000001,
            readOnly: true,
          },
          // hidden: true

        },
        {
          name: 'longitude',
          type: 'number',
          required: false,
          admin: {
            description: 'Longitude coordinate',
            step: 0.000001,
            readOnly: true,
          },
          // hidden: true

        },
        {
          type: 'ui',
          name: 'mapPicker',
          admin: {
            components: {
              Field: {
                path: '@/fields/mapPicker/MapPickerDynamic#MapPickerDynamic',
                clientProps: {
                  latPath: 'location.latitude',
                  lngPath: 'location.longitude',
                  namePath: 'location.location',
                },
              },
            },
          },
        },
      ],
    },
    {
      name: 'startDatetime',
      type: 'date',
      required: false,
      defaultValue: new Date().toISOString(),
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'MMM d, yyyy h:mm a',
        },
      },
    },
    {
      name: 'endDatetime',
      type: 'date',
      required: false,
      defaultValue: new Date().toISOString(),
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'MMM d, yyyy h:mm a',
        },
      },
    },
    {
      name: 'tags',
      type: 'select',
      hasMany: true,
      options: TAG_OPTIONS as any,
      admin: {
        description: 'Select one or more tags for this event',
        position: 'sidebar',
      },
    },
    {
      name: 'pricing',
      type: 'group',
      fields: [
        {
          name: 'paymentExternalLink',
          type: 'text',
          admin: {
            description: 'Used for external link redirection for payment',
          },
        },
        {
          name: 'type',
          type: 'select',
          defaultValue: 'free',
          options: [
            { label: 'Free', value: 'free' },
            { label: 'Paid', value: 'paid' },
          ],
        },
        {
          name: 'priceRange',
          type: 'text',
          defaultValue: 'Free',
          admin: {
            description: 'Display price (e.g., "£5.00 - £15.00" or "Free")',
          },
        },
        {
          name: 'ticketTypes',
          type: 'array',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              admin: {
                placeholder: 'e.g. VIP, General, Early Bird',
              },
            },
            {
              name: 'price',
              type: 'number',
              required: true,
              admin: {
                placeholder: 'e.g. 10',
              },
            },
            {
              name: 'description',
              type: 'textarea',
            },
            {
              name: 'stripePriceID',
              type: 'text',
              admin: {
                readOnly: true,
                position: 'sidebar',
              },
            },
          ],
          admin: {
            condition: (data) => data?.pricing?.type === 'paid',
          },
        },
      ],
    },
    {
      name: 'stripeProductID',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
      hidden: true,
    },
    {
      name: 'enabled',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      admin: {
        description: 'Enable or disable this event',
        position: 'sidebar',
      },
    },
  ],
}
