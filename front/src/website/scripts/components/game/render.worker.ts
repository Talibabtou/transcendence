// front/src/website/scripts/components/game/render.worker.ts

// Type placeholder - ideally, you'd share types from your main codebase
interface GameConfig {
    FRAME_TIME: number;
    MAX_DELTA_TIME: number;
    MAX_STEPS_PER_FRAME: number;
    // Add other relevant GAME_CONFIG properties here
}

interface SceneData {
    // Define the structure of data you'll send for rendering
    // For example:
    // players: { x: number, y: number, width: number, height: number, color: string }[];
    // ball: { x: number, y: number, radius: number, color: string };
    // scores: { player1: number, player2: number };
    // uiMessages: string[];
    testValue?: number; // Placeholder for initial testing
    canvasWidth?: number; // To inform worker of current canvas dimensions
    canvasHeight?: number;
}

// Updated Config Types to match constants/index.ts structure
interface ColorsConfig {
    GAME_BACKGROUND: string;
    BALL: string;
    PADDLE: string;
    TITLE: string;
    SCORE: string;
    NAMES: string;
    OVERLAY: string;
    // Add any other color properties if they exist and are used
}

interface FontsConfig {
    FAMILIES: {
        TITLE: string;
        SUBTITLE: string;
        SCORE: string;
        COUNTDOWN: string;
        PAUSE: string;
    };
    SIZE_RATIOS: {
        TITLE: number;
        SUBTITLE: number;
        SCORE: number;
        COUNTDOWN: number;
        PAUSE: number;
        RESUME_PROMPT: number;
    };
    MIN_SIZES: {
        TITLE: number;
        SUBTITLE: number;
        SCORE: number;
        COUNTDOWN: number;
        PAUSE: number;
        RESUME_PROMPT: number;
    };
}

interface MessagesConfig {
    GAME_TITLE: string;
    GAME_SUBTITLE: string;
    GAME_OVER: (winnerName: string) => [string, string]; // Function type
    RETURN_TO_MENU: string;
    PAUSED: string;
    RESUME_PROMPT: string;
    GO: string;
}

interface UIConfigTextStroke {
    COLOR: string;
    WIDTH: number;
}
interface UIConfigText {
    ALIGN: CanvasTextAlign;
    COLOR: string;
    STROKE: UIConfigTextStroke;
}
interface UIConfigLayout {
    SUBTITLE_OFFSET: number;
    VERTICAL_SPACING: number;
}
interface UIConfig {
    TEXT: UIConfigText;
    LAYOUT: UIConfigLayout;
}

interface BallRenderData {
    x: number;
    y: number;
    prevRenderX: number;
    prevRenderY: number;
    radius: number;
    color: string;
}

interface PlayerRenderData {
    x: number;
    y: number;
    prevRenderX: number;
    prevRenderY: number;
    width: number;
    height: number;
    color: string;
    name: string;      // For potential future use by worker-side UI rendering
    score: number;     // For potential future use by worker-side UI rendering
}

interface UIRenderData {
    countdownText: string | number | string[] | null;
    isPaused: boolean;
}

interface FullSceneRenderData {
    ball: BallRenderData | null;
    player1: PlayerRenderData | null;
    player2: PlayerRenderData | null;
    ui: UIRenderData;
    isBackgroundDemo: boolean;
}

let offscreenCanvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let gameConfig: GameConfig | null = null; 
let colors: ColorsConfig | null = null;
let fonts: FontsConfig | null = null;
let messages: MessagesConfig | null = null;
let uiConfig: UIConfig | null = null;

// Path2D for ball, similar to Ball.ts
let ballPath: Path2D | null = null;
const UNIT_CIRCLE_RADIUS = 1;

function createBallPathForWorker(): void {
    ballPath = new Path2D();
    ballPath.arc(0, 0, UNIT_CIRCLE_RADIUS, 0, Math.PI * 2);
}

