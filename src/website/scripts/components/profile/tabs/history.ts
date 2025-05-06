/**
 * Profile History Component
 * Displays user match history in a paginated table
 */
import { Component } from '@website/scripts/components';
import { html, render, DbService } from '@website/scripts/utils';
import { UserProfile } from '@shared/types';

interface ProfileHistoryState {
	profile: UserProfile | null;
	historyPage: number;
	historyPageSize: number;
	matches: any[];
	isLoading: boolean;
	hasMoreMatches: boolean;
	handlers: {
		onPlayerClick: (username: string) => void;
	};
}

export class ProfileHistoryComponent extends Component<ProfileHistoryState> {
	private scrollObserver: IntersectionObserver | null = null;
	private loadingElement: HTMLElement | null = null;
	private contentElement: HTMLElement | null = null;
	private scrollTimeout: number | null = null;
	private lastScrollPosition: number = 0;

	constructor(container: HTMLElement) {
		super(container, {
			profile: null,
			historyPage: 0,
			historyPageSize: 20,
			matches: [],
			isLoading: false,
			hasMoreMatches: true,
			handlers: {
				onPlayerClick: () => {}
			}
		});
		
		// Setup manual scroll handling as fallback
		this.setupScrollListener();
	}
	
	private setupScrollListener(): void {
		// Use event delegation to capture scroll events from window
		window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
	}
	
	private handleScroll(): void {
		// Debounce the scroll event to avoid excessive processing
		if (this.scrollTimeout) {
			window.clearTimeout(this.scrollTimeout);
		}
		
		this.scrollTimeout = window.setTimeout(() => {
			const state = this.getInternalState();
			
			// Skip if already loading or no more matches
			if (state.isLoading || !state.hasMoreMatches) {
				return;
			}
			
			// Standard detection for end of page scroll
			const scrollPosition = window.scrollY;
			const windowHeight = window.innerHeight;
			const documentHeight = Math.max(
				document.body.scrollHeight,
				document.body.offsetHeight,
				document.documentElement.clientHeight,
				document.documentElement.scrollHeight,
				document.documentElement.offsetHeight
			);
			
			// If we're near the bottom (within 200px of the end)
			if (scrollPosition + windowHeight >= documentHeight - 200) {
				console.log('Bottom of page detected, loading more matches');
				this.lastScrollPosition = scrollPosition;
				this.loadMoreMatches();
			}
		}, 100); // 100ms debounce for faster response
	}
	
	public setProfile(profile: UserProfile): void {
		this.updateInternalState({ 
			profile,
			historyPage: 0,
			matches: [],
			hasMoreMatches: true
		});
		this.loadMatchHistory(profile.id);
	}
	
	public setHandlers(handlers: { onPlayerClick: (username: string) => void }): void {
		this.updateInternalState({ handlers });
	}
	
	private async loadMatchHistory(userId: string, isLoadingMore: boolean = false): Promise<void> {
		try {
			const state = this.getInternalState();
			
			// Exit early if already loading
			if (state.isLoading) return;
			
			const previousHeight = isLoadingMore && this.contentElement ? 
				this.contentElement.getBoundingClientRect().height : 0;
			
			if (!isLoadingMore) {
				this.updateInternalState({ 
					isLoading: true,
					matches: [],
					historyPage: 0
				});
			} else {
				this.updateInternalState({ isLoading: true });
			}
			
			// Get user matches from DB service for current page
			const numericId = parseInt(userId);
			const pageToLoad = isLoadingMore ? state.historyPage + 1 : 0;
			console.log(`History component loading matches for user ID: ${numericId}, page: ${pageToLoad}`);
			
			const newMatches = await DbService.getUserMatches(numericId, pageToLoad, state.historyPageSize);
			console.log(`Found ${newMatches.length} matches for history`);
			
			// If we received fewer matches than page size, we've reached the end
			const hasMoreMatches = newMatches.length === state.historyPageSize;
			
			// Process matches to get opponent names and scores
			const processedMatches = await Promise.all(newMatches.map(async (match) => {
				const isPlayer1 = match.player_1 === numericId;
				const opponentId = isPlayer1 ? match.player_2 : match.player_1;
				
				// Get opponent details
				let opponentName = `Player ${opponentId}`;
				try {
					const opponent = await DbService.getUser(opponentId);
					if (opponent) {
						opponentName = opponent.pseudo;
					}
				} catch {
					console.log(`Could not fetch opponent data for ID ${opponentId}`);
				}
				
				// Get goals for this match
				const goals = await DbService.getMatchGoals(match.id);
				
				// Calculate scores
				let playerScore = 0;
				let opponentScore = 0;
				
				for (const goal of goals) {
					if (goal.player === numericId) {
						playerScore++;
					} else if (goal.player === opponentId) {
						opponentScore++;
					}
				}
				
				// Determine result
				const result = playerScore > opponentScore ? 'win' : 'loss';
				
				return {
					id: match.id,
					date: match.created_at,
					opponent: opponentName,
					opponentId: opponentId,
					playerScore,
					opponentScore,
					result
				};
			}));
			
			// Sort by most recent first
			const sortedMatches = processedMatches.sort((a, b) => 
				b.date.getTime() - a.date.getTime()
			);
			
			// Combine with existing matches if loading more
			const combinedMatches = isLoadingMore 
				? [...state.matches, ...sortedMatches]
				: sortedMatches;
			
			this.updateInternalState({ 
				matches: combinedMatches,
				isLoading: false,
				hasMoreMatches,
				historyPage: pageToLoad
			});
			
			this.render();
			
			// Setup scroll observer after rendering only if we have more matches
			if (hasMoreMatches) {
				setTimeout(() => {
					this.setupScrollObserver();
					
					// If loading more, restore the scroll position to maintain context
					if (isLoadingMore && this.lastScrollPosition > 0) {
						setTimeout(() => {
							window.scrollTo({
								top: this.lastScrollPosition,
								behavior: 'auto'
							});
							console.log('Restored scroll position to:', this.lastScrollPosition);
						}, 100);
					}
				}, 100);
			}
		} catch (error) {
			console.error('Error loading match history:', error);
			this.updateInternalState({ isLoading: false });
		}
	}
	
