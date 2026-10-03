import type { Tenant, User } from '../payload-types'
import { extractID } from './extractID'

/**
 * Returns array of all tenant IDs assigned to a user
 *
 * @param user - User object with tenants field
 * @param role - Optional role to filter by
 */
export const getUserTenantIDs = (
  user: null | User,
  role?: NonNullable<User['tenants']>[number]['roles'][number],
): Tenant['id'][] => {
  if (!user) {
    return []
  }

  // Better Auth sessions hand back serial IDs as strings ("38") but the
  // postgres adapter validates relationships as numbers — a string tenant
  // fails writes with "The following field is invalid: Assigned Tenant".
  // Coerce once here so every caller gets usable IDs.
  const coerce = (id: unknown): number | unknown =>
    typeof id === 'string' && /^\d+$/.test(id) ? parseInt(id, 10) : id

  return (
    user?.tenants?.reduce<Tenant['id'][]>((acc, { roles, tenant }) => {
      if (role && !roles?.includes(role)) {
        return acc
      }

      if (tenant) {
        acc.push(coerce(extractID(tenant)) as Tenant['id'])
      }

      return acc
    }, []) || []
  )
}
