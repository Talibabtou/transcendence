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
	
	// =========================================
	// INITIALIZATION
	// =========================================
	
	/**
	 * Initialize the error config map with all error codes from ErrorCodes enum
	 */
	private initializeErrorConfigMap(): void {
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
		
		this.errorConfigMap.set(ErrorCodes.FRIENDSHIP_EXISTS, { 
			message: 'You are already friends with this user', 
			type: NotificationType.INFO 
		});
		this.errorConfigMap.set(ErrorCodes.FRIENDS_NOTFOUND, { 
			message: 'Friend relationship not found', 
			type: NotificationType.ERROR 
		});
		
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
		
		this.errorConfigMap.set(ErrorCodes.GOAL_NOT_FOUND, { 
			message: 'Goal not found', 
			type: NotificationType.ERROR 
		});
		this.errorConfigMap.set(ErrorCodes.ELO_NOT_FOUND, { 
			message: 'Elo rating not found for this player', 
			type: NotificationType.ERROR 
		});

		this.registerCommonFrontendErrors();
	}

	/**
	 * Register common frontend errors that aren't in the error constants
	 */
	private registerCommonFrontendErrors(): void {
		this.registerError('network_error', 'Network connection error. Please check your internet connection.', NotificationType.ERROR);
		this.registerError('timeout', 'Request timed out. Please try again.', NotificationType.WARNING);
		
		this.registerError('required_field', 'This field is required', NotificationType.ERROR);
		this.registerError('invalid_email', 'Please enter a valid email address', NotificationType.ERROR);
		this.registerError('password_mismatch', 'Passwords do not match', NotificationType.ERROR);
		this.registerError('password_too_short', 'Password must be at least 8 characters', NotificationType.ERROR);
		
		this.registerError('game_connection_lost', 'Connection to the game server was lost', NotificationType.ERROR);
		this.registerError('opponent_disconnected', 'Your opponent has disconnected', NotificationType.WARNING);
		this.registerError('game_full', 'This game is already full', NotificationType.ERROR);
		this.registerError('tournament_full', 'This tournament is already full', NotificationType.ERROR);
		this.registerError('match_creation_failed', 'Failed to create a new match', NotificationType.ERROR);
		this.registerError('match_canceled', 'The match was canceled', NotificationType.WARNING);
		
		this.registerError('file_too_large', 'File is too large (max 1MB)', NotificationType.ERROR);
		this.registerError('invalid_file_type', 'Invalid file type. Please use JPG, PNG, or GIF.', NotificationType.ERROR);
		this.registerError('upload_failed', 'File upload failed', NotificationType.ERROR);
		
		this.registerError('websocket_connection_failed', 'Failed to connect to server', NotificationType.ERROR);
		this.registerError('websocket_disconnected', 'Disconnected from server', NotificationType.WARNING);
		
		this.registerError('session_expired', 'Your session has expired. Please log in again.', NotificationType.WARNING);
		this.registerError('account_locked', 'Your account has been locked. Please contact support.', NotificationType.ERROR);
		
		this.registerError('unknown_error', 'An unknown error occurred', NotificationType.ERROR);
		this.registerError('operation_failed', 'Operation failed. Please try again.', NotificationType.ERROR);
		
		this.registerError('profile_update_failed', 'Failed to update your profile', NotificationType.ERROR);
		this.registerError('username_reserved', 'This username is reserved or contains restricted words', NotificationType.ERROR);
		
		this.registerError('friend_request_failed', 'Failed to send friend request', NotificationType.ERROR);
		this.registerError('friend_request_duplicate', 'A friend request has already been sent to this user', NotificationType.INFO);
		this.registerError('friend_request_blocked', 'This user is not accepting friend requests', NotificationType.WARNING);
		
		this.registerError('invalid_username_format', 'Username can only contain letters, numbers, and underscores', NotificationType.ERROR);
		this.registerError('username_too_short', 'Username must be at least 3 characters', NotificationType.ERROR);
		this.registerError('username_too_long', 'Username cannot exceed 20 characters', NotificationType.ERROR);
		
		this.registerError('unique_constraint_username', 'This username is already taken', NotificationType.ERROR);
		this.registerError('unique_constraint_email', 'This email address is already registered', NotificationType.ERROR);
		this.registerError('unique_constraint_friendship', 'You are already friends with this user', NotificationType.INFO);
		
		this.registerError('service_overloaded', 'The service is experiencing high traffic. Please try again later.', NotificationType.WARNING);
		this.registerError('maintenance', 'The system is currently undergoing maintenance', NotificationType.INFO);
		
		this.registerError('twofa_setup_failed', 'Failed to set up two-factor authentication', NotificationType.ERROR);
		this.registerError('twofa_disabled', 'Two-factor authentication has been disabled', NotificationType.INFO);
		
		this.registerError('tournament_join_failed', 'Failed to join tournament', NotificationType.ERROR);
		this.registerError('tournament_ended', 'This tournament has already ended', NotificationType.WARNING);
		this.registerError('tournament_in_progress', 'Cannot join tournament in progress', NotificationType.WARNING);
	}

	/**
	 * Initialize the notification container
	 */
	private initializeContainer(): void {
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
	
	// =========================================
	// SINGLETON MANAGEMENT
	// =========================================
	
	/**
	 * Get singleton instance
	 */
	public static getInstance(): NotificationManagerService {
		if (!NotificationManagerService.instance) {
			NotificationManagerService.instance = new NotificationManagerService();
		}
		return NotificationManagerService.instance;
	}
	
	// =========================================
	// PUBLIC NOTIFICATION API
	// =========================================
	
	/**
	 * Register a custom error type
	 */
	public registerError(code: string, message: string, type: NotificationType): void {
		this.errorConfigMap.set(code, { message, type });
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
		if (!this.container) {
			this.createContainer();
		}
		
		const id = `notification-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
		
		const notification: Notification = {
			id,
			type,
			message,
			timeout
		};
		
		this.notifications.push(notification);
		
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
			
			setTimeout(() => {
				if (element.parentNode === this.container) {
					this.container!.removeChild(element);
				}
				
				this.notifications = this.notifications.filter(n => n.id !== id);
			}, 300);
		}
	}
	
	// =========================================
	// ERROR HANDLING
	// =========================================
	
	/**
	 * Handle an error and show appropriate notification
	 */
	public handleError(error: unknown): string {
		if (typeof error === 'object' && error !== null) {
			if ('code' in error && typeof error.code === 'string') {
				const errorCode = error.code as string;
				const errorConfig = this.errorConfigMap.get(errorCode);
				
				if (errorConfig) {
					return this.showNotification(errorConfig.message, errorConfig.type, this.defaultTimeout);
				}
				
				if ('message' in error && typeof error.message === 'string') {
					return this.showError(error.message as string);
				}
			}
			
			if (error instanceof Error) {
				return this.showError(error.message);
			}
		}
		
		if (typeof error === 'string') {
			return this.showError(error);
		}
		
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
