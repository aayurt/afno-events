// Simple in-memory sliding window rate limiter.
// For multi-instance deployments (Vercel), replace with Redis-based limiter.

const store = new Map<string, number[]>()
const WINDOW_MS = 60_000 // 1 minute

export function checkRateLimit(key: string, maxRequests: number): {
  allowed: boolean
  remaining: number
  reset: number
} {
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  let timestamps = store.get(key) ?? []
  timestamps = timestamps.filter((t) => t > windowStart)

  if (timestamps.length >= maxRequests) {
    const reset = (timestamps[0] ?? now) + WINDOW_MS
    return { allowed: false, remaining: 0, reset }
  }

  timestamps.push(now)
  store.set(key, timestamps)
  return { allowed: true, remaining: maxRequests - timestamps.length, reset: now + WINDOW_MS }
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS
  for (const [key, timestamps] of store) {
    const filtered = timestamps.filter((t) => t > cutoff)
    if (filtered.length === 0) store.delete(key)
    else store.set(key, filtered)
  }
}, 300_000)

export function rateLimitedResponse(): Response {
  return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
}
