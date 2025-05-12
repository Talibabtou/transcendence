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
   * Updates ball's state (velocity, destroyed flag) accordingly.
   * @param ball The ball object.
   * @returns True if the ball hit a vertical (top/bottom) reflecting wall, false otherwise.
   */
  private handleBallWallCollisions(ball: Ball): boolean {
    const ballRadius = ball.getSize();
    const canvas = ball.getContext().canvas;
    let reflectedOffVerticalWall = false;
    const epsilon = 0.05; // Small offset for separation

    // Vertical boundaries (top/bottom walls)
    const topWallSurfaceY = ballRadius;
    if (ball.y <= topWallSurfaceY) { // Ball center is above where it should be for contact with top wall
      const penetration = topWallSurfaceY - ball.y;
      ball.dy = Math.abs(ball.dy); // Force positive dy (downwards)
      ball.y = topWallSurfaceY + penetration + epsilon; // Move to surface, add penetration in new direction, then epsilon
      reflectedOffVerticalWall = true;
    }
    
    const bottomWallSurfaceY = canvas.height - ballRadius;
    if (ball.y >= bottomWallSurfaceY) { // Ball center is below where it should be for contact with bottom wall
      const penetration = ball.y - bottomWallSurfaceY;
      ball.dy = -Math.abs(ball.dy); // Force negative dy (upwards)
      ball.y = bottomWallSurfaceY - penetration - epsilon; // Move to surface, add penetration in new direction, then epsilon
      reflectedOffVerticalWall = true;
    }

    // Horizontal boundaries (left/right walls - scoring zones)
    if (ball.x - ballRadius <= 0) {
      ball.destroyed = true;
      ball.hitLeftBorder = true;
    } else if (ball.x + ballRadius >= canvas.width) {
      ball.destroyed = true;
      ball.hitLeftBorder = false;
    }

    // Ensure minimum velocity to prevent sticking (from former Ball.checkBoundaries)
    const minSpeed = 1; // Define this in constants if needed
    const currentSpeedSq = ball.dx * ball.dx + ball.dy * ball.dy;
    if (currentSpeedSq < minSpeed * minSpeed && currentSpeedSq > 1e-6) { // Check against squared speed and ensure it's not zero
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
  private static sweepCircleVsRect(
    p0: {x: number; y: number},
    dir: {dx: number; dy: number},
    r: number,
    left: number,
    right: number,
    top: number,
    bottom: number
  ): {t: number; normal: {nx: number; ny: number}} | null {
    let tmin = 0, tmax = 1;
    let txmin = -Infinity, tymin = -Infinity;
    const minX = left - r, maxX = right + r, minY = top - r, maxY = bottom + r;
    if (dir.dx !== 0) {
      const inv = 1 / dir.dx;
      const t1 = (minX - p0.x) * inv;
      const t2 = (maxX - p0.x) * inv;
      txmin = Math.min(t1, t2);
      const txmax = Math.max(t1, t2);
      tmin = Math.max(tmin, txmin);
      tmax = Math.min(tmax, txmax);
      if (tmin > tmax) return null;
    } else if (p0.x < minX || p0.x > maxX) return null;
    if (dir.dy !== 0) {
      const inv = 1 / dir.dy;
      const t1 = (minY - p0.y) * inv;
      const t2 = (maxY - p0.y) * inv;
      tymin = Math.min(t1, t2);
      const tymax = Math.max(t1, t2);
      tmin = Math.max(tmin, tymin);
      tmax = Math.min(tmax, tymax);
      if (tmin > tmax) return null;
    } else if (p0.y < minY || p0.y > maxY) return null;
    if (tmin < 0 || tmin > 1) return null;
    const axis = txmin > tymin ? 'x' : 'y';
    const normal = {
      nx: axis === 'x' ? (dir.dx < 0 ? 1 : -1) : 0,
      ny: axis === 'y' ? (dir.dy < 0 ? 1 : -1) : 0
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
    epsilon: number
  ): void {
    ball.x = contactX + nx * epsilon;
    ball.y = contactY + ny * epsilon;
    // Optional: Add clamping here if needed to ensure ball stays within bounds
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
    const cLeft = player.x;
    const cRight = player.x + player.paddleWidth;
    const cTop = player.y;
    const cBottom = player.y + player.paddleHeight;
    const ballRadius = ball.getSize();
    const epsilon = 0.05; 
    const velocity = ball.getVelocity();

    // 1) Continuous Sweep Test
    if (typeof (ball as any).getPrevPosition === 'function') {
      const p0 = (ball as any).getPrevPosition();
      const p1 = ball.getPosition();
      const dir = {dx: p1.x - p0.x, dy: p1.y - p0.y};

      if (!(Math.abs(dir.dx) < 1e-6 && Math.abs(dir.dy) < 1e-6)) {
          const hit = PhysicsManager.sweepCircleVsRect(p0, dir, ballRadius, cLeft, cRight, cTop, cBottom);
          if (hit) {
            const {t, normal} = hit;
            if (normal.ny !== 0) { // Hit top/bottom of paddle
              player.freezeMovement(0.2);
            }
            const contactX = p0.x + dir.dx * t;
            const contactY = p0.y + dir.dy * t;
            const dot = velocity.dx * normal.nx + velocity.dy * normal.ny;

            if (dot < 0) {
              const reflectedVel = PhysicsManager._reflectVelocity(velocity.dx, velocity.dy, normal.nx, normal.ny, dot);
              const finalVel = PhysicsManager._applyPaddleDeflection(
                { x: contactX, y: contactY },
                reflectedVel,
                cTop,
                cBottom
              );
              ball.dx = reflectedVel.dx;
              ball.dy = reflectedVel.dy;

              // Ensure minimum vertical velocity if hitting front face of paddle
              if (normal.nx !== 0) { // Hit was on the side (front face)
                const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                if (speed > 1e-6) { // Avoid division by zero or issues with zero speed
                    const minVerticalComponent = speed * BALL_CONFIG.MIN_VERTICAL_VELOCITY_RATIO_ON_PADDLE_HIT;
                    if (Math.abs(ball.dy) < minVerticalComponent) {
                        ball.dy = ball.dy >= 0 ? minVerticalComponent : -minVerticalComponent;
                        // Optional: re-normalize dx, dy to maintain original speed after adjusting dy.
                        // For now, matching original Ball.hit behavior which just sets dy.
                        // Acceleration will later adjust magnitude.
                    }
                }
              }
              PhysicsManager._correctPosition(ball, contactX, contactY, normal.nx, normal.ny, epsilon);
              return true; 
            }
          }
      }
    }

    // 2) Discrete Collision Test (Fallback - Merged Corner/Edge Logic)
    const pos = ball.getPosition();
    const r = ballRadius;
    const cx = Math.max(cLeft, Math.min(pos.x, cRight));
    const cy = Math.max(cTop, Math.min(pos.y, cBottom));
    const dxHit = pos.x - cx;
    const dyHit = pos.y - cy;
    const distSq = dxHit * dxHit + dyHit * dyHit;

    if (distSq <= r * r) {
      const isCorner = (cx === cLeft || cx === cRight) && (cy === cTop || cy === cBottom);
      let nx: number, ny: number;
      let len: number = Math.sqrt(distSq);

      if (len === 0) { // Ball center is exactly on corner/edge point
        // Determine a fallback normal. E.g., based on incoming velocity or a default pushout.
        // For simplicity, if len is 0, try pushing out along ball's incoming velocity negated, or a default.
        // This case should ideally be rare with continuous collision.
        // Let's use the vector from paddle center to ball as a rough normal if on edge.
        // Or simply prioritize horizontal push for vertical paddles.
        if (Math.abs(velocity.dx) > Math.abs(velocity.dy)) {
            nx = -Math.sign(velocity.dx); ny = 0;
        } else {
            nx = 0; ny = -Math.sign(velocity.dy);
        }
        if (nx === 0 && ny === 0) nx = 1; // ultimate fallback
        len = 1; // avoid division by zero for normalization
      } else {
        nx = dxHit / len;
        ny = dyHit / len;
      }

      if (isCorner) {
        console.log('corner');
        player.freezeMovement(0.5); 
        const dot = velocity.dx * nx + velocity.dy * ny;
        if (dot < 0) {
          const reflectedVel = PhysicsManager._reflectVelocity(velocity.dx, velocity.dy, nx, ny, dot);
          ball.dx = reflectedVel.dx;
          ball.dy = reflectedVel.dy;
          PhysicsManager._correctPositionCorner(ball, cx, cy, nx, ny, r, epsilon);
          return true;
        }
      } else { // Edge Collision
        if (Math.abs(pos.x - cx) < 1e-6 && (cy === cTop || cy === cBottom)) { // Top/bottom edge hit
            player.freezeMovement(0.5);
        }
        const dot = velocity.dx * nx + velocity.dy * ny;
        if (dot < 0) {
          const reflectedVel = PhysicsManager._reflectVelocity(velocity.dx, velocity.dy, nx, ny, dot);
          const finalVel = PhysicsManager._applyPaddleDeflection(
             pos, 
             reflectedVel,
             cTop,
             cBottom
           );
          ball.dx = reflectedVel.dx;
          ball.dy = reflectedVel.dy;

          // Ensure minimum vertical velocity if hitting front face of paddle (approximated by normal)
          if (Math.abs(nx) > Math.abs(ny)) { // Hit was primarily on the side (front face)
            const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            if (speed > 1e-6) {
                const minVerticalComponent = speed * BALL_CONFIG.MIN_VERTICAL_VELOCITY_RATIO_ON_PADDLE_HIT;
                if (Math.abs(ball.dy) < minVerticalComponent) {
                    ball.dy = ball.dy >= 0 ? minVerticalComponent : -minVerticalComponent;
                }
            }
          }
          PhysicsManager._correctPosition(ball, cx, cy, nx, ny, epsilon); // Using _correctPosition for general pushout
          return true;
        }
      }
    }
    return false;
  }
} 