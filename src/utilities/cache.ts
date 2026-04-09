import type { Payload } from 'payload'
import type { Event } from '@/payload-types'

export const getCachedEvents = async (payload: Payload): Promise<Event[]> => {
    const events = await payload.find({
        collection: 'events',
        limit: 1000,
        pagination: false,
    })

    return events.docs
}

export const getCachedEvent = async (
    payload: Payload,
    id: string | number,
): Promise<Event | null> => {
    const event = await payload.findByID({
        collection: 'events',
        id: id as any,
    })

    return event
}

export const invalidateEventsCache = async (id?: string | number) => {
    // No-op as Redis is removed
}

