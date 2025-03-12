// =========================================
// Core Game Types
// =========================================
export type GameContext = CanvasRenderingContext2D;

export interface GraphicalElement {
	draw(ctx: GameContext): void;
	update(ctx: GameContext, deltaTime: number, state: GameState): void;
}

// =========================================
// Game States & Enums
// =========================================
export enum Direction {
	UP,
	DOWN
}

export enum GameState {
	PLAYING = 'PLAYING',
	PAUSED = 'PAUSED',
	COUNTDOWN = 'COUNTDOWN'
}

export enum PlayerPosition {
	LEFT = 'LEFT',
	RIGHT = 'RIGHT'
}

export enum PlayerType {
	HUMAN = 'HUMAN',
	AI = 'AI'
}

// =========================================
// Game Objects
// =========================================
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

// =========================================
// Configuration Types
// =========================================
export interface GameSizes {
	PADDLE_WIDTH: number;
	PADDLE_HEIGHT: number;
	PADDLE_SPEED: number;
	PLAYER_PADDING: number;
	BALL_SIZE: number;
}

export interface SceneParams {
	winner?: Player;
	[key: string]: any;
}

// =========================================
// Collision Types
// =========================================
export interface Paddle {
	x: number;
	y: number;
	paddleWidth: number;
	paddleHeight: number;
}

export interface BoundingBox {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

export interface CollisionResult {
	collided: boolean;
	hitFace: 'front' | 'top' | 'bottom';
	deflectionModifier: number;
	collisionPoint?: { x: number; y: number };
}

export interface Collidable {
	getBoundingBox(): BoundingBox;
	getVelocity(): { dx: number; dy: number };
	getPosition(): { x: number; y: number };
	getPreviousPosition(): { x: number; y: number };
}

// Add these new interfaces for better separation
export interface PhysicsObject {
	x: number;
	y: number;
	getVelocity(): { dx: number; dy: number };
	getPosition(): { x: number; y: number };
}

export interface MovableObject extends PhysicsObject {
	setPosition(x: number, y: number): void;
	updateMovement(deltaTime: number): void;
}
