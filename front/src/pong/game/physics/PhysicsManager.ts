import { BALL_CONFIG } from '@pong/constants';
import { Ball, Player } from '../objects'; // Assuming objects are in ../objects
import {GameState } from '@pong/types';
import { GameScene } from '../scenes'; // Need GameScene for resetPositions

// =========================================
// PHYSICS MANAGER
// =========================================
// 1) Broad-phase (sweep): very cheap, finds the first time of impact along the movement ray
// 2) Narrow-phase (discrete): if for any reason your object starts inside the collider (e.g. spawn-in overlap, rounding drift, simultaneous multi-hits), or the sweep misses a corner case, the discrete overlap check will still detect and push the ball out
// In production engines you often see exactly this pattern:
// – Use a swept test for performance and to eliminate tunnelling at high speed
// – Immediately resolve that hit (position at impact, reflect velocity)
// – Then do a quick AABB or shape-vs-shape test on the final position to catch any remaining penetration (and correct it)
// =========================================
export class PhysicsManager {
  private ball: Ball;
  private player1: Player;
  private player2: Player;
  private gameEngine: any; // Store game engine reference
  private gameScene: GameScene; // Need reference for resetPositions and pauseManager

  constructor(ball: Ball, player1: Player, player2: Player, gameEngine: any, gameScene: GameScene) {
    this.ball = ball;
    this.player1 = player1;
    this.player2 = player2;
    this.gameEngine = gameEngine; // Store engine
    this.gameScene = gameScene;   // Store scene
  }

  // Add method to update gameEngine if set later
  public setGameEngine(engine: any): void {
    this.gameEngine = engine;
  }

  /**
   * Stores the ball's previous position and render states.
   * Call this before updating the ball's position.
   * @param ball The ball object.
   */
  private storeBallPreviousStates(ball: Ball): void {
    ball.prevPosition.x = ball.x;
    ball.prevPosition.y = ball.y;
    ball.prevRenderX = ball.x;
    ball.prevRenderY = ball.y;
  }

  /**
   * Applies movement to the ball based on its velocity and deltaTime.
   * Also handles speed capping.
   * @param ball The ball object.
   * @param deltaTime The time elapsed since the last physics update, in seconds.
   */
  private applyBallMovement(ball: Ball, deltaTime: number): void {
    // REMOVE or COMMENT OUT the clamping:
    // const physicsDeltaTime = Math.min(deltaTime, BALL_CONFIG.PHYSICS_MAX_TIMESTEP_S);
    // USE deltaTime directly:
    const physicsDeltaTime = deltaTime;

    // Speed cap logic (from former Ball.updatePhysics)
    if (ball.currentSpeed > ball.baseSpeed * BALL_CONFIG.ACCELERATION.MAX_MULTIPLIER) {
      ball.currentSpeed = ball.baseSpeed * BALL_CONFIG.ACCELERATION.MAX_MULTIPLIER;
      const normalized = ball.getNormalizedVelocity();
      ball.dx = normalized.dx * ball.currentSpeed;
      ball.dy = normalized.dy * ball.currentSpeed;
    }

    // Calculate how far the ball will move this step
    const moveX = ball.dx * physicsDeltaTime;
    const moveY = ball.dy * physicsDeltaTime;

    // Move the ball
    ball.x += moveX;
    ball.y += moveY;
  }

