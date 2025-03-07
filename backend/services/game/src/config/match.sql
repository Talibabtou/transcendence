CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-' || 
    lower(hex(randomblob(2))) || '-' || 
    lower(hex(randomblob(2))) || '-' || 
    lower(hex(randomblob(6)))
  ), -- Standard UUID format
  player_1 TEXT NOT NULL, -- UUID
  player_2 TEXT NOT NULL, -- UUID
  completed BOOLEAN DEFAULT FALSE,
  duration INTEGER DEFAULT NULL,
  timeout BOOLEAN DEFAULT FALSE,
  tournament_id TEXT DEFAULT NULL, -- UUID
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);