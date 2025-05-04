import { BALL_CONFIG } from '@pong/constants';

export class PhysicsManager {
  public static collideBallWithPaddle(
    ball: import('@pong/game/objects').Ball,
    player: import('@pong/game/objects').Player
  ): boolean {
    const pos = ball.getPosition();
    const r   = ball.getSize();
    const left   = player.x;
    const right  = player.x + player.paddleWidth;
    const top    = player.y;
    const bottom = player.y + player.paddleHeight;
    // find closest point on paddle
    const cx = Math.max(left, Math.min(pos.x, right));
    const cy = Math.max(top,  Math.min(pos.y, bottom));
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    if (dx*dx + dy*dy <= r*r) {
      // reflect + deflection using CollisionManager logic
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      const nx  = dx / len;
      const ny  = dy / len;
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