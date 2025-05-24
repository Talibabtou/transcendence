import { ErrorCodes, ErrorMessages, ErrorTypes } from '@shared/constants/error.const';

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
 * Creates a standardized error response
 */
export function createErrorResponse(statusCode: number, code: ErrorCodes, message?: string): ErrorResponse {
	return {
		statusCode,
		code,
		error: ErrorTypes.get(statusCode) || 'Unknown Error',
		message: message || ErrorMessages.get(code) || code
	};
}

// Types of notifications for the UI
export enum NotificationType {
	ERROR = 'error',
	WARNING = 'warning',
	INFO = 'info',
	SUCCESS = 'success'
}

// Structure for notification objects
interface Notification {
	id: string;
	type: NotificationType;
	message: string;
	timeout: number;
}

// Map of error codes to user-friendly messages and notification types
interface ErrorConfig {
	message: string;
	type: NotificationType;
}

/**
 * Centralized notification management service
 * Displays messages as toasts in the bottom-right corner
 */
class NotificationManagerService {
	private static instance: NotificationManagerService;
	private notifications: Notification[] = [];
	private container: HTMLElement | null = null;
	private defaultTimeout = 3000;
	private errorConfigMap: Map<string, ErrorConfig> = new Map();
	
	private constructor() {
		this.createContainer();
		
		window.addEventListener('DOMContentLoaded', () => {
			this.initializeContainer();
		});
		this.initializeErrorConfigMap();
	}
	
