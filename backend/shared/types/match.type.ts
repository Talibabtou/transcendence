// Define TypeScript interfaces for sharing
export interface Match {
  id: string;
  player_1: string;
  player_2: string;
  completed: boolean;
  duration: number | null;
  timeout: boolean;
  tournament_id: string | null;
  created_at: string;
}

export interface CreateMatchRequest {
  player_1: string;
  player_2: string;
  tournament_id?: string | null;
}

export interface UpdateMatchRequest {
  completed: boolean;
  duration: number | null;
  timeout: boolean;
}

export interface GetMatchesQuery {
  player_id?: string;
  completed?: boolean;
  tournament_id?: string;
  limit?: number;
  offset?: number;
}

export interface PlayerMatchSummary {
	total_matches: number;
	elo: number;
	completed_matches: number;
	victories: number;
	win_ratio: number;
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
	},
	daily_performance: DailyPerformance[];
	goal_durations: number[];
	match_durations: number[];
	elo_history: number[];
}
