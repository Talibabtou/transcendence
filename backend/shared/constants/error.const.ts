import { ErrorResponse } from '../types/error.type.js';

export enum ErrorCodes {
  // Common errors
  INVALID_REQUEST = 'INVALID_REQUEST',
	UNAUTHORIZED = 'UNAUTHORIZED',
	FORBIDDEN = 'FORBIDDEN',
	NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  // Match related errors
  MATCH_NOT_FOUND = 'MATCH_NOT_FOUND',
  INVALID_FIELDS = 'INVALID_FIELDS',
  
  // Goal related errors
  GOAL_NOT_FOUND = 'GOAL_NOT_FOUND',
  PLAYER_NOT_IN_MATCH = 'PLAYER_NOT_IN_MATCH',
}

// Create a map of error codes to their messages
export const ErrorTypes = new Map<number, string>([
	[400, 'Bad Request'],
	[401, 'Unauthorized'],
	[403, 'InsufficientPermissions'],
	[404, 'Not Found'],
	[500, 'Internal Server Error'],
]);

export const ErrorMessages = new Map<ErrorCodes, string>([
	// Common errors
  [ErrorCodes.INTERNAL_ERROR, 'Internal server error'],
	// Match related errors
  [ErrorCodes.MATCH_NOT_FOUND, 'Match not found'],
  [ErrorCodes.INVALID_FIELDS, 'Invalid or insufficient fields given to update the match'],
  // Goal related errors
  [ErrorCodes.GOAL_NOT_FOUND, 'Goal not found'],
  [ErrorCodes.PLAYER_NOT_IN_MATCH, 'Player is not part of this match'],
]);

// Helper function to create error response objects
export function createErrorResponse(statusCode: number, code: ErrorCodes): ErrorResponse {
  return {
    statusCode: statusCode,
    code: code,
    error: ErrorTypes.get(statusCode) || 'Unknown error',
    message: ErrorMessages.get(code) || 'Unknown error',
  };
}

// Common error response examples for API documentation
export const ErrorExamples = {
	//system
	internalError: {
		statusCode: 500,
		code: ErrorCodes.INTERNAL_ERROR,
		error: ErrorTypes.get(500),
		message: ErrorMessages.get(ErrorCodes.INTERNAL_ERROR)
	},
	
	// Match related errors
	matchNotFound: {
		statusCode: 404,
		code: ErrorCodes.MATCH_NOT_FOUND,
		error: ErrorTypes.get(404),
		message: ErrorMessages.get(ErrorCodes.MATCH_NOT_FOUND)
	},
	invalidFields: {
		statusCode: 400,
		code: ErrorCodes.INVALID_FIELDS,
		error: ErrorTypes.get(400),
		message: ErrorMessages.get(ErrorCodes.INVALID_FIELDS)
	},
	
	// Goal related errors
  playerNotInMatch: {
		statusCode: 400,
		code: ErrorCodes.PLAYER_NOT_IN_MATCH,
		error: ErrorTypes.get(400),
		message: ErrorMessages.get(ErrorCodes.PLAYER_NOT_IN_MATCH)
	},
	goalNotFound: {
		statusCode: 404,
		code: ErrorCodes.GOAL_NOT_FOUND,
		error: ErrorTypes.get(404),
		message: ErrorMessages.get(ErrorCodes.GOAL_NOT_FOUND)
	},
};