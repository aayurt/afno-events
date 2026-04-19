# Learnings - Hard-delete policy for user deletion

- Implemented a cascade delete strategy triggered on user deletion within the Users collection. The approach detaches the user from posts (removing the user from the authors array) and cascades deletions for dependent records where safe (orders, favorites, sessions) using the existing Payload API.
- The cascade is implemented in a beforeChange hook for operation === 'delete' to ensure the cascade runs as part of the deletion flow and to attempt transactional isolation, though cross-collection atomicity depends on the database and Payload's capabilities.
- Important trade-offs: deleting a user may orphan dependent records; we mitigate by cleaning up references and deleting dependent records where appropriate and permitted by permissions. Some collections (notifications) are best-effort to avoid breaking admin flows.
- Next steps: add automated tests to verify cascading behavior, add a feature flag for hard-delete vs soft-delete, and explore transactional guarantees across collections where supported by the underlying datastore.
