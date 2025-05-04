import { BALL_CONFIG } from '@pong/constants';

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

  public static collideBallWithPaddle(
    ball: import('@pong/game/objects').Ball,
    player: import('@pong/game/objects').Player
  ): boolean {
    // 1) Try continuous sweep test first
    const cLeft = player.x;
    const cRight = player.x + player.paddleWidth;
    const cTop = player.y;
    const cBottom = player.y + player.paddleHeight;
    if (typeof (ball as any).getPrevPosition === 'function') {
      const p0 = (ball as any).getPrevPosition();
      const p1 = ball.getPosition();
      const dir = {dx: p1.x - p0.x, dy: p1.y - p0.y};
      const hit = PhysicsManager.sweepCircleVsRect(p0, dir, ball.getSize(), cLeft, cRight, cTop, cBottom);
      if (hit) {
        const {t, normal} = hit;
        // ── If sweep hit is on top/bottom face, freeze paddle for 0.1s
        if (normal.ny !== 0) {
          player.freezeMovement(0.2);
        }
        const cx = p0.x + dir.dx * t;
        const cy = p0.y + dir.dy * t;
        const v = ball.getVelocity();
        const dot = v.dx * normal.nx + v.dy * normal.ny;
        if (dot < 0) {
          let newDx = v.dx - 2 * dot * normal.nx;
          let newDy = v.dy - 2 * dot * normal.ny;
          // deflection from paddle zones
          const zoneSize = BALL_CONFIG.EDGES.ZONE_SIZE;
          const maxDeflection = BALL_CONFIG.EDGES.MAX_DEFLECTION;
          const paddleHeight = cBottom - cTop;
          const clampedY = Math.max(cTop, Math.min(cy, cBottom));
          const relHit = (clampedY - cTop) / paddleHeight;
          const midStart = zoneSize;
          const midEnd = 1 - zoneSize;
          let defNorm = 0;
          if (relHit < midStart) {
            defNorm = -1 * (1 - relHit / zoneSize);
          } else if (relHit > midEnd) {
            defNorm = (relHit - midEnd) / zoneSize;
          }
          if (maxDeflection > 0 && defNorm !== 0) {
            const angle = defNorm * maxDeflection;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const dxr = newDx * cosA - newDy * sinA;
            const dyr = newDx * sinA + newDy * cosA;
            newDx = dxr;
            newDy = dyr;
          }
          ball.dx = newDx;
          ball.dy = newDy;
          ball.x = cx + normal.nx * ball.getSize();
          ball.y = cy + normal.ny * ball.getSize();
          return true;
        }
      }
    }
    // 2) Fallback to discrete collision
    const left   = player.x;
    const right  = player.x + player.paddleWidth;
    const top    = player.y;
    const bottom = player.y + player.paddleHeight;
    const pos    = ball.getPosition();
    const r      = ball.getSize();

    // ── EARLY CORNER BOUNCE: check the 4 paddle corners first ──
    const corners = [
      { x: left,  y: top    },
      { x: left,  y: bottom },
      { x: right, y: top    },
      { x: right, y: bottom }
    ];
    for (const corner of corners) {
      const dxC = pos.x - corner.x;
      const dyC = pos.y - corner.y;
      if (dxC*dxC + dyC*dyC <= r*r) {
        // ❄ freeze paddle briefly to prevent re-penetration
        player.freezeMovement(0.2);
        const lenC = Math.sqrt(dxC*dxC + dyC*dyC) || 1;
        const nxC  = dxC / lenC;
        const nyC  = dyC / lenC;
        const v    = ball.getVelocity();
        const dot  = v.dx * nxC + v.dy * nyC;
        if (dot < 0) {
          // reflect & nudge out
          const newDx = v.dx - 2 * dot * nxC;
          const newDy = v.dy - 2 * dot * nyC;
          ball.dx = newDx;
          ball.dy = newDy;
          ball.x  = corner.x + nxC * r;
          ball.y  = corner.y + nyC * r;
          return true;
        }
      }
    }

    // find closest point on paddle
    const cx = Math.max(left,  Math.min(pos.x, right));
    const cy = Math.max(top,   Math.min(pos.y, bottom));
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    if (dx*dx + dy*dy <= r*r) {
      // ── If discrete hit is exactly on top/bottom edge, freeze for 0.1s
      if (cy === top || cy === bottom) {
        player.freezeMovement(0.2);
      }
      // compute collision normal
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      const nx  = dx / len;
      const ny  = dy / len;

      // if we hit the paddle's horizontal face (top/bottom), freeze its movement
      if (nx === 0) {
        player.freezeMovement(0.2);
      }

      const v   = ball.getVelocity();
      const dot = v.dx*nx + v.dy*ny;
      if (dot >= 0) return false;

      // 1) base reflection
      let newDx = v.dx - 2*dot*nx;
      let newDy = v.dy - 2*dot*ny;

      // 2) deflection from paddle zones (top/bottom 10%)
      const zoneSize      = BALL_CONFIG.EDGES.ZONE_SIZE;     // e.g. 0.1
      const maxDeflection = BALL_CONFIG.EDGES.MAX_DEFLECTION; // e.g. 0 means "no deflection"
      const paddleHeight  = bottom - top;
      const clampedY      = Math.max(top, Math.min(pos.y, bottom));
      const relHit        = (clampedY - top) / paddleHeight; // 0=top, 1=bottom

      // compute normalized deflection in [-1,1]
      const midStart = zoneSize;
      const midEnd   = 1 - zoneSize;
      let defNorm = 0;
      if (relHit < midStart) {
        defNorm = -1 * (1 - (relHit / zoneSize));
      } else if (relHit > midEnd) {
        defNorm =  (relHit - midEnd) / zoneSize;
      }

      // apply actual deflection angle only if maxDeflection > 0
      if (maxDeflection > 0 && defNorm !== 0) {
        const angle = defNorm * maxDeflection;
        const cosA  = Math.cos(angle);
        const sinA  = Math.sin(angle);
        // rotate the reflected vector by 'angle'
        const dxr = newDx * cosA - newDy * sinA;
        const dyr = newDx * sinA + newDy * cosA;
        newDx = dxr;
        newDy = dyr;
      }

      ball.dx = newDx;
      ball.dy = newDy;

      // 3) position correction
      ball.x = cx + nx * r;
      ball.y = cy + ny * r;
      return true;
    }
    return false;
  }
} 