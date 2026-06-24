DROP TABLE IF EXISTS entries;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  happiness INTEGER NOT NULL CHECK (happiness BETWEEN 1 AND 10),
  progress INTEGER NOT NULL CHECK (progress BETWEEN 1 AND 10),
  log_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_entries_user_date ON entries (user_id, log_date);
CREATE INDEX idx_entries_user_created ON entries (user_id, created_at);
