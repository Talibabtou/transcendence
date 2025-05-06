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
   * Updates physics simulation for one fixed timestep.
   * @param context Game context (unused for now, but good practice)
   * @param deltaTime Fixed time step duration in seconds.
   * @param gameState Current game state.
   */
  public update(deltaTime: number, gameState: GameState): void {
    // Only run physics if playing
    if (gameState !== GameState.PLAYING) {
      return;
    }
    this.ball.updatePhysics(deltaTime);
    PhysicsManager.collideBallWithPaddle(this.ball, this.player1);
    const hitRight = PhysicsManager.collideBallWithPaddle(this.ball, this.player2);
    if (hitRight) { // Player 2 hit, Player 1 (AI) predicts (or any hit for AI?)
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

    // Ensure paddleHeight is not zero to avoid division by zero
    if (paddleHeight <= 0) {
      return reflectedVel; // Return original reflected velocity if height is invalid
    }

    const clampedY = Math.max(paddleTop, Math.min(ballPos.y, paddleBottom));
    const relHit = (clampedY - paddleTop) / paddleHeight; // 0=top, 1=bottom

    // compute normalized deflection in [-1,1]
    const midStart = zoneSize;
    const midEnd = 1 - zoneSize;
    let defNorm = 0;
    if (relHit < midStart) {
      // Map [0, midStart) -> [-1, 0) linearly
      defNorm = -1 * (1 - (relHit / midStart));
    } else if (relHit > midEnd) {
       // Map (midEnd, 1] -> (0, 1] linearly
      defNorm = (relHit - midEnd) / (1 - midEnd); // Normalize correctly
    }

    let finalDx = reflectedVel.dx;
    let finalDy = reflectedVel.dy;

    // apply actual deflection angle only if maxDeflection > 0 and deflection is non-zero
    if (maxDeflection > 0 && defNorm !== 0) {
      const angle = defNorm * maxDeflection; // angle in radians
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      // rotate the reflected vector by 'angle'
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
    const epsilon = 0.05; // 5% bias for separation
    const velocity = ball.getVelocity(); // Get velocity once

    // 1) Continuous Sweep Test
    if (typeof (ball as any).getPrevPosition === 'function') {
      const p0 = (ball as any).getPrevPosition();
      const p1 = ball.getPosition();
      const dir = {dx: p1.x - p0.x, dy: p1.y - p0.y};

      if (!(Math.abs(dir.dx) < 1e-6 && Math.abs(dir.dy) < 1e-6)) { // Check for movement
          const hit = PhysicsManager.sweepCircleVsRect(p0, dir, ballRadius, cLeft, cRight, cTop, cBottom);
          if (hit) {
            const {t, normal} = hit;
            if (normal.ny !== 0) {
              player.freezeMovement(0.2);
            }
            const contactX = p0.x + dir.dx * t;
            const contactY = p0.y + dir.dy * t;
            const dot = velocity.dx * normal.nx + velocity.dy * normal.ny;

            if (dot < 0) {
              // Reflect velocity
              const reflectedVel = PhysicsManager._reflectVelocity(velocity.dx, velocity.dy, normal.nx, normal.ny, dot);
              // Apply deflection
              const finalVel = PhysicsManager._applyPaddleDeflection(
                { x: contactX, y: contactY },
                reflectedVel, // Use reflected velocity
                cTop,
                cBottom
              );
              ball.dx = finalVel.dx;
              ball.dy = finalVel.dy;

              // Correct position
              PhysicsManager._correctPosition(ball, contactX, contactY, normal.nx, normal.ny, epsilon);

              return true; // Collision handled by sweep
            }
          }
      }
    }

    // 2) Discrete Collision Test (Fallback - Merged Corner/Edge Logic)
    const pos = ball.getPosition();
    const r = ballRadius;

    // Find closest point on paddle rectangle to ball center
    const cx = Math.max(cLeft, Math.min(pos.x, cRight));
    const cy = Math.max(cTop, Math.min(pos.y, cBottom));

    // Calculate squared distance from ball center to closest point
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const distSq = dx * dx + dy * dy;

    // Check for overlap (ball is within radius of the closest point)
    if (distSq <= r * r) {
      // Determine if the closest point is a corner
      const isCorner = (cx === cLeft || cx === cRight) && (cy === cTop || cy === cBottom);
      let nx: number, ny: number;
      let len: number;

      if (isCorner) {
				console.log('corner');
        // --- Corner Collision --- 
        player.freezeMovement(0.5); // Freeze on corner hit
        // Normal is from corner to ball center
        len = Math.sqrt(distSq) || 1;
        nx = dx / len;
        ny = dy / len;
        const dot = velocity.dx * nx + velocity.dy * ny;

        if (dot < 0) {
          // Reflect velocity using corner normal (no deflection)
          const reflectedVel = PhysicsManager._reflectVelocity(velocity.dx, velocity.dy, nx, ny, dot);
          ball.dx = reflectedVel.dx;
          ball.dy = reflectedVel.dy;
          // Correct position pushing away from the corner
          PhysicsManager._correctPositionCorner(ball, cx, cy, nx, ny, r, epsilon);
          return true;
        }
      } else {
        // --- Edge Collision --- 
        // Freeze only if hitting top/bottom edge explicitly
        if (Math.abs(pos.x - cx) < 1e-6 && (cy === cTop || cy === cBottom)) {
            player.freezeMovement(0.5);
        }
        // Normal is from closest point on edge to ball center
        len = Math.sqrt(distSq) || 1;
        nx = dx / len;
        ny = dy / len;
        const dot = velocity.dx * nx + velocity.dy * ny;

        if (dot < 0) {
          // Reflect velocity using edge normal
          const reflectedVel = PhysicsManager._reflectVelocity(velocity.dx, velocity.dy, nx, ny, dot);
          // Apply deflection based on hit position relative to the edge
          const finalVel = PhysicsManager._applyPaddleDeflection(
             pos, // Use current ball position for deflection calc on edge
             reflectedVel,
             cTop,
             cBottom
           );
          ball.dx = finalVel.dx;
          ball.dy = finalVel.dy;
          // Correct position pushing away from the edge
          // Note: _correctPosition and _correctPositionCorner now do the same thing,
          // maybe rename/merge the helper if desired, but functionally using either is fine here
          // Let's keep distinct names for clarity for now.
          PhysicsManager._correctPosition(ball, cx, cy, nx, ny, epsilon);
          return true;
        }
      }
    }

    return false; // No collision detected
  }
} 