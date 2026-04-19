Notepad for delete-user-soft-delete plan
- Learnings will be appended here as we implement soft-delete.
- Implemented soft-delete for Users collection by adding a beforeChange hook that, on delete operation, updates the user record with a deletedAt timestamp and cancels the actual delete.
- Added a focused unit test tests/users/soft-delete.unit.test.ts to verify that the hook performs an update with deletedAt and returns false to prevent hard delete.
- Added a placeholder integration test file tests/users/soft-delete.integration.test.ts to outline REST/GraphQL endpoint tests that will run against a real server in isolation.
- Next: implement end-to-end REST/GraphQL tests against a test instance, ensure reads exclude soft-deleted users by default, and plan an undelete path for future work.
