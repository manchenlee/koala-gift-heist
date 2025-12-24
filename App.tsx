import { useState, useEffect, useRef } from 'react';
import { 
  GRID_SIZE, 
  MAX_GIFTS_ON_BOARD, 
  GAME_TICK_RATE, 
  ASSETS, 
  COLORS,
  AUDIO,
  TREE_WARNING_DURATION_MS,
  TREE_ACTIVE_DURATION_MS,
  PROJECTILE_WARNING_DURATION_MS,
  BONUS_DURATION_MS,
  SCORE_PER_GIFT,
  BONUS_MULTIPLIER,
  BASE_OBSTACLE_INTERVAL_MS,
  MIN_OBSTACLE_INTERVAL_MS,
  DIFFICULTY_SCALING_STEP,
  TREE_COOLDOWN_CYCLES,
  MAX_REINDEER_DROPS
} from './constants';
import { Position, GameState, Gift, BuffItem, Projectile, Warning, TreeArea, TreePattern, DroppedTree } from './types';
import GridCell, { CellBgMode } from './components/GridCell';
import GameOverOverlay from './components/GameOverOverlay';

// Helper to get random position
const getRandomPos = (exclude: Position[] = []): Position => {
  let pos: Position;
  let attempts = 0;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    attempts++;
  } while (
    exclude.some((p) => p.x === pos.x && p.y === pos.y) &&
    attempts < 100
  );
  return pos;
};

// Helper for unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper to check if a cell is inside the current tree pattern
const isInTreeArea = (x: number, y: number, pattern: TreePattern): boolean => {
    switch (pattern) {
        case 'TOP': return y < 4;
        case 'BOTTOM': return y >= 4;
        case 'LEFT': return x < 4;
        case 'RIGHT': return x >= 4;
        // Triangles: 8x8 Grid (0..7)
        case 'TRI_TL': return x + y <= 7; // Top-Left Triangle
        case 'TRI_BR': return x + y >= 7; // Bottom-Right Triangle
        case 'TRI_TR': return x >= y;     // Top-Right Triangle (Above-Right of diagonal)
        case 'TRI_BL': return x <= y;     // Bottom-Left Triangle (Below-Left of diagonal)
        default: return false;
    }
};

