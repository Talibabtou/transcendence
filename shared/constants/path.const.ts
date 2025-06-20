/**
 * Path constants for API routes
 *
 * This file centralizes all API path definitions to ensure consistency
 * across the application and prevent duplication.
 */

// Define version more explicitly
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;
export const HEALTH_CHECK_PATH = '/health';

// Game service paths
export const GAME = {
	MATCH: {
		BASE: '/game/match',
		BY_ID: (id: string) => `/game/match/${id}`,
		STATS: (id: string) => `/game/match/stats/${id}`,
		SUMMARY: (id: string) => `/game/match/summary/${id}`,
	},
	LEADERBOARD: '/game/leaderboard',
	ELO: {
		BY_ID: (id: string) => `/game/elo/${id}`,
	},
	GOALS: {
		BASE: '/game/goal',
	},
	TOURNAMENT: {
		BASE: '/game/tournament',
		BY_ID: (id: string) => `/game/tournament/${id}`,
		FINALS: (id: string) => `/game/tournament/${id}/final`,
	},
};

// User service paths
export const USER = {
	BY_ID: (id: string) => `/auth/user/${id}`,
	BY_USERNAME: (username: string) => `/auth/id/${username}`,
	ME: '/auth/user/me',
	ME_UPDATE: '/auth/user',
	PROFILE: '/profile/summary',
	PROFILE_HISTORY: (id: string) => `/profile/history/${id}`,
	UPLOADS: '/profile/uploads',
	PROFILE_PIC_LINK: (id: string) => `/profile/pics/${id}`,
};

// Authentication paths
export const AUTH = {
	LOGIN: '/auth/login',
	GUEST_LOGIN: '/auth/login/guest',
	LOGOUT: '/auth/logout',
	REGISTER: '/auth/register',
	REGISTER_GUEST: '/auth/register/guest',
	REFRESH: '/auth/refresh',
	TWO_FA: {
		GENERATE: '/auth/2fa/generate',
		VALIDATE_GENERATE: '/auth/2fa/generate/validate',
		VALIDATE: '/auth/2fa/validate',
		DISABLE: '/auth/2fa/disable',
		STATUS: '/auth/2fa/status',
	},
};

// Social service paths
export const SOCIAL = {
	FRIENDS: {
		BASE: '/friends',
		ALL: {
			BY_ID: (id: string) => `/friends/all/${id}`,
			ME: '/friends/all/me',
		},
		CHECK: (id: string) => `/friends/check/${id}`,
		CREATE: '/friends/create',
		ACCEPT: '/friends/accept',
		DELETE: {
			BY_ID: (id: string) => `/friends/delete/${id}`,
		},
	},
};
