CREATE TABLE IF NOT EXISTS goal (
  id TEXT PRIMARY KEY, -- UUID
  match_id TEXT NOT NULL, -- UUID
  player TEXT NOT NULL, -- UUID
  duration TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id)
);
