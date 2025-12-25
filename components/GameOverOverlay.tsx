import React from 'react';
import { ASSETS } from '../constants';

interface GameOverOverlayProps {
  score: number;
  durationSeconds: number;
  scorePerSecond: number;
  onRestart: () => void;
}

const GameOverOverlay: React.FC<GameOverOverlayProps> = ({ 
  score, 
  durationSeconds, 
  onRestart 
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-800 rounded-xl p-6 text-center shadow-2xl max-w-sm w-full animate-bounce-in relative overflow-hidden flex flex-col items-center">
        {/* Decorative glint */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-200 to-transparent opacity-50"></div>

        <img src={ASSETS.KOALA_GAMEOVER} alt="Game Over Koala" className="w-64 h-auto mb-4 drop-shadow-lg rounded-lg" />
        <h2 className="text-4xl font-bold text-amber-400 mb-2 drop-shadow-md">OOps!</h2>
        <p className="text-slate-300 mb-6">Busted by the Santa Squad!</p>
        
        {/* Stats Grid */}
        <div className="w-64 grid grid-cols-2 gap-3 mb-6">
          {/* Main Score - Full Width */}
          <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-700">
            <p className="text-xs text-amber-500/80 uppercase tracking-wider font-semibold">Total Score</p>
            <p className="text-3xl font-bold text-white drop-shadow-sm">{score}</p>
          </div>

          {/* Time */}
          <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-700">
             <p className="text-xs text-amber-500/80 uppercase tracking-wider font-semibold">Survival Time</p>
             <p className="text-3xl font-bold text-white drop-shadow-sm">{durationSeconds.toFixed(1)}s</p>
          </div>
        </div>

        <button 
          onClick={onRestart}
          className="bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg transition-transform hover:scale-105 w-64"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default GameOverOverlay;