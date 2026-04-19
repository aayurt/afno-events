## Problems / Risks
- Potential performance impact from cascading deletes across large datasets; mitigated by batching and limiting depth.
- If a collection's access rules differ, cascade may fail (e.g., notifications deletion by non-super-admin). Consider alternative strategies (soft-delete references).
- Hard-delete policy may conflict with data retention requirements; ensure compliance and offer configurable opt-out or archiving instead.