    /**
   * Handles ball collisions with game boundaries (walls).
   * Uses continuous collision detection for top/bottom walls.
   * @param ball The ball object.
   * @returns True if the ball hit a vertical (top/bottom) reflecting wall, false otherwise.
   */
		private handleBallWallCollisions(ball: Ball): boolean {
			const ballRadius = ball.getSize();
			const canvas = ball.getContext().canvas;
			let reflectedOffVerticalWall = false;
			const epsilon = ballRadius * 0.02; // Small offset relative to ball radius
	
			// Get previous and current positions for sweep test
			const p0 = ball.prevPosition;
			const p1 = { x: ball.x, y: ball.y };
			const dir = { dx: p1.x - p0.x, dy: p1.y - p0.y };
			
			// Only perform sweep test if we have movement
			if (Math.abs(dir.dx) > 1e-6 || Math.abs(dir.dy) > 1e-6) {
				// Top wall sweep test
				const topWallY = ballRadius;
				if (p0.y > topWallY && p1.y <= topWallY) {
					// Calculate time of impact
					const t = (topWallY - p0.y) / dir.dy;
					if (t >= 0 && t <= 1) {
						// Position at impact
						const hitX = p0.x + dir.dx * t;
						// Reflect velocity and position
						ball.dy = Math.abs(ball.dy);
						ball.y = topWallY + epsilon;
						ball.x = hitX;
						reflectedOffVerticalWall = true;
					}
				}
				
				// Bottom wall sweep test
				const bottomWallY = canvas.height - ballRadius;
				if (p0.y < bottomWallY && p1.y >= bottomWallY) {
					// Calculate time of impact
					const t = (bottomWallY - p0.y) / dir.dy;
					if (t >= 0 && t <= 1) {
						// Position at impact
						const hitX = p0.x + dir.dx * t;
						// Reflect velocity and position
						ball.dy = -Math.abs(ball.dy);
						ball.y = bottomWallY - epsilon;
						ball.x = hitX;
						reflectedOffVerticalWall = true;
					}
				}
			}
			
			// Fallback discrete checks for any missed collisions
			if (!reflectedOffVerticalWall) {
				const topWallSurfaceY = ballRadius;
				if (ball.y <= topWallSurfaceY) {
					const penetration = topWallSurfaceY - ball.y;
					ball.dy = Math.abs(ball.dy);
					ball.y = topWallSurfaceY + penetration + epsilon;
					reflectedOffVerticalWall = true;
				}
				
				const bottomWallSurfaceY = canvas.height - ballRadius;
				if (ball.y >= bottomWallSurfaceY) {
					const penetration = ball.y - bottomWallSurfaceY;
					ball.dy = -Math.abs(ball.dy);
					ball.y = bottomWallSurfaceY - penetration - epsilon;
					reflectedOffVerticalWall = true;
				}
			}
	
			// Horizontal boundaries (left/right walls - scoring zones)
			if (ball.x - ballRadius <= 0) {
				ball.destroyed = true;
				ball.hitLeftBorder = true;
			} else if (ball.x + ballRadius >= canvas.width) {
				ball.destroyed = true;
				ball.hitLeftBorder = false;
			}
	
			// Ensure minimum velocity to prevent sticking
			const minSpeed = 1;
			const currentSpeedSq = ball.dx * ball.dx + ball.dy * ball.dy;
			if (currentSpeedSq < minSpeed * minSpeed && currentSpeedSq > 1e-6) {
				const currentSpeed = Math.sqrt(currentSpeedSq);
				const scale = minSpeed / currentSpeed;
				ball.dx *= scale;
				ball.dy *= scale;
			}
			return reflectedOffVerticalWall;
		}

  /**
   * Increases ball speed based on acceleration settings.
   * @param ball The ball object.
   */
  private accelerateBall(ball: Ball): void {
    ball.speedMultiplier = Math.min(
      ball.speedMultiplier + BALL_CONFIG.ACCELERATION.RATE,
      BALL_CONFIG.ACCELERATION.MAX_MULTIPLIER
    );
    ball.currentSpeed = ball.baseSpeed * ball.speedMultiplier;
    
    // Apply new speed while maintaining direction
    const normalized = ball.getNormalizedVelocity();
    if (normalized.dx !== 0 || normalized.dy !== 0) { // Avoid division by zero if speed is zero
        ball.dx = normalized.dx * ball.currentSpeed;
        ball.dy = normalized.dy * ball.currentSpeed;
    } else { // If ball was stationary, launchBall should have set a direction. This is a fallback.
        // Potentially re-launch or set a default small velocity if it ends up here with 0 magnitude.
        // For now, if magnitude is 0, currentSpeed won't apply to dx/dy.
    }
  }

