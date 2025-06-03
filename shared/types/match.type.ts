export interface Match {
  id: string;
  player_1: string;
  player_2: string;
  active: boolean;
  duration: number | null;
  tournament_id: string | null;
	final: boolean;
  created_at: string;
}

export interface MatchHistory {
  matchId: string;
  username1: string;
  id1: string;
  goals1: number;
  username2: string;
  id2: string;
  goals2: number;
  final: boolean;
  created_at: string;
}

export interface CreateMatchRequest {
  player_1: string;
  player_2: string;
  tournament_id?: string | null;
	final?: boolean;
}

export interface GetTournamentQuery {
  tournament_id: string;
}

export interface TournamentMatch {
	matchId: string;
  username1: string;
  id1: string;
  goals1: number;
  username2: string;
  id2: string;
  goals2: number;
	winner: string;
	final: boolean;
  created_at: string;
}

export interface PlayerMatchSummary {
  total_matches: number;
  elo: number;
  victories: number;
  defeats: number;
}

export interface DailyPerformance {
  match_date: string;
  matches_played: number;
}

export interface EloRating {
  match_date: string;
  elo_rating: number;
}

export interface PlayerStats {
  player_id: string;
  goal_stats: {
    fastest_goal_duration: number | null;
    average_goal_duration: number | null;
    total_goals: number;
  };
  daily_performance: DailyPerformance[];
  goal_durations: number[];
  match_durations: number[];
  elo_history: number[];
}

export interface FinalResultObject {
  player_1: string | null;
  player_2: string | null;
}

export interface IId {
  id: string;
}

export interface IMatchId {
  id: string;
}

export interface GetLeaderboardQuery {
  limit?: number;
  offset?: number;
}

export interface Finalist {
  player_id: string;
  victory_count?: number;
  goals_scored?: number;
  goals_conceded?: number;
  goal_duration?: number;
}

export interface GetPageQuery {
  limit?: number;
  offset?: number;
}