// calculateFontSizesInWorker (as before, but now workerFonts will be correctly typed as FontsConfig)
const calculateFontSizesInWorker = (width: number, height: number, workerFonts: FontsConfig | null) => {
    if (!workerFonts || !workerFonts.SIZE_RATIOS || !workerFonts.MIN_SIZES) {
        console.error("Worker: FONTS constant not available for calculateFontSizesInWorker");
        return { TITLE_SIZE: `24px`, SUBTITLE_SIZE: `14px`, SCORE_SIZE: `24px`, COUNTDOWN_SIZE: `24px`, PAUSE_SIZE: `24px`, RESUME_PROMPT_SIZE: `14px` };
    }
    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);
    const baseSize = (minDimension + maxDimension) * 0.5;
    return {
        TITLE_SIZE: `${Math.max(Math.floor(baseSize * workerFonts.SIZE_RATIOS.TITLE), workerFonts.MIN_SIZES.TITLE)}px`,
        SUBTITLE_SIZE: `${Math.max(Math.floor(baseSize * workerFonts.SIZE_RATIOS.SUBTITLE), workerFonts.MIN_SIZES.SUBTITLE)}px`,
        SCORE_SIZE: `${Math.max(Math.floor(baseSize * workerFonts.SIZE_RATIOS.SCORE), workerFonts.MIN_SIZES.SCORE)}px`,
        COUNTDOWN_SIZE: `${Math.max(Math.floor(baseSize * workerFonts.SIZE_RATIOS.COUNTDOWN), workerFonts.MIN_SIZES.COUNTDOWN)}px`,
        PAUSE_SIZE: `${Math.max(Math.floor(baseSize * workerFonts.SIZE_RATIOS.PAUSE), workerFonts.MIN_SIZES.PAUSE)}px`,
        RESUME_PROMPT_SIZE: `${Math.max(Math.floor(baseSize * workerFonts.SIZE_RATIOS.RESUME_PROMPT), workerFonts.MIN_SIZES.RESUME_PROMPT)}px`
    };
};

// Helper for setting text style in worker
function setWorkerTextStyle(
	drawCtx: OffscreenCanvasRenderingContext2D,
	fontStyle: string, 
	colorStyle: string, 
	align: CanvasTextAlign = 'center', 
	baseline: CanvasTextBaseline = 'middle'
) {
	drawCtx.font = fontStyle;
	drawCtx.fillStyle = colorStyle;
	drawCtx.textAlign = align;
	drawCtx.textBaseline = baseline;
}

// Reusable object for text positioning, similar to UIManager
const _reusableTextPositionWorker = { x: 0, y: 0 };
function getTextPositionInWorker(
	canvasWidth: number, canvasHeight: number, 
	lineIndex: number = 0, totalLines: number = 1, 
	customCenterY?: number, workerUiConfig?: UIConfig | null
): { x: number; y: number } {
	const verticalSpacing = workerUiConfig?.LAYOUT?.VERTICAL_SPACING ?? 0.08;
	const spacing = canvasHeight * verticalSpacing;
	const totalHeight = spacing * (totalLines - 1);
	const centerY = customCenterY !== undefined ? customCenterY : canvasHeight * 0.5;
	const startY = centerY - totalHeight * 0.5;
	
	_reusableTextPositionWorker.x = canvasWidth * 0.5;
	_reusableTextPositionWorker.y = startY + (lineIndex * spacing);
	return _reusableTextPositionWorker;
}