  /**
   * Updates physics simulation for one fixed timestep.
   * @param deltaTime Fixed time step duration in seconds.
   * @param gameState Current game state.
   */
  public update(deltaTime: number, gameState: GameState): void {
    if (gameState !== GameState.PLAYING) {
      return;
    }

    this.storeBallPreviousStates(this.ball);
    this.applyBallMovement(this.ball, deltaTime);
    
    const reflectedOffVerticalWall = this.handleBallWallCollisions(this.ball);
    if (reflectedOffVerticalWall) {
      this.accelerateBall(this.ball);
    }

    const hitPlayer1 = PhysicsManager.collideBallWithPaddle(this.ball, this.player1);
    if (hitPlayer1) {
      this.accelerateBall(this.ball);
      // Potentially add other P1 hit specific logic here if needed in future
    }

    const hitPlayer2 = PhysicsManager.collideBallWithPaddle(this.ball, this.player2);
    if (hitPlayer2) {
      this.accelerateBall(this.ball);
      this.player2.predictBallTrajectory(this.ball.getPosition(), this.ball.getVelocity());
    }

    this.handleBallDestruction();
  }

  /**
   * Handles ball destruction and point scoring
   * Moved from GameScene
   */
  private handleBallDestruction(): void {
    if (!this.ball.isDestroyed()) return;

    let scoringPlayerIndex: number;
    
    if (this.ball.isHitLeftBorder()) {
      // Player 2 scored (right side)
      this.player2.givePoint();
      scoringPlayerIndex = 1;
    } else {
      // Player 1 scored (left side)
      this.player1.givePoint();
      scoringPlayerIndex = 0;
    }

    // Skip DB operations for background demo
    if (!this.gameScene.isBackgroundDemo()) { // Check background demo via gameScene
      // Record the goal if we have access to the game engine
      if (this.gameEngine && typeof this.gameEngine.recordGoal === 'function') {
        this.gameEngine.recordGoal(scoringPlayerIndex);
      }

      // Reset goal timer for the next point
      if (this.gameEngine && typeof this.gameEngine.resetGoalTimer === 'function') {
        this.gameEngine.resetGoalTimer();
      }
    }

    // Use gameScene reference to reset positions and handle pause state
    this.gameScene.resetPositions(); 
    this.gameScene.getPauseManager().handlePointScored();
  }

