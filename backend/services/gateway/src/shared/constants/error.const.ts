import { ErrorResponse } from '../types/error.type.js';

export enum ErrorCodes {
  // Common errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  SQLITE_MISMATCH = 'SQLITE_MISMATCH',
  SQLITE_CONSTRAINT = 'SQLITE_CONSTRAINT',
  BAD_REQUEST = 'BAD REQUEST',
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',

  // Match related errors
  MATCH_NOT_FOUND = 'MATCH_NOT_FOUND',
  INVALID_FIELDS = 'INVALID_FIELDS',
  MATCH_NOT_ACTIVE = 'MATCH_NOT_ACTIVE',

  // Tournament related errors
  TOURNAMENT_NOT_FOUND = 'TOURNAMENT_NOT_FOUND',
  TOURNAMENT_WRONG_MATCH_COUNT = 'TOURNAMENT_WRONG_MATCH_COUNT',
  TOURNAMENT_INSUFFICIENT_PLAYERS = 'TOURNAMENT_INSUFFICIENT_PLAYERS',

  // Goal related errors
  GOAL_NOT_FOUND = 'GOAL_NOT_FOUND',
  PLAYER_NOT_IN_MATCH = 'PLAYER_NOT_IN_MATCH',

  //elo related errors
  ELO_NOT_FOUND = 'ELO_NOT_FOUND',

  //api related errors
  PICTURE_NOT_FOUND = 'PICTURE_NOT_FOUND',

  //auth related errors
  LOGIN_FAILURE = 'LOGIN_FAILURE',

  //profil
  NO_FILE_PROVIDED = 'NO_FILE_PROVIDED',
  INVALID_TYPE = 'INVALID_TYPE',

  //friends
  FRIENDSHIP_EXISTS = 'FRIENDSHIP_EXISTS',
  FRIENDS_NOTFOUND = 'FRIENDS_NOT_FOUNDS',

  //jwt
  JWT_BAD_HEADER = 'JWT_BAD_HEADER',
  JWT_INSUFFICIENT_PERMISSIIONS = 'JWT_INSUFFICIENT_PERMISSIIONS',
  JWT_EXP_TOKEN = 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED',
  JWT_REVOKED = 'JWT_REVOKED',

  //twofa
  TWOFA_BAD_CODE = 'TWOFA_BAD_CODE',
}

// Create a map of error codes to their messages
export const ErrorTypes = new Map<number, string>([
  [400, 'Bad Request'],
  [401, 'Unauthorized'],
  [403, 'Insufficient Permissions'],
  [404, 'Not Found'],
  [409, 'Conflict'],
  [500, 'Internal Server Error'],
  [503, 'Service Unavailable'],
]);

