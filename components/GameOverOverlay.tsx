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
  scorePerSecond, 
  onRestart 
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border-4 border-amber-400 rounded-xl p-6 text-center shadow-2xl max-w-sm w-full animate-bounce-in relative overflow-hidden flex flex-col items-center">
        {/* Decorative glint */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-200 to-transparent opacity-50"></div>

        <img src={ASSETS.KOALA_GAMEOVER} alt="Game Over Koala" className="w-64 h-auto mb-4 drop-shadow-lg rounded-lg" />
        <h2 className="text-4xl font-bold text-amber-400 mb-2 drop-shadow-md">OOps!</h2>
        <p className="text-slate-300 mb-6">Busted by the Santa Squad!</p>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Main Score - Full Width */}
          <div className="col-span-2 bg-slate-900/80 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-amber-500/80 uppercase tracking-wider font-semibold">Total Score</p>
            <p className="text-4xl font-bold text-white drop-shadow-sm">{score}</p>
          </div>

          {/* Time */}
          <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-700">
             <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Survival Time</p>
             <p className="text-xl font-bold text-white">{durationSeconds.toFixed(1)}s</p>
          </div>

          {/* PPS */}
          <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-700">
             <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Gift Per Second</p>
             <p className="text-xl font-bold text-white">{scorePerSecond.toFixed(2)}</p>
          </div>
        </div>

        <button 
          onClick={onRestart}
          className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105 active:scale-95 shadow-lg"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default GameOverOverlay;