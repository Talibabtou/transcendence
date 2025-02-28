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
  limit?: number;
  offset?: number;
}