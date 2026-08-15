const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000 // daily once tables exist
const RETRY_INTERVAL_MS = 10 * 60 * 1000 // retry every 10 min while tables are missing
const COOLDOWN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
// Keep expired location rows briefly so we never race a live client; then purge.
const EXPIRED_LOCATION_RETENTION_MS = 60 * 60 * 1000 // 1 hour

// Warn once per process about missing tables, then stay quiet.
let warnedMissingTables = false

const isMissingTableError = (error: any): boolean => {
  const msg = [
    error?.message,
    error?.cause?.message,
    error?.error,
    typeof error === 'string' ? error : '',
  ]
    .filter(Boolean)
    .join(' ')
  // Payload surfaces the underlying pg error ("relation ... does not exist")
  // or its own "Failed query: ..." wrapper when the table isn't provisioned.
  return /does not exist|Failed query/i.test(msg)
}

const logMissingTables = (payload: any, table: string) => {
  if (warnedMissingTables) return
  warnedMissingTables = true
  payload.logger.warn(
    `Cleanup: table "${table}" is missing — this database hasn't been migrated with the newest collections. ` +
      `Run \`pnpm payload migrate:create\` then \`pnpm payload migrate\` (or boot the server once in dev mode, ` +
      `which auto-creates tables) to provision it. Cleanup will retry automatically every ${RETRY_INTERVAL_MS / 60000} minutes.`,
  )
}

const purgeStaleRows = async (payload: any): Promise<boolean> => {
  const now = Date.now()
  let ok = true
  try {
    await payload.delete({
      collection: 'alert-cooldowns' as any,
      where: {
        firedAt: { lessThan: new Date(now - COOLDOWN_RETENTION_MS).toISOString() },
      },
      overrideAccess: true,
    })
  } catch (error: any) {
    ok = false
    if (isMissingTableError(error)) logMissingTables(payload, 'alert_cooldowns')
    else payload.logger.error(`Cleanup: error purging alert-cooldowns: ${error?.message ?? error}`)
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
    ok = false
    if (isMissingTableError(error)) logMissingTables(payload, 'circle_locations')
    else payload.logger.error(`Cleanup: error purging expired locations: ${error?.message ?? error}`)
  }
  return ok
}

/**
 * Starts the cleanup scheduler. Runs once immediately on boot, then:
 * - every 10 minutes while the tables are missing (so it self-heals once the
 *   database is migrated, without a restart), and
 * - daily after the first successful purge.
 * Idempotent (where-based deletes), safe on multiple instances.
 */
export const startCleanupScheduler = (payload: any): void => {
  let timer: ReturnType<typeof setInterval> | null = null
  const schedule = (ms: number) => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    timer = setInterval(tick, ms)
    timer.unref?.()
  }
  const tick = async () => {
    const ok = await purgeStaleRows(payload)
    if (ok) warnedMissingTables = false
    schedule(ok ? CLEANUP_INTERVAL_MS : RETRY_INTERVAL_MS)
  }
  tick()
}
