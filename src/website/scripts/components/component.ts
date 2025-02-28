/**
 * Base Component class that all components will extend
 */
export abstract class Component {
  protected container: HTMLElement;
  
  constructor(container: HTMLElement) {
    this.container = container;
  }
  
  /**
   * Abstract render method that components must implement
   */
  abstract render(): void;
  
  /**
   * Method to clean up resources when the component is destroyed
   */
  destroy(): void {
    // Default implementation - components can override if needed
  }
  
  /**
   * Helper method to load HTML template from a file
   */
  protected async loadTemplate(path: string): Promise<string> {
    try {
      // Use a relative path from the website root
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