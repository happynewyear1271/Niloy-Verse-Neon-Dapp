/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Target as TargetIcon, Trophy, Zap, Clock, MousePointer2, ChevronDown, MessageSquare, Twitter } from 'lucide-react';

// --- Types ---
// ... (rest of the file content until App function)

type GameStatus = 'IDLE' | 'PLAYING' | 'GAMEOVER';

interface TargetData {
  id: string;
  x: number;
  y: number;
  size: number;
  color: 'cyan' | 'pink';
  points: number;
}

// --- Constants ---

const GAME_DURATION = 30; // Seconds
const TARGET_LIFETIME = 1200; // ms
const SPAWN_INTERVAL = 600; // ms

// --- Components ---

interface TargetProps {
  target: TargetData;
  onClick: (id: string, points: number) => void;
}

const Target: React.FC<TargetProps> = ({ target, onClick }) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`absolute cursor-pointer rounded-full flex items-center justify-center
        ${target.color === 'cyan' ? 'bg-neon-cyan neon-glow-cyan' : 'bg-neon-pink neon-glow-pink'}
      `}
      style={{
        width: target.size,
        height: target.size,
        left: `${target.x}%`,
        top: `${target.y}%`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(target.id, target.points);
      }}
    >
      <Zap size={target.size * 0.5} className="text-nebula-dark" />
    </motion.div>
  );
};

