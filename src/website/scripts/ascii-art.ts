// ASCII art blocks
export const ASCII_ART = {
  TRANSCENDENCE: 
`___________                                                    ____                          
\\__    ___/___________    ____   ______ ____  ____   ____    __| _/____   ____   ____  ____  
  |    |  \\_  __ \\__  \\  /    \\ /  ___// ___\\/ __ \\ /    \\  / __ |/ __ \\ /    \\_/ ___\\/ __ \\ 
  |    |   |  | \\// __ \\|   |  \\\\___ \\\\  \\__\\  ___/|   |  \\/ /_/ \\  ___/|   |  \\  \\__\\  ___/ 
  |____|   |__|  /____  /___|  /____  /\\___  \\___  \\___|  /\\____ |\\___  \\___|  /\\___  \\___ \\
                      \\/     \\/     \\/     \\/    \\/     \\/      \\/    \\/     \\/     \\/    \\/`,
  
  PONG:
`__________                       
\\______   \\____   ____    ____  
 |     ___/  _ \\ /    \\  / ___\\ 
 |    |  (  <_> )   |  \\/ /_/  >
 |____|   \\____/|___|  /\\___  / 
                    \\/______/  `,
  
  GAME_OVER:
`   ________                                                 ._.
  /  _____/_____    _____   ____     _______  __ ___________| |
 /   \\  ___\\__  \\  /     \\_/ __ \\   /  _ \\  \\/ // __ \\_  __ \\ |
 \\    \\_\\  \\/ __ \\|  Y Y  \\  ___/  (  <_> )   /\\  ___/|  | \\/\\|
  \\______  (____  /__|_|  /\\___  >  \\____/ \\_/  \\___  >__|   __
         \\/     \\/      \\/     \\/                   \\/       \\/`
};

/**
 * Inserts ASCII art into specified DOM elements
 */
export function initializeAsciiArt(): void {
  // Insert Transcendence ASCII art
  const navLogo = document.querySelector('.nav-logo');
  if (navLogo) {
    navLogo.textContent = ASCII_ART.TRANSCENDENCE;
  }

  // Insert Pong ASCII art
  const pongTitle = document.querySelector('.pong-title');
  if (pongTitle) {
    pongTitle.textContent = ASCII_ART.PONG;
  }
} 