export const ErrorMessages = new Map<ErrorCodes, string>([
  // Common errors
  [ErrorCodes.INTERNAL_ERROR, 'Internal server error'],
  [ErrorCodes.SERVICE_UNAVAILABLE, 'Service unavailable'],
  [ErrorCodes.SQLITE_MISMATCH, 'Sqlite mismatch'],
  [ErrorCodes.SQLITE_CONSTRAINT, 'Sqlite constraint'],
  [ErrorCodes.BAD_REQUEST, 'Bad request'],
  [ErrorCodes.PLAYER_NOT_FOUND, 'Player not found'],

  // Match related errors
  [ErrorCodes.MATCH_NOT_FOUND, 'Match not found'],
  [ErrorCodes.INVALID_FIELDS, 'Invalid or insufficient fields given to update the match'],
  [ErrorCodes.MATCH_NOT_ACTIVE, 'Match has been cancelled or timeout'],

  // Tournament related errors
  [ErrorCodes.TOURNAMENT_NOT_FOUND, 'Tournament not found'],
  [ErrorCodes.TOURNAMENT_WRONG_MATCH_COUNT, 'Tournament is not at the final stage'],
  [ErrorCodes.TOURNAMENT_INSUFFICIENT_PLAYERS, 'Tournament has less than 3 players'],

  // Goal related errors
  [ErrorCodes.GOAL_NOT_FOUND, 'Goal not found'],
  [ErrorCodes.PLAYER_NOT_IN_MATCH, 'Player is not part of this match'],

  //elo related errors
  [ErrorCodes.ELO_NOT_FOUND, 'Elo rating not found for this player'],

  //api related errors
  [ErrorCodes.PICTURE_NOT_FOUND, 'Picture not found'],

  //auth related errors
  [ErrorCodes.LOGIN_FAILURE, 'Login failure'],

  //profil related errors
  [ErrorCodes.NO_FILE_PROVIDED, 'No File Provided'],
  [ErrorCodes.INVALID_TYPE, 'Invalid Type'],

  //friends
  [ErrorCodes.FRIENDSHIP_EXISTS, 'Friendship exists'],
  [ErrorCodes.FRIENDS_NOTFOUND, 'Friends not found'],

  //jwt
  [ErrorCodes.JWT_BAD_HEADER, 'JWT bad header'],
  [ErrorCodes.JWT_INSUFFICIENT_PERMISSIIONS, 'JWT insufficient permissions'],
  [ErrorCodes.JWT_EXP_TOKEN, 'Token expired'],
  [ErrorCodes.JWT_REVOKED, 'Jwt revoked'],

  //twofa
  [ErrorCodes.TWOFA_BAD_CODE, 'Twofa bad code'],
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
    message: ErrorMessages.get(ErrorCodes.INTERNAL_ERROR),
  },
  serviceUnavailable: {
    statusCode: 503,
    code: ErrorCodes.SERVICE_UNAVAILABLE,
    error: ErrorTypes.get(503),
    message: ErrorMessages.get(ErrorCodes.SERVICE_UNAVAILABLE),
  },

  // database
  sqliteMismatch: {
    statusCode: 400,
    code: ErrorCodes.SQLITE_MISMATCH,
    error: ErrorTypes.get(400),
    message: ErrorMessages.get(ErrorCodes.SQLITE_MISMATCH),
  },
  sqliteConstraint: {
    statusCode: 409,
    code: ErrorCodes.SQLITE_CONSTRAINT,
    error: ErrorTypes.get(409),
    message: ErrorMessages.get(ErrorCodes.SQLITE_CONSTRAINT),
  },
  badRequest: {
    statusCode: 400,
    code: ErrorCodes.BAD_REQUEST,
    error: ErrorTypes.get(400),
    message: ErrorMessages.get(ErrorCodes.BAD_REQUEST),
  },
  playerNotFound: {
    statusCode: 404,
    code: ErrorCodes.PLAYER_NOT_FOUND,
    error: ErrorTypes.get(404),
    message: ErrorMessages.get(ErrorCodes.PLAYER_NOT_FOUND),
  },

  // Match related errors
  matchNotFound: {
    statusCode: 404,
    code: ErrorCodes.MATCH_NOT_FOUND,
    error: ErrorTypes.get(404),
    message: ErrorMessages.get(ErrorCodes.MATCH_NOT_FOUND),
  },
  invalidFields: {
    statusCode: 400,
    code: ErrorCodes.INVALID_FIELDS,
    error: ErrorTypes.get(400),
    message: ErrorMessages.get(ErrorCodes.INVALID_FIELDS),
  },
  matchNotActive: {
    statusCode: 400,
    code: ErrorCodes.MATCH_NOT_ACTIVE,
    error: ErrorTypes.get(400),
    message: ErrorMessages.get(ErrorCodes.MATCH_NOT_ACTIVE),
  },

  // Tournament related errors
  tournamentWrongMatchCount: {
    statusCode: 400,
    code: ErrorCodes.TOURNAMENT_WRONG_MATCH_COUNT,
    error: ErrorTypes.get(400),
    message: ErrorMessages.get(ErrorCodes.TOURNAMENT_WRONG_MATCH_COUNT),
  },
  tournamentNotFound: {
    statusCode: 404,
    code: ErrorCodes.TOURNAMENT_NOT_FOUND,
    error: ErrorTypes.get(404),
    message: ErrorMessages.get(ErrorCodes.TOURNAMENT_NOT_FOUND),
  },
  tournamentInsufficientPlayers: {
    statusCode: 400,
    code: ErrorCodes.TOURNAMENT_INSUFFICIENT_PLAYERS,
    error: ErrorTypes.get(400),
    message: ErrorMessages.get(ErrorCodes.TOURNAMENT_INSUFFICIENT_PLAYERS),
  },

  // Goal related errors
  playerNotInMatch: {
    statusCode: 400,
    code: ErrorCodes.PLAYER_NOT_IN_MATCH,
    error: ErrorTypes.get(400),
    message: ErrorMessages.get(ErrorCodes.PLAYER_NOT_IN_MATCH),
  },
  goalNotFound: {
    statusCode: 404,
    code: ErrorCodes.GOAL_NOT_FOUND,
    error: ErrorTypes.get(404),
    message: ErrorMessages.get(ErrorCodes.GOAL_NOT_FOUND),
  },

  //elo related errors
  eloNotFound: {
    statusCode: 404,
    code: ErrorCodes.ELO_NOT_FOUND,
    error: ErrorTypes.get(404),
    message: ErrorMessages.get(ErrorCodes.ELO_NOT_FOUND),
  },

  //api related errors
  pictureNotFound: {
    statusCode: 404,
    code: ErrorCodes.PICTURE_NOT_FOUND,
    error: ErrorTypes.get(404),
    message: ErrorMessages.get(ErrorCodes.PICTURE_NOT_FOUND),
  },

  //auth related errors
  loginFailure: {
    statusCode: 401,
    code: ErrorCodes.LOGIN_FAILURE,
    error: ErrorTypes.get(401),
    message: ErrorMessages.get(ErrorCodes.LOGIN_FAILURE),
  },

  //profil related errors
  noFileProvided: {
    statusCode: 404,
    code: ErrorCodes.NO_FILE_PROVIDED,
    error: ErrorTypes.get(404),
    message: ErrorMessages.get(ErrorCodes.NO_FILE_PROVIDED),
  },
  invalidType: {
    statusCode: 403,
    code: ErrorCodes.INVALID_TYPE,
    error: ErrorTypes.get(403),
    message: ErrorMessages.get(ErrorCodes.INVALID_TYPE),
  },

  //friends
  friendshipExist: {
    statusCode: 409,
    code: ErrorCodes.FRIENDSHIP_EXISTS,
    error: ErrorTypes.get(409),
    message: ErrorMessages.get(ErrorCodes.FRIENDSHIP_EXISTS),
  },
  friendshipNotFound: {
    statusCode: 404,
    code: ErrorCodes.FRIENDS_NOTFOUND,
    error: ErrorTypes.get(404),
    message: ErrorMessages.get(ErrorCodes.FRIENDS_NOTFOUND),
  },

  // Jwt
  jwtBadHeader: {
    statusCode: 401,
    code: ErrorCodes.JWT_BAD_HEADER,
    error: ErrorTypes.get(401),
    message: ErrorMessages.get(ErrorCodes.JWT_BAD_HEADER),
  },
  jwtInsufficientPerm: {
    statusCode: 403,
    code: ErrorCodes.JWT_INSUFFICIENT_PERMISSIIONS,
    error: ErrorTypes.get(403),
    message: ErrorMessages.get(ErrorCodes.JWT_INSUFFICIENT_PERMISSIIONS),
  },
  jwtTokenExpired: {
    statusCode: 401,
    code: ErrorCodes.JWT_INSUFFICIENT_PERMISSIIONS,
    error: ErrorTypes.get(401),
    message: ErrorMessages.get(ErrorCodes.JWT_INSUFFICIENT_PERMISSIIONS),
  },
  jwtRevoked: {
    statusCode: 403,
    code: ErrorCodes.JWT_REVOKED,
    error: ErrorTypes.get(403),
    message: ErrorMessages.get(ErrorCodes.JWT_REVOKED),
  },

  //2fa
  twofaBadCode: {
    statusCode: 401,
    code: ErrorCodes.TWOFA_BAD_CODE,
    error: ErrorTypes.get(401),
    message: ErrorMessages.get(ErrorCodes.TWOFA_BAD_CODE),
  },
};