export default function App() {
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [targets, setTargets] = useState<TargetData[]>([]);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('neon-reflex-highscore');
    return saved ? parseInt(saved, 10) : 0;
  });

  const nextTargetId = useRef(0);
  const spawnTimer = useRef<NodeJS.Timeout | null>(null);
  const gameTimer = useRef<NodeJS.Timeout | null>(null);

  // --- Game Logic ---

  const spawnTarget = useCallback(() => {
    const id = `target-${nextTargetId.current++}`;
    const x = Math.random() * 85 + 5; // 5% to 90%
    const y = Math.random() * 75 + 15; // 15% to 90%
    const isSpecial = Math.random() > 0.8;
    
    const newTarget: TargetData = {
      id,
      x,
      y,
      size: isSpecial ? 40 : 60,
      color: isSpecial ? 'pink' : 'cyan',
      points: isSpecial ? 3 : 1,
    };

    setTargets((prev) => [...prev, newTarget]);

    // Cleanup target after lifetime
    setTimeout(() => {
      setTargets((prev) => prev.filter((t) => t.id !== id));
    }, TARGET_LIFETIME);
  }, []);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setTargets([]);
    setStatus('PLAYING');
    nextTargetId.current = 0;
  };

  const endGame = useCallback(() => {
    setStatus('GAMEOVER');
    if (spawnTimer.current) clearInterval(spawnTimer.current);
    if (gameTimer.current) clearInterval(gameTimer.current);
    
    setHighScore((prev) => {
      const newScore = Math.max(prev, score);
      localStorage.setItem('neon-reflex-highscore', newScore.toString());
      return newScore;
    });
  }, [score]);

  useEffect(() => {
    if (status === 'PLAYING') {
      spawnTimer.current = setInterval(spawnTarget, SPAWN_INTERVAL);
      gameTimer.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (spawnTimer.current) clearInterval(spawnTimer.current);
      if (gameTimer.current) clearInterval(gameTimer.current);
    };
  }, [status, spawnTarget, endGame]);

  const handleTargetClick = (id: string, points: number) => {
    setScore((prev) => prev + points);
    setTargets((prev) => prev.filter((t) => t.id !== id));
  };

  const [missFlash, setMissFlash] = useState(false);
  const handleFieldClick = () => {
    if (status !== 'PLAYING') return;
    setMissFlash(true);
    setScore(s => Math.max(0, s - 1));
    setTimeout(() => setMissFlash(false), 100);
  };

  const [isXOpen, setIsXOpen] = useState(false);

  return (
    <div className={`relative w-screen h-screen overflow-hidden select-none cyber-grid bg-nebula-dark flex flex-col transition-colors duration-100 ${missFlash ? 'bg-red-900/20' : ''}`}>
      {/* Community Header */}
      <div className="absolute top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-start bg-nebula-dark/60 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3 pt-2">
          <img 
            src="https://i.ibb.co.com/pBfDG6y6/IMG-20260427-221547.jpg" 
            alt="Verse Logo" 
            className="h-12 w-auto object-contain rounded"
            referrerPolicy="no-referrer"
          />
          <span className="font-display font-bold text-xl tracking-tighter text-white">VERSE ARENA</span>
        </div>
        
        <div className="flex flex-col items-end pt-1">
          <h3 className="text-white font-display font-black text-sm tracking-widest mb-2">JOIN NOW</h3>
          
          <div className="flex flex-col items-end gap-2">
            <a 
              href="https://t.me/GetVerse" 
              target="_blank" 
              rel="noreferrer"
              className="text-[#0088cc] hover:text-white transition-colors flex items-center gap-2 text-sm font-bold"
            >
              <MessageSquare size={16} />
              Telegram Group
            </a>
            
            <div className="flex flex-col items-end">
              <button 
                onClick={() => setIsXOpen(!isXOpen)}
                className="bg-black/80 text-white border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white hover:text-black transition-all flex items-center gap-2 text-xs font-bold outline-none cursor-pointer"
              >
                <Twitter size={14} />
                X Official
                <ChevronDown size={14} className={`transition-transform duration-300 ${isXOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isXOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden flex flex-col items-end mt-2 gap-1"
                  >
                    <a href="https://x.com/VerseEcosystem" target="_blank" rel="noreferrer" className="text-[#1DA1F2] hover:text-white text-xs font-medium py-1">@VerseEcosystem</a>
                    <a href="https://x.com/BitcoinCom" target="_blank" rel="noreferrer" className="text-[#1DA1F2] hover:text-white text-xs font-medium py-1">@BitcoinCom</a>
                    <a href="https://x.com/search?q=%23VerseArmy" target="_blank" rel="noreferrer" className="text-[#1DA1F2] hover:text-white text-xs font-bold py-1">#VerseArmy</a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* HUD - Always visible in game */}
      {status !== 'IDLE' && (
        <div className="absolute top-20 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
          <div className="flex flex-col gap-1 items-start">
            <span className="text-xs uppercase tracking-widest text-neon-cyan opacity-70">Current Score</span>
            <div className="flex items-center gap-2">
              <TargetIcon className="text-neon-cyan" size={24} />
              <span className="text-4xl font-display font-bold text-white neon-text-cyan">{score}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-1 items-center bg-nebula-dark/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
            <div className="flex items-center gap-3">
              <Clock className="text-neon-pink" size={20} />
              <span className={`text-4xl font-display font-bold tabular-nums ${timeLeft <= 5 ? 'text-neon-pink neon-text-pink animate-pulse' : 'text-white'}`}>
                {timeLeft}s
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 items-end">
            <span className="text-xs uppercase tracking-widest text-neon-cyan opacity-70">Best Reflex</span>
            <div className="flex items-center gap-2">
              <Trophy className="text-neon-yellow" size={24} />
              <span className="text-4xl font-display font-bold text-neon-yellow">{highScore}</span>
            </div>
          </div>
        </div>
      )}

      {/* Game Field */}
      <div className="flex-1 relative overflow-hidden" onClick={handleFieldClick}>
        <AnimatePresence>
          {status === 'PLAYING' && targets.map((target) => (
            <Target key={target.id} target={target} onClick={handleTargetClick} />
          ))}
        </AnimatePresence>
      </div>

      {/* Screens */}
      <AnimatePresence>
        {status === 'IDLE' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="max-w-md w-full bg-nebula-dark/90 backdrop-blur-xl border-2 border-neon-cyan p-12 rounded-3xl neon-glow-cyan text-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {/* Community Logo */}
                <div className="flex justify-center mb-6">
                  <img 
                    src="https://i.ibb.co.com/pBfDG6y6/IMG-20260427-221547.jpg" 
                    alt="Community Logo" 
                    className="w-48 h-auto object-contain rounded-lg shadow-lg border border-white/10"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <h1 className="text-5xl font-display font-black text-white mb-2 leading-none uppercase tracking-tighter">
                  VERSE <span className="text-neon-pink">NEON</span> ARENA
                </h1>
                <p className="text-neon-cyan tracking-[0.3em] uppercase text-sm mb-8 font-medium">Hyper-Reflex Protocol 2.4</p>
                
                <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2 text-neon-cyan mb-1">
                      <Zap size={14} />
                      <span className="text-[10px] uppercase font-bold tracking-widest">Normal</span>
                    </div>
                    <div className="text-2xl font-display font-bold">+1 PT</div>
                    <p className="text-[10px] text-white/50">Standard Targets</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2 text-neon-pink mb-1">
                      <Zap size={14} />
                      <span className="text-[10px] uppercase font-bold tracking-widest">Special</span>
                    </div>
                    <div className="text-2xl font-display font-bold">+3 PT</div>
                    <p className="text-[10px] text-white/50">Fast & Small</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={startGame}
                    className="w-full bg-neon-cyan hover:bg-white text-nebula-dark font-display font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 group text-xl uppercase tracking-tighter"
                  >
                    <Play className="group-hover:scale-110 transition-transform" fill="currentColor" />
                    Enter the Arena
                  </button>
                  <p className="text-white/30 text-xs flex items-center justify-center gap-2 italic">
                    <MousePointer2 size={12} /> Don't click empty space -1 PT
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {status === 'GAMEOVER' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="max-w-md w-full bg-nebula-dark/95 backdrop-blur-xl border-2 border-neon-pink p-12 rounded-3xl neon-glow-pink text-center">
              <h2 className="text-4xl font-display font-black text-white mb-2 leading-none uppercase tracking-tighter">
                ARENA <span className="text-neon-pink">CLEAR</span>
              </h2>
              <div className="h-px bg-neon-pink/30 w-full my-6"></div>
              
              <div className="space-y-6 mb-10">
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="text-white/50 uppercase tracking-widest text-xs font-bold">Final Score</span>
                  <span className="text-4xl font-display font-bold text-neon-cyan">{score}</span>
                </div>
                {score === highScore && score > 0 && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-neon-yellow font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Trophy size={16} /> New Record Established
                  </motion.div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={startGame}
                  className="bg-neon-pink text-white font-display font-black py-4 rounded-xl transition-all hover:bg-white hover:text-nebula-dark flex items-center justify-center gap-2 group uppercase"
                >
                  <RotateCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                  Retry
                </button>
                <button
                  onClick={() => setStatus('IDLE')}
                  className="bg-white/10 text-white font-display font-black py-4 rounded-xl transition-all hover:bg-white/20 uppercase"
                >
                  Menu
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient background particles could be added here for extra polish */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="w-full h-full relative overflow-hidden">
          {/* Decorative lines or grid effects */}
        </div>
      </div>
    </div>
  );
}
