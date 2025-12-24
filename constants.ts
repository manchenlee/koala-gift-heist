// Grid Configuration
export const GRID_SIZE = 8;
export const MAX_GIFTS_ON_BOARD = 5;

// Timing (ms)
export const GAME_TICK_RATE = 100; // Main loop speed
export const BONUS_DURATION_MS = 5000;
export const TREE_WARNING_DURATION_MS = 1500;
export const TREE_ACTIVE_DURATION_MS = 1500; // Reduced to 1.5s
export const PROJECTILE_WARNING_DURATION_MS = 1200;
export const PROJECTILE_MOVE_SPEED_TICKS = 1; // Move every X ticks (1 = fast, 2 = slower)

// Scoring
export const SCORE_PER_GIFT = 1;
export const BONUS_MULTIPLIER = 2;

// Audio Assets
export const AUDIO = {
  BGM: "./assets/audio/bgm.mp3",
  GIFT_GET: "./assets/audio/gift_get.mp3",
  BUFF_GET: "./assets/audio/buff_get.mp3",
  REINDEER_WARNING: "./assets/audio/reindeer_warning.mp3",
  SNOWBALL_WARNING: "./assets/audio/snowball_warning.mp3",
  TREE_WARNING: "./assets/audio/tree_warning.mp3",
  GAME_OVER: "./assets/audio/gameover.mp3",
};

// Visual Assets
export const ASSETS = {
  BACKGROUND: "./assets/images/background.png",
  // Player GIFs
  PLAYER_DEFAULT: './assets/images/koala_default.GIF',
  PLAYER_BONUS: './assets/images/koala_bonus.GIF',
  KOALA_STARTSCENE: "./assets/images/koala_startscene.png",
  KOALA_GAMEOVER: "./assets/images/koala_gameover.png",
  
  // Reindeer GIFs (Directional)
  REINDEER_L2R: './assets/images/reindeer_l2r.GIF',
  REINDEER_R2L: './assets/images/reindeer_r2l.GIF',
  REINDEER_U2D: './assets/images/reindeer_u2d.GIF',
  REINDEER_D2U: './assets/images/reindeer_d2u.GIF',

  // Snowball PNG
  SNOWBALL: './assets/images/snowball.PNG',
  
  // Tree Animation PNGs
  TREE_1: "./assets/images/tree_1.PNG",
  TREE_2: "./assets/images/tree_2.PNG",
  TREE_3: "./assets/images/tree_3.PNG",

  // Items
  GIFT: "./assets/images/gift.PNG",
  BUFF: "./assets/images/buff.PNG",
};

// Colors (Tailwind classes) - Snow White Theme
export const COLORS = {
  APP_BG: 'bg-slate-50', // Snow White page background
  BOARD_BG: 'bg-white', // Pure white board
  CELL_BG: 'bg-slate-50', // Very light gray cells
  CELL_BORDER: 'border-slate-200', // Light borders
  BOARD_BORDER: 'border-slate-300',
  
  // Obstacles
  // Removed rings for warnings as requested, intensified background colors for visibility
  WARNING_SNOWBALL: 'bg-blue-200',
  WARNING_REINDEER: 'bg-red-200',
  WARNING_TREE: 'bg-green-200 animate-pulse', // Green warning for tree
  TREE_ACTIVE: 'bg-slate-50', // Removed solid green, used default cell bg
};

// Game Logic
export const TREE_COOLDOWN_CYCLES = 5; // Minimum obstacle triggers before another tree can happen
export const BASE_OBSTACLE_INTERVAL_MS = 3000;
export const MIN_OBSTACLE_INTERVAL_MS = 800;
export const DIFFICULTY_SCALING_STEP = 50; // ms reduction per score point
export const MAX_REINDEER_DROPS = 3;