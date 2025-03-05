import { html, render, ASCII_ART } from './index';


export class NavbarComponent {
	static initialize(): void {
		const navLogo = document.querySelector('.nav-logo');
		if (navLogo) {
			render(html`<pre>${ASCII_ART.TRANSCENDENCE}</pre>`, navLogo as HTMLElement);
		}
	}
}
