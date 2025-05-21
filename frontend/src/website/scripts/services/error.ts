import { ErrorCodes } from '@shared/constants/error.const';

/**
 * Standard error response format from the backend API
 */
export interface ErrorResponse {
	statusCode: number;
	code: string;
	error: string;
	message: string;
}

/**
 * API error class that preserves backend error information
 */
export class ApiError extends Error {
	statusCode: number;
	code: string;
	
	constructor(errorResponse: ErrorResponse) {
		super(errorResponse.message);
		this.name = 'ApiError';
		this.statusCode = errorResponse.statusCode;
		this.code = errorResponse.code;
		
		// Ensures correct prototype chain for instanceof checks
		Object.setPrototypeOf(this, ApiError.prototype);
	}
	
	/**
	 * Helper to check if an error is a specific API error type
	 */
	isErrorCode(code: ErrorCodes | string): boolean {
		return this.code === code;
	}
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(statusCode: number, code: ErrorCodes, message?: string): ErrorResponse {
	const errorTypes = new Map([
		[400, 'Bad Request'],
		[401, 'Unauthorized'],
		[403, 'Forbidden'],
		[404, 'Not Found'],
		[409, 'Conflict'],
		[500, 'Internal Server Error'],
		[503, 'Service Unavailable'],
	]);

	return {
		statusCode,
		code,
		error: errorTypes.get(statusCode) || 'Unknown Error',
		message: message || code
	};
}
