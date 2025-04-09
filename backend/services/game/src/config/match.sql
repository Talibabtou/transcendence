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

-- Indexes to potentially speed up player lookups within UNIONs
CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player_1);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player_2);
-- Index for date-based grouping and ordering (e.g., in player_daily_performance)
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);
-- Index for filtering completed matches (e.g., in player_match_durations)
CREATE INDEX IF NOT EXISTS idx_matches_completed ON matches(completed);