self.onmessage = (event: MessageEvent) => {
    const messageData = event.data;

    if (!messageData || !messageData.type) {
        console.error("Render worker: Received malformed message", event);
        return;
    }

    switch (messageData.type) {
        case 'init':
            try {
                offscreenCanvas = messageData.canvas as OffscreenCanvas;
                gameConfig = messageData.gameConfig as GameConfig;
                colors = messageData.colors as ColorsConfig;
                fonts = messageData.fonts as FontsConfig;
                messages = messageData.messages as MessagesConfig;
                uiConfig = messageData.uiConfig as UIConfig;
                
                if (!offscreenCanvas) throw new Error("Canvas not provided in init message.");
                
                const tempCtx = offscreenCanvas.getContext('2d');
                if (tempCtx) {
                    ctx = tempCtx as OffscreenCanvasRenderingContext2D;
                    createBallPathForWorker(); // Create ball path once context is available
                    self.postMessage({ type: 'worker_initialized', status: 'success' });
                } else {
                    throw new Error("Failed to get OffscreenCanvas context.");
                }
            } catch (e: any) {
                console.error("Render worker initialization error:", e);
                self.postMessage({ type: 'worker_initialized', status: 'error', message: e.message });
            }
            break;

        case 'render':
            if (!ctx || !offscreenCanvas || !colors || !fonts || !messages || !uiConfig) {
                return; 
            }
            
            const sceneRenderData = messageData.sceneData as FullSceneRenderData;
            const alpha = messageData.alpha as number;
            const canvasWidth = messageData.canvasWidth as number;
            const canvasHeight = messageData.canvasHeight as number;

            if (offscreenCanvas.width !== canvasWidth || offscreenCanvas.height !== canvasHeight) {
                offscreenCanvas.width = canvasWidth;
                offscreenCanvas.height = canvasHeight;
            }
            
            // 0. Clear canvas (or fill background if needed)
            // If GAME_BACKGROUND is transparent, clearRect is fine. 
            // Otherwise, fill with GAME_BACKGROUND color.
            if (colors.GAME_BACKGROUND && colors.GAME_BACKGROUND !== 'transparent') {
                ctx.fillStyle = colors.GAME_BACKGROUND;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            } else {
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            }

            // 1. Draw Net/Center Line
            const netWidth = 4;
            const netSegmentHeight = 15;
            const netGapHeight = 10;
            ctx.fillStyle = colors.PADDLE; // Using PADDLE color for net as an example
            for (let y = netGapHeight / 2; y < canvasHeight; y += netSegmentHeight + netGapHeight) {
                ctx.fillRect(canvasWidth / 2 - netWidth / 2, y, netWidth, netSegmentHeight);
            }

            // 2. Draw Players
            if (sceneRenderData.player1) {
                const p1 = sceneRenderData.player1;
                const p1InterpolatedX = p1.prevRenderX * (1 - alpha) + p1.x * alpha;
                const p1InterpolatedY = p1.prevRenderY * (1 - alpha) + p1.y * alpha;
                ctx.fillStyle = p1.color;
                ctx.fillRect(p1InterpolatedX, p1InterpolatedY, p1.width, p1.height);
            }
            if (sceneRenderData.player2) {
                const p2 = sceneRenderData.player2;
                const p2InterpolatedX = p2.prevRenderX * (1 - alpha) + p2.x * alpha;
                const p2InterpolatedY = p2.prevRenderY * (1 - alpha) + p2.y * alpha;
                ctx.fillStyle = p2.color;
                ctx.fillRect(p2InterpolatedX, p2InterpolatedY, p2.width, p2.height);
            }

            // 3. Draw Ball
            if (sceneRenderData.ball && ballPath) {
                const ball = sceneRenderData.ball;
                const ballInterpolatedX = ball.prevRenderX * (1 - alpha) + ball.x * alpha;
                const ballInterpolatedY = ball.prevRenderY * (1 - alpha) + ball.y * alpha;

                ctx.save();
                ctx.translate(ballInterpolatedX, ballInterpolatedY);
                ctx.scale(ball.radius / UNIT_CIRCLE_RADIUS, ball.radius / UNIT_CIRCLE_RADIUS);
                ctx.fillStyle = ball.color;
                ctx.fill(ballPath);
                ctx.restore();
            }
            
            // 4. Draw UI
            const fontSizes = calculateFontSizesInWorker(canvasWidth, canvasHeight, fonts);

            // Draw Player Names
            if (!sceneRenderData.isBackgroundDemo) { // Don't draw names in background demo
                if (sceneRenderData.player1 && sceneRenderData.player1.name) {
                    setWorkerTextStyle(ctx, `${fontSizes.SUBTITLE_SIZE} ${fonts.FAMILIES.SUBTITLE}`, colors.NAMES, 'left', 'top');
                    // Position similar to UIManager's original logic if possible, simplified here
                    ctx.fillText(sceneRenderData.player1.name, canvasWidth * 0.06, canvasHeight * 0.02);
                }
                if (sceneRenderData.player2 && sceneRenderData.player2.name) {
                    setWorkerTextStyle(ctx, `${fontSizes.SUBTITLE_SIZE} ${fonts.FAMILIES.SUBTITLE}`, colors.NAMES, 'right', 'top');
                    ctx.fillText(sceneRenderData.player2.name, canvasWidth * (1 - 0.06) , canvasHeight * 0.02);
                }
            }

            // Draw Player Scores
            if (sceneRenderData.player1) {
                setWorkerTextStyle(ctx, `${fontSizes.SCORE_SIZE} ${fonts.FAMILIES.SCORE}`, colors.SCORE, 'center', 'middle');
                ctx.fillText(sceneRenderData.player1.score.toString(), canvasWidth * 0.25, canvasHeight * 0.52);
            }
            if (sceneRenderData.player2) {
                setWorkerTextStyle(ctx, `${fontSizes.SCORE_SIZE} ${fonts.FAMILIES.SCORE}`, colors.SCORE, 'center', 'middle');
                ctx.fillText(sceneRenderData.player2.score.toString(), canvasWidth * 0.75, canvasHeight * 0.52);
            }

            // Draw Pause Overlay & Text
            if (sceneRenderData.ui.isPaused && !sceneRenderData.isBackgroundDemo) {
                ctx.fillStyle = colors.OVERLAY;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);

                setWorkerTextStyle(ctx, `${fontSizes.PAUSE_SIZE} ${fonts.FAMILIES.PAUSE}`, uiConfig.TEXT.COLOR, uiConfig.TEXT.ALIGN);
                const pausePos = getTextPositionInWorker(canvasWidth, canvasHeight, 0, 2, undefined, uiConfig);
                ctx.fillText(messages.PAUSED, pausePos.x, pausePos.y);

                setWorkerTextStyle(ctx, `${fontSizes.RESUME_PROMPT_SIZE} ${fonts.FAMILIES.PAUSE}`, uiConfig.TEXT.COLOR, uiConfig.TEXT.ALIGN);
                const promptPos = getTextPositionInWorker(canvasWidth, canvasHeight, 1, 2, undefined, uiConfig);
                ctx.fillText(messages.RESUME_PROMPT, promptPos.x, promptPos.y);
            }

            // Draw Countdown Text/Number
            if (!sceneRenderData.isBackgroundDemo && sceneRenderData.ui.countdownText !== null) {
                const cdText = sceneRenderData.ui.countdownText;
                if (Array.isArray(cdText)) { // Message array
                    setWorkerTextStyle(ctx, `${fontSizes.PAUSE_SIZE} ${fonts.FAMILIES.PAUSE}`, uiConfig.TEXT.COLOR, uiConfig.TEXT.ALIGN);
                    const msgCustomCenterY = canvasHeight * 0.25;
                    const msgPos1 = getTextPositionInWorker(canvasWidth, canvasHeight, 0, 2, msgCustomCenterY, uiConfig);
                    ctx.fillText(cdText[0], msgPos1.x, msgPos1.y);
                    if (cdText.length > 1) {
                        setWorkerTextStyle(ctx, `${fontSizes.RESUME_PROMPT_SIZE} ${fonts.FAMILIES.PAUSE}`, uiConfig.TEXT.COLOR, uiConfig.TEXT.ALIGN);
                        const msgPos2 = getTextPositionInWorker(canvasWidth, canvasHeight, 1, 2, msgCustomCenterY, uiConfig);
                        ctx.fillText(cdText[1], msgPos2.x, msgPos2.y);
                    }
                } else { // Numeric countdown (string or number)
                    const numText = cdText.toString();
                    setWorkerTextStyle(ctx, `${fontSizes.COUNTDOWN_SIZE} ${fonts.FAMILIES.COUNTDOWN}`, uiConfig.TEXT.COLOR, 'center', 'middle');
                    const numCustomCenterY = canvasHeight * 0.25;
                    const numPos = getTextPositionInWorker(canvasWidth, canvasHeight, 0, 1, numCustomCenterY, uiConfig);
                    
                    // Apply stroke like UIManager if uiConfig and colors are defined
                    if (uiConfig.TEXT.STROKE) {
                        ctx.strokeStyle = uiConfig.TEXT.STROKE.COLOR;
                        ctx.lineWidth = uiConfig.TEXT.STROKE.WIDTH;
                        ctx.strokeText(numText, numPos.x, numPos.y);
                    }
                    ctx.fillText(numText, numPos.x, numPos.y);
                }
            }
            break;
        
        case 'update_dimensions':
            if (offscreenCanvas) {
                offscreenCanvas.width = messageData.width;
                offscreenCanvas.height = messageData.height;
            }
            break;

        default:
            console.warn("Render worker: Received unknown message type", messageData.type);
    }
}; 