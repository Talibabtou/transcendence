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

/**
 * Types of notifications for the UI
 */
export enum NotificationType {
	ERROR = 'error',
	WARNING = 'warning',
	INFO = 'info',
	SUCCESS = 'success'
}

/**
 * Structure for notification objects
 */
interface Notification {
	id: string;
	type: NotificationType;
	message: string;
	timeout: number;
}

/**
 * Map of error codes to user-friendly messages and notification types
 */
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
			const existingContainer = document.getElementById('notification-container');
			if (existingContainer) this.container = existingContainer;
			else this.createContainer();
		});
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
		if (!this.container) this.createContainer();
		const id = `notification-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
		
		this.notifications.push({ id, type, message, timeout });
		
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
		
		if (timeout > 0) setTimeout(() => this.removeNotification(id), timeout);
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
				if (element.parentNode === this.container) this.container!.removeChild(element);
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
				if (errorConfig) return this.showNotification(errorConfig.message, errorConfig.type, this.defaultTimeout);
				if ('message' in error && typeof error.message === 'string') return this.showError(error.message as string);
			}
			if (error instanceof Error) return this.showError(error.message);
		}
		return this.showError(typeof error === 'string' ? error : 'An unknown error occurred');
	}
	
	/**
	 * Handle a specific error code
	 */
	public handleErrorCode(code: ErrorCodes | string, defaultMessage?: string): string {
		const errorConfig = this.errorConfigMap.get(code);
		if (errorConfig) return this.showNotification(errorConfig.message, errorConfig.type, this.defaultTimeout);
		return this.showError(defaultMessage || `Error: ${code}`);
	}
	
	/**
	 * Clear all notifications
	 */
	public clearAll(): void {
		this.notifications.forEach(notification => this.removeNotification(notification.id));
	}
}

export const NotificationManager = NotificationManagerService.getInstance();