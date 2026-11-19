# Security Specification — WazzimaGiygg Maker

## 1. Data Invariants
1. **Page Slug & Identity Integrity**: Every `/pages/{slug}` document must have `slug == {slug}`, `slug` matching `^[a-zA-Z0-9_\-]+$` (1..128 chars), `authorId == request.auth.uid` on create, and `authorId` and `createdAt` remain strictly immutable on update.
2. **Temporal Integrity**: `createdAt == request.time` on create; `updatedAt == request.time` on create and update.
3. **Version Monotonicity & Collaborator Locking**: On create, `version == 1`. On update, `version == existing().version + 1`. If `existing().isLocked == true` or `existing().visibility == 'private'`, only the page `authorId` or a verified admin may update or delete the page. Only the `authorId` or admin may change `isLocked` or `visibility`.
4. **Master Gate on Subcollections**: `/pages/{slug}/revisions/{revisionId}` and `/pages/{slug}/comments/{commentId}` must verify via `get(/databases/$(database)/documents/pages/$(slug))` that the parent page exists, `pageSlug == slug`, `pageAuthorId == parent.authorId`, `pageVisibility == parent.visibility`, and if `parent.visibility == 'private'` or (for revisions) `parent.isLocked == true`, only the page author or admin can write.
5. **PII Isolation**: Email addresses live exclusively in `/users/{userId}/private/info` readable and writable only by `request.auth.uid == userId` or verified admin. `/collaborators/{userId}` stores only non-PII display metadata (`uid`, `displayName`, `photoURL`).
6. **Verified Identity**: All write operations require `isSignedIn()` and `request.auth.token.email_verified == true`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoofing on Page Create**: Authenticated user `uid_attacker` creates `/pages/hijack` with `authorId: "uid_victim"`. -> **Expected: PERMISSION_DENIED**
2. **Shadow / Ghost Field Injection**: User creates `/pages/ghost` with all required fields plus `isFeatured: true` or `role: "admin"`. -> **Expected: PERMISSION_DENIED**
3. **ID Poisoning**: User creates `/pages/bad..$slug!@#` with invalid characters or length > 128. -> **Expected: PERMISSION_DENIED**
4. **Immortal Field Mutation**: Collaborator updates `/pages/start` attempting to change `authorId` or `createdAt`. -> **Expected: PERMISSION_DENIED**
5. **Locked Page Bypass**: Non-author collaborator attempts to update `/pages/locked-page` where `isLocked == true`. -> **Expected: PERMISSION_DENIED**
6. **Privilege Escalation on Lock/Visibility**: Non-author collaborator attempts to set `isLocked: true` or `visibility: "private"` on a public page created by another user. -> **Expected: PERMISSION_DENIED**
7. **Timestamp Forgery**: User submits `createdAt` or `updatedAt` with a past client timestamp instead of `request.time`. -> **Expected: PERMISSION_DENIED**
8. **Version Jump / Replay**: Collaborator updates `/pages/start` with `version: 999` or `version: 1` instead of `existing().version + 1`. -> **Expected: PERMISSION_DENIED**
9. **Orphaned Revision Write**: User attempts to create `/pages/nonexistent-page/revisions/rev1` where parent `/pages/nonexistent-page` does not exist. -> **Expected: PERMISSION_DENIED**
10. **PII Leak Attempt**: Signed-in user `uid_b` attempts to `get` `/users/uid_a/private/info`. -> **Expected: PERMISSION_DENIED**
11. **Query Scraping Private Pages**: Signed-in user `uid_b` executes `list` on `/pages` without `where('visibility', '==', 'public')` or `where('authorId', '==', 'uid_b')`. -> **Expected: PERMISSION_DENIED**
12. **Unverified Email Write & Array Poisoning**: User with `email_verified: false` tries to create a page, or verified user sends `tags` with > 8 items or non-string first item `[123]`. -> **Expected: PERMISSION_DENIED**
