// Define TypeScript interfaces for sharing
export interface Elo {
    id: string;
    player: string;
    elo: number;
    created_at: string;
}

export interface CreateEloRequest {
    player: string;
    elo: number;
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
