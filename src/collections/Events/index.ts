import { isAdmin } from '@/access/admin'
import { sendFCMTopicNotification } from '@/utilities/sendFCMNotification'
import { getCachedEvents, invalidateEventsCache } from '@/utilities/cache'
import type { CollectionConfig } from 'payload'
import { getStripe } from '@/utilities/stripe'

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
        if (data?.pricing?.type === 'paid') {
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
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if ((operation === 'create' || operation === 'update') && req?.payload) {
          // Invalidate cache
          await invalidateEventsCache(doc.id)

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
          await sendFCMTopicNotification({
            topic: 'afno-app-event',
            notification: {
              title: 'Check out for ' + doc.title + ' event.',
              body: doc.description || 'Check out the ' + doc.title + ' event.',
              imageUrl: doc.coverImage?.url,
              id: doc.id,
            },
          })
        }
        return doc
      },
    ],
    afterDelete: [
      async ({ id }) => {
        await invalidateEventsCache(id)
      },
    ],
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
      name: 'gallery',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
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
            description: 'Location of the event location',
          },
        },
        {
          name: 'Map location',
          type: 'text',
          required: false,
          admin: {
            description: 'Map address of the event location for google maps',
          },
        },
        {
          name: 'latitude',
          type: 'number',
          required: false,
          admin: {
            description: 'Latitude coordinate of the event location',
            step: 0.000001,
          },
        },
        {
          name: 'longitude',
          type: 'number',
          required: false,
          admin: {
            description: 'Longitude coordinate of the event location',
            step: 0.000001,
          },
        },
      ],
      admin: {
        description: 'Event location coordinates',
      },
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
      options: [
        { label: 'Music', value: 'music' },
        { label: 'Gaming', value: 'gaming' },
        { label: 'Theatre', value: 'theatre' },
        { label: 'Arts', value: 'arts' },
        { label: 'Business', value: 'business' },
        { label: 'Technology', value: 'technology' },
        { label: 'Sports', value: 'sports' },
        { label: 'Food & Drink', value: 'food-drink' },
        { label: 'Exhibition', value: 'exhibition' },
        { label: 'Comedy', value: 'comedy' },
        { label: 'Workshop', value: 'workshop' },
        { label: 'Fitness', value: 'fitness' },
      ],
      admin: {
        description: 'Select one or more tags for this event',
        position: 'sidebar',
      },
    },
    {
      name: 'paymentExternalLink',
      type: 'text',
      admin: {
        description: 'Used for external link redirection for payment',
      },
    },
    {
      name: 'pricing',
      type: 'group',
      fields: [
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