	/**
	 * Initialize the error config map with all error codes from ErrorCodes enum
	 */
	private initializeErrorConfigMap(): void {
		// Common errors - typically ERROR type
		this.errorConfigMap.set(ErrorCodes.INVALID_REQUEST, { 
			message: 'Invalid request format', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.UNAUTHORIZED, { 
			message: 'You are not authorized to perform this action', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.FORBIDDEN, { 
			message: 'Access denied', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.NOT_FOUND, { 
			message: 'Resource not found', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.INTERNAL_ERROR, { 
			message: 'An internal error occurred. Please try again later.', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.SERVICE_UNAVAILABLE, { 
			message: 'Service is temporarily unavailable. Please try again later.', 
			type: NotificationType.ERROR 
		});
		
		// Authentication errors
		this.errorConfigMap.set(ErrorCodes.LOGIN_FAILURE, { 
			message: 'Invalid username or password', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.TWOFA_BAD_CODE, { 
			message: 'Invalid verification code', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.JWT_EXP_TOKEN, { 
			message: 'Your session has expired. Please log in again.', 
			type: NotificationType.WARNING 
		});
		this.errorConfigMap.set(ErrorCodes.JWT_REVOKED, { 
			message: 'Your session has been revoked. Please log in again.', 
			type: NotificationType.WARNING 
		});
		this.errorConfigMap.set(ErrorCodes.JWT_BAD_HEADER, { 
			message: 'Authentication error. Please log in again.', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.JWT_INSUFFICIENT_PERMISSIIONS, { 
			message: 'You do not have permission to perform this action', 
			type: NotificationType.ERROR 
		});
		
		// Game/match related errors
		this.errorConfigMap.set(ErrorCodes.MATCH_NOT_FOUND, { 
			message: 'Match not found', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.INVALID_FIELDS, { 
			message: 'Invalid or insufficient information provided', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.MATCH_NOT_ACTIVE, { 
			message: 'This match is no longer active', 
			type: NotificationType.WARNING 
		});
		this.errorConfigMap.set(ErrorCodes.PLAYER_NOT_FOUND, { 
			message: 'Player not found', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.PLAYER_NOT_IN_MATCH, { 
			message: 'Player is not part of this match', 
			type: NotificationType.ERROR 
		});
		
		// Tournament errors
		this.errorConfigMap.set(ErrorCodes.TOURNAMENT_NOT_FOUND, { 
			message: 'Tournament not found', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.TOURNAMENT_WRONG_MATCH_COUNT, { 
			message: 'Tournament is not at the final stage', 
			type: NotificationType.WARNING 
		});
		this.errorConfigMap.set(ErrorCodes.TOURNAMENT_INSUFFICIENT_PLAYERS, { 
			message: 'Not enough players to start the tournament', 
			type: NotificationType.WARNING 
		});
		
		// Profile related errors
		this.errorConfigMap.set(ErrorCodes.NO_FILE_PROVIDED, { 
			message: 'No file was provided', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.INVALID_TYPE, { 
			message: 'Invalid file type', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.PICTURE_NOT_FOUND, { 
			message: 'Profile picture not found', 
			type: NotificationType.ERROR 
		});
		
		// Friend related errors
		this.errorConfigMap.set(ErrorCodes.FRIENDSHIP_EXISTS, { 
			message: 'You are already friends with this user', 
			type: NotificationType.INFO 
		});
		this.errorConfigMap.set(ErrorCodes.FRIENDS_NOTFOUND, { 
			message: 'Friend relationship not found', 
			type: NotificationType.ERROR 
		});
		
		// Database errors - typically shown as warnings or errors
		this.errorConfigMap.set(ErrorCodes.SQLITE_MISMATCH, { 
			message: 'Database type mismatch error', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.SQLITE_CONSTRAINT, { 
			message: 'Database constraint violation', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.BAD_REQUEST, { 
			message: 'Invalid request', 
			type: NotificationType.ERROR 
		});
		
		// Other specific errors
		this.errorConfigMap.set(ErrorCodes.GOAL_NOT_FOUND, { 
			message: 'Goal not found', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.ELO_NOT_FOUND, { 
			message: 'Elo rating not found for this player', 
			type: NotificationType.ERROR 
		});

		// Common frontend errors
		this.registerCommonFrontendErrors();
	}

	/**
	 * Register common frontend errors that aren't in the error constants
	 */
	private registerCommonFrontendErrors(): void {
		// Network errors
		this.registerError('network_error', 'Network connection error. Please check your internet connection.', NotificationType.ERROR);
		this.registerError('timeout', 'Request timed out. Please try again.', NotificationType.WARNING);
		
		// Form validation errors
		this.registerError('required_field', 'This field is required', NotificationType.ERROR);
		this.registerError('invalid_email', 'Please enter a valid email address', NotificationType.ERROR);
		this.registerError('password_mismatch', 'Passwords do not match', NotificationType.ERROR);
		this.registerError('password_too_short', 'Password must be at least 8 characters', NotificationType.ERROR);
		this.registerError('username_taken', 'Username is already taken', NotificationType.ERROR);
		this.registerError('email_taken', 'Email is already registered', NotificationType.ERROR);
		
		// Game-specific errors
		this.registerError('game_connection_lost', 'Connection to the game server was lost', NotificationType.ERROR);
		this.registerError('opponent_disconnected', 'Your opponent has disconnected', NotificationType.WARNING);
		this.registerError('game_full', 'This game is already full', NotificationType.ERROR);
		this.registerError('tournament_full', 'This tournament is already full', NotificationType.ERROR);
		
		// File upload errors
		this.registerError('file_too_large', 'File is too large', NotificationType.ERROR);
		this.registerError('invalid_file_type', 'Invalid file type', NotificationType.ERROR);
		this.registerError('upload_failed', 'File upload failed', NotificationType.ERROR);
		
		// WebSocket errors
		this.registerError('websocket_connection_failed', 'Failed to connect to server', NotificationType.ERROR);
		this.registerError('websocket_disconnected', 'Disconnected from server', NotificationType.WARNING);
		
		// Authentication errors
		this.registerError('session_expired', 'Your session has expired. Please log in again.', NotificationType.WARNING);
		this.registerError('invalid_credentials', 'Invalid username or password', NotificationType.ERROR);
		this.registerError('account_locked', 'Your account has been locked. Please contact support.', NotificationType.ERROR);
		
		// Permission errors
		this.registerError('permission_denied', 'You do not have permission to perform this action', NotificationType.ERROR);
		
		// General errors
		this.registerError('unknown_error', 'An unknown error occurred', NotificationType.ERROR);
		this.registerError('operation_failed', 'Operation failed. Please try again.', NotificationType.ERROR);
	}

	/**
	 * Register a custom error type
	 */
	public registerError(code: string, message: string, type: NotificationType): void {
			this.errorConfigMap.set(code, { message, type });
	}
	
	/**
	 * Get singleton instance
	 */
	public static getInstance(): NotificationManagerService {
		if (!NotificationManagerService.instance) {
			NotificationManagerService.instance = new NotificationManagerService();
		}
		return NotificationManagerService.instance;
	}
	
	/**
	 * Initialize the notification container
	 */
	private initializeContainer(): void {
		// Check if container already exists
		const existingContainer = document.getElementById('notification-container');
		
		if (existingContainer) {
			this.container = existingContainer;
		} else {
			this.createContainer();
		}
	}
	
	/**
	 * Create the notification container
	 */
	private createContainer(): void {
		this.container = document.createElement('div');
		this.container.id = 'notification-container';
		this.container.className = 'notification-container';
		document.body.appendChild(this.container);
	}
	
	/**
	 * Display an error notification
	 */
	public showError(message: string, timeout: number = this.defaultTimeout): string {
		return this.showNotification(message, NotificationType.ERROR, timeout);
	}
	
	/**
	 * Display a warning notification
	 */
	public showWarning(message: string, timeout: number = this.defaultTimeout): string {
		return this.showNotification(message, NotificationType.WARNING, timeout);
	}
	
	/**
	 * Display an info notification
	 */
	public showInfo(message: string, timeout: number = this.defaultTimeout): string {
		return this.showNotification(message, NotificationType.INFO, timeout);
	}
	
	/**
	 * Display a success notification
	 */
	public showSuccess(message: string, timeout: number = this.defaultTimeout): string {
		return this.showNotification(message, NotificationType.SUCCESS, timeout);
	}
	
	/**
	 * Display a notification of any type
	 */
	private showNotification(message: string, type: NotificationType, timeout: number): string {
		// Make sure container exists
		if (!this.container) {
			this.createContainer();
		}
		
		// Generate unique ID
		const id = `notification-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
		
		// Create notification object
		const notification: Notification = {
			id,
			type,
			message,
			timeout
		};
		
		// Add to internal tracking
		this.notifications.push(notification);
		
		// Create and append DOM element
		const element = document.createElement('div');
		element.id = id;
		element.className = `notification notification-${type} notification-enter shake`;
		
		const messageEl = document.createElement('div');
		messageEl.className = 'notification-message';
		messageEl.textContent = message;
		
		const closeButton = document.createElement('button');
		closeButton.className = 'notification-close';
		closeButton.innerHTML = '&times;';
		closeButton.addEventListener('click', () => this.removeNotification(id));
		
		element.appendChild(messageEl);
		element.appendChild(closeButton);
		this.container!.appendChild(element);
		
		// Set auto-remove timeout
		if (timeout > 0) {
			setTimeout(() => this.removeNotification(id), timeout);
		}
		
		return id;
	}
	
	/**
	 * Remove a notification by ID
	 */
	public removeNotification(id: string): void {
		const element = document.getElementById(id);
		if (element) {
			element.classList.add('notification-exit');
			
			// Wait for exit animation to complete
			setTimeout(() => {
				if (element.parentNode === this.container) {
					this.container!.removeChild(element);
				}
				
				// Remove from internal tracking
				this.notifications = this.notifications.filter(n => n.id !== id);
			}, 300);
		}
	}
	
	/**
	 * Handle an error and show appropriate notification
	 */
	public handleError(error: unknown): string {
		console.error('Error caught by NotificationManager:', error);
		
		// Handle errors based on their structure
		if (typeof error === 'object' && error !== null) {
			if ('code' in error && typeof error.code === 'string') {
				const errorCode = error.code as string;
				const errorConfig = this.errorConfigMap.get(errorCode);
				
				if (errorConfig) {
					return this.showNotification(errorConfig.message, errorConfig.type, this.defaultTimeout);
				}
				
				// If we have a message property, use that
				if ('message' in error && typeof error.message === 'string') {
					return this.showError(error.message as string);
				}
			}
			
			// Standard Error object
			if (error instanceof Error) {
				return this.showError(error.message);
			}
		}
		
		// Handle string errors
		if (typeof error === 'string') {
			return this.showError(error);
		}
		
		// Handle unknown error types
		return this.showError('An unknown error occurred');
	}
	
	/**
	 * Handle a specific error code
	 */
	public handleErrorCode(code: ErrorCodes | string, defaultMessage?: string): string {
		const errorConfig = this.errorConfigMap.get(code);
		
		if (errorConfig) {
			return this.showNotification(errorConfig.message, errorConfig.type, this.defaultTimeout);
		}
		
		// If we don't have a config for this code, use the default message or a generic one
		return this.showError(defaultMessage || `Error: ${code}`);
	}
	
	/**
	 * Clear all notifications
	 */
	public clearAll(): void {
		this.notifications.forEach(notification => {
			this.removeNotification(notification.id);
		});
	}
}

// Export singleton instance
export const NotificationManager = NotificationManagerService.getInstance();

// // Example usage in any component
// import { NotificationManager } from '@website/scripts/services';

// // Simple error display
// NotificationManager.showError('Something went wrong');

// // Success message
// NotificationManager.showSuccess('Operation completed successfully');

// // Warning message
// NotificationManager.showWarning('This action might have consequences');

// // Info message
// NotificationManager.showInfo('The game will start in a few moments');

// // Use the error handler to automatically determine the type of error
// try {
//   // Some code that might throw an error
//   await someApiCall();
// } catch (error) {
//   // This will automatically determine what kind of error it is
//   // and display an appropriate message
//   NotificationManager.handleError(error);
// }