// =========================================
// Core Game Types
// =========================================
/**
 * Canvas context used for rendering game elements
 */
export type GameContext = CanvasRenderingContext2D;

/**
 * Base interface for all drawable and updatable game elements
 */
export interface GraphicalElement {
	draw(ctx: GameContext): void;
	update(ctx: GameContext, deltaTime: number, state: GameState): void;
}

// =========================================
// Game States & Enums
// =========================================
/**
 * Represents movement directions within the game
 */
export enum Direction {
	UP,
	DOWN
}

/**
 * Represents possible game states
 */
export enum GameState {
	PLAYING = 'PLAYING',
	PAUSED = 'PAUSED',
	COUNTDOWN = 'COUNTDOWN'
}

/**
 * Represents player positions on the screen
 */
export enum PlayerPosition {
	LEFT = 'LEFT',
	RIGHT = 'RIGHT'
}

/**
 * Represents player control types
 */
export enum PlayerType {
	HUMAN = 'HUMAN',
	AI = 'AI',
	BACKGROUND = 'BACKGROUND'
}

// =========================================
// Physics & Collision Interfaces
// =========================================
/**
 * Represents the axis-aligned bounding box for collision detection
 */
export interface BoundingBox {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

/**
 * Interface for objects that can collide with other objects
 */
export interface Collidable {
	getBoundingBox(): BoundingBox;
	getVelocity(): { dx: number; dy: number };
	getPosition(): { x: number; y: number };
	getPreviousPosition(): { x: number; y: number };
}

/**
 * Represents the result of a collision detection check
 */
export interface CollisionResult {
	collided: boolean;
	hitFace: 'front' | 'top' | 'bottom';
	deflectionModifier: number;
	collisionPoint?: { x: number; y: number };
}

/**
 * Base interface for objects with physical properties
 */
export interface PhysicsObject {
	x: number;
	y: number;
	getVelocity(): { dx: number; dy: number };
	getPosition(): { x: number; y: number };
}

/**
 * Interface for objects that can be moved and positioned
 */
export interface MovableObject extends PhysicsObject {
	setPosition(x: number, y: number): void;
	updateMovement(deltaTime: number): void;
}

export interface CollisionResult {
	collided: boolean;
	hitFace: 'front' | 'top' | 'bottom';
	deflectionModifier: number;
	collisionPoint?: { x: number; y: number };
	hardBounce?: boolean;
}

// =========================================
// Game Objects
// =========================================
/**
 * Interface for paddle objects
 */
export interface Paddle {
	x: number;
	y: number;
	paddleWidth: number;
	paddleHeight: number;
}

/**
 * Interface for player objects
 */
export interface Player extends GraphicalElement {
	x: number;
	y: number;
	name: string;

	getScore(): number;
	resetScore(): void;
	givePoint(): void;
	updateSizes(): void;
	bindControls(): void;
	unbindControls(): void;
	isAIControlled(): boolean;
	setControlType(type: PlayerType): void;
}

/**
 * Represents the serializable state of a ball
 */
export interface BallState {
	position: { x: number; y: number };
	velocity: { dx: number; dy: number };
	speedMultiplier: number;
}

// =========================================
// Game State Management
// =========================================
/**
 * Information about the current game state
 */
export interface GameStateInfo {
	player1Score: number;
	player2Score: number;
	isGameOver: boolean;
	winner: Player | null;
}

/**
 * Snapshot of game state for pausing/resuming
 */
export interface GameSnapshot {
	ballState: BallState;
	player1RelativeY: number;
	player2RelativeY: number;
}

// =========================================
// Configuration Types
// =========================================
/**
 * Sizes and dimensions for game elements
 */
export interface GameSizes {
	PADDLE_WIDTH: number;
	PADDLE_HEIGHT: number;
	PADDLE_SPEED: number;
	PLAYER_PADDING: number;
	BALL_SIZE: number;
}

/**
 * Parameters for scene initialization
 */
export interface SceneParams {
	winner?: Player;
	[key: string]: any;
}
