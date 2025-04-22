CREATE TABLE IF NOT EXISTS elo (
    id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-' || 
    lower(hex(randomblob(2))) || '-' || 
    lower(hex(randomblob(2))) || '-' || 
    lower(hex(randomblob(6)))
  ), -- Auto-generated UUID
  player TEXT NOT NULL, -- UUID
  elo INTEGER NOT NULL DEFAULT 1000,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create composite index for the common query pattern
CREATE INDEX IF NOT EXISTS idx_elo_player_created_at ON elo(player, created_at DESC);

CREATE VIEW IF NOT EXISTS latest_player_elos AS
SELECT 
    player,
    elo,
    created_at
FROM (
    SELECT 
        player,
        elo,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY player ORDER BY created_at DESC) as rn
    FROM elo
) ranked
WHERE rn = 1;
