/**
 * Mock Database Service - Simulates database interactions with console logs
 */

// Types based on your database schema
interface User {
	id: number;
	theme?: string;
	pfp?: string;
	human: boolean;
	pseudo: string;
	last_login?: Date;
	created_at: Date;
}

interface Match {
	id: number;
	player_1: number; // User id
	player_2: number; // User id
	completed: boolean;
	duration?: number; // in seconds
	timeout: boolean;
	tournament_id?: number;
	created_at: Date;
}

interface Goal {
	id: number;
	match_id: number;
	player: number; // User id
	duration: number; // seconds into the match
	created_at: Date;
}

export class DbService {
	// Simulate getting a user by id
	static getUser(id: number): void {
		console.log('DB REQUEST: GET /api/users/' + id, {
			method: 'GET',
			endpoint: `/api/users/${id}`
		});
	}

	// Simulate getting a user by username
	static getUserByUsername(username: string): void {
		console.log('DB REQUEST: GET /api/users?pseudo=' + username, {
			method: 'GET',
			endpoint: `/api/users?pseudo=${username}`
		});
	}

	// Simulate getting match history for a user
	static getUserMatches(userId: number): void {
		console.log('DB REQUEST: GET /api/users/' + userId + '/matches', {
			method: 'GET',
			endpoint: `/api/users/${userId}/matches`
		});
	}

	// Simulate getting leaderboard data
	static getLeaderboard(): void {
		console.log('DB REQUEST: GET /api/leaderboard', {
			method: 'GET',
			endpoint: '/api/leaderboard'
		});
	}

	// Simulate creating a new match
	static createMatch(player1Id: number, player2Id: number, tournamentId?: number): void {
		const matchData: Partial<Match> = {
			player_1: player1Id,
			player_2: player2Id,
			completed: false,
			timeout: false,
			tournament_id: tournamentId,
			created_at: new Date()
		};
		
		console.log('DB REQUEST: POST /api/matches', {
			method: 'POST',
			endpoint: '/api/matches',
			body: matchData
		});
	}
	
	// Simulate updating a match when completed
	static completeMatch(matchId: number, duration: number): void {
		const updateData = {
			completed: true,
			duration
		};
		
		console.log('DB REQUEST: PUT /api/matches/' + matchId, {
			method: 'PUT',
			endpoint: `/api/matches/${matchId}`,
			body: updateData
		});
	}
	
	// Simulate recording a goal
	static recordGoal(matchId: number, playerId: number, duration: number): void {
		const goalData: Partial<Goal> = {
			match_id: matchId,
			player: playerId,
			duration,
			created_at: new Date()
		};
		
		console.log('DB REQUEST: POST /api/goals', {
			method: 'POST',
			endpoint: '/api/goals',
			body: goalData
		});
	}
	
	// Simulate recovering a match
	static recoverMatch(matchId: number): void {
		console.log('DB REQUEST: PUT /api/matches/' + matchId + '/recover', {
			method: 'PUT',
			endpoint: `/api/matches/${matchId}/recover`,
			body: {
				recovered_at: new Date()
			}
		});
	}
	
	// Simulate updating a user
	static updateUser(userId: number, userData: any): void {
		console.log('DB REQUEST: PUT /api/users/' + userId, {
			method: 'PUT',
			endpoint: `/api/users/${userId}`,
			body: userData
		});
	}
} 