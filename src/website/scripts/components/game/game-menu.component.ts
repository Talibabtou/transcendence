import { Component } from '@website/scripts/components';
import { html, render, ASCII_ART } from '@website/scripts/utils';

// Define possible game modes
export enum GameMode {
	SINGLE = 'single',
	MULTI = 'multi',
	TOURNAMENT = 'tournament'
}

// Define state interface for type safety
interface GameMenuState {
	visible: boolean;
}

export class GameMenuComponent extends Component<GameMenuState> {
	// Event handler for mode selection
	private onModeSelected: (mode: GameMode) => void;
	
	constructor(container: HTMLElement, onModeSelected: (mode: GameMode) => void) {
		super(container, {
			visible: true
		});
		
		this.onModeSelected = onModeSelected;
	}
	
	render(): void {
		const state = this.getInternalState();
		if (!state.visible) {
			this.container.innerHTML = '';
			return;
		}
		const menuContent = html`
			<div id="game-menu" class="game-menu">
				<div class="ascii-title">
					<pre class="pong-title">${ASCII_ART.PONG}</pre>
				</div>
				<div class="menu-buttons">
					<button class="menu-button" data-mode="${GameMode.SINGLE}">
						Single Player
					</button>
					<button class="menu-button" data-mode="${GameMode.MULTI}">
						Multiplayer
					</button>
					<button class="menu-button" data-mode="${GameMode.TOURNAMENT}">
						Tournament
					</button>
				</div>
			</div>
		`;
		render(menuContent, this.container);
		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		const buttons = this.container.querySelectorAll('.menu-button');
		buttons.forEach(button => {
			button.addEventListener('click', (e) => {
				const mode = (e.target as HTMLElement).getAttribute('data-mode') as GameMode;
				this.onModeSelected(mode);
			});
		});
	}
	
	// Method to show the menu
	show(): void {
		this.updateInternalState({ visible: true });
	}
	
	// Method to hide the menu
	hide(): void {
		this.updateInternalState({ visible: false });
	}
	
	destroy(): void {
		super.destroy();
		// No special cleanup needed
	}
} 