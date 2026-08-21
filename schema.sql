-- Vercel version: storage is Redis/Upstash, so this SQL is NOT executed by Vercel.
-- It is kept as a reference for the same logical data model used by the old D1 backend.
CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT
);
