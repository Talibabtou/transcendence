export class PhysicsManager {
  /**
   * Discrete circle-vs-AABB test + reflect velocity.
   * @returns true if collision occurred
   */
  public static collideBallWithPaddle(
    ball: import('@pong/game/objects').Ball,
    player: import('@pong/game/objects').Player
  ): boolean {
    const pos = ball.getPosition();
    const r   = ball.getSize();
    // get paddle box from player fields
    const left   = player.x;
    const right  = player.x + player.paddleWidth;
    const top    = player.y;
    const bottom = player.y + player.paddleHeight;
    // closest point
    const cx = Math.max(left,   Math.min(pos.x, right));
    const cy = Math.max(top,    Math.min(pos.y, bottom));
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    if (dx*dx + dy*dy <= r*r) {
      // reflect velocity about normal (dx,dy)
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      const nx  = dx / len;
      const ny  = dy / len;
      const v   = ball.getVelocity();
      const dot = v.dx*nx + v.dy*ny;
      if (dot >= 0) return false;
      ball.dx = v.dx - 2*dot*nx;
      ball.dy = v.dy - 2*dot*ny;
      ball.x = cx + nx * r;
      ball.y = cy + ny * r;
      return true;
    }
    return false;
  }
}
