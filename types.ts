export type Position = {
  x: number;
  y: number;
};

export type GameState = 'START' | 'PLAYING' | 'GAME_OVER';

export type EntityType = 'PLAYER' | 'GIFT' | 'BUFF' | 'TREE' | 'SNOWBALL' | 'REINDEER';

export interface Gift {
  id: string;
  x: number;
  y: number;
}

export interface BuffItem {
  id: string;
  x: number;
  y: number;
}

export interface Projectile {
  id: string;
  type: 'SNOWBALL' | 'REINDEER';
  x: number;
  y: number;
  dx: number;
  dy: number;
  droppedCount: number;
}

export interface Warning {
  id: string;
  x: number;
  y: number;
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  type: 'SNOWBALL' | 'REINDEER';
  expiresAt: number; // timestamp
}

export interface DroppedTree {
  id: string;
  x: number;
  y: number;
  createdAt: number;
  expiresAt: number;
}

export type TreePattern = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'TRI_TL' | 'TRI_TR' | 'TRI_BL' | 'TRI_BR';

export interface TreeArea {
  pattern: TreePattern;
  state: 'WARNING' | 'ACTIVE';
  timer: number;
}