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
  gridIndex: number;
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

interface CryptoToken {
  symbol: string;
  name: string;
  price: number;
  change: number;
  basePrice?: number;
}

const INITIAL_CRYPTO_DATA: CryptoToken[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 68150.00, change: 2.15 },
  { symbol: 'ETH', name: 'Ethereum', price: 3720.00, change: 1.45 },
  { symbol: 'BNB', name: 'BNB', price: 585.30, change: 0.35 },
  { symbol: 'USDT', name: 'Tether', price: 1.00, change: -0.01 },
  { symbol: 'XRP', name: 'Ripple', price: 0.512, change: -0.45 },
  { symbol: 'USDC', name: 'USD Coin', price: 1.00, change: 0.01 },
  { symbol: 'SOL', name: 'Solana', price: 165.80, change: -0.85 },
  { symbol: 'TRX', name: 'TRON', price: 0.122, change: 1.10 },
  { symbol: 'VERSE', name: 'Verse', price: 0.000028, change: 0.00 },
];

// --- Components ---

interface TargetProps {
  target: TargetData;
  onClick: (id: string, points: number) => void;
}

const Target: React.FC<TargetProps> = ({ target, onClick }) => {
  return null; // Rendered inline in grid cells
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

  const [cryptoData, setCryptoData] = useState<CryptoToken[]>(INITIAL_CRYPTO_DATA);

  // Live real-time market polling from real public crypto APIs with zero artificial drift
  useEffect(() => {
    const updatePrices = async () => {
      // Create a mutable copy of our current states
      let updatedData = [...INITIAL_CRYPTO_DATA];

      // 1. Fetch live real-time spot rates from Binance (extremely fast, CORS support)
      try {
        const binanceRes = await fetch(
          'https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22%2C%22ETHUSDT%22%2C%22BNBUSDT%22%2C%22XRPUSDT%22%2C%22SOLUSDT%22%2C%22TRXUSDT%22%5D'
        );
        if (binanceRes.ok) {
          const arr = await binanceRes.json();
          if (Array.isArray(arr)) {
            const symMap: Record<string, string> = {
              BTCUSDT: 'BTC',
              ETHUSDT: 'ETH',
              BNBUSDT: 'BNB',
              XRPUSDT: 'XRP',
              SOLUSDT: 'SOL',
              TRXUSDT: 'TRX',
            };
            arr.forEach((item: any) => {
              const matchedSymbol = symMap[item.symbol];
              if (matchedSymbol) {
                const tokenIdx = updatedData.findIndex((t) => t.symbol === matchedSymbol);
                if (tokenIdx !== -1) {
                  const lastPrice = parseFloat(item.lastPrice);
                  const priceChangePercent = parseFloat(item.priceChangePercent) || 0;
                  if (lastPrice > 0) {
                    updatedData[tokenIdx] = {
                      ...updatedData[tokenIdx],
                      price: lastPrice,
                      change: priceChangePercent,
                      basePrice: lastPrice,
                    };
                  }
                }
              }
            });
          }
        }
      } catch (err) {
        console.warn('Binance real-time API rate lookup failed, falling back...', err);
      }

      // 2. Supplement and support other tokens (like USDT, USDC stablecoins) via CoinCap Assets API
      try {
        const coincapRes = await fetch('https://api.coincap.io/v2/assets?limit=100');
        if (coincapRes.ok) {
          const json = await coincapRes.json();
          if (json && Array.isArray(json.data)) {
            const capMap: Record<string, string> = {
              bitcoin: 'BTC',
              ethereum: 'ETH',
              'binance-coin': 'BNB',
              tether: 'USDT',
              ripple: 'XRP',
              'usd-coin': 'USDC',
              solana: 'SOL',
              tron: 'TRX',
            };
            json.data.forEach((asset: any) => {
              const matchedSymbol = capMap[asset.id] || (asset.symbol && asset.symbol.toUpperCase());
              if (matchedSymbol) {
                const tokenIdx = updatedData.findIndex((t) => t.symbol === matchedSymbol);
                if (tokenIdx !== -1) {
                  // Only update if it wasn't set by higher priority source or is a stablecoin
                  const currentToken = updatedData[tokenIdx];
                  const priceUsd = parseFloat(asset.priceUsd);
                  const changePercent24Hr = parseFloat(asset.changePercent24Hr) || 0;
                  
                  if (priceUsd > 0) {
                    updatedData[tokenIdx] = {
                      ...currentToken,
                      price: priceUsd,
                      change: changePercent24Hr,
                      basePrice: priceUsd,
                    };
                  }
                }
              }
            });
          }
        }
      } catch (err) {
        console.warn('CoinCap fallback asset rates throttled:', err);
      }

      // 3. Retrieve real-time VERSE token pricing from decentralized Uniswap pools via DexScreener API
      try {
        const dexscreenerRes = await fetch(
          'https://api.dexscreener.com/latest/dex/tokens/0x7ae044f50010af61d49408731cd27f3745cce2f4'
        );
        if (dexscreenerRes.ok) {
          const dsData = await dexscreenerRes.json();
          if (dsData && Array.isArray(dsData.pairs) && dsData.pairs.length > 0) {
            // Pick primary active liquidity pair
            const pair = dsData.pairs[0];
            const liveVersePrice = parseFloat(pair.priceUsd);
            const liveVerseChange = parseFloat(pair.priceChange?.h24) || 0;
            
            const verseIdx = updatedData.findIndex((t) => t.symbol === 'VERSE');
            if (verseIdx !== -1 && liveVersePrice > 0) {
              updatedData[verseIdx] = {
                ...updatedData[verseIdx],
                price: liveVersePrice,
                change: liveVerseChange,
                basePrice: liveVersePrice,
              };
            }
          }
        }
      } catch (err) {
        console.warn('DexScreener API bypass, testing primary CoinGecko fallback for VERSE...', err);
        
        // Fallback: Fetch VERSE from CoinGecko’s simple price endpoint
        try {
          const geckoRes = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=verse&vs_currencies=usd&include_24hr_change=true'
          );
          if (geckoRes.ok) {
            const data = await geckoRes.json();
            if (data && data.verse) {
              const versePrice = parseFloat(data.verse.usd);
              const verseChange = parseFloat(data.verse.usd_24h_change) || 0;
              const verseIdx = updatedData.findIndex((t) => t.symbol === 'VERSE');
              if (verseIdx !== -1 && versePrice > 0) {
                updatedData[verseIdx] = {
                  ...updatedData[verseIdx],
                  price: versePrice,
                  change: verseChange,
                  basePrice: versePrice,
                };
              }
            }
          }
        } catch (cgErr) {
          console.warn('CoinGecko query failed for VERSE:', cgErr);
        }
      }

      // 4. Guarantee VERSE has fallback value and stablecoins have exact price metrics if completely offline
      updatedData = updatedData.map((token) => {
        // Enforce fallback boundaries if external calls were temporarily interrupted or blocked
        if (token.symbol === 'VERSE' && (!token.price || token.price === 0)) {
          return {
            ...token,
            price: 0.000028,
            change: 0.00,
            basePrice: 0.000028,
          };
        }
        if ((token.symbol === 'USDT' || token.symbol === 'USDC') && (!token.price || token.price === 0)) {
          return {
            ...token,
            price: 1.00,
            change: 0.00,
            basePrice: 1.00,
          };
        }
        if (!token.basePrice) {
          return {
            ...token,
            basePrice: token.price,
          };
        }
        return token;
      });

      // Update state with pure live market coordinates directly
      setCryptoData(updatedData);
    };

    // Trigger instant fetch on load
    updatePrices();

    // Query official servers every 6 seconds to stay perfectly synchronized to active global markets
    const apiInterval = setInterval(updatePrices, 6000);

    return () => {
      clearInterval(apiInterval);
    };
  }, []);

  const nextTargetId = useRef(0);
  const spawnTimer = useRef<NodeJS.Timeout | null>(null);
  const gameTimer = useRef<NodeJS.Timeout | null>(null);

  // --- Game Logic ---

  const spawnTarget = useCallback(() => {
    const id = `target-${nextTargetId.current++}`;
    const isSpecial = Math.random() > 0.8;
    
    setTargets((prev) => {
      const activeIndices = prev.map((t) => t.gridIndex);
      const availableIndices = Array.from({ length: 16 }, (_, i) => i).filter(
        (i) => !activeIndices.includes(i)
      );

      if (availableIndices.length === 0) return prev; // No empty slots

      const gridIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      
      const newTarget: TargetData = {
        id,
        gridIndex,
        x: 0,
        y: 0,
        size: isSpecial ? 40 : 60,
        color: isSpecial ? 'pink' : 'cyan',
        points: isSpecial ? 3 : 1,
      };

      setTimeout(() => {
        setTargets((current) => current.filter((t) => t.id !== id));
      }, TARGET_LIFETIME);

      return [...prev, newTarget];
    });
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

  const handleBackToMenu = () => {
    if (spawnTimer.current) clearInterval(spawnTimer.current);
    if (gameTimer.current) clearInterval(gameTimer.current);
    setTargets([]);
    setStatus('IDLE');
  };

  const [isXOpen, setIsXOpen] = useState(false);

  return (
    <div className={`relative w-screen h-screen overflow-hidden select-none cyber-grid bg-nebula-dark flex flex-col transition-colors duration-100 ${missFlash ? 'bg-red-900/20' : ''}`}>
      {/* Real-time Present & Future Crypto Market Prize Ticker */}
      {status === 'IDLE' && (
        <div className="absolute top-0 left-0 w-full bg-black/95 border-b border-neon-cyan/25 h-10 flex items-center z-[100] overflow-hidden select-none shadow-[0_2px_15px_rgba(0,0,0,0.5)]">
          {/* Title Badging */}
          <div className="flex items-center gap-2 px-4 h-full bg-gradient-to-r from-neon-cyan/15 to-[#050608] border-r border-white/10 z-10 shrink-0 select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-cyan"></span>
            </span>
            <span className="font-display font-black text-xs uppercase tracking-tight bg-gradient-to-r from-neon-cyan via-neon-yellow to-neon-pink bg-clip-text text-transparent drop-shadow-sm">
              Present Crypto Market Prize
            </span>
          </div>
          
          {/* Scrollable ticker animation */}
          <div className="flex-1 overflow-hidden h-full flex items-center relative">
            <div className="scrolling-ticker flex items-center gap-8 px-4">
              {/* Double up items for continuous loops */}
              {[...cryptoData, ...cryptoData].map((token, idx) => {
                const isPositive = token.change >= 0;
                return (
                  <div key={`${token.symbol}-${idx}`} className="flex items-center gap-3 text-[11px] font-mono whitespace-nowrap">
                    {/* Token Icon Symbol */}
                    <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-neon-cyan">
                      {token.symbol}
                    </span>
                    <span className="text-white/50 text-[10px] uppercase font-semibold">
                      {token.name}
                    </span>
                    
                    {/* Present Price */}
                    <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                      <span className="text-white/40 text-[9px]">LIVE:</span>
                      <span className="text-white font-bold tabular-nums">
                        ${token.price < 0.1 ? token.price.toFixed(6) : token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </span>
                      <span className={`text-[10px] font-bold flex items-center tabular-nums ${isPositive ? 'text-[#00ff99]' : 'text-neon-pink'}`}>
                        {isPositive ? '▲' : '▼'}{Math.abs(token.change).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Community Header */}
      <div className={`absolute left-0 w-full z-50 px-6 py-4 flex justify-between items-start bg-nebula-dark/60 backdrop-blur-md border-b border-white/5 transition-all duration-300 ${status === 'IDLE' ? 'top-10' : 'top-0'}`}>
        <div className="flex flex-col items-start pt-2">
          <div className="flex items-center gap-3">
            <img 
              src="https://i.ibb.co.com/jZZjk7Cq/file-0000000062d871fa8829f2df43a8f1be.png" 
              alt="Verse Logo" 
              className="h-12 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="font-display font-bold text-xl tracking-tighter text-white">VERSE ARENA</span>
          </div>
          {status !== 'IDLE' && (
            <button 
              onClick={handleBackToMenu}
              className="mt-2 flex items-center gap-1 text-[11px] font-mono uppercase bg-white/5 border border-white/10 hover:border-neon-pink hover:bg-neon-pink/10 hover:text-white text-neon-pink px-2.5 py-1 rounded transition-all cursor-pointer"
            >
              ← Back
            </button>
          )}
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
        <div className="absolute top-28 sm:top-24 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
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

      {/* Game Field - 16 Cell Board Grid */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 pt-32 sm:pt-28 pb-8 relative" onClick={handleFieldClick}>
        <AnimatePresence>
          {status === 'PLAYING' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-[340px] sm:max-w-md aspect-square bg-[#0c0d14]/90 backdrop-blur-xl rounded-2xl border border-white/10 p-3 sm:p-4 grid grid-cols-4 grid-rows-4 gap-2 sm:gap-3 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10"
            >
              {Array.from({ length: 16 }).map((_, index) => {
                const activeTarget = targets.find((t) => t.gridIndex === index);
                return (
                  <div 
                    key={index} 
                    className="relative rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-center overflow-hidden hover:bg-white/[0.03] transition-all group"
                    style={{ aspectRatio: '1/1' }}
                  >
                    {/* Grid room number marker */}
                    <span className="absolute top-1 left-1.5 font-mono text-[9px] text-white/15 select-none font-bold">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    
                    {/* Pop-up target piece/guti */}
                    <AnimatePresence mode="popLayout">
                      {activeTarget && (
                        <motion.button
                          key={activeTarget.id}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTargetClick(activeTarget.id, activeTarget.points);
                          }}
                          className={`absolute inset-1.5 rounded-xl flex items-center justify-center transition-all p-1 outline-none border-2
                            ${activeTarget.points > 1 
                              ? 'bg-neon-pink/15 border-neon-pink shadow-[0_0_15px_rgba(255,0,127,0.4)] animate-pulse' 
                              : 'bg-neon-cyan/15 border-neon-cyan shadow-[0_0_15px_rgba(0,191,255,0.4)]'}
                          `}
                        >
                          {/* Logo as the piece fully covering the cell bubble */}
                          <img 
                            src="https://i.ibb.co.com/jZZjk7Cq/file-0000000062d871fa8829f2df43a8f1be.png" 
                            alt="Target Piece" 
                            className="w-full h-full object-contain pointer-events-none"
                            referrerPolicy="no-referrer"
                          />
                          {/* Special badge */}
                          {activeTarget.points > 1 && (
                            <span className="absolute bottom-1 right-1 bg-neon-pink text-white text-[8px] font-black px-1 rounded select-none shadow-md">
                              3X
                            </span>
                          )}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          )}
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
                    src="https://i.ibb.co.com/jZZjk7Cq/file-0000000062d871fa8829f2df43a8f1be.png" 
                    alt="Community Logo" 
                    className="w-48 h-auto object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <h1 className="text-3xl font-display font-black text-white mb-4 leading-tight uppercase tracking-tight">
                  <span className="bg-gradient-to-r from-neon-cyan via-[#00ff99] to-neon-yellow bg-clip-text text-transparent block filter drop-shadow-[0_2px_8px_rgba(0,242,255,0.3)]">
                    Crypto Market
                  </span>
                  <span className="text-xs font-semibold tracking-[0.25em] text-white/40 block my-1">
                    — AND —
                  </span>
                  <span className="bg-gradient-to-r from-neon-pink via-[#da5ffd] to-[#00f2ff] bg-clip-text text-transparent block filter drop-shadow-[0_2px_8px_rgba(255,0,127,0.3)]">
                    Verse Neon Arena
                  </span>
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
                    Play Naw Go Go
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
