-- 6 matches per tournament
CREATE VIEW IF NOT EXISTS tournament_match_count AS
SELECT
  tournament_id,
  COUNT(id) AS total_matches
FROM matches WHERE DURATION IS NOT NULL AND tournament_id IS NOT NULL
GROUP BY tournament_id;

-- Top 3 players with most victories in tournaments
CREATE VIEW IF NOT EXISTS tournament_top_victories AS
SELECT
  player_id,
  COUNT(*) AS victory_count,
  m.tournament_id
FROM (
  SELECT
    m.player_1 AS player_id,
    m.id AS match_id,
    m.tournament_id
  FROM matches m
  WHERE m.tournament_id IS NOT NULL 
    AND m.duration IS NOT NULL
    AND (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_1) > 
        (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_2)
  
  UNION ALL
  
  SELECT
    m.player_2 AS player_id,
    m.id AS match_id,
    m.tournament_id
  FROM matches m
  WHERE m.tournament_id IS NOT NULL 
    AND m.duration IS NOT NULL
    AND (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_2) > 
        (SELECT COUNT(*) FROM goal WHERE match_id = m.id AND player = m.player_1)
) AS victories
JOIN matches m ON victories.match_id = m.id
GROUP BY player_id, m.tournament_id
ORDER BY m.tournament_id, victory_count DESC;

-- Top scorers in tournaments
CREATE VIEW IF NOT EXISTS tournament_top_scorers AS
SELECT
  g.player AS player_id,
  COUNT(*) AS goals_scored,
  m.tournament_id
FROM goal g
JOIN matches m ON g.match_id = m.id
WHERE m.tournament_id IS NOT NULL AND m.duration IS NOT NULL
GROUP BY g.player, m.tournament_id -- Groups by player AND tournament
ORDER BY m.tournament_id, goals_scored DESC;