  // Continuous sweep vs AABB helper; returns {t,normal} or null on miss
  // Updated to handle moving rectangle (paddle)
  private static sweepCircleVsMovingRect(
    p0: {x: number; y: number}, // Circle start position
    vCircle: {dx: number; dy: number}, // Circle velocity
    r: number, // Circle radius
    rectLeft: number,
    rectRight: number,
    rectTop: number,
    rectBottom: number,
    vRect: {dx: number; dy: number} // Rectangle velocity
  ): {t: number; normal: {nx: number; ny: number}} | null {
    // Calculate relative velocity (Circle's velocity relative to the Rectangle)
    const relDx = vCircle.dx - vRect.dx;
    const relDy = vCircle.dy - vRect.dy;

    // If relative velocity is near zero, no sweep needed (or possible)
    if (Math.abs(relDx) < 1e-6 && Math.abs(relDy) < 1e-6) {
        // Optional: Could add a simple overlap check here if needed as a fallback
        return null;
    }

    let tmin = 0, tmax = 1;
    let txmin = -Infinity, tymin = -Infinity;
    // Expand the rectangle by the circle's radius
    const minX = rectLeft - r, maxX = rectRight + r, minY = rectTop - r, maxY = rectBottom + r;

    // --- X-axis sweep ---
    if (relDx !== 0) {
      const inv = 1 / relDx;
      const t1 = (minX - p0.x) * inv; // Time to hit left expanded edge
      const t2 = (maxX - p0.x) * inv; // Time to hit right expanded edge
      txmin = Math.min(t1, t2);
      const txmax = Math.max(t1, t2);
      tmin = Math.max(tmin, txmin); // Update earliest entry time
      tmax = Math.min(tmax, txmax); // Update latest exit time
      if (tmin > tmax) return null; // Exit if no overlap in time interval on X
    } else if (p0.x < minX || p0.x > maxX) {
        return null; // If no horizontal velocity and outside X bounds, cannot hit
    }

    // --- Y-axis sweep ---
    if (relDy !== 0) {
      const inv = 1 / relDy;
      const t1 = (minY - p0.y) * inv; // Time to hit top expanded edge
      const t2 = (maxY - p0.y) * inv; // Time to hit bottom expanded edge
      tymin = Math.min(t1, t2);
      const tymax = Math.max(t1, t2);
      tmin = Math.max(tmin, tymin); // Update earliest entry time
      tmax = Math.min(tmax, tymax); // Update latest exit time
      if (tmin > tmax) return null; // Exit if no overlap in time interval on Y
    } else if (p0.y < minY || p0.y > maxY) {
      return null; // If no vertical velocity and outside Y bounds, cannot hit
    }

    // Check if the valid collision time 'tmin' is within the frame interval [0, 1]
    if (tmin < 0 || tmin > 1) return null;

    // Determine the collision normal based on which axis had the latest entry time
    const axis = txmin > tymin ? 'x' : 'y';
    const normal = {
        // Normal should point AWAY from the rectangle face that was hit
        nx: axis === 'x' ? (relDx < 0 ? 1 : -1) : 0, // If moving right (relDx>0), hit left face (nx=-1)
        ny: axis === 'y' ? (relDy < 0 ? 1 : -1) : 0  // If moving down (relDy>0), hit top face (ny=-1)
    };

    return {t: tmin, normal};
  }

  // Helper function to apply paddle deflection
  private static _applyPaddleDeflection(
    ballPos: { x: number; y: number },
    reflectedVel: { dx: number; dy: number },
    paddleTop: number,
    paddleBottom: number
  ): { dx: number; dy: number } {
    const zoneSize = BALL_CONFIG.EDGES.ZONE_SIZE;
    const maxDeflection = BALL_CONFIG.EDGES.MAX_DEFLECTION;
    const paddleHeight = paddleBottom - paddleTop;

    if (paddleHeight <= 0) {
      return reflectedVel;
    }

    const clampedY = Math.max(paddleTop, Math.min(ballPos.y, paddleBottom));
    const relHit = (clampedY - paddleTop) / paddleHeight; // 0=top, 1=bottom

    const midStart = zoneSize;
    const midEnd = 1 - zoneSize;
    let defNorm = 0;
    if (relHit < midStart) {
      defNorm = -1 * (1 - (relHit / midStart));
    } else if (relHit > midEnd) {
      defNorm = (relHit - midEnd) / (1 - midEnd);
    }

    let finalDx = reflectedVel.dx;
    let finalDy = reflectedVel.dy;
    // Apply actual deflection angle only if maxDeflection > 0 and deflection is non-zero
    if (maxDeflection > 0 && defNorm !== 0) {
      const angle = defNorm * maxDeflection; // angle in radians
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      finalDx = reflectedVel.dx * cosA - reflectedVel.dy * sinA;
      finalDy = reflectedVel.dx * sinA + reflectedVel.dy * cosA;
    }

    return { dx: finalDx, dy: finalDy };
  }

