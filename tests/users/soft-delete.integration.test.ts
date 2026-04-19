import { describe, it, expect, test } from 'vitest'

// This integration test suite is a placeholder to outline REST/GraphQL endpoint expectations
// The actual integration tests require a running Payload server and test DB.
describe('soft-delete REST/GraphQL integration (skeleton)', () => {
  test.skip('DELETE /users/:id should mark user as deleted (soft-delete)', async () => {
    // Intentionally skipped - requires running server
    expect(true).toBe(true)
  })

  test.skip('GET /users should exclude soft-deleted users by default', async () => {
    // Intentionally skipped - requires running server
    expect(true).toBe(true)
  })
})
