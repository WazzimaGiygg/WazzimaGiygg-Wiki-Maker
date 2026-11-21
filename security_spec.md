# Security Specification — WazzimaGiygg Maker

## 1. Data Invariants
1. **Page Slug & Identity Integrity**: Every `/pages/{slug}` document must have `slug == {slug}`, `slug` matching `^[a-zA-Z0-9_\-]+$` (1..128 chars), `authorId == request.auth.uid` on create, and `authorId` and `createdAt` remain strictly immutable on update.
2. **Temporal Integrity**: `createdAt == request.time` on create; `updatedAt == request.time` on create and update.
3. **Version Monotonicity & Collaborator Locking**: On create, `version == 1`. On update, `version == existing().version + 1`. If `existing().isLocked == true` or `existing().visibility == 'private'`, only the page `authorId` or a verified non-blocked admin may update or delete the page. Only the `authorId` or admin may change `isLocked` or `visibility`.
4. **Master Gate & Batch Atomicity on Subcollections**: `/pages/{slug}/revisions/{revisionId}` must use `revisionId == 'v_' + string(version)` and match `getAfter(/pages/{slug})` (`title`, `content`, `pageVisibility`, `pageAuthorId`, `version`, `editorId == lastEditorId`, `updatedAt == request.time`). `/pages/{slug}/comments/{commentId}` must verify via `get(/pages/{slug})` that the parent page exists, `pageSlug == slug`, `pageAuthorId == parent.authorId`, `pageVisibility == parent.visibility`, and respect private access. `/collaborators/{userId}/edits/{editId}` must verify both parent collaborator and target page exist after batch commit with synced `pageTitle`, `pageVisibility`, `version`, `lastEditorId`, and `updatedAt`.
5. **PII Isolation & URI Hardening**: Email addresses live exclusively in `/users/{userId}/private/info` (`docId == 'info'`, valid email format) readable only by `request.auth.uid == userId` or verified non-blocked admin. `/collaborators/{userId}` stores only non-PII display metadata (`uid`, `displayName`, `photoURL` restricted to empty or `https?://`).
6. **Governance & Anti-Escalation**: Only verified, non-blocked admins (`!exists(/blocked_users/uid)`) hold governance privileges. Regular admins cannot block, unblock, or LGPD-purge admins or bureaucrats (`canModerateTarget(uid)`), and no actor may self-unblock or modify their own `/admins/{uid}` record.
7. **Evaluation Order (Denial-of-Wallet Guard)**: Every write rule validates `isVerified()`, `isValidId()`, static blueprint schema (`keys().hasAll`/`hasOnly`), and temporal/immutability invariants before issuing `exists()` or `get()` lookups.

## 2. Adversarial Red Team Payloads
1. **Identity Spoofing on Page Create**: Authenticated user `uid_attacker` creates `/pages/hijack` with `authorId: "uid_victim"`. -> **Expected: PERMISSION_DENIED**
2. **Shadow / Ghost Field Injection**: User creates or updates `/pages/ghost` with extra keys (`isFeatured: true` or `role: "admin"`). -> **Expected: PERMISSION_DENIED**
3. **ID Poisoning**: User creates `/pages/bad..$slug!@#` with invalid characters or length > 128. -> **Expected: PERMISSION_DENIED**
4. **Immortal Field Mutation**: Collaborator updates `/pages/start` attempting to change `authorId` or `createdAt`. -> **Expected: PERMISSION_DENIED**
5. **Locked Page Bypass**: Non-author collaborator attempts to update `/pages/locked-page` where `isLocked == true`. -> **Expected: PERMISSION_DENIED**
6. **Privilege Escalation on Lock/Visibility**: Non-author collaborator attempts to set `isLocked: true` or `visibility: "private"` on a public page created by another user. -> **Expected: PERMISSION_DENIED**
7. **Timestamp Forgery**: User submits `createdAt` or `updatedAt` with a past client timestamp instead of `request.time`. -> **Expected: PERMISSION_DENIED**
8. **Version Jump / Replay**: Collaborator updates `/pages/start` with `version: 999` or `version: 1` instead of `existing().version + 1`. -> **Expected: PERMISSION_DENIED**
9. **Orphaned or Unsynchronized Revision Write**: User attempts to create `/pages/start/revisions/fake_id` or create `/pages/start/revisions/v_1` without updating `/pages/start` in the same atomic batch. -> **Expected: PERMISSION_DENIED**
10. **PII Leak Attempt & Private Doc Injection**: Signed-in user `uid_b` attempts to `get` `/users/uid_a/private/info`, or `uid_a` writes `/users/uid_a/private/other`. -> **Expected: PERMISSION_DENIED**
11. **Query Scraping Private Pages**: Signed-in user `uid_b` executes `list` on `/pages` without `where('visibility', '==', 'public')` or `where('authorId', '==', 'uid_b')`. -> **Expected: PERMISSION_DENIED**
12. **Unverified Email, Array Slot Poisoning & Avatar XSS**: Unverified user writes a page, user sends `tags: ["ok", 12345]`, or user writes `photoURL: "javascript:alert(1)"`. -> **Expected: PERMISSION_DENIED**
13. **Blocked Admin Self-Unblock / Bureaucrat Block Escalation**: A blocked admin attempts to delete `/blocked_users/{selfUid}` or a regular admin attempts to block a bureaucrat. -> **Expected: PERMISSION_DENIED**