  // Helper for basic velocity reflection
  private static _reflectVelocity(
    vx: number, vy: number,
    nx: number, ny: number,
    dot: number // Pre-calculated dot product (v . n)
  ): { dx: number, dy: number } {
    return {
      dx: vx - 2 * dot * nx,
      dy: vy - 2 * dot * ny
    };
  }

  // Helper to correct position after sweep collision
  private static _correctPosition(
    ball: Ball,
    contactX: number, contactY: number,
    nx: number, ny: number,
    epsilon: number // Small buffer distance
  ): void {
    const originalX = ball.x;
    const originalY = ball.y;
    // Set position precisely to the calculated contact point first
    ball.x = contactX;
    ball.y = contactY;
    // Then, push the ball slightly away along the normal
    const pushX = nx * epsilon;
    const pushY = ny * epsilon;
    ball.x += pushX;
    ball.y += pushY;
    // Log the state before and after correction
    console.log(`[Debug Collision] Corrected ball pos. Original: (${originalX.toFixed(2)}, ${originalY.toFixed(2)}), Contact: (${contactX.toFixed(2)}, ${contactY.toFixed(2)}), Push: (${pushX.toFixed(2)}, ${pushY.toFixed(2)}), Corrected: (${ball.x.toFixed(2)}, ${ball.y.toFixed(2)}), Normal: (${nx}, ${ny}), Epsilon: ${epsilon}`);
  }

  // Helper to correct position after discrete collision (corner or edge)
  private static _correctPositionCorner(
    ball: Ball,
    pointX: number, pointY: number, // The point to push away from (corner or closest edge point)
    nx: number, ny: number, // Normal pointing away from the point
    radius: number,
    epsilon: number
  ): void {
    const bias = radius + epsilon;
    ball.x = pointX + nx * bias;
    ball.y = pointY + ny * bias;
  }