	private setupScrollObserver(): void {
		// Find the loading element in case it wasn't set
		if (!this.loadingElement) {
			this.loadingElement = this.container.querySelector('.loading-indicator');
		}
		
		// Only setup observer if we have a loading element
		if (this.loadingElement) {
			// Clean up existing observer
			if (this.scrollObserver) {
				this.scrollObserver.disconnect();
			}
			
			// Create new observer
			this.scrollObserver = new IntersectionObserver((entries) => {
				const state = this.getInternalState();
				// Check if we should load more
				if (!state.isLoading && state.hasMoreMatches && entries[0].isIntersecting) {
					// Save current scroll position before loading more
					this.lastScrollPosition = window.scrollY;
					this.loadMoreMatches();
				}
			}, {
				threshold: 0.9, // Element must be 90% visible
				rootMargin: '10px' // Very small margin
			});
			
			this.scrollObserver.observe(this.loadingElement);
		}
	}
	
	private loadMoreMatches(): void {
		const state = this.getInternalState();
		if (state.isLoading || !state.hasMoreMatches || !state.profile) {
			return;
		}
		
		console.log('Loading more matches, current page:', state.historyPage);
		this.loadMatchHistory(state.profile.id, true);
	}
	
	render(): void {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		// Filter for matches with at least 1 point total
		const filteredMatches = state.matches.filter(match => 
			match.playerScore + match.opponentScore > 0
		);
		
		const template = html`
			<div class="history-content" ref=${(el: HTMLElement) => this.contentElement = el}>
				${state.isLoading && filteredMatches.length === 0 ? 
					html`<p class="loading">Loading match history...</p>` :
					filteredMatches.length === 0 ? 
					html`<p class="no-data">No match history available</p>` :
					html`
						<table class="game-history-table">
							<thead>
								<tr>
									<th>DATE</th>
									<th>OPPONENT</th>
									<th>RESULT</th>
									<th>SCORE</th>
								</tr>
							</thead>
							<tbody>
								${filteredMatches.map(game => html`
									<tr class="game-${game.result}">
										<td>${game.date.toLocaleDateString()}</td>
										<td 
											class="player-cell" 
											data-player-id=${game.opponentId}
											onClick=${() => state.handlers.onPlayerClick(game.opponent)}
										>
											${game.opponent}
										</td>
										<td class="result-cell-${game.result}">${game.result.toUpperCase()}</td>
										<td>${game.playerScore} - ${game.opponentScore}</td>
									</tr>
								`)}
							</tbody>
						</table>
						
						${state.hasMoreMatches ? html`
							<div 
								class="loading-indicator" 
								ref=${(el: HTMLElement) => { 
									this.loadingElement = el;
								}}
							>
								${state.isLoading ? html`<p>Loading more matches...</p>` : html`<p>Scroll to load more matches</p>`}
							</div>
						` : html`
							<div class="debug-info">
								All matches loaded (${filteredMatches.length} total)
							</div>
						`}
					`
				}
			</div>
		`;
		
		render(template, this.container);
		
		// Setup scroll observer after render
		setTimeout(() => {
			this.setupScrollObserver();
		}, 100);
	}
}
