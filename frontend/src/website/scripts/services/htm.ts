import htm from 'htm';

// =========================================
// CORE ELEMENT CREATION
// =========================================

/**
 * Creates DOM elements from template literal tags.
 * 
 * @param type - The HTML tag name or 'fragment' for DocumentFragment
 * @param props - Object containing element attributes and event handlers
 * @param children - Child elements or text content
 * @returns Created DOM node (HTMLElement, Text, or DocumentFragment)
 */
function createElement(
	type: string,
	props: Record<string, any> | null,
	...children: (Node | string | (Node | string)[])[]
): HTMLElement | Text | DocumentFragment {
	// Handle DocumentFragment creation
	if (type === 'fragment') {
		return createFragment(children);
	}

	// Create the main element
	const element = document.createElement(type);

	// Apply properties and event handlers
	if (props) {
		applyProps(element, props);
	}

	// Append children
	appendChildren(element, children);

	return element;
}

// =========================================
// DOM MANIPULATION HELPERS
// =========================================

/**
 * Creates a DocumentFragment with the given children.
 * @param children - Elements to append to the fragment
 */
function createFragment(children: (Node | string | (Node | string)[])[]) {
	const fragment = document.createDocumentFragment();
	appendChildren(fragment, children);
	return fragment;
}

/**
 * Applies properties, attributes, and event handlers to an element.
 * @param element - Target DOM element
 * @param props - Properties to apply
 */
function applyProps(element: HTMLElement, props: Record<string, any>): void {
	Object.entries(props).forEach(([name, value]) => {
		// Handle event listeners (onClick, onInput, etc.)
		if (name.startsWith('on') && name.toLowerCase() in window) {
			element.addEventListener(
				name.toLowerCase().substring(2),
				value as EventListener
			);
		}
		// Handle className property
		else if (name === 'className') {
			element.setAttribute('class', value as string);
		}
		// Handle style object
		else if (name === 'style' && typeof value === 'object') {
			Object.assign(element.style, value);
		}
		// Handle dangerous HTML insertion
		else if (name === 'dangerouslySetInnerHTML' && value?.__html) {
			element.innerHTML = value.__html;
		}
		// Handle regular attributes
		else {
			element.setAttribute(name, value as string);
		}
	});
}

/**
 * Appends children to a parent node, handling arrays and text nodes.
 * @param parent - Parent DOM node
 * @param children - Children to append
 */
function appendChildren(
	parent: HTMLElement | DocumentFragment,
	children: (Node | string | number | boolean | (Node | string | number | boolean)[])[]
): void {
	children.forEach(child => {
		if (child === null || child === undefined) {
			return;
		}

		if (Array.isArray(child)) {
			appendChildren(parent, child);
		} else if (typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean') {
			parent.appendChild(document.createTextNode(String(child)));
		} else if (child instanceof Node) {
			parent.appendChild(child);
		}
	});
}

// =========================================
// PUBLIC API
// =========================================

/**
 * Tagged template literal function for creating DOM elements.
 * Provides JSX-like syntax using template literals.
 * 
 * @example
 * html`<div class="box">
 *     <h1>Title</h1>
 *     <p onclick=${() => alert('clicked')}>Click me</p>
 * </div>`
 */
export const html = htm.bind(createElement);

/**
 * Renders virtual DOM nodes into a container element.
 * Replaces existing content of the container.
 * 
 * @param vdom - Virtual DOM node(s) to render
 * @param container - Target container element
 * 
 * @example
 * const container = document.querySelector('.app');
 * render(html`<div>Hello World</div>`, container);
 */
export function render(
	vdom: HTMLElement | Text | DocumentFragment | (HTMLElement | Text | DocumentFragment)[],
	container: HTMLElement
): void {
	// Clear existing content
	container.textContent = '';

	// Handle array of nodes or single node
	if (Array.isArray(vdom)) {
		vdom.forEach(node => {
			if (node instanceof Node) {
				container.appendChild(node);
			}
		});
	} else if (vdom instanceof Node) {
		container.appendChild(vdom);
	}
}

/**
 * Updates an existing DOM element with new content while preserving its position.
 * Useful for dynamic updates like progress bars or live data.
 * 
 * @param vdom - New virtual DOM node(s) to render
 * @param container - Target container element to update
 * 
 * @example
 * const container = document.querySelector('.progress-bar');
 * update(html`<div class="progress" style="width: ${progress}%"></div>`, container);
 */
export function update(
	vdom: HTMLElement | Text | DocumentFragment | (HTMLElement | Text | DocumentFragment)[],
	container: HTMLElement
): void {
	// Store the parent and next sibling for reinsertion
	const parent = container.parentNode;
	const nextSibling = container.nextSibling;

	// Remove the old content
	container.textContent = '';

	// Insert new content
	if (Array.isArray(vdom)) {
		vdom.forEach(node => {
			if (node instanceof Node) {
				container.appendChild(node);
			}
		});
	} else if (vdom instanceof Node) {
		container.appendChild(vdom);
	}

	// If the container was removed from DOM, reinsert it
	if (parent && !container.parentNode) {
		if (nextSibling) {
			parent.insertBefore(container, nextSibling);
		} else {
			parent.appendChild(container);
		}
	}
}

/**
 * Creates a component that can be updated with new content.
 * Useful for creating reusable, updatable UI elements.
 * 
 * @param container - The container element for the component
 * @param initialRender - Function that returns the initial virtual DOM
 * @returns Object with update method
 * 
 * @example
 * const progressBar = createComponent(
 *   container,
 *   () => html`<div class="progress" style="width: 0%"></div>`
 * );
 * 
 * // Later update the progress
 * progressBar.update(() => html`<div class="progress" style="width: 50%"></div>`);
 */
export function createComponent(
	container: HTMLElement,
	initialRender: () => HTMLElement | Text | DocumentFragment | (HTMLElement | Text | DocumentFragment)[]
) {
	// Initial render
	render(initialRender(), container);

	return {
		update: (newRender: () => HTMLElement | Text | DocumentFragment | (HTMLElement | Text | DocumentFragment)[]) => {
			update(newRender(), container);
		}
	};
}
