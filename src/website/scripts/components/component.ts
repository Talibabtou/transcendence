export abstract class Component {
	protected container: HTMLElement;

	constructor(container: HTMLElement) {
		this.container = container;
	}

	abstract render(): void;

	destroy(): void {
	}

	protected async loadTemplate(path: string): Promise<string> {
		try {
			const adjustedPath = path.startsWith('/') ? path.substring(1) : path;
			const response = await fetch(`/src/website/${adjustedPath}`);
			if (!response.ok) {
				throw new Error(`Failed to load template: ${response.status} ${response.statusText}`);
			}
			return await response.text();
		} catch (error) {
			console.error(`Error loading template from ${path}:`, error);
			return '';
		}
	}
}
