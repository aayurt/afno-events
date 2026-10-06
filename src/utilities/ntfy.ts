/**
 * Minimal ntfy publisher (self-hosted on the VPS).
 * Env: NTFY_URL (e.g. http://127.0.0.1:2586), NTFY_TOPIC, NTFY_TOKEN.
 * Missing env = silently disabled (local dev). Never throws.
 */
export async function publishNtfy(options: {
  title: string
  message: string
  tags?: string[]
  priority?: 'min' | 'low' | 'default' | 'high' | 'urgent'
  click?: string
}): Promise<boolean> {
  const base = process.env.NTFY_URL
  const topic = process.env.NTFY_TOPIC
  const token = process.env.NTFY_TOKEN
  if (!base || !topic || !token) return false

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/${topic}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Title: sanitizeNtfyHeader(options.title),
        ...(options.tags?.length ? { Tags: sanitizeNtfyHeader(options.tags.join(',')) } : {}),
        ...(options.priority ? { Priority: options.priority } : {}),
        ...(options.click ? { Click: options.click } : {}),
      },
      body: options.message,
    })
    if (!res.ok) {
      console.error(`[ntfy] publish failed: HTTP ${res.status}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[ntfy] publish failed:', (err as Error)?.message || err)
    return false
  }
}

/**
 * HTTP header values must be Latin-1 (undici throws on e.g. em dashes).
 * The message BODY stays full UTF-8 — only headers get sanitised.
 */
export function sanitizeNtfyHeader(value: string): string {
  return (value || '')
    .replace(/[—–]/g, '-')
    .replace(/×/g, 'x')
    .replace(/[''«»]/g, "'")
    .replace(/[""„]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E]/g, '?')
}

/** "3 Oct 2026, 14:22 UK time" style stamp for purchase alerts. */
export function formatPurchaseTime(when: string | Date = new Date()): string {
  try {
    const d = new Date(when)
    const date = d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Europe/London',
    })
    const time = d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London',
    })
    return `${date}, ${time} UK`
  } catch {
    return new Date().toISOString()
  }
}
