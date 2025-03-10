// Define TypeScript interfaces for sharing
export interface Goal {
  id: string;
  match_id: string;
  player: string;
  duration: number;
  created_at: string;
}

export interface CreateGoalRequest {
  match_id: string;
  player: string;
  duration: number;
}

export interface GetGoalsQuery {
  match_id?: string;
  player?: string;
  limit?: number;
  offset?: number;
}
