import { User } from '@/payload-types'

export const isAccessingSelf = ({ id, user }: { user?: User; id?: string | number }): boolean => {
  if (!user) return false
  if (user.id === id) return true
  // Compare as strings so numeric ids from the route (e.g. "123") match
  // the serial numeric user id (123) regardless of type mismatch.
  return String(user.id) === String(id)
}
