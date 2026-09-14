export const REMINDER_PREFIX = 'afno-event-reminder-'

export type StoredReminder = {
  /** Epoch ms when the notification should fire. */
  fireAt: number
  /** Minutes before start the user chose (informational). */
  minutes: number
  /** Notification title shown when firing. */
  title: string
  /** Notification body shown when firing. */
  body: string
  /** In-app path to open when the notification is clicked. */
  path: string
}

export const reminderKey = (eventId: number | string) => `${REMINDER_PREFIX}${eventId}`

export function getReminder(eventId: number | string): StoredReminder | null {
  try {
    const raw = localStorage.getItem(reminderKey(eventId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredReminder>
    if (
      typeof parsed.fireAt !== 'number' ||
      Number.isNaN(parsed.fireAt) ||
      typeof parsed.title !== 'string'
    ) {
      localStorage.removeItem(reminderKey(eventId))
      return null
    }
    // Expired reminders are dropped on read.
    if (parsed.fireAt <= Date.now()) {
      localStorage.removeItem(reminderKey(eventId))
      return null
    }
    return {
      fireAt: parsed.fireAt,
      minutes: typeof parsed.minutes === 'number' ? parsed.minutes : 0,
      title: parsed.title,
      body: typeof parsed.body === 'string' ? parsed.body : '',
      path: typeof parsed.path === 'string' ? parsed.path : '/app',
    }
  } catch {
    return null
  }
}

export function setReminder(eventId: number | string, reminder: StoredReminder) {
  try {
    localStorage.setItem(reminderKey(eventId), JSON.stringify(reminder))
  } catch {
    // Storage unavailable (private mode, quota) — reminders just won't persist.
  }
}

export function removeReminder(eventId: number | string) {
  try {
    localStorage.removeItem(reminderKey(eventId))
  } catch {}
}

function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Fires every stored reminder whose time has come (and drops expired ones).
 * Safe to call repeatedly — it only acts on due entries. Runs from the app
 * shell's poll so a reminder set for one event page still fires while the
 * user browses other pages.
 */
export function fireDueReminders() {
  if (!notificationsSupported()) return
  if (Notification.permission !== 'granted') {
    // Not allowed (or undecided): nothing can be shown — drop nothing for
    // 'default' (the user may still grant later), but clear nothing now.
    return
  }
  let keys: string[] = []
  try {
    keys = Object.keys(localStorage).filter((k) => k.startsWith(REMINDER_PREFIX))
  } catch {
    return
  }

  const now = Date.now()
  const MAX_LATE_MS = 10 * 60_000 // never fire a stale reminder more than 10 min late
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as Partial<StoredReminder>
      if (typeof parsed.fireAt !== 'number' || Number.isNaN(parsed.fireAt)) {
        localStorage.removeItem(key)
        continue
      }
      if (parsed.fireAt > now) continue

      const title = typeof parsed.title === 'string' ? parsed.title : ''
      const body = typeof parsed.body === 'string' ? parsed.body : ''
      const path = typeof parsed.path === 'string' ? parsed.path : ''
      localStorage.removeItem(key)

      // Fired too late (permission granted long after, tab closed, etc.) or
      // missing content — drop silently instead of nagging.
      if (now - parsed.fireAt > MAX_LATE_MS) continue
      if (!title || !path) continue

      const notification = new Notification(title, {
        body,
        tag: key,
        icon: '/logo.png',
        badge: '/logo.png',
      })
      notification.onclick = () => {
        window.focus()
        window.location.href = path
      }
    } catch {
      // Corrupt entry — drop it and move on.
      try {
        localStorage.removeItem(key)
      } catch {}
    }
  }
}
