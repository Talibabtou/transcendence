// Define TypeScript interfaces for sharing
export interface Elo {
  id: string;
  player: string;
  elo: number;
  created_at: string;
}

export interface LeaderboardEntry extends Omit<Elo, 'id' | 'created_at'> {
  victories: number;
  defeats: number;
  total_matches: number;
  username: string;
}

export interface GetElosQuery {
  player?: string;
  limit?: number;
  offset?: number;
}

export interface DailyElo {
  player: string;
  match_date: string;
  elo: number;
}

export interface UpdatePlayerElo {
  winner: string;
  loser: string;
}

export interface IId {
  id: string;
}
