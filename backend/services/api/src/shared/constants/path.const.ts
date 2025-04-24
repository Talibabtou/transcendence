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
    BASE: '/games',
    BY_ID: (id: string | number) => `/games/${id}`,
    LEADERBOARD: '/leaderboard',
};

// User service paths
export const USER = {
    BASE: '/users',
    BY_ID: (id: string | number) => `/users/${id}`,
    PROFILE: '/profile',
    SETTINGS: '/settings',
};

// Authentication paths
export const AUTH = {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
};

// Social service paths
export const SOCIAL = {
    FRIENDS: '/social/friends',
    REQUESTS: '/social/requests',
    MESSAGES: '/social/messages',
};
