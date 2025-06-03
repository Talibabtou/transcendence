import htm from 'htm';
import { NotificationManager } from '@website/scripts/services';

// =========================================
// CORE ELEMENT CREATION
// =========================================

/**
 * Creates DOM elements from template literal tags.
 * @param type - The HTML tag name or 'fragment' for DocumentFragment
 * @param props - Object containing element attributes and event handlers
 * @param children - Child elements or text content
 * @returns Created DOM node (HTMLElement, Text, or DocumentFragment)
 */
function createElement(
	type: string,
	props: Record<string, string | number | boolean | EventListener | { __html: string } | Record<string, string | number>> | null,
	...children: (Node | string | (Node | string)[])[]
): HTMLElement | Text | DocumentFragment {
	try {
		if (type === 'fragment') return createFragment(children);
		
		const element = document.createElement(type);
		if (props) applyProps(element, props);
		appendChildren(element, children);
		
		return element;
	} catch (error) {
		NotificationManager.handleError(error);
		return document.createDocumentFragment();
	}
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
function applyProps(
	element: HTMLElement,
	props: Record<string, string | number | boolean | EventListener | { __html: string } | Record<string, string | number>>
): void {
	Object.entries(props).forEach(([name, value]) => {
		try {
			if (name.startsWith('on') && name.toLowerCase() in window) {
				element.addEventListener(name.toLowerCase().substring(2), value as EventListener);
			} else if (name === 'className') {
				element.setAttribute('class', value as string);
			} else if (name === 'style' && typeof value === 'object') {
				Object.assign(element.style, value);
			} else if (name === 'dangerouslySetInnerHTML' && typeof value === 'object' && value?.__html) {
				element.innerHTML = value.__html as string;
			} else {
				element.setAttribute(name, value as string);
			}
		} catch (error) {
			NotificationManager.handleError(error);
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
		try {
			if (child === null || child === undefined) return;
			
			if (Array.isArray(child)) {
				appendChildren(parent, child);
			} else if (typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean') {
				parent.appendChild(document.createTextNode(String(child)));
			} else if (child instanceof Node) {
				parent.appendChild(child);
			}
		} catch (error) {
			NotificationManager.handleError(error);
		}
	});
}

// =========================================
// PUBLIC API
// =========================================

/**
 * Tagged template literal function for creating DOM elements.
 * Provides JSX-like syntax using template literals.
 * @example
 * html`<div class="box">
 *     <h1>Title</h1>
 *     <p onclick=${() => alert('clicked')}>Click me</p>
 * </div>`
 */
export const html = htm.bind(createElement);
export type VNode = HTMLElement | Text | DocumentFragment | (HTMLElement | Text | DocumentFragment)[];
export type VNodeArray = VNode[];
export type VNodeOrArray = VNode | VNodeArray;

/**
 * Renders virtual DOM nodes into a container element.
 * Replaces existing content of the container.
 * @param vdom - Virtual DOM node(s) to render
 * @param container - Target container element
 */
export function render(
	vdom: VNodeOrArray,
	container: HTMLElement
): void {
	try {
		container.textContent = '';
		
		if (Array.isArray(vdom)) {
			vdom.forEach(node => {
				if (node instanceof Node) container.appendChild(node);
			});
		} else if (vdom instanceof Node) {
			container.appendChild(vdom);
		}
	} catch (error) {
		NotificationManager.handleError(error);
	}
}

/**
 * Updates an existing DOM element with new content while preserving its position.
 * @param vdom - New virtual DOM node(s) to render
 * @param container - Target container element to update
 */
export function update(
	vdom: VNodeOrArray,
	container: HTMLElement
): void {
	try {
		const parent = container.parentNode;
		const nextSibling = container.nextSibling;
		
		container.textContent = '';
		
		if (Array.isArray(vdom)) {
			vdom.forEach(node => {
				if (node instanceof Node) container.appendChild(node);
			});
		} else if (vdom instanceof Node) {
			container.appendChild(vdom);
		}
		
		if (parent && !container.parentNode) {
			parent.insertBefore(container, nextSibling || null);
		}
	} catch (error) {
		NotificationManager.handleError(error);
	}
}
