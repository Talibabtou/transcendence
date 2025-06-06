-- Player match summary view
-- The output of the player_match_summary view will include:
-- player_id: The unique identifier for the player.
-- total_matches: The total number of matches that the player 
--   has participated in (both as player 1 and player 2) where the match has a recorded duration.
-- elo: The current Elo rating of the player.
-- victories: The number of matches that the player has won 
--   (from completed matches with a recorded duration).
CREATE VIEW IF NOT EXISTS player_match_summary AS
SELECT 
  player_id, -- The ID of the player
  COUNT(match_id) AS total_matches, -- Total number of matches played by the player (with duration)
  (SELECT elo FROM elo WHERE player = player_id ORDER BY created_at DESC LIMIT 1) AS elo,
  SUM(CASE WHEN ((player_id = player_1 AND score_1 > score_2) OR 
            (player_id = player_2 AND score_2 > score_1)) 
      THEN 1 ELSE 0 END) AS victories -- Number of matches won by the player (from completed matches with duration)
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
  WHERE m.duration IS NOT NULL
  
  UNION ALL
  
  -- Include matches where player was player_2
  SELECT 
    m.id AS match_id, -- Match ID
    m.player_2 AS player_id, -- Player ID (player 2)
    m.active, -- Match completion status
    m.player_1,
		m.duration,
    m.player_2,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_1) AS score_1,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_2) AS score_2
  FROM matches m
  WHERE m.duration IS NOT NULL
) AS player_matches
GROUP BY player_id; -- Group results by player ID

-- Daily win/loss ratio for line plot
CREATE VIEW IF NOT EXISTS player_daily_performance AS
SELECT
	match_id,
  player_id, -- The player ID to filter by in your query
	player_1,
	player_2,
	p1_score,
	p2_score,	
	created_at,
  DATE(m.created_at) AS match_date, -- Date of the match
  COUNT(m.match_id) AS matches_played, -- Number of matches played on this date by the player (completed matches with duration)
  SUM(CASE WHEN ((m.player_id = m.player_1 AND m.p1_score > m.p2_score) OR 
                 (m.player_id = m.player_2 AND m.p2_score > m.p1_score)) 
      THEN 1 ELSE 0 END) AS wins, -- Number of wins on this date (from completed matches with duration)
  SUM(CASE WHEN ((m.player_id = m.player_1 AND m.p1_score < m.p2_score) OR 
                 (m.player_id = m.player_2 AND m.p2_score < m.p1_score)) 
      THEN 1 ELSE 0 END) AS losses, -- Number of losses on this date (from completed matches with duration)
  CAST(SUM(CASE WHEN ((m.player_id = m.player_1 AND m.p1_score > m.p2_score) OR 
                     (m.player_id = m.player_2 AND m.p2_score > m.p1_score)) 
           THEN 1 ELSE 0 END) AS REAL) / 
    NULLIF(COUNT(m.match_id), 0) AS daily_win_ratio -- Daily win ratio (from completed matches with duration)
FROM (
  -- Player 1 perspective
  SELECT 
    m.id AS match_id,
    m.player_1 AS player_id,
    m.player_1 AS player_1,
    m.player_2 AS player_2,
    m.created_at AS created_at,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_1) AS p1_score,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_2) AS p2_score
  FROM matches m
  WHERE m.duration IS NOT NULL
  
  UNION ALL
  
  -- Player 2 perspective
  SELECT 
    m.id AS match_id,
    m.player_2 AS player_id,
    m.player_1,
    m.player_2,
    m.created_at,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_1) AS p1_score,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_2) AS p2_score
  FROM matches m
  WHERE m.duration IS NOT NULL
) AS m
GROUP BY m.player_id, DATE(m.created_at);

CREATE VIEW IF NOT EXISTS player_match_history AS
SELECT
  m.match_id,
  m.player_id,
  m.player_1,
  m.player_2,
  m.p1_score,
  m.p2_score,
  m.tournament_id,
  m.final,
  m.duration,
  m.created_at
FROM (
  -- Player 1 perspective
  SELECT
    m.id           AS match_id,
    m.player_1     AS player_id,
    m.player_1     AS player_1,
    m.player_2     AS player_2,
    m.tournament_id,
    m.final,
    m.duration,
    m.created_at   AS created_at,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_1) AS p1_score,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_2) AS p2_score
  FROM matches m
  WHERE m.duration IS NOT NULL

  UNION ALL

  -- Player 2 perspective
  SELECT
    m.id           AS match_id,
    m.player_2     AS player_id,
    m.player_1     AS player_1,
    m.player_2     AS player_2,
    m.tournament_id,
    m.final,
    m.duration,
    m.created_at   AS created_at,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_1) AS p1_score,
    (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_2) AS p2_score
  FROM matches m
  WHERE m.duration IS NOT NULL
) AS m;

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
  WHERE m.duration IS NOT NULL
  
  UNION ALL
  
  SELECT 
    m.id AS match_id,
    m.player_2 AS player_id,
    m.duration
  FROM matches m
  WHERE m.duration IS NOT NULL
) AS player_matches;