function App() {
  // Game State
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [playerPos, setPlayerPos] = useState<Position>({ x: 3, y: 3 });
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [buff, setBuff] = useState<BuffItem | null>(null);
  const [isBonusActive, setIsBonusActive] = useState(false);
  const [bonusTimer, setBonusTimer] = useState(0);
  
  // Stats
  const [finalStats, setFinalStats] = useState({ duration: 0, pps: 0 });
  const startTimeRef = useRef<number>(0);

  // Obstacles State
  const [treeArea, setTreeArea] = useState<TreeArea | null>(null);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [droppedTrees, setDroppedTrees] = useState<DroppedTree[]>([]);

  // Audio Ref
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  // Refs for logic that needs fresh state inside intervals without re-renders or stale closures
  const stateRef = useRef({
    gameState,
    score,
    playerPos,
    gifts,
    buff,
    isBonusActive,
    treeArea,
    projectiles,
    warnings,
    droppedTrees,
    treeCooldown: TREE_COOLDOWN_CYCLES, // Start with some cooldown
    lastObstacleTime: 0,
    lastGiftSpawnTime: 0,
    lastBuffSpawnTime: 0,
    // Tracking to prevent consecutive same-row/col spawns
    lastProjectileAxis: null as 'ROW' | 'COL' | null,
    lastProjectileIndex: -1,
  });

  // Initialize Audio
  useEffect(() => {
    // Preload BGM
    bgmRef.current = new Audio(AUDIO.BGM);
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.5; // Slightly lower volume for background
    
    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
    };
  }, []);

  // Helper to play SFX
  const playSound = (url: string, volume = 1.0) => {
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(e => console.error("Audio play failed", e));
  };

  // Sync refs
  useEffect(() => {
    stateRef.current = {
      ...stateRef.current,
      gameState,
      score,
      playerPos,
      gifts,
      buff,
      isBonusActive,
      treeArea,
      projectiles,
      warnings,
      droppedTrees
    };
  }, [gameState, score, playerPos, gifts, buff, isBonusActive, treeArea, projectiles, warnings, droppedTrees]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.gameState !== 'PLAYING') return;

      const { x, y } = stateRef.current.playerPos;
      let newX = x;
      let newY = y;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          newY = Math.max(0, y - 1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          newY = Math.min(GRID_SIZE - 1, y + 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          newX = Math.max(0, x - 1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          newX = Math.min(GRID_SIZE - 1, x + 1);
          break;
        default:
          return;
      }

      if (newX !== x || newY !== y) {
        setPlayerPos({ x: newX, y: newY });
        checkCollisions({ x: newX, y: newY });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Game Mechanics Functions ---

  const checkCollisions = (currentPos: Position) => {
    const { gifts, buff, isBonusActive, projectiles, treeArea, droppedTrees } = stateRef.current;
    
    // 1. Gifts
    const hitGift = gifts.find(g => g.x === currentPos.x && g.y === currentPos.y);
    if (hitGift) {
      playSound(AUDIO.GIFT_GET); // SFX: Gift Get
      setGifts(prev => prev.filter(g => g.id !== hitGift.id));
      const points = isBonusActive ? SCORE_PER_GIFT * BONUS_MULTIPLIER : SCORE_PER_GIFT;
      setScore(prev => prev + points);
      spawnGift(1); // Immediate replacement
    }

    // 2. Buff
    if (buff && buff.x === currentPos.x && buff.y === currentPos.y) {
      playSound(AUDIO.BUFF_GET); // SFX: Buff Get
      setBuff(null);
      activateBonus();
    }

    // 3. Dangerous Obstacles (Only if not in Bonus Mode)
    if (!isBonusActive) {
      // Tree Active Area
      if (treeArea && treeArea.state === 'ACTIVE') {
        if (isInTreeArea(currentPos.x, currentPos.y, treeArea.pattern)) {
          endGame();
          return;
        }
      }

      // Dropped Trees (Individual)
      const hitDroppedTree = droppedTrees.some(t => t.x === currentPos.x && t.y === currentPos.y);
      if (hitDroppedTree) {
        endGame();
        return;
      }

      // Projectiles
      const hitProjectile = projectiles.some(p => p.x === currentPos.x && p.y === currentPos.y);
      if (hitProjectile) {
        endGame();
      }
    }
  };

  const spawnGift = (count = 1) => {
    setGifts(prev => {
      const newGifts = [...prev];
      // Only spawn if below max
      if (newGifts.length >= MAX_GIFTS_ON_BOARD) return prev;

      for (let i = 0; i < count; i++) {
        if (newGifts.length >= MAX_GIFTS_ON_BOARD) break;
        const occupied = [
          stateRef.current.playerPos,
          ...newGifts,
          ...(stateRef.current.buff ? [stateRef.current.buff] : []),
          ...stateRef.current.droppedTrees
        ];
        const pos = getRandomPos(occupied);
        newGifts.push({ id: generateId(), ...pos });
      }
      return newGifts;
    });
  };

  const activateBonus = () => {
    setIsBonusActive(true);
    setBonusTimer(BONUS_DURATION_MS);
  };

  const endGame = () => {
    // Calculate Stats
    const endTime = Date.now();
    const duration = (endTime - startTimeRef.current) / 1000; // in seconds
    const pps = duration > 0 ? stateRef.current.score / duration : 0;
    
    setFinalStats({ duration, pps });

    playSound(AUDIO.GAME_OVER); // Play game over sound
    setGameState('GAME_OVER');
    // BGM continues playing
  };

  const restartGame = () => {
    // Reset Stats
    startTimeRef.current = Date.now();
    setFinalStats({ duration: 0, pps: 0 });

    setScore(0);
    setPlayerPos({ x: 3, y: 3 });
    setGifts([]);
    setBuff(null);
    setIsBonusActive(false);
    setTreeArea(null);
    setProjectiles([]);
    setWarnings([]);
    setDroppedTrees([]);
    
    // Reset internal state refs
    stateRef.current.treeCooldown = TREE_COOLDOWN_CYCLES;
    stateRef.current.lastProjectileAxis = null;
    stateRef.current.lastProjectileIndex = -1;

    setGameState('PLAYING');
    
    // Start BGM only if it's not already playing (first start)
    if (bgmRef.current && bgmRef.current.paused) {
        bgmRef.current.currentTime = 0;
        bgmRef.current.play().catch(e => console.error("BGM Play failed", e));
    }
    
    // Initial spawns
    setTimeout(() => spawnGift(3), 100);
  };

  // --- Obstacle Logic ---

  const triggerObstacle = () => {
    const { treeCooldown } = stateRef.current;
    
    // Decide type
    let type: 'TREE' | 'SNOWBALL' | 'REINDEER';
    
    // Tree logic: Must respect cooldown
    if (treeCooldown <= 0) {
        // 40% chance for tree if available
        if (Math.random() < 0.4) {
            type = 'TREE';
        } else {
            type = Math.random() < 0.4 ? 'SNOWBALL' : 'REINDEER';
        }
    } else {
        type = Math.random() < 0.4 ? 'SNOWBALL' : 'REINDEER';
    }

    if (type === 'TREE') {
        stateRef.current.treeCooldown = TREE_COOLDOWN_CYCLES; // Reset cooldown
        triggerTreeMechanic();
    } else {
        stateRef.current.treeCooldown--;
        triggerProjectileMechanic(type);
    }
  };

  const triggerTreeMechanic = () => {
    playSound(AUDIO.TREE_WARNING); // SFX: Tree Warning
    const patterns: TreePattern[] = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'TRI_TL', 'TRI_TR', 'TRI_BL', 'TRI_BR'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    setTreeArea({
        pattern,
        state: 'WARNING',
        timer: TREE_WARNING_DURATION_MS
    });
  };

  const triggerProjectileMechanic = (type: 'SNOWBALL' | 'REINDEER') => {
    // SFX: Snowball or Reindeer Warning
    if (type === 'SNOWBALL') playSound(AUDIO.SNOWBALL_WARNING);
    else playSound(AUDIO.REINDEER_WARNING);

    let isRow: boolean;
    let index: number;
    let attempts = 0;
    const { lastProjectileAxis, lastProjectileIndex } = stateRef.current;

    // Prevent same row/col consecutive spawn
    do {
      isRow = Math.random() < 0.5;
      index = Math.floor(Math.random() * GRID_SIZE);
      attempts++;
    } while (
      attempts < 10 &&
      ((isRow && lastProjectileAxis === 'ROW' && index === lastProjectileIndex) ||
       (!isRow && lastProjectileAxis === 'COL' && index === lastProjectileIndex))
    );

    // Save history
    stateRef.current.lastProjectileAxis = isRow ? 'ROW' : 'COL';
    stateRef.current.lastProjectileIndex = index;

    // Determine start and direction
    // 0 = from start (left/top) moving positive, 1 = from end (right/bottom) moving negative
    const directionVal = Math.random() < 0.5 ? 1 : -1;
    
    // Determine visual direction string for the warning
    let visualDirection: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
    if (isRow) {
        visualDirection = directionVal === 1 ? 'RIGHT' : 'LEFT';
    } else {
        visualDirection = directionVal === 1 ? 'DOWN' : 'UP';
    }
    
    const id = generateId();
    
    // Add Warning
    const newWarnings: Warning[] = [];
    
    for(let i=0; i<GRID_SIZE; i++) {
        newWarnings.push({
            id: `${id}-${i}`,
            x: isRow ? i : index,
            y: isRow ? index : i,
            type: type,
            direction: visualDirection,
            expiresAt: Date.now() + PROJECTILE_WARNING_DURATION_MS
        });
    }

    setWarnings(prev => [...prev, ...newWarnings]);

    // Schedule Projectile Spawn
    setTimeout(() => {
        if (stateRef.current.gameState !== 'PLAYING') return;

        // Remove these specific warnings
        setWarnings(prev => prev.filter(w => !w.id.startsWith(id)));

        const startX = isRow ? (directionVal === 1 ? -1 : GRID_SIZE) : index;
        const startY = isRow ? index : (directionVal === 1 ? -1 : GRID_SIZE);

        

        const newProjectile: Projectile = {
            id,
            type,
            x: startX,
            y: startY,
            dx: isRow ? directionVal : 0,
            dy: isRow ? 0 : directionVal,
            droppedCount: 0
        };
        
        setProjectiles(prev => [...prev, newProjectile]);
    }, PROJECTILE_WARNING_DURATION_MS);
  };


  // --- Main Game Loop ---
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const current = stateRef.current;

      // 1. Bonus Timer
      if (current.isBonusActive) {
        setBonusTimer(prev => {
          if (prev <= GAME_TICK_RATE) {
            setIsBonusActive(false);
            return 0;
          }
          return prev - GAME_TICK_RATE;
        });
      }

      // 2. Obstacle Spawning Logic
      const difficultyMs = Math.max(
          MIN_OBSTACLE_INTERVAL_MS, 
          BASE_OBSTACLE_INTERVAL_MS - (current.score * DIFFICULTY_SCALING_STEP)
      );
      
      if (now - current.lastObstacleTime > difficultyMs) {
        stateRef.current.lastObstacleTime = now;
        triggerObstacle();
      }

      // 3. Gift Spawning Logic (Periodic fallback if count low)
      if (now - current.lastGiftSpawnTime > 2000) {
        stateRef.current.lastGiftSpawnTime = now;
        if (current.gifts.length < MAX_GIFTS_ON_BOARD) {
            spawnGift(1);
        }
      }

      // 4. Buff Spawning Logic
      if (!current.buff && !current.isBonusActive && now - current.lastBuffSpawnTime > 10000) {
        if (Math.random() < 0.5) {
             const occupied = [
                ...current.gifts, 
                current.playerPos, 
                ...current.droppedTrees
             ];
             const pos = getRandomPos(occupied);
             setBuff({ id: generateId(), ...pos });
        }
        stateRef.current.lastBuffSpawnTime = now;
      }

      // 5. Tree Logic Update (Main Giant Tree)
      if (current.treeArea) {
        if (current.treeArea.state === 'WARNING') {
            setTreeArea(prev => {
                if (!prev) return null;
                const newTimer = prev.timer - GAME_TICK_RATE;
                if (newTimer <= 0) {
                    return { ...prev, state: 'ACTIVE', timer: TREE_ACTIVE_DURATION_MS };
                }
                return { ...prev, timer: newTimer };
            });
        } else if (current.treeArea.state === 'ACTIVE') {
            // Check Collision for Tree active
            if (!current.isBonusActive) {
                if (isInTreeArea(current.playerPos.x, current.playerPos.y, current.treeArea.pattern)) {
                    endGame();
                }
            }

            setTreeArea(prev => {
                if (!prev) return null;
                const newTimer = prev.timer - GAME_TICK_RATE;
                if (newTimer <= 0) {
                    return null; // Tree disappears
                }
                return { ...prev, timer: newTimer };
            });
        }
      }

      // 6. Dropped Trees Cleanup
      if (current.droppedTrees.length > 0) {
          setDroppedTrees(prev => {
              const active = prev.filter(t => t.expiresAt > now);
              // Check collision with player for any active tree
              if (!current.isBonusActive) {
                  const hit = active.some(t => t.x === current.playerPos.x && t.y === current.playerPos.y);
                  if (hit) endGame();
              }
              return active;
          });
      }

      // 7. Projectile Movement & Logic
      if (current.projectiles.length > 0) {
        setProjectiles(prev => {
          const nextProjectiles: Projectile[] = [];
          
          prev.forEach(p => {
             const nextX = p.x + p.dx;
             const nextY = p.y + p.dy;

             // Check Bounds
             if (nextX < -1 || nextX > GRID_SIZE || nextY < -1 || nextY > GRID_SIZE) {
                 // Removed (out of bounds)
                 return; 
             }

             // Logic: Snowball eats gifts
             if (p.type === 'SNOWBALL') {
                 setGifts(currentGifts => currentGifts.filter(g => g.x !== nextX || g.y !== nextY));
             }
             
             let newDroppedCount = p.droppedCount;
             // Logic: Reindeer drops items
             if (p.type === 'REINDEER') {
                 // If cell empty and random chance
                 const isOccupied = current.gifts.some(g => g.x === nextX && g.y === nextY) || 
                                    (current.playerPos.x === nextX && current.playerPos.y === nextY) ||
                                    current.droppedTrees.some(t => t.x === nextX && t.y === nextY);
                 
                 // 30% chance to drop item if empty and hasn't dropped max limit
                 if (!isOccupied && nextX >= 0 && nextX < GRID_SIZE && nextY >= 0 && nextY < GRID_SIZE) {
                    if (p.droppedCount < MAX_REINDEER_DROPS && Math.random() < 0.4) {
                         // 20% chance for Gift, 80% chance for Tree
                         if (Math.random() < 0.2) {
                             // Drop Gift
                             setGifts(g => [...g, { id: generateId(), x: nextX, y: nextY }]);
                         } else {
                             // Drop Instant Tree
                             const newTree: DroppedTree = {
                                 id: generateId(),
                                 x: nextX,
                                 y: nextY,
                                 createdAt: now,
                                 expiresAt: now + TREE_ACTIVE_DURATION_MS
                             };
                             setDroppedTrees(t => [...t, newTree]);
                         }
                         newDroppedCount++;
                    }
                 }
             }

             // Collision with player
             if (!current.isBonusActive && nextX === current.playerPos.x && nextY === current.playerPos.y) {
                 endGame();
             }

             nextProjectiles.push({ ...p, x: nextX, y: nextY, droppedCount: newDroppedCount });
          });

          return nextProjectiles;
        });
      }

    }, GAME_TICK_RATE);

    return () => clearInterval(intervalId);
  }, [gameState]);


  // --- Render ---

  // Create grid cells
  const renderGrid = () => {
    const cells = [];
    const now = Date.now();

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const id = `${x}-${y}`;
        
        // Determine content & background
        let content: string | null = null;
        let type: any = 'NONE';
        let bgMode: CellBgMode = 'DEFAULT';

        // 1. Calculate Background Mode (Warnings/Zones)
        const warn = warnings.find(w => w.x === x && w.y === y);
        let warningDirection: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | undefined;
        if (warn) {
            bgMode = warn.type === 'SNOWBALL' ? 'SNOWBALL_WARNING' : 'REINDEER_WARNING';
            warningDirection = warn.direction;
        }

        const isBlockedByBigTree = treeArea?.state === 'ACTIVE' && isInTreeArea(x, y, treeArea.pattern);
        
        // Check for Dropped Trees
        const droppedTree = droppedTrees.find(t => t.x === x && t.y === y);
        const isBlockedByDroppedTree = !!droppedTree;

        const isBlocked = isBlockedByBigTree || isBlockedByDroppedTree;

        // Render Big Tree
        if (treeArea && isInTreeArea(x, y, treeArea.pattern)) {
             if (treeArea.state === 'WARNING') {
                 bgMode = 'TREE_WARNING';
             } else {
                 bgMode = 'TREE_ACTIVE';
                 if (!content) {
                     const timeRemaining = treeArea.timer;
                     const totalDuration = TREE_ACTIVE_DURATION_MS;
                     const timePassed = totalDuration - timeRemaining;

                     // Disappearance Logic (Reverse Animation)
                     if (timeRemaining <= 100) {
                         content = ASSETS.TREE_1;
                     } else if (timeRemaining <= 200) {
                         content = ASSETS.TREE_2;
                     }
                     // Appearance Logic
                     else if (timePassed < 100) {
                         content = ASSETS.TREE_1;
                     } else if (timePassed < 200) {
                         content = ASSETS.TREE_2;
                     } else {
                         content = ASSETS.TREE_3;
                     }
                     type = 'TREE';
                 }
             }
        }

        // Render Dropped Tree (Instant, mimics Active Big Tree)
        if (droppedTree && !content) {
            bgMode = 'TREE_ACTIVE';
            const timePassed = now - droppedTree.createdAt;
            const timeRemaining = droppedTree.expiresAt - now;

            // Disappearance Logic
            if (timeRemaining <= 100) {
                content = ASSETS.TREE_1;
            } else if (timeRemaining <= 200) {
                content = ASSETS.TREE_2;
            } 
            // Appearance Logic
            else if (timePassed < 100) {
                 content = ASSETS.TREE_1;
            } else if (timePassed < 200) {
                 content = ASSETS.TREE_2;
            } else {
                 content = ASSETS.TREE_3;
            }
            type = 'TREE';
        }

        // 2. Entities (Overlaying content)
        
        // Static Entities (Gifts, Buffs) - Only if not blocked
        if (!isBlocked) {
            const gift = gifts.find(g => g.x === x && g.y === y);
            if (gift) {
                content = ASSETS.GIFT;
                type = 'GIFT';
            }

            const buffItem = buff && buff.x === x && buff.y === y ? buff : null;
            if (buffItem) {
                content = ASSETS.BUFF;
                type = 'BUFF';
            }
        }

        // Projectiles
        const proj = projectiles.find(p => p.x === x && p.y === y);
        if (proj) {
            if (proj.type === 'SNOWBALL') {
                content = ASSETS.SNOWBALL;
            } else if (proj.type === 'REINDEER') {
                // Determine direction for Reindeer asset
                if (proj.dx > 0) content = ASSETS.REINDEER_L2R;
                else if (proj.dx < 0) content = ASSETS.REINDEER_R2L;
                else if (proj.dy > 0) content = ASSETS.REINDEER_U2D;
                else content = ASSETS.REINDEER_D2U; 
            }
            type = proj.type;
        }

        // Player
        if (playerPos.x === x && playerPos.y === y) {
            // Select correct asset based on Bonus State
            content = isBonusActive ? ASSETS.PLAYER_BONUS : ASSETS.PLAYER_DEFAULT;
            type = 'PLAYER';
        }

        cells.push(
          <GridCell 
            key={id} 
            content={content} 
            type={type} 
            bgMode={bgMode}
            isBonus={isBonusActive}
            warningDirection={warningDirection}
          />
        );
      }
    }
    return cells;
  };

  return (
    <div 
        className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500`}
        style={{
            backgroundImage: `url(${ASSETS.BACKGROUND})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated'
        }}
    >
      {/* Header with blurred background for readability - Reduced bottom margin for compact screens */}
      <div className="w-full max-w-lg flex justify-between items-center mb-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg">
        <div>
           <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-green-600">
             Koala's Gift Heist
           </h1>
           <p className="text-slate-600 text-sm font-semibold">Steal 🎁 | Avoid ⚪🦌🎄</p>
        </div>
        <div className="text-right">
            <div className="text-4xl font-mono font-bold text-slate-800">{score}</div>
            <div className="text-xs text-slate-600 uppercase font-bold">Score</div>
        </div>
      </div>

      {/* Bonus Indicator Placeholder */}
      <div className="h-8 mb-2 w-full text-center flex items-center justify-center">
        <div className={`${isBonusActive ? 'opacity-100 animate-pulse' : 'opacity-0'} text-amber-300 font-bold text-lg transition-opacity duration-200`}>
           🎅 SUPER SANTA MODE! ({(Math.max(0, bonusTimer)/1000).toFixed(1)}s)
        </div>
      </div>

      {/* Game Board */}
      <div 
        className={`relative p-2 rounded-xl shadow-2xl border-4 transition-colors duration-500 ${COLORS.BOARD_BG} ${isBonusActive ? 'border-amber-400' : COLORS.BOARD_BORDER}`}
      >
        <div 
          className="grid gap-1"
          style={{ 
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            width: 'min(540px, 90vw, 60vh)',
            height: 'min(540px, 90vw, 60vh)',
          }}
        >
          {renderGrid()}
        </div>
      </div>

      {/* Controls Hint - Updated for visibility on dark background */}
      <div className="mt-6 text-white text-sm flex gap-4 font-bold drop-shadow-md">
        <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-300 px-2 py-1 rounded shadow-sm text-slate-800">WASD</kbd> Move</span>
        <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-300 px-2 py-1 rounded shadow-sm text-slate-800">Arrows</kbd> Move</span>
      </div>

      {/* Start Screen */}
      {gameState === 'START' && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
             <div className="text-center p-8 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md shadow-2xl flex flex-col items-center">
                 <img src={ASSETS.KOALA_STARTSCENE} alt="Koala" className="w-64 h-auto mb-6 drop-shadow-lg rounded-lg" />
                 <button 
                    onClick={restartGame}
                    className="bg-amber-500 hover:bg-amber-400 text-white font-bold py-4 px-12 rounded-full text-2xl shadow-lg transition-transform hover:scale-105"
                 >
                     Start Game
                 </button>
             </div>
         </div>
      )}

      {/* Game Over Modal */}
      {gameState === 'GAME_OVER' && (
        <GameOverOverlay 
          score={score} 
          durationSeconds={finalStats.duration}
          scorePerSecond={finalStats.pps}
          onRestart={restartGame} 
        />
      )}
    </div>
  );
}

export default App;