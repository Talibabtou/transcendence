/**
 * Base component class providing core functionality for UI components
 * Handles state management, rendering lifecycle, and error handling
 * @template StateType - Type of the component's internal state
 * @template TemplateDataType - Type of data used in template rendering
 */
export abstract class Component<StateType = any, TemplateDataType = any> {
	/**
	 * The DOM element that contains this component
	 */
	protected container: HTMLElement;

	/**
	 * Tracks component error state
	 */
	protected errorState: { hasError: boolean; message: string } = { 
		hasError: false, 
		message: '' 
	};

	/**
	 * Internal state storage
	 */
	private internalState: StateType;

	/**
	 * Collection of state change listeners
	 */
	private internalStateListeners: Array<(newState: StateType, oldState: StateType) => void> = [];

	/**
	 * Optional error handler
	 */
	private onError?: (componentName: string, message: string) => void;

	// =========================================
	// LIFECYCLE MANAGEMENT
	// =========================================

	/**
	 * Creates a new component instance
	 * @param container - The DOM element to render the component into
	 * @param initialState - Optional initial state for the component
	 * @param onError - Optional error handler for the component
	 */
	constructor(container: HTMLElement, initialState?: StateType, onError?: (componentName: string, message: string) => void) {
		this.container = container;
		this.internalState = initialState || {} as StateType;
		this.onError = onError;
	}

	/**
	 * Manages the complete rendering lifecycle with error handling
	 * Calls beforeRender, render, and afterRender in sequence
	 */
	public renderComponent(): void {
		try {
			this.beforeRender();
			this.render();
			this.afterRender();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown rendering error';
			this.setErrorState(message);
		}
	}

	/**
	 * Lifecycle hook executed before rendering
	 * Can be overridden by subclasses for pre-render operations
	 */
	protected beforeRender(): void {
		// Default empty implementation
	}

	/**
	 * Abstract render method that must be implemented by subclasses
	 * Defines how the component should be rendered
	 */
	abstract render(): void;

	/**
	 * Lifecycle hook executed after rendering
	 * Can be overridden by subclasses for post-render operations
	 */
	protected afterRender(): void {
		// Default empty implementation
	}

	/**
	 * Cleans up component resources and removes state listeners
	 * Should be called when component is no longer needed
	 */
	public destroy(): void {
		this.clearErrorState();
		this.internalStateListeners = [];
	}

	// =========================================
	// STATE MANAGEMENT
	// =========================================

	/**
	 * Returns the current internal state
	 */
	protected getInternalState(): StateType {
		return this.internalState;
	}

	/**
	 * Updates component state and triggers change listeners
	 */
	protected updateInternalState(newState: Partial<StateType>): void {
		const oldState = { ...this.internalState } as StateType;
		this.internalState = { ...this.internalState, ...newState } as StateType;
		
		// Notify listeners of state change
		this.internalStateListeners.forEach(listener => listener(this.internalState, oldState));
		
		// Trigger re-render with new state
		this.renderComponent();
	}

	/**
	 * Registers a listener for state changes
	 * @param listener - Function to call when state changes
	 * @returns Function to unsubscribe the listener
	 */
	protected onInternalStateChange(
		listener: (newState: StateType, oldState: StateType) => void
	): () => void {
		this.internalStateListeners.push(listener);
		
		return () => {
			this.internalStateListeners = this.internalStateListeners.filter(l => l !== listener);
		};
	}

	// =========================================
	// TEMPLATING & RENDERING
	// =========================================

	/**
	 * Loads and renders a template with the provided data
	 */
	protected async renderTemplate(templatePath: string, data: TemplateDataType): Promise<void> {
		try {
			const template = await this.loadTemplate(templatePath);
			const rendered = this.bindDataToTemplate(template, data);
			this.container.innerHTML = rendered;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Template rendering failed';
			this.setErrorState(message);
		}
	}

	/**
	 * Loads a template file from the specified path
	 * @param path - Path to the template file
	 * @returns Promise resolving to template content
	 */
	protected async loadTemplate(path: string): Promise<string> {
		try {
			const adjustedPath = path.startsWith('/') ? path.substring(1) : path;
			const response = await fetch(`/src/website/${adjustedPath}`);
			
			if (!response.ok) {
				const errorMessage = `Failed to load template: ${response.status} ${response.statusText}`;
				this.setErrorState(errorMessage);
				throw new Error(errorMessage);
			}
			
			return await response.text();
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error loading template';
			this.setErrorState(errorMessage);
			return this.getFallbackErrorTemplate(errorMessage);
		}
	}

	/**
	 * Binds data to a template by replacing placeholders
	 * @param template - Template string with {{key}} placeholders
	 * @param data - Data object containing values for placeholders
	 * @returns Rendered template with replaced values
	 */
	protected bindDataToTemplate(template: string, data: TemplateDataType): string {
		let result = template;
		
		Object.entries(data as Record<string, any>).forEach(([key, value]) => {
			const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
			result = result.replace(regex, value);
		});
		
		return result;
	}

	// =========================================
	// ERROR HANDLING
	// =========================================

	/**
	 * Sets the component into an error state
	 */
	protected setErrorState(message: string): void {
		this.errorState = { hasError: true, message };
		if (this.onError) {
			this.onError(this.constructor.name, message);
		}
	}
	
	/**
	 * Clears the current error state
	 */
	protected clearErrorState(): void {
		this.errorState = { hasError: false, message: '' };
	}
	
	/**
	 * Generates a fallback error template
	 * @param message - Error message to display
	 * @returns HTML string for error display
	 */
	protected getFallbackErrorTemplate(message: string): string {
		return `
			<div class="error-container">
				<div class="error-icon">⚠️</div>
				<div class="error-message">${message}</div>
				<button class="error-retry-btn" onclick="window.location.reload()">Retry</button>
			</div>
		`;
	}

	/**
	 * Public method to refresh the component
	 * Can be called by router to re-initialize after auth changes
	 */
	public refresh(): void {
		this.render();
		this.afterRender();
		
		// Call setupEventListeners if component implements it
		// This was causing listeners to be re-added on existing components when router called refresh.
		// Individual components should manage listener re-creation during their own render/refresh 
		// cycle if necessary, and do so idempotently.
		// if (typeof (this as any).setupEventListeners === 'function') {
		// 	setTimeout(() => {
		// 		(this as any).setupEventListeners();
		// 	}, 0);
		// }
	}

	public getDOMContainer(): HTMLElement {
		return this.container;
	}
}
