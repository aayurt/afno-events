const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000 // daily
const COOLDOWN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
// Keep expired location rows briefly so we never race a live client; then purge.
const EXPIRED_LOCATION_RETENTION_MS = 60 * 60 * 1000 // 1 hour

const purgeStaleRows = async (payload: any): Promise<void> => {
  const now = Date.now()
  try {
    await payload.delete({
      collection: 'alert-cooldowns' as any,
      where: {
        firedAt: { lessThan: new Date(now - COOLDOWN_RETENTION_MS).toISOString() },
      },
      overrideAccess: true,
    })
  } catch (error: any) {
    payload.logger.error(`Cleanup: error purging alert-cooldowns: ${error.message}`)
  }
  try {
    await payload.delete({
      collection: 'circle-locations' as any,
      where: {
        expiresAt: { lessThan: new Date(now - EXPIRED_LOCATION_RETENTION_MS).toISOString() },
      },
      overrideAccess: true,
    })
  } catch (error: any) {
    payload.logger.error(`Cleanup: error purging expired locations: ${error.message}`)
  }
}

/**
 * Starts the nightly cleanup scheduler. Runs once immediately on boot, then
 * every 24h. Idempotent (where-based deletes), safe on multiple instances.
 */
export const startCleanupScheduler = (payload: any): void => {
  purgeStaleRows(payload)
  const timer = setInterval(() => purgeStaleRows(payload), CLEANUP_INTERVAL_MS)
  timer.unref?.()
}