  public static collideBallWithPaddle(
    ball: Ball,
    player: Player
  ): boolean {
    const ballRadius = ball.getSize();
    // --- Increased epsilon slightly for testing ---
    const epsilon = 0.1; // Increased from 0.05
    const ballVelocity = ball.getVelocity();
    const paddleVelocity = player.paddle.getVelocity();

    // Get paddle bounds based on current player state
    const cLeft = player.x;
    const cRight = player.x + player.paddleWidth;
    const cTop = player.y;
    const cBottom = player.y + player.paddleHeight;

    // --- Added detailed logging at the start of the check ---
    console.log(`[Frame Start Check] Player at (${player.x.toFixed(2)}, ${player.y.toFixed(2)}), Vel: (${paddleVelocity.dx.toFixed(2)}, ${paddleVelocity.dy.toFixed(2)}), Bounds: T:${cTop.toFixed(2)} B:${cBottom.toFixed(2)} L:${cLeft.toFixed(2)} R:${cRight.toFixed(2)}`);
    const p1_start = ball.getPosition(); // Ball position at start of this check
    console.log(`[Frame Start Check] Ball at (${p1_start.x.toFixed(2)}, ${p1_start.y.toFixed(2)}), Vel: (${ballVelocity.dx.toFixed(2)}, ${ballVelocity.dy.toFixed(2)}) Radius: ${ballRadius.toFixed(2)}`);
    // --- End Added Logging ---

    // 1) Continuous Sweep Test
    if (typeof (ball as any).getPrevPosition === 'function') {
      const p0 = (ball as any).getPrevPosition();
      // Ball's movement vector for this step
      const ballMoveDir = {dx: p1_start.x - p0.x, dy: p1_start.y - p0.y};

      console.log(`[Debug Collision] Ball sweep from (${p0.x.toFixed(2)}, ${p0.y.toFixed(2)}) to (${p1_start.x.toFixed(2)}, ${p1_start.y.toFixed(2)}) (Move: dx=${ballMoveDir.dx.toFixed(2)}, dy=${ballMoveDir.dy.toFixed(2)})`);

      // Check if ball moved significantly
      if (!(Math.abs(ballMoveDir.dx) < 1e-6 && Math.abs(ballMoveDir.dy) < 1e-6)) {
          const hit = PhysicsManager.sweepCircleVsMovingRect(
              p0, ballMoveDir, ballRadius,
              cLeft, cRight, cTop, cBottom,
              paddleVelocity
          );
          if (hit) {
            const {t, normal} = hit;
            const contactX = p0.x + ballMoveDir.dx * t;
            const contactY = p0.y + ballMoveDir.dy * t;

            console.log('[Debug Collision] Sweep test hit:', {
              ballPrevPos: {x: p0.x.toFixed(2), y: p0.y.toFixed(2)},
              ballMoveDir: {dx: ballMoveDir.dx.toFixed(2), dy: ballMoveDir.dy.toFixed(2)},
              paddleRect: { T: cTop.toFixed(2), B: cBottom.toFixed(2), L: cLeft.toFixed(2), R: cRight.toFixed(2) },
              paddleVel: {dx: paddleVelocity.dx.toFixed(2), dy: paddleVelocity.dy.toFixed(2)},
              hitResult: { t: t.toFixed(4), normal: {nx: normal.nx, ny: normal.ny} },
              contactPoint: { x: contactX.toFixed(2), y: contactY.toFixed(2) }
            });

            if (normal.ny !== 0) { // Hit top/bottom of paddle
              console.log('[Debug Collision] Top/Bottom paddle hit detected. Normal:', normal);
              player.freezeMovement(0.2);
              console.log('[Debug Collision] player.freezeMovement(0.2) called for top/bottom hit.');
            }

            const dot = ballVelocity.dx * normal.nx + ballVelocity.dy * normal.ny;
            if (dot < 0) {
              console.log(`[Debug Collision] Dot product < 0 (${dot.toFixed(2)}), proceeding with reflection.`);
              const reflectedVel = PhysicsManager._reflectVelocity(ballVelocity.dx, ballVelocity.dy, normal.nx, normal.ny, dot);
              const finalVel = PhysicsManager._applyPaddleDeflection(
                { x: contactX, y: contactY },
                reflectedVel,
                cTop, cBottom
              );
              ball.dx = finalVel.dx;
              ball.dy = finalVel.dy;

              // Ensure minimum vertical velocity if hitting front face of paddle
              if (normal.nx !== 0) { // Hit was on the side (front face)
                const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                if (speed > 1e-6) {
                    const minVerticalComponent = speed * BALL_CONFIG.MIN_VERTICAL_VELOCITY_RATIO_ON_PADDLE_HIT;
                    if (Math.abs(ball.dy) < minVerticalComponent) {
                        ball.dy = ball.dy >= 0 ? minVerticalComponent : -minVerticalComponent;
                    }
                }
              }

              // --- Added Pre/Post Correction Logging ---
              console.log(`[Debug Collision] Pre-Correction State: Ball Pos (${ball.x.toFixed(2)}, ${ball.y.toFixed(2)}), Ball Vel (${ball.dx.toFixed(2)}, ${ball.dy.toFixed(2)})`);
              PhysicsManager._correctPosition(ball, contactX, contactY, normal.nx, normal.ny, epsilon);
              console.log(`[Debug Collision] Post-Correction State: Ball Pos (${ball.x.toFixed(2)}, ${ball.y.toFixed(2)})`);
              // --- End Added Logging ---
              return true;
            } else {
              console.log(`[Debug Collision] Dot product >= 0 (${dot.toFixed(2)}), collision detected but ball moving away from surface normal. No reflection.`);
            }
          } else {
             console.log('[Debug Collision] Sweep test reported NO hit.');
          }
      } else {
        console.log('[Debug Collision] Ball did not move significantly, skipping sweep test.');
      }
    }

    // 2) Discrete Collision Test (Fallback)
    // ... (discrete code remains, might need review if sweep fails) ...

    return false;
  }
} 