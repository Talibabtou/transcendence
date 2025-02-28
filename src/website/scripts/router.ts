import { GameComponent } from './components/game';
import { LeaderboardComponent } from './components/leaderboard';
import { ProfileComponent } from './components/profile';

// Define routes
export enum Route {
  GAME = 'game',
  LEADERBOARD = 'leaderboard',
  SETTINGS = 'settings',
  PROFILE = 'profile'
}

export class Router {
  private container: HTMLElement;
  private currentComponent: any = null;
  private components: Map<Route, any> = new Map();
  private sections: Map<Route, HTMLElement> = new Map();
  
  constructor(container: HTMLElement) {
    this.container = container;
    
    // Initialize sections map
    this.initializeSections();
    
    // Initialize components map
    this.components.set(Route.GAME, GameComponent);
    this.components.set(Route.LEADERBOARD, LeaderboardComponent);
    this.components.set(Route.PROFILE, ProfileComponent);
    
    // Set up event listeners
    window.addEventListener('popstate', this.handleRouteChange.bind(this));
    this.setupNavClickHandlers();
    
    // Handle initial route
    this.handleRouteChange();
  }
  
  private initializeSections(): void {
    console.log('Initializing sections...');
    
    // First, check if sections already exist
    Object.values(Route).forEach(route => {
      const section = document.getElementById(route);
      if (section) {
        console.log(`Found section for route: ${route}`);
        this.sections.set(route as Route, section);
      } else {
        // Create section if it doesn't exist
        console.log(`Creating section for route: ${route}`);
        const newSection = document.createElement('section');
        newSection.id = route;
        newSection.className = 'section';
        newSection.style.display = 'none';
        this.container.appendChild(newSection);
        this.sections.set(route as Route, newSection);
      }
    });
  }
  
  navigate(path: string): void {
    console.log(`Navigating to: ${path}`);
    history.pushState(null, '', path);
    this.handleRouteChange();
  }
  
  private setupNavClickHandlers(): void {
    document.querySelectorAll('.nav-item').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
        if (href) this.navigate(href);
      });
    });
  }
  
  private handleRouteChange(): void {
    const path = window.location.pathname;
    const route = path.substring(1) || 'game';
    
    console.log(`Handling route change to: ${route}`);
    
    // Destroy previous component if it exists
    if (this.currentComponent && typeof this.currentComponent.destroy === 'function') {
      this.currentComponent.destroy();
    }
    
    // Hide all sections
    this.sections.forEach(section => section.style.display = 'none');
    
    // Show and instantiate the appropriate component
    const routeKey = route as Route;
    
    if (this.components.has(routeKey)) {
      const section = this.sections.get(routeKey);
      
      if (section) {
        console.log(`Showing section for route: ${routeKey}`);
        section.style.display = 'block';
        
        try {
          // Instantiate and render the component
          const ComponentClass = this.components.get(routeKey)!;
          console.log(`Creating component for route: ${routeKey}`);
          this.currentComponent = new ComponentClass(section);
          this.currentComponent.render();
          
          // Update active nav item
          document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('href') === `/${route}`);
          });
        } catch (error) {
          console.error(`Error creating component for route: ${routeKey}`, error);
          section.innerHTML = `
            <div class="error-container">
              <h2>Error</h2>
              <p>Failed to load this section. Please try again later.</p>
            </div>
          `;
        }
      } else {
        console.error(`No section found for route: ${routeKey}`);
      }
    } else {
      console.error(`No component registered for route: ${routeKey}`);
    }
  }
} 