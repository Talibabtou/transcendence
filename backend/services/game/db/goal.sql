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

CREATE INDEX IF NOT EXISTS idx_goal_match_player ON goal(match_id, player);
CREATE INDEX IF NOT EXISTS idx_goal_player ON goal(player);
CREATE INDEX IF NOT EXISTS idx_goal_match_id ON goal(match_id);
