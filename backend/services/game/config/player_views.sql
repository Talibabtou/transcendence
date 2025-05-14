-- Player match summary view
-- The output of the player_match_summary view will include:
-- player_id: The unique identifier for the player.
-- total_matches: The total number of matches that the player 
--   has participated in (both as player 1 and player 2).
-- active_matches: The number of matches that have been active 
--   (i.e., where the active field is TRUE).z
-- victories: The number of matches that the player has won 
--   (i.e., where the player is listed as the winner).
-- win_ratio: The ratio of victories to active matches, 
--   calculated as the number of victories divided by the number of active matches. If there are no active matches, this will return NULL to avoid division by zero.
CREATE VIEW IF NOT EXISTS player_match_summary AS
SELECT 
  player_id, -- The ID of the player
  COUNT(match_id) AND duration NOT NULL AS total_matches, -- Total number of matches played by the player
  (SELECT elo FROM elo WHERE player = player_id ORDER BY created_at DESC LIMIT 1) AS elo,
  SUM(CASE WHEN active = FALSE AND duration NOT NULL THEN 1 ELSE 0 END) AS active_matches, -- Number of matches that are active
  SUM(CASE WHEN active = FALSE AND duration NOT NULL AND 
           ((player_id = player_1 AND score_1 > score_2) OR 
            (player_id = player_2 AND score_2 > score_1)) 
      THEN 1 ELSE 0 END) AS victories, -- Number of matches won by the player
  CAST(SUM(CASE WHEN active = FALSE AND duration NOT NULL AND 
                ((player_id = player_1 AND score_1 > score_2) OR 
                 (player_id = player_2 AND score_2 > score_1)) 
           THEN 1 ELSE 0 END) AS REAL) / 
    NULLIF(SUM(CASE WHEN active = FALSE AND duration NOT NULL THEN 1 ELSE 0 END), 0) AS win_ratio -- Win ratio (victories / active matches)
FROM (
  -- Include matches where player was player_1
  SELECT 
    m.id AS match_id, -- Match ID
    m.player_1 AS player_id, -- Player ID (player 1)
    m.active, -- Match completion status
    m.duration,
    m.player_1,
    m.player_2,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_1) AS score_1,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_2) AS score_2
  FROM matches m
  
  UNION ALL
  
  -- Include matches where player was player_2
  SELECT 
    m.id AS match_id, -- Match ID
    m.player_2 AS player_id, -- Player ID (player 2)
    m.active, -- Match completion status
    m.duration,
    m.player_1,
    m.player_2,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_1) AS score_1,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_2) AS score_2
  FROM matches m
) AS player_matches
GROUP BY player_id; -- Group results by player ID

-- Daily win/loss ratio for line plot
CREATE VIEW IF NOT EXISTS player_daily_performance AS
SELECT
  player_id, -- The player ID to filter by in your query
  DATE(m.created_at) AS match_date, -- Date of the match
  COUNT(DISTINCT m.id) AS matches_played, -- Number of matches played on this date
  SUM(CASE WHEN m.active = FALSE AND m.duration NOT NULL AND 
           ((player_id = m.player_1 AND p1_score > p2_score) OR 
            (player_id = m.player_2 AND p2_score > p1_score)) 
      THEN 1 ELSE 0 END) AS wins, -- Number of wins on this date
  SUM(CASE WHEN m.active = FALSE AND m.duration NOT NULL NOT NULL  AND 
           ((player_id = m.player_1 AND p1_score < p2_score) OR 
            (player_id = m.player_2 AND p2_score < p1_score)) 
      THEN 1 ELSE 0 END) AS losses, -- Number of losses
  CAST(SUM(CASE WHEN m.active = FALSE AND m.duration NOT NULL NOT NULL  AND 
                ((player_id = m.player_1 AND p1_score > p2_score) OR 
                 (player_id = m.player_2 AND p2_score > p1_score)) 
           THEN 1 ELSE 0 END) AS REAL) / 
    NULLIF(SUM(CASE WHEN m.active = FALSE AND m.duration NOT NULL NOT NULL  THEN 1 ELSE 0 END), 0) AS daily_win_ratio -- Daily win ratio
FROM (
  -- Player 1 perspective
  SELECT 
    m.id,
    m.player_1 AS player_id,
    m.player_1,
    m.player_2,
    m.duration,
    m.active,
    m.created_at,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_1) AS p1_score,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_2) AS p2_score
  FROM matches m
  
  UNION ALL
  
  -- Player 2 perspective
  SELECT 
    m.id,
    m.player_2 AS player_id,
    m.player_1,
    m.player_2,
    m.duration,
    m.active,
    m.created_at,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_1) AS p1_score,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_2) AS p2_score
  FROM matches m
) AS m
GROUP BY player_id, DATE(m.created_at);

-- Goal duration data for heatmap visualization
CREATE VIEW IF NOT EXISTS player_goal_durations AS
SELECT
  player, -- The player ID to filter by in your query
  match_id,
  duration, -- Goal duration for heatmap
  created_at -- Timestamp for heatmap
FROM goal;

-- Match duration data for histogram
CREATE VIEW IF NOT EXISTS player_match_durations AS
SELECT
  player_id, -- The player ID to filter by in your query
  match_id,
  duration AS match_duration -- Match duration for histogram
FROM (
  SELECT 
    m.id AS match_id,
    m.player_1 AS player_id,
    m.duration
  FROM matches m
  WHERE m.active = FALSE AND m.duration NOT NULL NOT NULL 
  
  UNION ALL
  
  SELECT 
    m.id AS match_id,
    m.player_2 AS player_id,
    m.duration
  FROM matches m
  WHERE m.active = FALSE AND m.duration NOT NULL NOT NULL 
) AS player_matches;
