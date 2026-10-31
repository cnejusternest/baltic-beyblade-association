-- BBA migration v2: allow worldwide profile countries, preserve accounts and sessions.
-- IMPORTANT: back up bba-db (D1 Time Travel bookmark/export) before applying.
-- Run ONCE, as a SINGLE SCRIPT in a quiet/maintenance window; never paste line by line.
-- Do not publish new country registration code until this migration succeeds.
-- D1 executes SQL in implicit transactions and supports defer_foreign_keys.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE users_global (
 id TEXT PRIMARY KEY,
 username TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(username) BETWEEN 3 AND 24),
 email TEXT NOT NULL COLLATE NOCASE UNIQUE,
 country TEXT NOT NULL CHECK(length(country) = 2 AND country GLOB '[A-Z][A-Z]'),
 password_salt TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 email_verified INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL DEFAULT (unixepoch()),
 avatar_key TEXT DEFAULT NULL
);
INSERT INTO users_global (id,username,email,country,password_salt,password_hash,email_verified,created_at)
 SELECT id,username,email,country,password_salt,password_hash,email_verified,created_at FROM users;

-- Sessions reference users, so preserve and rebuild them when replacing users.
CREATE TABLE sessions_migration_backup AS
 SELECT token_hash,user_id,expires_at FROM sessions;
DROP TABLE sessions;
DROP TABLE users;
ALTER TABLE users_global RENAME TO users;
CREATE TABLE sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
INSERT INTO sessions (token_hash,user_id,expires_at)
 SELECT token_hash,user_id,expires_at FROM sessions_migration_backup;
DROP TABLE sessions_migration_backup;
CREATE INDEX idx_sessions_user ON sessions(user_id);
PRAGMA foreign_key_check;
