/**
 * Persistent alert cooldowns backed by the `alert-cooldowns` collection.
 *
 * Unlike an in-memory Map, this survives server restarts and works across
 * multiple instances, so nearby / geofence alerts aren't duplicated after a
 * redeploy or when requests hit different nodes.
 *
 * Returns `true` when an alert should fire (recording the time), `false` when
 * the key is still within its cooldown window.
 */
export const shouldFireAlert = async (
  payload: any,
  key: string,
  ttlMs: number,
): Promise<boolean> => {
  const found = await payload.find({
    collection: 'alert-cooldowns' as any,
    where: { key: { equals: key } },
    limit: 1,
    overrideAccess: true,
  })

  const now = Date.now()
  const doc = found.docs?.[0]

  if (!doc) {
    // First time this key fires. On a unique-key race (two requests at once),
    // the loser suppresses its alert — exactly the dedup we want.
    try {
      await payload.create({
        collection: 'alert-cooldowns' as any,
        data: { key, firedAt: new Date(now).toISOString() },
        overrideAccess: true,
      })
      return true
    } catch {
      return false
    }
  }

  const firedAt = new Date(doc.firedAt).getTime()
  if (now - firedAt >= ttlMs) {
    await payload.update({
      collection: 'alert-cooldowns' as any,
      id: doc.id,
      data: { firedAt: new Date(now).toISOString() },
      overrideAccess: true,
    })
    return true
  }

  return false
}
