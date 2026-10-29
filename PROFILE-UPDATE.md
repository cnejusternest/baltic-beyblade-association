# Player profiles and worldwide countries (staged)

This branch adds a working **My profile** link to BBA navigation; a player's private account page;
country selection and changes for 250 countries/territories (ISO 3166-1 alpha-2 plus XK);
and a initials avatar placeholder. It does **not** implement photo uploads.

## Important: database migration before merge

The production D1 `users.country` column currently accepts only LV/LT/EE. The new API
will reject non-Baltic saves until the database migration runs. Do not merge first.

1. Backup **bba-db** (D1 Time Travel bookmark or SQL export); pause registrations briefly.
2. Record `SELECT COUNT(*) AS users_before FROM users;` and `SELECT COUNT(*) AS sessions_before FROM sessions;`.
3. In Cloudflare D1 -> `bba-db` -> Console, run the **entire contents** of
   `migrations/2026-10-29-worldwide-countries.sql` as one script, only once.
4. Verify `PRAGMA foreign_key_check;` returns no rows,
   `PRAGMA table_info(users);` includes `avatar_key`,
   and user and session counts are unchanged.
5. Only then merge the pull request into `main`. Cloudflare Pages auto-deploys.
6. Test creating a NEW test account with a non-Baltic country and editing
   the country on `profile.html`. Test case-insensitive duplicate usernames.

Migration preserves user IDs, emails, usernames, existing PBKDF2 hashes and login sessions;
the username and email UNIQUE NOCASE constraints remain. This migration assumes the
current BBA schema, with `sessions` as the only other table referencing `users`.
**Review this assumption** if any more foreign keys or tables have been added.

## Site behavior

- The navigation shows `Log in` if logged out and `My profile` if logged in.
- Profile email remains visible only to its account owner; no public profile pages yet.
- Public rankings stay Baltic-focused for now; selecting a country does not automatically
  grant tournament eligibility or ranking points.
- Only currently supported codes are accepted server-side, not arbitrary text.
- Username uniqueness remains case-insensitive, enforced by the database.

## Future avatar uploads

The circular initials placeholder can later be replaced with authenticated image uploads
via Cloudflare R2, after adding file validation, re-encoding, strict size limits, safe storage
and abuse controls. The optional database field `avatar_key` is reserved but unused.

## Public launch warning

This is still a **test-phase authentication system**. There is no email verification,
password reset, account deletion workflow, privacy policy, or reviewed production password
hashing strategy (existing code uses PBKDF2-100k due to a runtime limit). Keep public
registration closed until those are implemented and independently tested.
