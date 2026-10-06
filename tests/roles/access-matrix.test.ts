import { describe, expect, it } from 'vitest'
import { isAdmin } from '@/access/admin'
import { isSuperAdmin } from '@/access/isSuperAdmin'
import { anyone } from '@/access/anyone'
import { authenticated } from '@/access/authenticated'
import { Orders } from '@/collections/Orders/index'
import { Notifications } from '@/collections/Notifications/index'
import { Tenants } from '@/collections/Tenants/index'
import { Events } from '@/collections/Events/index'
import { Media } from '@/collections/Media'
import { updateAndDeleteAccess as tenantsUpdateDelete } from '@/collections/Tenants/access/updateAndDelete'

// Access matrix per role. req() builds the minimal shape access fns read.
const req = (user: any) => ({ req: { user } }) as any

const anon = null
const fan = { id: 1, role: 'user' }
const organiser = { id: 2, role: 'admin', tenants: [{ tenant: 38, roles: ['tenant-admin'] }] }
const superAdmin = { id: 3, role: 'super-admin' }

describe('role primitives', () => {
  it('anonymous has no identity or admin rights', () => {
    expect(authenticated(req(anon))).toBe(false)
    expect(isAdmin(req(anon))).toBe(false)
    expect(isSuperAdmin(anon)).toBe(false)
    expect(anyone()).toBe(true)
  })

  it('fan is authenticated but not admin', () => {
    expect(authenticated(req(fan))).toBe(true)
    expect(isAdmin(req(fan))).toBe(false)
    expect(isSuperAdmin(fan)).toBe(false)
  })

  it('organiser admin is admin but not super-admin', () => {
    expect(isAdmin(req(organiser))).toBe(true)
    expect(isSuperAdmin(organiser)).toBe(false)
  })

  it('super-admin is both', () => {
    expect(isAdmin(req(superAdmin))).toBe(true)
    expect(isSuperAdmin(superAdmin)).toBe(true)
  })
})

describe('orders access', () => {
  it('anyone (even anonymous) can create an order', () => {
    expect(Orders.access.create?.(req(anon))).toBe(true)
  })

  it('anonymous cannot read orders', () => {
    expect(Orders.access.read?.(req(anon))).toBe(false)
  })

  it('fans read only their own orders', () => {
    expect(Orders.access.read?.(req(fan))).toEqual({ buyer: { equals: 1 } })
  })

  it('admins and super-admins read everything', () => {
    expect(Orders.access.read?.(req(organiser))).toBe(true)
    expect(Orders.access.read?.(req(superAdmin))).toBe(true)
  })

  it('only admins can update/delete orders', () => {
    expect(Orders.access.update?.(req(fan))).toBe(false)
    expect(Orders.access.update?.(req(anon))).toBe(false)
    expect(Orders.access.update?.(req(organiser))).toBe(true)
    expect(Orders.access.update?.(req(superAdmin))).toBe(true)
    expect(Orders.access.delete?.(req(fan))).toBe(false)
    expect(Orders.access.delete?.(req(superAdmin))).toBe(true)
  })
})

describe('notifications access', () => {
  it('only super-admins can create', () => {
    expect(Notifications.access.create?.(req(fan))).toBe(false)
    expect(Notifications.access.create?.(req(organiser))).toBe(false)
    expect(Notifications.access.create?.(req(superAdmin))).toBe(true)
  })

  it('fans read/update only their own, super-admins all', () => {
    expect(Notifications.access.read?.(req(anon))).toBe(false)
    expect(Notifications.access.read?.(req(fan))).toEqual({ user: { equals: 1 } })
    expect(Notifications.access.read?.(req(superAdmin))).toBe(true)
    expect(Notifications.access.update?.(req(fan))).toEqual({ user: { equals: 1 } })
  })

  it('only super-admins can delete', () => {
    expect(Notifications.access.delete?.(req(fan))).toBe(false)
    expect(Notifications.access.delete?.(req(superAdmin))).toBe(true)
  })
})

describe('tenants access', () => {
  it('only super-admins can create tenants', () => {
    expect(Tenants.access.create?.(req(fan))).toBe(false)
    expect(Tenants.access.create?.(req(organiser))).toBe(false)
    expect(Tenants.access.create?.(req(superAdmin))).toBe(true)
  })

  it('tenant list is public', () => {
    expect(Tenants.access.read?.(req(anon))).toBe(true)
    expect(Tenants.access.read?.(req(fan))).toBe(true)
  })

  it('update/delete: super-admin everywhere, tenant-admin own tenants only', () => {
    expect(tenantsUpdateDelete({ req: { user: anon } } as any)).toBe(false)
    expect(tenantsUpdateDelete({ req: { user: superAdmin } } as any)).toBe(true)
    expect(tenantsUpdateDelete({ req: { user: organiser } } as any)).toEqual({
      id: { in: [38] },
    })
    expect(tenantsUpdateDelete({ req: { user: fan } } as any)).toEqual({ id: { in: [] } })
  })
})

describe('events access', () => {
  it('events are publicly readable', () => {
    expect(Events.access.read?.(req(anon))).toBe(true)
    expect(Events.access.read?.(req(fan))).toBe(true)
  })

  it('only admins manage events', () => {
    for (const op of ['create', 'update', 'delete'] as const) {
      expect(Events.access[op]?.(req(anon))).toBe(false)
      expect(Events.access[op]?.(req(fan))).toBe(false)
      expect(Events.access[op]?.(req(organiser))).toBe(true)
      expect(Events.access[op]?.(req(superAdmin))).toBe(true)
    }
  })
})

describe('media access', () => {
  it('media is publicly readable', () => {
    expect(Media.access.read?.(req(anon))).toBe(true)
  })

  it('any signed-in user can upload; anonymous cannot', () => {
    expect(Media.access.create?.(req(anon))).toBe(false)
    expect(Media.access.create?.(req(fan))).toBe(true)
    expect(Media.access.create?.(req(superAdmin))).toBe(true)
  })
})

describe('admin panel visibility', () => {
  it('media + notifications collections hide from non-super-admins', () => {
    for (const collection of [Media, Notifications]) {
      const hidden = collection.admin?.hidden as any
      expect(hidden({ user: anon })).toBe(true)
      expect(hidden({ user: fan })).toBe(true)
      expect(hidden({ user: superAdmin })).toBe(false)
    }
  })
})
