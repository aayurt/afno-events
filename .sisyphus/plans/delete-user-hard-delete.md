# Plan: Hard-delete user deletion
- [ ] Investigate and implement hard-delete policy for user deletion across codebase
- [ ] Map entry points (REST endpoints, GraphQL mutations, internal services)
- [ ] Identify cascade deletion requirements for related records
- [ ] Implement transactional, hard-delete path with proper RBAC checks
- [ ] Create/Update tests for unit and integration coverage
- [ ] Document migration plan and rollback
