/**
 * NavbarComponent
 * Utility class for navbar-specific functionality.
 * Currently handles the ASCII art logo rendering in the navbar.
 */
import { html, render, ASCII_ART } from '@website/scripts/utils';

export class NavbarComponent {
	/**
	 * Initializes the navbar by rendering the ASCII art logo.
	 * Should be called once when the application starts.
	 */
	static initialize(): void {
		const navLogo = document.querySelector('.nav-logo');
		if (navLogo) {
			render(html`<pre>${ASCII_ART.TRANSCENDENCE}</pre>`, navLogo as HTMLElement);
		}
	}
}
