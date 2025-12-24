import React, { memo } from 'react';
import { COLORS } from '../constants';

export type CellBgMode = 'DEFAULT' | 'TREE_ACTIVE' | 'TREE_WARNING' | 'SNOWBALL_WARNING' | 'REINDEER_WARNING';

interface GridCellProps {
  content: string | null;
  type?: 'PLAYER' | 'GIFT' | 'BUFF' | 'TREE' | 'SNOWBALL' | 'REINDEER' | 'WARNING_TREE' | 'NONE';
  bgMode?: CellBgMode;
  isBonus?: boolean;
  warningDirection?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
}

const GridCell: React.FC<GridCellProps> = ({ 
  content, 
  type, 
  bgMode = 'DEFAULT', 
  isBonus,
  warningDirection
}) => {
  // Base class: 
  // - w-full h-full: Fill grid track
  // - aspect-square: Enforce 1:1 ratio
  // - overflow-visible: ALLOW sprites to stick out (2.5D effect)
  // - relative: For absolute positioning of sprite
  // - z-index is handled by DOM order (lower rows render last -> on top)
  let baseClass = `w-full h-full aspect-square border ${COLORS.CELL_BORDER} relative overflow-visible transition-colors duration-200`;

  // Background logic (Hitbox/Ground visualization)
  let bgClass = COLORS.CELL_BG;
  
  switch (bgMode) {
      case 'TREE_ACTIVE':
          bgClass = COLORS.TREE_ACTIVE;
          break;
      case 'TREE_WARNING':
          bgClass = COLORS.WARNING_TREE;
          break;
      case 'SNOWBALL_WARNING':
          bgClass = COLORS.WARNING_SNOWBALL;
          break;
      case 'REINDEER_WARNING':
          bgClass = COLORS.WARNING_REINDEER;
          break;
      default:
          bgClass = COLORS.CELL_BG;
  }

  // Determine if content is an Image based on common extensions or prefixes
  // This is more robust than checking for './' which might vary in some build environments
  const isImage = content && (
    content.startsWith('http') || 
    content.startsWith('data:image') || 
    /\.(png|PNG|jpg|jpeg|gif|GIF|svg|webp|bmp)$/i.test(content)
  );

  // Common positioning for 2.5D effect (Bottom Center)
  // Note: translateX(-50%) is used to center horizontally.
  const positionClass = "absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none drop-shadow-sm origin-bottom";
  
  // Specific styles for Image vs Emoji
  // Image: width: 100%, height: auto (maintains aspect ratio)
  let imageClass = `${positionClass} w-full h-auto object-contain ${type === 'PLAYER' && isBonus ? 'bonus-active' : ''}`;
  
  // Emoji: Tall fixed height to act as a sprite
  const emojiClass = `${positionClass} w-full h-[160%] flex items-end justify-center text-5xl sm:text-6xl leading-none`;
  // Render Arrow if warningDirection exists
  const renderWarningArrow = () => {
    if (!warningDirection) return null;

    let rotation = 'rotate-0';
    switch (warningDirection) {
        case 'RIGHT': rotation = 'rotate-0'; break;
        case 'DOWN': rotation = 'rotate-90'; break;
        case 'LEFT': rotation = 'rotate-180'; break;
        case 'UP': rotation = '-rotate-90'; break;
    }

    // Determine arrow color based on bgMode
    let arrowColor = 'text-slate-400';
    if (bgMode === 'SNOWBALL_WARNING') arrowColor = 'text-blue-600/50';
    if (bgMode === 'REINDEER_WARNING') arrowColor = 'text-red-600/50';

    return (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-0`}>
             <span className={`text-5xl font-black ${arrowColor} transform ${rotation} animate-pulse`}>➜</span>
        </div>
    );
  };

  return (
    <div className={`${baseClass} ${bgClass}`}>
      {renderWarningArrow()}
      {/* Render content if it exists. */}
      {content && (
        <>
          {isImage ? (
             <img 
               src={content} 
               alt={type} 
               className={imageClass} 
               onError={(e) => {
                 // Fallback if image fails to load
                 console.warn(`Failed to load image: ${content}`);
                 e.currentTarget.style.display = 'none';
               }}
             />
          ) : (
             <span className={emojiClass}>
               {content}
             </span>
          )}
        </>
      )}
    </div>
  );
};

export default memo(GridCell);