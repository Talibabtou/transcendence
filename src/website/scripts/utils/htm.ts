import htm from 'htm';

// Update return type to include possible types
function createElement(type: string, props: any, ...children: any[]): HTMLElement | Text | DocumentFragment {
	if (type === 'fragment') {
		const fragment = document.createDocumentFragment();
		children.forEach(child => {
			if (typeof child === 'string') {
				fragment.appendChild(document.createTextNode(child));
			} else if (child instanceof Node) {
				fragment.appendChild(child);
			}
		});
		return fragment;
	}
	const element = document.createElement(type);
	// Handle properties
	if (props) {
		Object.entries(props).forEach(([name, value]) => {
			// Handle event handlers
			if (name.startsWith('on') && name.toLowerCase() in window) {
				element.addEventListener(name.toLowerCase().substring(2), value as EventListener);
			} else if (name === 'className') {
				// Handle className -> class
				element.setAttribute('class', value as string);
			} else if (name === 'style' && typeof value === 'object') {
				// Handle style objects
				Object.assign(element.style, value);
			} else if (name === 'dangerouslySetInnerHTML' && value && (value as any).__html) {
				// Handle innerHTML setting
				element.innerHTML = (value as any).__html;
			} else {
				// Handle regular attributes
				element.setAttribute(name, value as string);
			}
		});
	}
	// Add children
	children.forEach(child => {
		if (child === null || child === undefined) {
			return;
		}
		if (Array.isArray(child)) {
			child.forEach(nestedChild => {
				if (typeof nestedChild === 'string') {
					element.appendChild(document.createTextNode(nestedChild));
				} else if (nestedChild instanceof Node) {
					element.appendChild(nestedChild);
				}
			});
		} else if (typeof child === 'string') {
			element.appendChild(document.createTextNode(child));
		} else if (child instanceof Node) {
			element.appendChild(child);
		}
	});
	return element;
}

// Create our html template tag function
export const html = htm.bind(createElement);

// Update the render function to accept any DOM node
export function render(vdom: HTMLElement | Text | DocumentFragment | (HTMLElement | Text | DocumentFragment)[], container: HTMLElement): void {
	// Clear the container
	while (container.firstChild) {
		container.removeChild(container.firstChild);
	}
	// Append the new content
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
