import { describe, it, expect, vi } from 'vitest'

// Import the Users collection to access the soft-delete hook
import { Users } from '../../src/collections/Users/index.ts'

describe('Users soft-delete (beforeChange hook)', () => {
  it('should soft-delete a user by setting deletedAt and cancel the actual delete', async () => {
    // Arrange
    const updatesCalled: any[] = []
    const mockPayload: any = {
      update: async (payload: any) => {
        updatesCalled.push(payload)
        return { ok: true }
      },
      logger: {
        error: vi.fn(),
      },
    }

    const mockReq: any = {
      payload: mockPayload,
      user: { id: 'user-123', role: 'admin' },
      headers: new Map(),
    }

    // The beforeChange hook is defined in Users.hooks.beforeChange[0]
    const beforeChangeFn = (Users.hooks?.beforeChange && Users.hooks.beforeChange[0]) as Function

    // Act
    const result = await beforeChangeFn({ data: {}, req: mockReq, operation: 'delete', id: 'user-123' })

    // Assert
    // The hook should cancel the real delete by returning false
    expect(result).toBe(false)
    // It should perform a soft-delete by calling req.payload.update with deletedAt
    expect(updatesCalled.length).toBe(1)
    const updateCall = updatesCalled[0]
    expect(updateCall).toBeDefined()
    expect(updateCall.collection).toBe('users')
    expect(updateCall.id).toBe('user-123')
    expect(updateCall.data).toHaveProperty('deletedAt')
    // The update call should include the original req for atomicity
    expect(updateCall.req).toBe(mockReq)
  })
})
