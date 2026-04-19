## Plan: Soft-delete user deletion
- [ ] Analyze current hard-delete plan and revert to soft-delete approach
- [ ] Add deletedAt field to User schema
- [ ] Implement soft-delete path in User deletion flow (set deletedAt, cancel actual deletion)
- [ ] Ensure reads exclude deleted users by default (RBAC-safe)
- [ ] Update tests to cover soft-delete scenarios (delete marks, exclude in reads, restore path if needed)
- [ ] Document migration/rollback strategy and auditing
- [ ] Tests: Soft-delete tests added
