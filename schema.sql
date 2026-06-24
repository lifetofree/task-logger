DROP TABLE IF EXISTS entries;
CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  happiness INTEGER NOT NULL CHECK (happiness BETWEEN 1 AND 5),
  progress INTEGER NOT NULL CHECK (progress BETWEEN 1 AND 5),
  log_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entries_log_date ON entries (log_date);
CREATE INDEX idx_entries_created_at ON entries (created_at);
