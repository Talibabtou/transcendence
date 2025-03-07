CREATE TABLE IF NOT EXISTS goal (
    id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-' || 
    lower(hex(randomblob(2))) || '-' || 
    lower(hex(randomblob(2))) || '-' || 
    lower(hex(randomblob(6)))
  ), -- Auto-generated UUID
  match_id TEXT NOT NULL, -- UUID
  player TEXT NOT NULL, -- UUID
  duration INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (match_id) REFERENCES matches(id)
);
