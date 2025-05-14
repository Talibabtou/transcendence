import { BALL_CONFIG } from '@pong/constants';
import { Ball, Player } from '../objects'; // Assuming objects are in ../objects
import {GameState } from '@pong/types';
import { GameScene } from '../scenes'; // Need GameScene for resetPositions

// =========================================
// Result Interfaces for Physics Calculations
// =========================================
interface SweepResult {
  t: number;
  normal: { nx: number; ny: number };
  collided: boolean;
}

interface CircleAABBOverlapResult {
  penetration: { dx: number; dy: number };
  normal: { nx: number; ny: number };
  collided: boolean;
}

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

  // Reusable result objects for collision calculations
  private sweepResult: SweepResult = { t: 0, normal: { nx: 0, ny: 0 }, collided: false };
  private overlapResult: CircleAABBOverlapResult = {
    penetration: { dx: 0, dy: 0 },
    normal: { nx: 0, ny: 0 },
    collided: false
  };

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
    const physicsDeltaTime = Math.min(deltaTime, BALL_CONFIG.PHYSICS_MAX_TIMESTEP_S);
    // USE deltaTime directly:
    // const physicsDeltaTime = deltaTime;

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
			const epsilon = ballRadius * 0.01; // Small offset relative to ball radius
	
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

    const hitPlayer1 = this.collideBallWithPaddle(this.ball, this.player1);
    if (hitPlayer1) {
      this.accelerateBall(this.ball);
      // Potentially add other P1 hit specific logic here if needed in future
    }

    const hitPlayer2 = this.collideBallWithPaddle(this.ball, this.player2);
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
    vRect: {dx: number; dy: number}, // Rectangle velocity
    out: SweepResult // Output parameter
  ): void {
    out.collided = false; // Initialize

    // Calculate relative velocity (Circle's velocity relative to the Rectangle)
    const relDx = vCircle.dx - vRect.dx;
    const relDy = vCircle.dy - vRect.dy;

    // If relative velocity is near zero, no sweep needed (or possible)
    if (Math.abs(relDx) < 1e-6 && Math.abs(relDy) < 1e-6) {
        // Optional: Could add a simple overlap check here if needed as a fallback
        return; // out.collided remains false
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
      if (tmin > tmax) return; // Exit if no overlap in time interval on X, out.collided remains false
    } else if (p0.x < minX || p0.x > maxX) {
        return; // If no horizontal velocity and outside X bounds, cannot hit, out.collided remains false
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
      if (tmin > tmax) return; // Exit if no overlap in time interval on Y, out.collided remains false
    } else if (p0.y < minY || p0.y > maxY) {
      return; // If no vertical velocity and outside Y bounds, cannot hit, out.collided remains false
    }

    // Check if the valid collision time 'tmin' is within the frame interval [0, 1]
    if (tmin < 0 || tmin > 1) return; // out.collided remains false

    // Determine the collision normal based on which axis had the latest entry time
    const axis = txmin > tymin ? 'x' : 'y';
    
    out.t = tmin;
    out.normal.nx = axis === 'x' ? (relDx < 0 ? 1 : -1) : 0;
    out.normal.ny = axis === 'y' ? (relDy < 0 ? 1 : -1) : 0;
    out.collided = true;
    // No explicit return needed here, function completes
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
    // Set position precisely to the calculated contact point first
    ball.x = contactX;
    ball.y = contactY;
    // Then, push the ball slightly away along the normal
    const pushX = nx * epsilon;
    const pushY = ny * epsilon;
    ball.x += pushX;
    ball.y += pushY;
    // Log the state before and after correction
  }

  /**
   * Checks for overlap between a circle and an AABB (Axis-Aligned Bounding Box).
   * If an overlap occurs, returns the penetration depth and collision normal.
   * @param ballPos Current position of the ball's center.
   * @param ballRadius Radius of the ball.
   * @param rectLeft Left edge of the rectangle.
   * @param rectRight Right edge of the rectangle.
   * @param rectTop Top edge of the rectangle.
   * @param rectBottom Bottom edge of the rectangle.
   * @returns Object with penetration depth and normal, or null if no overlap.
   */
  private static checkCircleAABBOverlap(
    ballPos: { x: number; y: number },
    ballRadius: number,
    rectLeft: number,
    rectRight: number,
    rectTop: number,
    rectBottom: number,
    out: CircleAABBOverlapResult // Output parameter
  ): void {
    out.collided = false; // Initialize

    // Find the closest point on the AABB to the circle's center
    const closestX = Math.max(rectLeft, Math.min(ballPos.x, rectRight));
    const closestY = Math.max(rectTop, Math.min(ballPos.y, rectBottom));

    // Calculate the distance between the circle's center and this closest point
    const distanceX = ballPos.x - closestX;
    const distanceY = ballPos.y - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    // If the distance is less than the circle's radius, an overlap occurs
    if (distanceSquared < ballRadius * ballRadius && distanceSquared > 1e-9) { // Added > 1e-9 to avoid issues with zero distance
      const distance = Math.sqrt(distanceSquared);
      const penetrationDepth = ballRadius - distance;
      
      // Collision normal points from the AABB to the circle
      const normalX = distanceX / distance;
      const normalY = distanceY / distance;

      out.penetration.dx = normalX * penetrationDepth;
      out.penetration.dy = normalY * penetrationDepth;
      out.normal.nx = normalX;
      out.normal.ny = normalY;
      out.collided = true;
      return; // Collision occurred
    }
    // No overlap, out.collided remains false
  }

  public collideBallWithPaddle(
    ball: Ball,
    player: Player
  ): boolean {
    const ballRadius = ball.getSize();
    const epsilon = 0.01; // Reduced epsilon as discrete check is more robust
    const ballPosition = ball.getPosition();
    const ballVelocity = ball.getVelocity();
    const paddleVelocity = player.paddle.getVelocity();

    const pLeft = player.x;
    const pRight = player.x + player.paddleWidth;
    const pTop = player.y;
    const pBottom = player.y + player.paddleHeight;

    let hitOccurred = false;

    // 1) Continuous Sweep Test
    const prevBallPos = ball.getPrevPosition ? ball.getPrevPosition() : ballPosition; // Handle if getPrevPosition is missing
    const ballMoveDir = { dx: ballPosition.x - prevBallPos.x, dy: ballPosition.y - prevBallPos.y };

    if (Math.abs(ballMoveDir.dx) > 1e-6 || Math.abs(ballMoveDir.dy) > 1e-6) {
      PhysicsManager.sweepCircleVsMovingRect(
        prevBallPos, ballMoveDir, ballRadius,
        pLeft, pRight, pTop, pBottom,
        paddleVelocity,
        this.sweepResult
      );

      if (this.sweepResult.collided) {
        const { t, normal } = this.sweepResult;
        const contactX = prevBallPos.x + ballMoveDir.dx * t;
        const contactY = prevBallPos.y + ballMoveDir.dy * t;

        // Ensure the ball is moving towards the paddle surface it hit
        const dotProduct = ballVelocity.dx * normal.nx + ballVelocity.dy * normal.ny;
        if (dotProduct < 0) { // Negative dot product means velocities are opposing (moving towards)
          if (normal.ny !== 0) { // Hit top/bottom of paddle
            player.freezeMovement(0.2);
          }
          const reflectedVel = PhysicsManager._reflectVelocity(ballVelocity.dx, ballVelocity.dy, normal.nx, normal.ny, dotProduct);
          const finalVel = PhysicsManager._applyPaddleDeflection(
            { x: contactX, y: contactY },
            reflectedVel,
            pTop, pBottom
          );
          ball.dx = finalVel.dx;
          ball.dy = finalVel.dy;

          PhysicsManager._correctPosition(ball, contactX, contactY, normal.nx, normal.ny, epsilon);
          hitOccurred = true;
        }
      }
    }

    // 2) Discrete Collision Test (Fallback or if sweep didn't fully resolve)
    PhysicsManager.checkCircleAABBOverlap(
      ball.getPosition(), // Use the ball's *current* position after sweep correction
      ballRadius,
      pLeft, pRight, pTop, pBottom,
      this.overlapResult
    );

    if (this.overlapResult.collided) {
      const { penetration, normal } = this.overlapResult;

      // Push the ball out of the paddle by the penetration amount
      ball.x += penetration.dx;
      ball.y += penetration.dy;
      
      const dotProduct = ballVelocity.dx * normal.nx + ballVelocity.dy * normal.ny;
      if (dotProduct < 0 || hitOccurred) {
        if (normal.ny !== 0 && !hitOccurred) {
            player.freezeMovement(0.2);
        }
        const reflectedVel = PhysicsManager._reflectVelocity(ballVelocity.dx, ballVelocity.dy, normal.nx, normal.ny, dotProduct);
        const finalVel = PhysicsManager._applyPaddleDeflection(
            ball.getPosition(),
            reflectedVel,
            pTop, pBottom
        );
        ball.dx = finalVel.dx;
        ball.dy = finalVel.dy;
        hitOccurred = true;
      } else {
        // This 'else' block was problematic and led to unintended reflections on resting contact.
        // Simplified logic: if overlapping but not clearly moving into it, and sweep didn't hit,
        // we reflect to prevent sticking. This covers cases where the ball might be pushed slightly
        // by the discrete check and its velocity vector isn't perfectly aligned for dotProduct < 0.
        // However, the original aggressive reflection on any overlap if dotProduct wasn't < 0 was causing issues.
        // A more robust solution would be to only reflect if there is some opposing motion, 
        // or if the overlap is significant, or implement proper resting contact physics.
        // For now, let's ensure we only apply this secondary reflection if not already handled by sweep.
        if (!hitOccurred) {
            // Small negative dot product to ensure reflection away from normal
            const emergencyDot = -0.1; 
            if (normal.ny !== 0) {
                player.freezeMovement(0.2);
            }
            const reflectedVel = PhysicsManager._reflectVelocity(ballVelocity.dx, ballVelocity.dy, normal.nx, normal.ny, emergencyDot);
            const finalVel = PhysicsManager._applyPaddleDeflection(
                ball.getPosition(),
                reflectedVel,
                pTop, pBottom
            );
            ball.dx = finalVel.dx;
            ball.dy = finalVel.dy;
            hitOccurred = true;
        }
      }
    }
    
    if (hitOccurred) {
        // Ensure minimum vertical velocity if hitting front face of paddle
        // Check if normal from discrete or sweep indicates a side hit
        // This logic might need to be more robust regarding which normal to use if both hit
        let collisionNormalX = 0;
        if (this.overlapResult.collided) collisionNormalX = this.overlapResult.normal.nx;
        // else if (sweepHit) collisionNormalX = sweepHit.normal.nx; // sweepHit might not be in scope

        if (collisionNormalX !== 0) { // Hit was on the side (front face)
            const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            if (speed > 1e-6) {
                const minVerticalComponent = speed * BALL_CONFIG.MIN_VERTICAL_VELOCITY_RATIO_ON_PADDLE_HIT;
                if (Math.abs(ball.dy) < minVerticalComponent) {
                    ball.dy = ball.dy >= 0 ? minVerticalComponent : -minVerticalComponent;
                    // Adjust dx to maintain overall speed if dy was changed significantly (optional, can lead to complexities)
                    // const newSpeedSq = ball.dx * ball.dx + ball.dy * ball.dy;
                    // if (newSpeedSq > speed * speed) { // if new speed is higher
                    //    ball.dx = Math.sign(ball.dx) * Math.sqrt(Math.max(0, speed*speed - ball.dy*ball.dy));
                    // }
                }
            }
        }
    }

    return hitOccurred;
  }
} 