var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var Direction = /* @__PURE__ */ ((Direction2) => {
  Direction2[Direction2["UP"] = 0] = "UP";
  Direction2[Direction2["DOWN"] = 1] = "DOWN";
  return Direction2;
})(Direction || {});
var GameState = /* @__PURE__ */ ((GameState2) => {
  GameState2["PLAYING"] = "PLAYING";
  GameState2["PAUSED"] = "PAUSED";
  GameState2["COUNTDOWN"] = "COUNTDOWN";
  return GameState2;
})(GameState || {});
const GAME_CONFIG = {
  WINNING_SCORE: 5,
  FPS: 144,
  MIN_SIZES: {
    BALL_SIZE: 5
  }
};
const COLORS = {
  // Backgrounds
  MENU_BACKGROUND: "#7E8F7C",
  GAME_BACKGROUND: "#000000",
  // Game elements
  PITCH: "#FFFFFF",
  BALL: "#FF0000",
  PADDLE: "#0000FF",
  // UI elements
  TITLE: "#FDF3E7",
  SCORE: "#FFFFFF",
  OVERLAY: "rgba(0, 0, 0, 0.5)"
};
const UI_CONFIG = {
  TEXT: {
    ALIGN: "center",
    COLOR: "#FFFFFF",
    STROKE: {
      COLOR: "#000000",
      WIDTH: 2
    }
  },
  LAYOUT: {
    // 10% of screen height
    VERTICAL_SPACING: 0.08
    // 8% of screen height
  }
};
const GAME_RATIOS = {
  PADDLE: {
    WIDTH: 0.01,
    // % of screen width
    HEIGHT: 0.15,
    // % of screen height
    SPEED: 6e-3,
    // Reduced from 0.01 to 0.006 for better control
    PADDING: 0.03
    // % from edges
  },
  BALL: {
    SIZE: 8e-3
    // % of base unit
  }
};
const BALL_CONFIG = {
  SPEED: {
    RELATIVE: {
      TIME_TO_CROSS: 2.75,
      INITIAL_ANGLE: {
        BASE: 30,
        // Base diagonal angle
        VARIATION: 10
        // Random variation range
      }
    }
  },
  ACCELERATION: {
    MAX_MULTIPLIER: 4,
    // Maximum speed (4x initial speed)
    RATE: 0.05,
    // 10% speed increase per hit
    INITIAL: 1
    // Initial speed multiplier
  },
  EDGES: {
    ZONE_SIZE: 0.05,
    // 5% edge detection zone
    MAX_DEFLECTION: 0.1
    // 10% max deflection
  }
};
const FONTS = {
  FAMILIES: {
    TITLE: "Arial",
    SUBTITLE: "Arial",
    SCORE: "Arial",
    COUNTDOWN: "Arial",
    PAUSE: "Arial"
  },
  SIZE_RATIOS: {
    TITLE: 0.06,
    SUBTITLE: 0.03,
    SCORE: 0.06,
    COUNTDOWN: 0.06,
    PAUSE: 0.06,
    RESUME_PROMPT: 0.03
  },
  MIN_SIZES: {
    TITLE: 24,
    SUBTITLE: 14,
    SCORE: 24,
    COUNTDOWN: 24,
    PAUSE: 24,
    RESUME_PROMPT: 14
  }
};
const KEYS = {
  PLAYER_LEFT_UP: "KeyW",
  PLAYER_LEFT_DOWN: "KeyS",
  ENTER: "Enter",
  ESC: "Escape"
};
const MESSAGES = {
  GAME_TITLE: "PONG",
  GAME_SUBTITLE: "Click to start",
  GAME_OVER: (winnerName) => ["Game is over!", `The winner is ${winnerName}`],
  RETURN_TO_MENU: "Click to go to main menu",
  PAUSED: "PAUSED",
  RESUME_PROMPT: "Press ENTER or ESC to resume",
  GO: "GO!"
};
const calculateFontSizes = (width, height) => {
  const minDimension = Math.min(width, height);
  const maxDimension = Math.max(width, height);
  const baseSize = (minDimension + maxDimension) / 2;
  return {
    TITLE_SIZE: `${Math.max(Math.floor(baseSize * FONTS.SIZE_RATIOS.TITLE), FONTS.MIN_SIZES.TITLE)}px`,
    SUBTITLE_SIZE: `${Math.max(Math.floor(baseSize * FONTS.SIZE_RATIOS.SUBTITLE), FONTS.MIN_SIZES.SUBTITLE)}px`,
    SCORE_SIZE: `${Math.max(Math.floor(baseSize * FONTS.SIZE_RATIOS.SCORE), FONTS.MIN_SIZES.SCORE)}px`,
    COUNTDOWN_SIZE: `${Math.max(Math.floor(baseSize * FONTS.SIZE_RATIOS.COUNTDOWN), FONTS.MIN_SIZES.COUNTDOWN)}px`,
    PAUSE_SIZE: `${Math.max(Math.floor(baseSize * FONTS.SIZE_RATIOS.PAUSE), FONTS.MIN_SIZES.PAUSE)}px`,
    RESUME_PROMPT_SIZE: `${Math.max(Math.floor(baseSize * FONTS.SIZE_RATIOS.RESUME_PROMPT), FONTS.MIN_SIZES.RESUME_PROMPT)}px`
  };
};
const calculateGameSizes = (width, height) => {
  const baseUnit = Math.min(width, height) / 100;
  return {
    PADDLE_WIDTH: Math.floor(width * GAME_RATIOS.PADDLE.WIDTH),
    PADDLE_HEIGHT: Math.floor(height * GAME_RATIOS.PADDLE.HEIGHT),
    PADDLE_SPEED: Math.floor(height * GAME_RATIOS.PADDLE.SPEED),
    PLAYER_PADDING: Math.floor(width * GAME_RATIOS.PADDLE.PADDING),
    BALL_SIZE: Math.max(Math.floor(baseUnit * GAME_RATIOS.BALL.SIZE * 100), GAME_CONFIG.MIN_SIZES.BALL_SIZE)
  };
};
class Scene {
  // =========================================
  // Constructor
  // =========================================
  constructor(context) {
    // =========================================
    // Protected Properties
    // =========================================
    __publicField(this, "gameContext");
    this.context = context;
  }
  // =========================================
  // Public Methods
  // =========================================
  draw() {
    this.drawBackground();
    this.drawContent();
  }
  load(_params = {}) {
  }
  unload() {
    var _a, _b;
    if (this.resizeManager) {
      (_b = (_a = this.resizeManager).cleanup) == null ? void 0 : _b.call(_a);
      this.resizeManager = null;
    }
    this.gameContext = null;
  }
  setGameContext(game) {
    this.gameContext = game;
  }
  getResizeManager() {
    return this.resizeManager;
  }
  // =========================================
  // Protected Helper Methods
  // =========================================
  getTextPosition(lineIndex = 0, totalLines = 1) {
    const { width, height } = this.context.canvas;
    const spacing = height * UI_CONFIG.LAYOUT.VERTICAL_SPACING;
    const totalHeight = spacing * (totalLines - 1);
    const startY = height / 2 - totalHeight / 2;
    return {
      x: width / 2,
      y: startY + lineIndex * spacing
    };
  }
  // =========================================
  // Protected Methods
  // =========================================
  drawBackground() {
    const { width, height } = this.context.canvas;
    this.context.fillStyle = COLORS.MENU_BACKGROUND;
    this.context.fillRect(0, 0, width, height);
  }
}
class Ball {
  constructor(x, y, context) {
    // =========================================
    // Private Properties
    // =========================================
    __publicField(this, "context");
    __publicField(this, "size");
    __publicField(this, "baseSpeed");
    __publicField(this, "currentSpeed");
    __publicField(this, "colour", COLORS.BALL);
    // State flags
    __publicField(this, "destroyed", false);
    __publicField(this, "hitLeftBorder", false);
    // Speed control
    __publicField(this, "speedMultiplier", BALL_CONFIG.ACCELERATION.INITIAL);
    // =========================================
    // Public Properties
    // =========================================
    __publicField(this, "dx", 0);
    __publicField(this, "dy", 0);
    this.x = x;
    this.y = y;
    this.context = context;
    this.initializeSizes();
  }
  // =========================================
  // Public Methods
  // =========================================
  getContext() {
    return this.context;
  }
  getSize() {
    return this.size;
  }
  isDestroyed() {
    return this.destroyed;
  }
  isHitLeftBorder() {
    return this.hitLeftBorder;
  }
  draw() {
    this.context.beginPath();
    this.context.fillStyle = this.colour;
    this.context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    this.context.fill();
    this.context.closePath();
  }
  update(_context, deltaTime, state) {
    if (state !== GameState.PLAYING) return;
    this.movePosition(deltaTime);
    this.checkBoundaries();
  }
  launchBall() {
    this.currentSpeed = this.baseSpeed;
    this.speedMultiplier = BALL_CONFIG.ACCELERATION.INITIAL;
    const baseAngle = BALL_CONFIG.SPEED.RELATIVE.INITIAL_ANGLE.BASE;
    const variation = BALL_CONFIG.SPEED.RELATIVE.INITIAL_ANGLE.VARIATION;
    const randomVariation = Math.random() * variation * 2 - variation;
    const launchAngle = (baseAngle + randomVariation) * (Math.PI / 180);
    this.dx = Math.cos(launchAngle);
    this.dy = Math.sin(launchAngle);
    const magnitude = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    this.dx = this.dx / magnitude * this.currentSpeed;
    this.dy = this.dy / magnitude * this.currentSpeed;
    if (Math.random() > 0.5) {
      this.dx = -this.dx;
    }
  }
  hit(hitFace, deflectionModifier = 0) {
    const currentAngle = Math.atan2(this.dy, this.dx);
    const speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    switch (hitFace) {
      case "front":
        const newAngle = Math.PI - currentAngle + deflectionModifier * Math.PI;
        this.dx = Math.cos(newAngle) * speed;
        this.dy = Math.sin(newAngle) * speed;
        break;
      case "bottom":
        const topAngle = -currentAngle + deflectionModifier * Math.PI;
        this.dx = Math.cos(topAngle) * speed;
        this.dy = Math.abs(Math.sin(topAngle) * speed);
        break;
      case "top":
        const bottomAngle = -currentAngle + deflectionModifier * Math.PI;
        this.dx = Math.cos(bottomAngle) * speed;
        this.dy = -Math.abs(Math.sin(bottomAngle) * speed);
        break;
    }
    this.accelerate();
  }
  updateSizes() {
    const oldWidth = this.context.canvas.width;
    const oldHeight = this.context.canvas.height;
    const newWidth = this.context.canvas.width;
    const newHeight = this.context.canvas.height;
    const widthRatio = newWidth / oldWidth;
    const heightRatio = newHeight / oldHeight;
    const oldDx = this.dx;
    const oldDy = this.dy;
    const sizes = calculateGameSizes(newWidth, newHeight);
    this.size = sizes.BALL_SIZE;
    this.baseSpeed = newWidth / BALL_CONFIG.SPEED.RELATIVE.TIME_TO_CROSS;
    if (oldDx !== 0 || oldDy !== 0) {
      this.dx = oldDx * widthRatio;
      this.dy = oldDy * heightRatio;
    }
  }
  restart() {
    this.x = this.context.canvas.width / 2;
    this.y = this.context.canvas.height / 2;
    this.dx = 0;
    this.dy = 0;
    this.destroyed = false;
    this.hitLeftBorder = false;
  }
  saveState() {
    const { width, height } = this.context.canvas;
    return {
      position: {
        x: this.x / width,
        y: this.y / height
      },
      velocity: this.getNormalizedVelocity(),
      // This already gives us normalized direction
      speedMultiplier: this.speedMultiplier
    };
  }
  restoreState(state, newWidth, newHeight) {
    const width = newWidth ?? this.context.canvas.width;
    const height = newHeight ?? this.context.canvas.height;
    this.x = width * state.position.x;
    this.y = height * state.position.y;
    if (state.velocity.dx !== 0 || state.velocity.dy !== 0) {
      this.dx = state.velocity.dx;
      this.dy = state.velocity.dy;
      this.speedMultiplier = state.speedMultiplier;
      this.currentSpeed = this.baseSpeed * this.speedMultiplier;
      this.dx = state.velocity.dx * this.currentSpeed;
      this.dy = state.velocity.dy * this.currentSpeed;
    }
  }
  // =========================================
  // Private Methods
  // =========================================
  initializeSizes() {
    const sizes = calculateGameSizes(this.context.canvas.width, this.context.canvas.height);
    this.size = sizes.BALL_SIZE;
    this.baseSpeed = this.context.canvas.width / BALL_CONFIG.SPEED.RELATIVE.TIME_TO_CROSS;
    this.currentSpeed = this.baseSpeed;
  }
  movePosition(deltaTime) {
    if (this.destroyed) return;
    this.x += this.dx * deltaTime;
    this.y += this.dy * deltaTime;
  }
  checkBoundaries() {
    const ballRadius = this.size;
    if (this.y - ballRadius <= 0) {
      this.y = ballRadius;
      this.dy = Math.abs(this.dy);
      this.accelerate();
    } else if (this.y + ballRadius >= this.context.canvas.height) {
      this.y = this.context.canvas.height - ballRadius;
      this.dy = -Math.abs(this.dy);
      this.accelerate();
    }
    if (this.x - ballRadius <= 0) {
      this.destroyed = true;
      this.hitLeftBorder = true;
    } else if (this.x + ballRadius >= this.context.canvas.width) {
      this.destroyed = true;
      this.hitLeftBorder = false;
    }
    const minSpeed = 1;
    const currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    if (currentSpeed < minSpeed && currentSpeed > 0) {
      const scale = minSpeed / currentSpeed;
      this.dx *= scale;
      this.dy *= scale;
    }
  }
  accelerate() {
    this.speedMultiplier = Math.min(
      this.speedMultiplier + BALL_CONFIG.ACCELERATION.RATE,
      BALL_CONFIG.ACCELERATION.MAX_MULTIPLIER
    );
    this.currentSpeed = this.baseSpeed * this.speedMultiplier;
    const normalized = this.getNormalizedVelocity();
    this.dx = normalized.dx * this.currentSpeed;
    this.dy = normalized.dy * this.currentSpeed;
  }
  getNormalizedVelocity() {
    const magnitude = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    if (magnitude === 0) return { dx: 0, dy: 0 };
    return {
      dx: this.dx / magnitude,
      dy: this.dy / magnitude
    };
  }
}
class PaddleHitbox {
  // =========================================
  // Constructor
  // =========================================
  constructor(paddle, ball) {
    __publicField(this, "EDGE_ZONE", BALL_CONFIG.EDGES.ZONE_SIZE);
    __publicField(this, "MAX_DEFLECTION", BALL_CONFIG.EDGES.MAX_DEFLECTION);
    this.paddle = paddle;
    this.ball = ball;
  }
  // =========================================
  // Public Methods
  // =========================================
  checkCollision() {
    if (this.isStationary()) {
      return { collided: false, hitFace: "front", deflectionModifier: 0 };
    }
    const ballBox = this.getBallBoundingBox();
    const paddleBox = this.getPaddleBoundingBox();
    if (!this.doBoxesIntersect(ballBox, paddleBox)) {
      return { collided: false, hitFace: "front", deflectionModifier: 0 };
    }
    const isApproachingFromLeft = this.ball.dx > 0 && this.ball.x < this.paddle.x;
    const isApproachingFromRight = this.ball.dx < 0 && this.ball.x > this.paddle.x + this.paddle.paddleWidth;
    if (!isApproachingFromLeft && !isApproachingFromRight) {
      return { collided: false, hitFace: "front", deflectionModifier: 0 };
    }
    const relativeHitPos = (this.ball.y - this.paddle.y) / this.paddle.paddleHeight;
    let hitFace;
    let deflectionModifier = 0;
    if (this.ball.dy > 0 && this.ball.y - this.ball.getSize() <= this.paddle.y) {
      hitFace = "top";
    } else if (this.ball.dy < 0 && this.ball.y + this.ball.getSize() >= this.paddle.y + this.paddle.paddleHeight) {
      hitFace = "bottom";
    } else {
      hitFace = "front";
      if (relativeHitPos < this.EDGE_ZONE) {
        deflectionModifier = -this.MAX_DEFLECTION * (1 - relativeHitPos / this.EDGE_ZONE);
      } else if (relativeHitPos > 1 - this.EDGE_ZONE) {
        deflectionModifier = this.MAX_DEFLECTION * ((relativeHitPos - (1 - this.EDGE_ZONE)) / this.EDGE_ZONE);
      }
    }
    if (hitFace === "front") {
      if (isApproachingFromLeft) {
        this.ball.x = this.paddle.x - this.ball.getSize();
      } else {
        this.ball.x = this.paddle.x + this.paddle.paddleWidth + this.ball.getSize();
      }
    }
    return { collided: true, hitFace, deflectionModifier };
  }
  // =========================================
  // Private Methods
  // =========================================
  isStationary() {
    return this.ball.dx === 0 && this.ball.dy === 0;
  }
  getBallBoundingBox() {
    const ballSize = this.ball.getSize();
    return {
      left: this.ball.x - ballSize,
      right: this.ball.x + ballSize,
      top: this.ball.y - ballSize,
      bottom: this.ball.y + ballSize
    };
  }
  getPaddleBoundingBox() {
    return {
      left: this.paddle.x,
      right: this.paddle.x + this.paddle.paddleWidth,
      top: this.paddle.y,
      bottom: this.paddle.y + this.paddle.paddleHeight
    };
  }
  doBoxesIntersect(box1, box2) {
    return box1.right >= box2.left && box1.left <= box2.right && box1.bottom >= box2.top && box1.top <= box2.bottom;
  }
}
class Player {
  // =========================================
  // Constructor
  // =========================================
  constructor(x, y, ball, context) {
    // =========================================
    // Protected Properties
    // =========================================
    __publicField(this, "direction", null);
    __publicField(this, "speed", 5);
    __publicField(this, "colour", COLORS.PADDLE);
    __publicField(this, "score", 0);
    __publicField(this, "startX");
    __publicField(this, "startY");
    __publicField(this, "hitbox");
    __publicField(this, "upPressed", false);
    __publicField(this, "downPressed", false);
    // =========================================
    // Public Properties
    // =========================================
    __publicField(this, "paddleWidth", 10);
    __publicField(this, "paddleHeight", 100);
    __publicField(this, "name", "Human Player");
    this.x = x;
    this.y = y;
    this.ball = ball;
    this.context = context;
    this.startX = x;
    this.startY = context.canvas.height / 2 - this.paddleHeight / 2;
    this.y = this.startY;
    this.hitbox = new PaddleHitbox(this, ball);
    this.updateSizes();
  }
  // =========================================
  // Public API
  // =========================================
  getScore() {
    return this.score;
  }
  givePoint() {
    this.score += 1;
  }
  resetScore() {
    this.score = 0;
  }
  stopMovement() {
    this.direction = null;
  }
  resetPosition() {
    const height = this.context.canvas.height;
    this.y = height / 2 - this.paddleHeight / 2;
  }
  // =========================================
  // Size Management
  // =========================================
  updateSizes() {
    if (!this.context) return;
    const { width, height } = this.context.canvas;
    const sizes = calculateGameSizes(width, height);
    this.paddleWidth = sizes.PADDLE_WIDTH;
    this.paddleHeight = sizes.PADDLE_HEIGHT;
    this.speed = sizes.PADDLE_SPEED;
    this.updateHorizontalPosition(this.context);
  }
  // =========================================
  // Game Loop Methods
  // =========================================
  update(ctx, deltaTime, state) {
    const { width, height } = ctx.canvas;
    const sizes = calculateGameSizes(width, height);
    this.paddleHeight = sizes.PADDLE_HEIGHT;
    if (state === GameState.PLAYING) {
      this.updateMovement(deltaTime);
    }
    this.updateHorizontalPosition(ctx);
    this.checkBallCollision();
  }
  draw(ctx) {
    ctx.fillStyle = this.colour;
    ctx.fillRect(this.x, this.y, this.paddleWidth, this.paddleHeight);
  }
  // =========================================
  // Protected Methods
  // =========================================
  updateHorizontalPosition(ctx) {
    const { width } = ctx.canvas;
    const sizes = calculateGameSizes(width, ctx.canvas.height);
    const isRightPlayer = this.startX > width / 2;
    this.x = isRightPlayer ? width - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH) : sizes.PLAYER_PADDING;
  }
  updateMovement(deltaTime) {
    if (this.direction === null) return;
    const frameSpeed = this.speed * GAME_CONFIG.FPS * deltaTime;
    const newY = this.direction === Direction.UP ? this.y - frameSpeed : this.y + frameSpeed;
    const maxY = this.context.canvas.height - this.paddleHeight;
    this.y = Math.min(Math.max(0, newY), maxY);
  }
  updateDirection() {
    if (this.upPressed && this.downPressed) {
      this.direction = null;
    } else if (this.upPressed) {
      this.direction = Direction.UP;
    } else if (this.downPressed) {
      this.direction = Direction.DOWN;
    } else {
      this.direction = null;
    }
  }
  checkBallCollision() {
    const collision = this.hitbox.checkCollision();
    if (collision.collided) {
      this.ball.hit(collision.hitFace, collision.deflectionModifier);
    }
  }
}
class PlayerLeft extends Player {
  constructor() {
    super(...arguments);
    __publicField(this, "name", "Player 1");
    // =========================================
    // Event Handlers
    // =========================================
    __publicField(this, "handleKeydown", (evt) => {
      switch (evt.code) {
        case KEYS.PLAYER_LEFT_UP:
          this.upPressed = true;
          break;
        case KEYS.PLAYER_LEFT_DOWN:
          this.downPressed = true;
          break;
      }
      this.updateDirection();
    });
    __publicField(this, "handleKeyup", (evt) => {
      switch (evt.code) {
        case KEYS.PLAYER_LEFT_UP:
          this.upPressed = false;
          break;
        case KEYS.PLAYER_LEFT_DOWN:
          this.downPressed = false;
          break;
      }
      this.updateDirection();
    });
  }
  // =========================================
  // Public Methods
  // =========================================
  bind() {
    window.addEventListener("keydown", this.handleKeydown);
    window.addEventListener("keyup", this.handleKeyup);
  }
  unbind() {
    this.upPressed = false;
    this.downPressed = false;
    this.direction = null;
    window.removeEventListener("keydown", this.handleKeydown);
    window.removeEventListener("keyup", this.handleKeyup);
  }
  // Override update to ensure direction is always current
  update(ctx, deltaTime, state) {
    this.updateDirection();
    super.update(ctx, deltaTime, state);
  }
}
class PlayerRight extends Player {
  constructor() {
    super(...arguments);
    // =========================================
    // Properties
    // =========================================
    __publicField(this, "name", "Computer");
    __publicField(this, "isAIControlled", true);
  }
  // =========================================
  // Game Loop Methods
  // =========================================
  update(ctx, deltaTime, state) {
    if (this.isAIControlled && state === GameState.PLAYING) {
      this.updateAIInputs(ctx);
    }
    this.updateDirection();
    super.update(ctx, deltaTime, state);
  }
  // =========================================
  // Protected Methods
  // =========================================
  updateHorizontalPosition(ctx) {
    const width = ctx.canvas.width;
    const sizes = calculateGameSizes(width, ctx.canvas.height);
    this.x = width - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH);
    this.paddleWidth = sizes.PADDLE_WIDTH;
  }
  // =========================================
  // AI Control Methods
  // =========================================
  updateAIInputs(ctx) {
    const paddleCenter = this.y + this.paddleHeight / 2;
    const centerY = ctx.canvas.height / 2 - this.paddleHeight / 2;
    if (this.ball.dx === 0 && this.ball.dy === 0) {
      this.upPressed = false;
      this.downPressed = false;
      return;
    }
    if (this.ball.dx <= 0) {
      this.simulateAIReturn(centerY);
    } else {
      this.simulateAIFollow(paddleCenter);
    }
  }
  simulateAIReturn(centerY) {
    const deadzone = this.speed / 2;
    if (Math.abs(this.y - centerY) < deadzone) {
      this.upPressed = false;
      this.downPressed = false;
    } else {
      this.upPressed = this.y > centerY;
      this.downPressed = this.y < centerY;
    }
  }
  simulateAIFollow(paddleCenter) {
    const deadzone = this.speed / 2;
    if (Math.abs(this.ball.y - paddleCenter) < deadzone) {
      this.upPressed = false;
      this.downPressed = false;
    } else {
      this.upPressed = this.ball.y < paddleCenter;
      this.downPressed = this.ball.y > paddleCenter;
    }
  }
  // =========================================
  // Control Mode Methods
  // =========================================
  setAIControl(enabled) {
    this.isAIControlled = enabled;
    this.upPressed = false;
    this.downPressed = false;
  }
}
class MainScene extends Scene {
  // =========================================
  // Constructor
  // =========================================
  constructor(context) {
    super(context);
    // =========================================
    // Private Properties
    // =========================================
    __publicField(this, "ball");
    __publicField(this, "player1");
    __publicField(this, "player2");
    __publicField(this, "winningScore", GAME_CONFIG.WINNING_SCORE);
    __publicField(this, "objectsInScene", []);
    __publicField(this, "pauseManager");
    __publicField(this, "resizeManager", null);
    __publicField(this, "lastTime", 0);
    __publicField(this, "countdownText", null);
    this.context = context;
    this.setupScene();
    this.lastTime = performance.now();
  }
  // =========================================
  // Lifecycle Methods
  // =========================================
  load() {
    this.player1.bind();
    this.pauseManager.startGame();
  }
  unload() {
    this.player1.unbind();
    this.objectsInScene = [];
    this.ball = null;
    this.player1 = null;
    this.player2 = null;
    if (this.pauseManager) {
      this.pauseManager.forceStop();
      this.pauseManager = null;
    }
    this.countdownText = null;
    this.lastTime = 0;
    super.unload();
  }
  update() {
    if (this.shouldSkipUpdate()) return;
    const deltaTime = this.calculateDeltaTime();
    this.updateGameState(deltaTime);
    this.checkWinCondition();
  }
  // =========================================
  // Protected Methods
  // =========================================
  drawContent() {
    this.drawGameElements();
    this.drawUI();
  }
  drawBackground() {
    const { width, height } = this.context.canvas;
    this.context.fillStyle = COLORS.GAME_BACKGROUND;
    this.context.fillRect(0, 0, width, height);
    this.context.beginPath();
    this.context.strokeStyle = COLORS.PITCH;
    this.context.setLineDash([5, 15]);
    this.context.moveTo(width / 2, 0);
    this.context.lineTo(width / 2, height);
    this.context.stroke();
    this.context.closePath();
  }
  // =========================================
  // Public Methods
  // =========================================
  handlePause() {
    this.pauseManager.pause();
  }
  handleResume() {
    this.pauseManager.resume();
  }
  getPauseManager() {
    return this.pauseManager;
  }
  // =========================================
  // Private Setup Methods
  // =========================================
  setupScene() {
    const { width, height } = this.context.canvas;
    this.createGameObjects(width, height);
    this.objectsInScene = [this.player1, this.player2, this.ball];
    this.initializePauseManager();
    this.initializeResizeManager();
  }
  initializePauseManager() {
    this.pauseManager = new PauseManager(this.ball, this.player1, this.player2);
    this.pauseManager.setCountdownCallback((text) => {
      this.countdownText = text;
    });
  }
  initializeResizeManager() {
    this.resizeManager = new ResizeManager(
      this.context,
      this,
      this.ball,
      this.player1,
      this.player2,
      this.pauseManager
    );
  }
  createGameObjects(width, height) {
    const centerH = width / 2;
    this.ball = new Ball(centerH, height / 2, this.context);
    this.createPlayers(width);
  }
  createPlayers(width) {
    const sizes = calculateGameSizes(width, this.context.canvas.height);
    const height = this.context.canvas.height;
    const centerPaddleY = height / 2 - sizes.PADDLE_HEIGHT / 2;
    this.player1 = new PlayerLeft(
      sizes.PLAYER_PADDING,
      centerPaddleY,
      this.ball,
      this.context
    );
    const player2X = width - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH);
    this.player2 = new PlayerRight(
      player2X,
      centerPaddleY,
      this.ball,
      this.context
    );
  }
  // =========================================
  // Private Update Methods
  // =========================================
  shouldSkipUpdate() {
    return this.pauseManager.hasState(GameState.PAUSED);
  }
  calculateDeltaTime() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1e3;
    this.lastTime = currentTime;
    return deltaTime;
  }
  updateGameState(deltaTime) {
    this.pauseManager.update();
    this.handleBallDestruction();
    this.updateGameObjects(deltaTime);
  }
  handleBallDestruction() {
    if (!this.ball.isDestroyed()) return;
    if (this.ball.isHitLeftBorder()) {
      this.player2.givePoint();
    } else {
      this.player1.givePoint();
    }
    this.ball.restart();
    this.player1.resetPosition();
    this.player2.resetPosition();
    this.pauseManager.handlePointScored();
    this.pauseManager.startGame();
  }
  updateGameObjects(deltaTime) {
    const currentState = this.pauseManager.hasState(GameState.PLAYING) ? GameState.PLAYING : GameState.PAUSED;
    this.objectsInScene.forEach(
      (object) => object.update(this.context, deltaTime, currentState)
    );
  }
  checkWinCondition() {
    if (this.player1.getScore() >= this.winningScore) {
      this.gameContext.loadScene(new EndScene(this.context), { winner: this.player1 });
    } else if (this.player2.getScore() >= this.winningScore) {
      this.gameContext.loadScene(new EndScene(this.context), { winner: this.player2 });
    }
  }
  // =========================================
  // Private Drawing Methods
  // =========================================
  drawGameElements() {
    this.objectsInScene.forEach((object) => object.draw(this.context));
    this.drawScores();
  }
  drawScores() {
    const { width, height } = this.context.canvas;
    const sizes = calculateFontSizes(width, height);
    this.context.font = `${sizes.SCORE_SIZE} ${FONTS.FAMILIES.SCORE}`;
    this.context.fillStyle = COLORS.SCORE;
    this.context.fillText(this.player1.getScore().toString(), width / 4, height / 2);
    this.context.fillText(this.player2.getScore().toString(), 3 * (width / 4), height / 2);
  }
  drawUI() {
    if (this.pauseManager.hasState(GameState.PAUSED)) {
      this.drawPauseOverlay();
    }
    if (this.shouldDrawCountdown()) {
      this.drawCountdown();
    }
  }
  shouldDrawCountdown() {
    return this.countdownText !== null && (this.pauseManager.hasState(GameState.COUNTDOWN) || this.pauseManager.hasState(GameState.PAUSED));
  }
  drawPauseOverlay() {
    const { width, height } = this.context.canvas;
    this.context.fillStyle = COLORS.OVERLAY;
    this.context.fillRect(0, 0, width, height);
  }
  drawCountdown() {
    if (this.countdownText === null) return;
    const { width, height } = this.context.canvas;
    const sizes = calculateFontSizes(width, height);
    this.context.fillStyle = UI_CONFIG.TEXT.COLOR;
    this.context.textAlign = UI_CONFIG.TEXT.ALIGN;
    if (Array.isArray(this.countdownText)) {
      this.context.font = `${sizes.PAUSE_SIZE} ${FONTS.FAMILIES.PAUSE}`;
      const pausePos = this.getTextPosition(0, 2);
      this.context.fillText(this.countdownText[0], pausePos.x, pausePos.y);
      this.context.font = `${sizes.RESUME_PROMPT_SIZE} ${FONTS.FAMILIES.PAUSE}`;
      const promptPos = this.getTextPosition(1, 2);
      this.context.fillText(this.countdownText[1], promptPos.x, promptPos.y);
    } else {
      const isNumber = typeof this.countdownText === "number";
      this.context.font = `${sizes.COUNTDOWN_SIZE} ${FONTS.FAMILIES.COUNTDOWN}`;
      if (isNumber) {
        const pos = this.getTextPosition(0, 1);
        const textToDisplay = this.countdownText.toString();
        this.context.strokeStyle = UI_CONFIG.TEXT.STROKE.COLOR;
        this.context.lineWidth = UI_CONFIG.TEXT.STROKE.WIDTH;
        this.context.strokeText(textToDisplay, pos.x, pos.y);
        this.context.fillText(textToDisplay, pos.x, pos.y);
      }
    }
  }
}
class MenuScene extends Scene {
  constructor() {
    super(...arguments);
    // =========================================
    // Protected Properties
    // =========================================
    __publicField(this, "resizeManager", null);
    // =========================================
    // Event Handlers
    // =========================================
    __publicField(this, "handleClick", () => {
      this.gameContext.loadScene(new MainScene(this.context));
    });
  }
  // =========================================
  // Lifecycle Methods
  // =========================================
  load() {
    super.load();
    this.context.canvas.addEventListener("click", this.handleClick);
    this.resizeManager = new ResizeManager(
      this.context,
      this,
      null,
      null,
      null,
      null
    );
  }
  unload() {
    this.context.canvas.removeEventListener("click", this.handleClick);
    if (this.resizeManager) {
      this.resizeManager.cleanup();
    }
    super.unload();
  }
  // =========================================
  // Protected Methods
  // =========================================
  drawContent() {
    this.drawTitle();
    this.drawSubtitle();
  }
  drawTitle() {
    const { width, height } = this.context.canvas;
    const sizes = calculateFontSizes(width, height);
    this.context.font = `${sizes.TITLE_SIZE} ${FONTS.FAMILIES.TITLE}`;
    this.context.fillStyle = COLORS.TITLE;
    this.context.textAlign = UI_CONFIG.TEXT.ALIGN;
    const pos = this.getTextPosition(0, 2);
    this.context.fillText(MESSAGES.GAME_TITLE, pos.x, pos.y);
  }
  drawSubtitle() {
    const { width, height } = this.context.canvas;
    const sizes = calculateFontSizes(width, height);
    this.context.font = `${sizes.SUBTITLE_SIZE} ${FONTS.FAMILIES.SUBTITLE}`;
    const pos = this.getTextPosition(1, 2);
    this.context.fillText(MESSAGES.GAME_SUBTITLE, pos.x, pos.y);
  }
}
class EndScene extends Scene {
  constructor() {
    super(...arguments);
    // =========================================
    // Private Properties
    // =========================================
    __publicField(this, "winner");
    __publicField(this, "resizeManager", null);
    // =========================================
    // Event Handlers
    // =========================================
    __publicField(this, "handleClick", () => {
      this.gameContext.loadScene(new MenuScene(this.context));
    });
  }
  // =========================================
  // Lifecycle Methods
  // =========================================
  load(params) {
    this.winner = params.winner;
    this.context.canvas.addEventListener("click", this.handleClick);
    this.resizeManager = new ResizeManager(
      this.context,
      this,
      null,
      null,
      null,
      null
    );
  }
  unload() {
    this.context.canvas.removeEventListener("click", this.handleClick);
    if (this.resizeManager) {
      this.resizeManager.cleanup();
    }
    super.unload();
  }
  // =========================================
  // Protected Methods
  // =========================================
  drawContent() {
    this.drawGameOver();
    this.drawReturnPrompt();
  }
  // =========================================
  // Private Methods
  // =========================================
  drawGameOver() {
    const { width, height } = this.context.canvas;
    const sizes = calculateFontSizes(width, height);
    this.context.font = `${sizes.TITLE_SIZE} ${FONTS.FAMILIES.TITLE}`;
    this.context.fillStyle = COLORS.TITLE;
    this.context.textAlign = UI_CONFIG.TEXT.ALIGN;
    const messages = MESSAGES.GAME_OVER(this.winner.name);
    messages.forEach((message, index) => {
      const pos = this.getTextPosition(index, messages.length + 1);
      this.context.fillText(message, pos.x, pos.y);
    });
  }
  drawReturnPrompt() {
    const { width, height } = this.context.canvas;
    const sizes = calculateFontSizes(width, height);
    this.context.font = `${sizes.SUBTITLE_SIZE} ${FONTS.FAMILIES.SUBTITLE}`;
    const messages = MESSAGES.GAME_OVER(this.winner.name);
    const pos = this.getTextPosition(messages.length, messages.length + 1);
    this.context.fillText(MESSAGES.RETURN_TO_MENU, pos.x, pos.y);
  }
}
class GameEngine {
  // =========================================
  // Lifecycle
  // =========================================
  constructor(ctx) {
    // =========================================
    // Properties
    // =========================================
    __publicField(this, "scene");
    __publicField(this, "context");
    this.context = ctx;
    this.initializeGame();
  }
  initializeGame() {
    const menu = new MenuScene(this.context);
    this.loadScene(menu);
    this.bindPauseControls();
  }
  // =========================================
  // Scene Management
  // =========================================
  loadScene(newScene, params = {}) {
    if (this.scene) {
      this.scene.unload();
    }
    this.scene = newScene;
    this.scene.setGameContext(this);
    this.scene.load(params);
  }
  getScene() {
    return this.scene;
  }
  // =========================================
  // Game Loop
  // =========================================
  draw() {
    this.clearScreen();
    this.scene.draw();
  }
  update() {
    var _a, _b;
    if (this.isGamePaused()) {
      return;
    }
    (_b = (_a = this.scene).update) == null ? void 0 : _b.call(_a);
  }
  // =========================================
  // Pause Management
  // =========================================
  bindPauseControls() {
    window.addEventListener("keydown", (evt) => {
      if (evt.code === KEYS.ENTER || evt.code === KEYS.ESC) {
        this.togglePause();
      }
    });
  }
  togglePause() {
    if (!(this.scene instanceof MainScene)) {
      return;
    }
    const mainScene = this.scene;
    const resizeManager = mainScene.getResizeManager();
    if (resizeManager == null ? void 0 : resizeManager.isCurrentlyResizing()) {
      return;
    }
    const pauseManager = mainScene.getPauseManager();
    if (pauseManager.hasState(GameState.PLAYING)) {
      mainScene.handlePause();
    } else if (pauseManager.hasState(GameState.PAUSED)) {
      mainScene.handleResume();
    }
  }
  isGamePaused() {
    if (!(this.scene instanceof MainScene)) {
      return false;
    }
    return this.scene.getPauseManager().hasState(GameState.PAUSED);
  }
  // =========================================
  // Private Rendering Methods
  // =========================================
  clearScreen() {
    const { width, height } = this.context.canvas;
    this.context.beginPath();
    this.context.clearRect(0, 0, width, height);
    this.context.closePath();
  }
  cleanup() {
    if (this.scene) {
      this.scene.unload();
      this.scene = null;
    }
    this.context = null;
  }
}
class PauseManager {
  // =========================================
  // Constructor
  // =========================================
  constructor(ball, player1, player2) {
    // =========================================
    // Private Properties
    // =========================================
    __publicField(this, "ball");
    __publicField(this, "player1");
    __publicField(this, "player2");
    __publicField(this, "states", /* @__PURE__ */ new Set([GameState.PAUSED]));
    __publicField(this, "isCountingDown", false);
    __publicField(this, "isFirstStart", true);
    __publicField(this, "countInterval", null);
    __publicField(this, "gameSnapshot", null);
    __publicField(this, "countdownCallback", null);
    this.ball = ball;
    this.player1 = player1;
    this.player2 = player2;
    this.states.clear();
    this.states.add(GameState.PAUSED);
    this.isFirstStart = true;
  }
  // =========================================
  // Public API
  // =========================================
  setCountdownCallback(callback) {
    this.countdownCallback = callback;
  }
  startGame() {
    this.states.clear();
    this.states.add(GameState.COUNTDOWN);
    this.startCountdown(() => {
      var _a;
      this.ball.launchBall();
      this.states.delete(GameState.COUNTDOWN);
      this.states.add(GameState.PLAYING);
      this.isFirstStart = false;
      (_a = this.countdownCallback) == null ? void 0 : _a.call(this, null);
    });
  }
  pause() {
    if (this.states.has(GameState.PAUSED)) {
      return;
    }
    if (this.states.has(GameState.COUNTDOWN)) {
      this.handleCountdownPause();
      return;
    }
    if (this.states.has(GameState.PLAYING)) {
      this.handleGamePause();
    }
  }
  resume() {
    if (!this.states.has(GameState.PAUSED)) return;
    if (this.states.has(GameState.COUNTDOWN)) {
      this.states.delete(GameState.PAUSED);
      return;
    }
    if (this.isFirstStart) {
      this.startGame();
      return;
    }
    this.states.delete(GameState.PAUSED);
    this.states.add(GameState.COUNTDOWN);
    this.startCountdown(() => {
      this.restoreGameState();
      this.states.delete(GameState.COUNTDOWN);
      this.states.add(GameState.PLAYING);
    });
  }
  update() {
    if (this.isCountingDown || this.states.has(GameState.PAUSED)) {
      this.player1.stopMovement();
      this.player2.stopMovement();
      if (this.gameSnapshot) {
        const { width, height } = this.ball.getContext().canvas;
        this.ball.x = width * this.gameSnapshot.ballState.position.x;
        this.ball.y = height * this.gameSnapshot.ballState.position.y;
        this.player1.y = this.gameSnapshot.player1RelativeY * height - this.player1.paddleHeight / 2;
        this.player2.y = this.gameSnapshot.player2RelativeY * height - this.player2.paddleHeight / 2;
      }
    }
  }
  forceStop() {
    this.cleanupCountdown();
    this.resetToPostPoint();
  }
  handlePointScored() {
    this.states.clear();
    this.states.add(GameState.PAUSED);
    this.gameSnapshot = null;
  }
  // =========================================
  // State Management
  // =========================================
  hasState(state) {
    return this.states.has(state);
  }
  getStates() {
    return new Set(this.states);
  }
  canCombineStates(state1, state2) {
    if (this.areStatesExclusive(state1, state2)) return false;
    if (this.isPostPointState(state1, state2)) {
      return state1 === GameState.PAUSED || state2 === GameState.PAUSED;
    }
    return true;
  }
  isStateActive(state) {
    return this.states.has(state);
  }
  // =========================================
  // Game State Management
  // =========================================
  updateSavedState() {
    if (!this.gameSnapshot) return;
    this.gameSnapshot.ballState = this.ball.saveState();
  }
  updateSavedPositions() {
    if (!this.gameSnapshot) return;
    const canvas = this.ball.getContext().canvas;
    const relativeX = this.ball.x / canvas.width;
    const relativeY = this.ball.y / canvas.height;
    this.gameSnapshot.ballState.position = {
      x: relativeX,
      y: relativeY
    };
    const { dx, dy } = this.getNormalizedVelocity();
    this.gameSnapshot.ballState.velocity = {
      dx,
      dy
    };
  }
  // =========================================
  // Private Helper Methods
  // =========================================
  saveGameState() {
    const canvas = this.ball.getContext().canvas;
    const p1Center = (this.player1.y + this.player1.paddleHeight / 2) / canvas.height;
    const p2Center = (this.player2.y + this.player2.paddleHeight / 2) / canvas.height;
    this.gameSnapshot = {
      ballState: this.ball.saveState(),
      player1RelativeY: p1Center,
      player2RelativeY: p2Center
    };
  }
  restoreGameState() {
    if (!this.gameSnapshot) return;
    this.ball.restoreState(this.gameSnapshot.ballState);
  }
  startCountdown(onComplete) {
    var _a;
    if (this.isCountingDown) return;
    this.isCountingDown = true;
    let count = 3;
    (_a = this.countdownCallback) == null ? void 0 : _a.call(this, count);
    this.countInterval = setInterval(() => {
      var _a2, _b;
      count--;
      if (count > 0) {
        (_a2 = this.countdownCallback) == null ? void 0 : _a2.call(this, count);
      } else {
        (_b = this.countdownCallback) == null ? void 0 : _b.call(this, null);
        this.cleanupCountdown();
        onComplete();
      }
    }, 1e3);
  }
  cleanupCountdown() {
    if (this.countInterval) {
      clearInterval(this.countInterval);
      this.countInterval = null;
    }
    this.isCountingDown = false;
  }
  resetToPostPoint() {
    var _a;
    this.gameSnapshot = null;
    this.states.clear();
    this.states.add(GameState.PAUSED);
    (_a = this.countdownCallback) == null ? void 0 : _a.call(this, null);
  }
  handleCountdownPause() {
    this.cancelCountdown();
    this.states.add(GameState.PAUSED);
  }
  handleGamePause() {
    var _a;
    this.saveGameState();
    this.ball.dx = 0;
    this.ball.dy = 0;
    this.states.delete(GameState.PLAYING);
    this.states.add(GameState.PAUSED);
    (_a = this.countdownCallback) == null ? void 0 : _a.call(this, [MESSAGES.PAUSED, MESSAGES.RESUME_PROMPT]);
  }
  cancelCountdown() {
    this.cleanupCountdown();
    this.states.delete(GameState.COUNTDOWN);
    if (this.isFirstStart) {
      this.states.add(GameState.PAUSED);
    }
  }
  areStatesExclusive(state1, state2) {
    return state1 === GameState.PLAYING && state2 === GameState.COUNTDOWN || state1 === GameState.COUNTDOWN && state2 === GameState.PLAYING;
  }
  isPostPointState(state1, state2) {
    return state1 === GameState.PAUSED || state2 === GameState.PAUSED;
  }
  getNormalizedVelocity() {
    const magnitude = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
    if (magnitude === 0) {
      return { dx: 0, dy: 0 };
    }
    return {
      dx: this.ball.dx / magnitude,
      dy: this.ball.dy / magnitude
    };
  }
  getGameSnapshot() {
    return this.gameSnapshot;
  }
  maintainCountdownState() {
    if (this.states.has(GameState.COUNTDOWN)) {
      const canvas = this.ball.getContext().canvas;
      if (this.isFirstStart || !this.gameSnapshot) {
        this.ball.x = canvas.width / 2;
        this.ball.y = canvas.height / 2;
        this.ball.dx = 0;
        this.ball.dy = 0;
        this.player1.y = canvas.height / 2 - this.player1.paddleHeight / 2;
        this.player2.y = canvas.height / 2 - this.player2.paddleHeight / 2;
      } else {
        this.ball.restoreState(this.gameSnapshot.ballState);
      }
    }
  }
  cleanup() {
    this.cleanupCountdown();
    this.ball = null;
    this.player1 = null;
    this.player2 = null;
    this.countdownCallback = null;
    this.gameSnapshot = null;
    this.states.clear();
  }
}
class ResizeManager {
  // =========================================
  // Constructor
  // =========================================
  constructor(ctx, scene, ball, player1, player2, pauseManager) {
    // =========================================
    // Private Properties
    // =========================================
    __publicField(this, "resizeTimeout", null);
    __publicField(this, "isResizing", false);
    __publicField(this, "context");
    __publicField(this, "scene");
    __publicField(this, "ball");
    __publicField(this, "player1");
    __publicField(this, "player2");
    __publicField(this, "pauseManager");
    __publicField(this, "boundResizeHandler");
    this.context = ctx;
    this.scene = scene;
    this.ball = ball;
    this.player1 = player1;
    this.player2 = player2;
    this.pauseManager = pauseManager;
    this.boundResizeHandler = this.handleResize.bind(this);
    this.setupResizeHandler();
  }
  // =========================================
  // Public Methods
  // =========================================
  isCurrentlyResizing() {
    return this.isResizing;
  }
  cleanup() {
    if (this.resizeTimeout) {
      window.clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
    window.removeEventListener("resize", this.boundResizeHandler);
    this.context = null;
    this.scene = null;
    this.ball = null;
    this.player1 = null;
    this.player2 = null;
    this.pauseManager = null;
    this.boundResizeHandler = null;
  }
  // =========================================
  // Private Methods
  // =========================================
  setupResizeHandler() {
    window.addEventListener("resize", this.boundResizeHandler);
  }
  handleResize() {
    var _a;
    if (this.resizeTimeout) {
      window.clearTimeout(this.resizeTimeout);
    }
    this.isResizing = true;
    const wasPlaying = ((_a = this.pauseManager) == null ? void 0 : _a.hasState(GameState.PLAYING)) ?? false;
    if (wasPlaying && this.pauseManager) {
      this.pauseManager.pause();
    }
    requestAnimationFrame(() => {
      if (this.isGameScene()) {
        this.handleGameSceneResize();
      } else {
        this.handleMenuSceneResize();
      }
      this.resizeTimeout = window.setTimeout(() => {
        this.isResizing = false;
        if (wasPlaying && this.pauseManager) {
          this.pauseManager.resume();
        }
      }, 150);
    });
  }
  handleGameSceneResize() {
    const pauseManager = this.pauseManager;
    if (!pauseManager) return;
    const wasPlaying = pauseManager.hasState(GameState.PLAYING);
    const wasInCountdown = pauseManager.hasState(GameState.COUNTDOWN);
    if (wasPlaying) {
      pauseManager.pause();
      this.updateGameObjects();
      this.resizeTimeout = window.setTimeout(() => {
        this.isResizing = false;
        pauseManager.resume();
      }, 150);
    } else if (wasInCountdown) {
      this.updateGameObjects();
      pauseManager.maintainCountdownState();
    } else {
      this.updateGameObjects();
    }
  }
  handleMenuSceneResize() {
    this.updateCanvasSize();
    this.scene.draw();
  }
  updateGameObjects() {
    var _a;
    const wasPlaying = ((_a = this.pauseManager) == null ? void 0 : _a.hasState(GameState.PLAYING)) ?? false;
    if (wasPlaying && this.pauseManager) {
      this.pauseManager.pause();
    }
    this.updateCanvasSize();
    const { width: newWidth, height: newHeight } = this.context.canvas;
    const sizes = calculateGameSizes(newWidth, newHeight);
    this.updatePaddles(sizes, newWidth, newHeight);
    this.updateBall(newWidth, newHeight);
    if (wasPlaying && this.pauseManager) {
      this.pauseManager.resume();
    }
  }
  updatePaddles(sizes, newWidth, newHeight) {
    if (!this.player1 || !this.player2 || !this.pauseManager) return;
    const gameSnapshot = this.pauseManager.getGameSnapshot();
    if (gameSnapshot) {
      this.player1.y = gameSnapshot.player1RelativeY * newHeight - this.player1.paddleHeight / 2;
      this.player2.y = gameSnapshot.player2RelativeY * newHeight - this.player2.paddleHeight / 2;
    } else {
      const currentHeight = this.context.canvas.height;
      const p1Center = (this.player1.y + this.player1.paddleHeight / 2) / currentHeight;
      const p2Center = (this.player2.y + this.player2.paddleHeight / 2) / currentHeight;
      this.player1.y = p1Center * newHeight - this.player1.paddleHeight / 2;
      this.player2.y = p2Center * newHeight - this.player2.paddleHeight / 2;
    }
    this.player1.updateSizes();
    this.player2.updateSizes();
    this.player1.x = sizes.PLAYER_PADDING;
    this.player2.x = newWidth - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH);
    const maxY = newHeight - this.player1.paddleHeight;
    this.player1.y = Math.min(Math.max(this.player1.y, 0), maxY);
    this.player2.y = Math.min(Math.max(this.player2.y, 0), maxY);
    if (gameSnapshot) {
      gameSnapshot.player1RelativeY = (this.player1.y + this.player1.paddleHeight / 2) / newHeight;
      gameSnapshot.player2RelativeY = (this.player2.y + this.player2.paddleHeight / 2) / newHeight;
    }
  }
  updateBall(newWidth, newHeight) {
    if (!this.ball || !this.pauseManager) return;
    const gameSnapshot = this.pauseManager.getGameSnapshot();
    if (gameSnapshot) {
      this.ball.updateSizes();
      this.ball.restoreState(gameSnapshot.ballState, newWidth, newHeight);
    } else {
      const state = this.ball.saveState();
      this.ball.updateSizes();
      this.ball.restoreState(state, newWidth, newHeight);
    }
  }
  updateCanvasSize() {
    const targetWidth = window.innerWidth;
    const targetHeight = window.innerHeight;
    if (this.context.canvas.width !== targetWidth || this.context.canvas.height !== targetHeight) {
      const contextProps = {
        fillStyle: this.context.fillStyle,
        strokeStyle: this.context.strokeStyle,
        lineWidth: this.context.lineWidth,
        font: this.context.font,
        textAlign: this.context.textAlign,
        textBaseline: this.context.textBaseline,
        globalAlpha: this.context.globalAlpha
      };
      this.context.canvas.width = targetWidth;
      this.context.canvas.height = targetHeight;
      Object.assign(this.context, contextProps);
      this.scene.draw();
    }
  }
  isGameScene() {
    return !!(this.ball && this.player1 && this.player2 && this.pauseManager);
  }
}
function initializeGame() {
  const canvas = document.getElementById("game-canvas");
  const context = canvas.getContext("2d");
  return new GameEngine(context);
}
function startGameLoop(game) {
  setInterval(() => {
    game.update();
  }, 1e3 / GAME_CONFIG.FPS);
  function render() {
    game.draw();
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}
document.addEventListener("DOMContentLoaded", () => {
  const game = initializeGame();
  startGameLoop(game);
  window.addEventListener("unload", () => {
    game.cleanup();
  });
});
