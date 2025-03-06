import { ErrorResponse } from '../types/response.type.js';

export enum ErrorCodes {
  // Common errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  // Match related errors
  MATCH_NOT_FOUND = 'MATCH_NOT_FOUND',
  NO_VALID_FIELDS_TO_UPDATE = 'NO_VALID_FIELDS_TO_UPDATE',
  
  // Goal related errors
  GOAL_NOT_FOUND = 'GOAL_NOT_FOUND',
  PLAYER_NOT_IN_MATCH = 'PLAYER_NOT_IN_MATCH',
}

// Create a map of error codes to their messages
export const ErrorMessages = new Map<ErrorCodes, string>([
  [ErrorCodes.INTERNAL_ERROR, 'Internal Server Error'],
  [ErrorCodes.MATCH_NOT_FOUND, 'Match not found'],
  [ErrorCodes.NO_VALID_FIELDS_TO_UPDATE, 'No valid fields to update'],
  [ErrorCodes.GOAL_NOT_FOUND, 'Goal not found'],
  [ErrorCodes.PLAYER_NOT_IN_MATCH, 'Player is not part of this match'],
]);

// Helper function to create error response objects
export function createErrorResponse(statusCode: number, code: ErrorCodes): ErrorResponse {
  return {
    statusCode: statusCode,
    code: code,
    error: ErrorMessages.get(code) || 'Unknown error',
    message: ErrorMessages.get(code) || 'Unknown error',
  };
}
