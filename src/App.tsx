import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  ArrowLeftRight, 
  ShieldCheck, 
  Wallet, 
  Globe, 
  Award, 
  Landmark, 
  Users, 
  Cpu, 
  Layers, 
  HelpCircle, 
  Activity, 
  ChevronRight, 
  Info, 
  DollarSign, 
  RefreshCw, 
  Send, 
  ThumbsUp, 
  MessageSquare, 
  Twitter, 
  ChevronDown, 
  BookOpen, 
  AlertTriangle,
  Flame,
  MousePointer2,
  Lock,
  ExternalLink,
  Coins
} from 'lucide-react';

// --- Interface Types ---
interface CryptoToken {
  symbol: string;
  name: string;
  price: number;
  change: number;
  basePrice?: number;
}

interface Proposal {
  id: string;
  title: string;
  type: string;
  author: string;
  votes: number;
  tags: string[];
  status: 'ACTIVE' | 'PASSED' | 'REVIEW';
  comments: string[];
  timestamp: string;
}

interface MarketTrade {
  time: string;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
}

// --- Initial Polling Data (Keeps your live polling configuration perfectly alive!) ---
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

export default function App() {
  const [cryptoData, setCryptoData] = useState<CryptoToken[]>(INITIAL_CRYPTO_DATA);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRADING' | 'SWAP' | 'GOVERNANCE' | 'GUIDE'>('OVERVIEW');
  const [userLanguage] = useState<'BN' | 'EN'>('EN');

  // --- Real-Time Polling Engine (Binance & DexScreener & CoinCap Fallback) ---
  useEffect(() => {
    const updatePrices = async () => {
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
        console.warn('Binance real-time API lookup bypassed/failed:', err);
      }

      // 2. Supplement other tokens via CoinCap Assets API
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

      // 3. Fetch VERSE token real-time rate from DexScreener (decentralized Uniswap pools)
      try {
        const dexscreenerRes = await fetch(
          'https://api.dexscreener.com/latest/dex/tokens/0x7ae044f50010af61d49408731cd27f3745cce2f4'
        );
        if (dexscreenerRes.ok) {
          const dsData = await dexscreenerRes.json();
          if (dsData && Array.isArray(dsData.pairs) && dsData.pairs.length > 0) {
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
        console.warn('DexScreener bypass, trying CoinGecko lookup for VERSE...', err);
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
          console.warn('CoinGecko backup query failed too:', cgErr);
        }
      }

      // 4. Fallback boundaries
      updatedData = updatedData.map((token) => {
        if (token.symbol === 'VERSE' && (!token.price || token.price === 0)) {
          return { ...token, price: 0.000028, change: 0.00, basePrice: 0.000028 };
        }
        if ((token.symbol === 'USDT' || token.symbol === 'USDC') && (!token.price || token.price === 0)) {
          return { ...token, price: 1.00, change: 0.00, basePrice: 1.00 };
        }
        if (!token.basePrice) {
          return { ...token, basePrice: token.price };
        }
        return token;
      });

      setCryptoData(updatedData);
    };

    updatePrices();
    const apiInterval = setInterval(updatePrices, 6000);
    return () => clearInterval(apiInterval);
  }, []);

  // Retrieve VERSE dynamic live price from real-time state for calculation engine components
  const verseLiveMarketPrice = useMemo(() => {
    const vToken = cryptoData.find(t => t.symbol === 'VERSE');
    return vToken ? vToken.price : 0.000028;
  }, [cryptoData]);

  const verseLive24hChange = useMemo(() => {
    const vToken = cryptoData.find(t => t.symbol === 'VERSE');
    return vToken ? vToken.change : 0.0;
  }, [cryptoData]);

  // --- Trading Simulator Settings & State (Bitcoin.com Wallet Trading Module) ---
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [tradePriceMode, setTradePriceMode] = useState<'LIMIT' | 'MARKET'>('MARKET');
  const [tradeAmountUSD, setTradeAmountUSD] = useState<string>('150');
  const [leverage, setLeverage] = useState<number>(1);
  const [chartTimeframe, setChartTimeframe] = useState<'5M' | '15M' | '1H' | '1D'>('15M');
  const [recentLiveTrades, setRecentLiveTrades] = useState<MarketTrade[]>([
    { time: '14:59:01', type: 'BUY', price: verseLiveMarketPrice * 1.001, amount: 450000 },
    { time: '14:58:45', type: 'SELL', price: verseLiveMarketPrice * 0.998, amount: 120000 },
    { time: '14:58:30', type: 'BUY', price: verseLiveMarketPrice, amount: 800000 },
    { time: '14:57:12', type: 'BUY', price: verseLiveMarketPrice * 1.003, amount: 1250000 },
    { time: '14:56:59', type: 'SELL', price: verseLiveMarketPrice * 0.999, amount: 280000 },
  ]);
  const [userBalanceUSDT, setUserBalanceUSDT] = useState<number>(3150.00);
  const [userBalanceVERSE, setUserBalanceVERSE] = useState<number>(8500000);
  const [tradeActionMessage, setTradeActionMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Auto-generate fresh simulation trades every few seconds anchored to the real rate
  useEffect(() => {
    const tradeSimulatorInterval = setInterval(() => {
      const isBuy = Math.random() > 0.45;
      const deviation = 1 + (Math.random() * 0.006 - 0.003);
      const generatedPrice = verseLiveMarketPrice * deviation;
      const generatedAmount = Math.floor(Math.random() * 150000) + 10000;
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      setRecentLiveTrades((prev) => [
        { time: timeStr, type: isBuy ? 'BUY' : 'SELL', price: generatedPrice, amount: generatedAmount },
        ...prev.slice(0, 7),
      ]);
    }, 4000);

    return () => clearInterval(tradeSimulatorInterval);
  }, [verseLiveMarketPrice]);

  const handleExecuteTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const usdAmount = parseFloat(tradeAmountUSD);
    if (isNaN(usdAmount) || usdAmount <= 0) {
      setTradeActionMessage({ text: 'অনুগ্রহ করে সঠিক পরিমাণ ডলার (USD) প্রদান করুন।', error: true });
      return;
    }

    if (tradeType === 'BUY') {
      if (usdAmount > userBalanceUSDT) {
        setTradeActionMessage({ text: 'আপনার ওয়ালেটে পর্যাপ্ত USDT ব্যালেন্স নেই!', error: true });
        return;
      }
      const verseTokensBought = (usdAmount * leverage) / verseLiveMarketPrice;
      setUserBalanceUSDT((p) => p - usdAmount);
      setUserBalanceVERSE((p) => p + verseTokensBought);
      
      const audioSuccess = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
      audioSuccess.volume = 0.15;
      audioSuccess.play().catch(() => {});

      setTradeActionMessage({ 
        text: `সাফল্যের সাথে ${verseTokensBought.toLocaleString(undefined, { maximumFractionDigits: 0 })} VERSE টোকেন বায় করা হয়েছে!`, 
        error: false 
      });
    } else {
      const verseToSell = (usdAmount * leverage) / verseLiveMarketPrice;
      if (verseToSell > userBalanceVERSE) {
        setTradeActionMessage({ text: 'আপনার ওয়ালেটে পর্যাপ্ত VERSE টোকেন ব্যালেন্স নেই!', error: true });
        return;
      }
      setUserBalanceVERSE((p) => p - verseToSell);
      setUserBalanceUSDT((p) => p + usdAmount);

      const audioSuccess = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
      audioSuccess.volume = 0.15;
      audioSuccess.play().catch(() => {});

      setTradeActionMessage({ 
        text: `সাফল্যের সাথে ${(verseToSell).toLocaleString(undefined, { maximumFractionDigits: 0 })} VERSE টোকেন সেল করা হয়েছে ও ওয়ালেটে $${usdAmount} যোগ হয়েছে!`, 
        error: false 
      });
    }

    setTimeout(() => {
      setTradeActionMessage(null);
    }, 5000);
  };

  // --- Swap & Yield Calculator Engine State ---
  const [swapFromToken, setSwapFromToken] = useState<string>('VERSE');
  const [swapToToken, setSwapToToken] = useState<string>('USDT');
  const [swapInputAmount, setSwapInputAmount] = useState<string>('100000');
  
  const calculatedSwapResult = useMemo(() => {
    const inputVal = parseFloat(swapInputAmount);
    if (isNaN(inputVal) || inputVal <= 0) return { outAmount: 0, path: [], fee: 0, priceImpact: '0.00%' };

    const fromTokenObj = cryptoData.find(t => t.symbol === swapFromToken) || { price: 1 };
    const toTokenObj = cryptoData.find(t => t.symbol === swapToToken) || { price: 1 };

    const totalValueUSD = inputVal * fromTokenObj.price;
    const outputAmount = totalValueUSD / toTokenObj.price;
    const poolFee = totalValueUSD * 0.003; // 0.3% routing pool fee typical for Verse DEX

    // Simulated slippage impact
    let priceImpact = '0.05%';
    if (totalValueUSD > 1000) priceImpact = '0.45%';
    if (totalValueUSD > 15000) priceImpact = '3.50% (High Slippage)';

    return {
      outAmount: outputAmount,
      path: [swapFromToken, 'VERSE_DEFI_POOL', swapToToken],
      fee: poolFee,
      priceImpact
    };
  }, [swapInputAmount, swapFromToken, swapToToken, cryptoData]);

  // Staking Staker simulation
  const [stakingVerseAmount, setStakingVerseAmount] = useState<string>('2000000');
  const [stakingDurationDays, setStakingDurationDays] = useState<number>(365);
  
  // Calculate staking outputs
  const calculatedStakingYield = useMemo(() => {
    const verseAmount = parseFloat(stakingVerseAmount);
    if (isNaN(verseAmount) || verseAmount <= 0) return { rewards: 0, valueUSD: 0, apy: 0 };
    
    // Staking tiers based on lock period
    let apy = 12.5; // default 12.5% APY
    if (stakingDurationDays > 180) apy = 18.2;
    if (stakingDurationDays >= 365) apy = 24.8; // premium pool APY

    const rewardTokens = (verseAmount * (apy / 100) * (stakingDurationDays / 365));
    const rewardsUSD = rewardTokens * verseLiveMarketPrice;

    return {
      rewards: rewardTokens,
      valueUSD: rewardsUSD,
      apy
    };
  }, [stakingVerseAmount, stakingDurationDays, verseLiveMarketPrice]);


  // --- Verse Community Governance State ---
  const [newProposalTitle, setNewProposalTitle] = useState('');
  const [newProposalType, setNewProposalType] = useState('Marketing Campaign');
  const [newProposalAuthor, setNewProposalAuthor] = useState('');
  const [newProposalMessage, setNewProposalMessage] = useState('');
  const [governanceProposals, setGovernanceProposals] = useState<Proposal[]>([
    {
      id: 'prop-1',
      title: 'Verse Staking Multiplier Boost on Polygon Network LP',
      type: 'LP Rewards Program',
      author: '0xVerseCommander',
      votes: 1420,
      tags: ['Staking Incentives', 'Polygon', 'Yield Farming'],
      status: 'ACTIVE',
      comments: [
        'Great proposal! Polygon users have been requesting this for months.',
        'Agree, 24% APY will attract significant deep TVL liquidity from Ethereum mainnet.',
        'Will this increase the local VERSE emission rate?'
      ],
      timestamp: '2026-06-03'
    },
    {
      id: 'prop-2',
      title: 'Global Discord/Telegram Interactive Trading Bot Integration',
      type: 'Community Integration',
      author: 'Niloy_VerseArmy',
      votes: 980,
      tags: ['Telegram Bot', 'Trading Suite', '#VerseArmy'],
      status: 'PASSED',
      comments: [
        'Awesome, this fits decentralized trading directly with the Bitcoin.com Wallet!',
        'User experience will dramatically improve. Direct price alerts on Telegram.'
      ],
      timestamp: '2026-06-02'
    },
    {
      id: 'prop-3',
      title: 'Monthly Buy-back-and-burn Initiative fueled by DEX Trading Fee Profits',
      type: 'Deflationary Protocol',
      author: 'SatoshiVerse',
      votes: 2150,
      tags: ['Burn Ecosystem', 'Deflationary', 'VERSE Pool'],
      status: 'ACTIVE',
      comments: [
        'Extremely bullish! Deflation raises token value organically for the global community.',
        'This is the single most important factor for long-term health.',
        'Implemented with smart contracts, it would be unstoppable!'
      ],
      timestamp: '2026-06-01'
    }
  ]);

  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProposalTitle.trim() || !newProposalMessage.trim()) {
      alert('অনুগ্রহ করে সঠিক টাইটেল এবং বিস্তারিত প্রস্তাবনা মেসেজ লিখুন।');
      return;
    }

    const payload: Proposal = {
      id: `prop-${Date.now()}`,
      title: newProposalTitle,
      type: newProposalType,
      author: newProposalAuthor.trim() || 'Anonymous_VerseWarrior',
      votes: 1,
      tags: [newProposalType, '#VerseArmy', 'CommunityProposal'],
      status: 'ACTIVE',
      comments: [newProposalMessage],
      timestamp: new Date().toISOString().split('T')[0]
    };

    setGovernanceProposals(prev => [payload, ...prev]);
    setNewProposalTitle('');
    setNewProposalMessage('');
    setNewProposalAuthor('');

    // Play a friendly simulated success sound
    const audioSu = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
    audioSu.volume = 0.1;
    audioSu.play().catch(() => {});
  };

  const handleVoteProposal = (id: string) => {
    setGovernanceProposals(prev =>
      prev.map(p => p.id === id ? { ...p, votes: p.votes + 1 } : p)
    );
  };

  const [activeInteractiveConcept, setActiveInteractiveConcept] = useState<number>(0);

  const CONCEPT_STEPS: any[] = [
    {
      title: "Bitcoin.com Wallet Core",
      detailEN: "Ecosystem users swap, trade, store securely without middleman custody.",
      detailBN: "ইউজাররা কোনো প্রকার থার্ড-পার্টি ছাড়াই সরাসরি তাদের নিজস্ব Bitcoin.com ওয়ালেটে টোকেন সুরক্ষিতভাবে স্টোর ও ইনস্ট্যান্ট ট্রেড বা সোয়াপ করে থাকেন।",
      badge: "Non-Custodial Secure Base Pipeline"
    },
    {
      title: "Verse DEX Liquidity Pools",
      detailEN: "Enables instantaneous permissionless trades. LP providers receive a share of the 0.3% protocol fee.",
      detailBN: "সম্পূর্ণ ডিসেন্ট্রালাইজড পন্থায় ইনস্ট্যান্ট লিকুইডিটি পুল অ্যাক্সেস। এলপি প্রভাইডাররা প্রতিটি সোয়াপ ট্রেডিং ভলিউমের ০.৩% পারসেন্ট প্রোটোকল ফি লভ্যাংশ হিসেবে আর্ন করেন।",
      badge: "Amm Staking Mechanism"
    },
    {
      title: "Community Rewards Program",
      detailEN: "Active rewards for utility, completing learn-to-earn courses, cashback in Visa Card payments, community microtasks.",
      detailBN: "সরাসরি Learn-to-Earn কুইজ সমাধান করে, দৈনন্দিন ট্রেডিং কমপ্লিট করে অথবা প্রমোশনাল টাস্কের মাধ্যমে নিয়মিত Verse টোকেন বোনাস পুরষ্কার রিসিভ করা যায়।",
      badge: "#VerseArmy Incentives"
    },
    {
      title: "Dao Community Voting",
      detailEN: "Ecosystem direction is democratically decided by members staking their VERSE to vote on development and marketing programs.",
      detailBN: "ভার্স ইকোসিস্টেমের ভবিষ্যৎ ডেভলপমেন্ট প্ল্যান এবং মার্কেটিং প্রপোজাল সম্পূর্ণ ডেমোক্রেটিক পদ্ধতিতে ইউজারদের ভোটিংয়ের ওপর ভিত্তি করে ডিক্লেয়ার করা হয়।",
      badge: "Decentralized On-Chain Governance"
    }
  ];

  return (
    <div className="relative w-full min-h-screen bg-nebula-dark text-white select-text font-sans pb-16">
      
      {/* 1. Real-Time Dynamic Crypto Live Market Banner Ticker */}
      <div className="sticky top-0 left-0 w-full bg-[#050608]/98 backdrop-blur-md border-b border-neon-cyan/20 h-10 flex items-center z-[110] overflow-hidden select-none shadow-[0_2px_15px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-1.5 px-3 sm:px-4 h-full bg-gradient-to-r from-neon-cyan/15 to-[#050608] border-r border-white/5 z-10 shrink-0 select-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-display font-bold text-[9px] sm:text-[11px] uppercase tracking-wider bg-gradient-to-r from-neon-cyan via-[#00ff99] to-neon-yellow bg-clip-text text-transparent">
            Live Global Spot Markets
          </span>
        </div>
        
        <div className="flex-1 overflow-hidden h-full flex items-center relative">
          <div className="scrolling-ticker flex items-center gap-8 px-4">
            {[...cryptoData, ...cryptoData].map((token, idx) => {
              const isPositive = token.change >= 0;
              const isVerse = token.symbol === 'VERSE';
              return (
                <div key={`${token.symbol}-${idx}`} className={`flex items-center gap-2.5 text-[11px] font-mono whitespace-nowrap px-1 rounded transition-colors ${isVerse ? 'bg-neon-cyan/10 border border-neon-cyan/25' : ''}`}>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isVerse ? 'bg-neon-cyan text-black font-black' : 'bg-white/5 border border-white/10 text-neon-cyan'}`}>
                    {token.symbol}
                  </span>
                  <span className="text-white/60 text-[10px] uppercase font-medium">
                    {token.name}
                  </span>
                  
                  <div className="flex items-center gap-1 border-l border-white/15 pl-2.5">
                    <span className="text-white font-bold tabular-nums">
                      ${token.price < 0.01 ? token.price.toFixed(6) : token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </span>
                    <span className={`text-[10px] font-bold flex items-center tabular-nums ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '▲' : '▼'}{Math.abs(token.change).toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hero Header Space */}
      <div className="relative w-full border-b border-white/5 bg-gradient-to-b from-[#11121c] to-[#0a0a0c] overflow-hidden px-4 py-8 sm:py-14 cyber-grid">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-10">
          
          <div className="flex-1 text-center lg:text-left space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-neon-cyan font-mono font-semibold">
              <Flame size={14} className="text-neon-pink animate-pulse" />
              <span>OFFICIAL VERSE ARMY COMMUNITY GATEWAY</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-display font-black tracking-tight text-white leading-tight uppercase">
              {userLanguage === 'BN' ? (
                <>
                  ভার্স <span className="bg-gradient-to-r from-neon-cyan via-[#00ff99] to-neon-yellow bg-clip-text text-transparent">ইকোসিস্টেম</span> <br /> 
                  ও <span className="bg-gradient-to-r from-neon-pink via-[#ca62fe] to-[#00f2ff] bg-clip-text text-transparent">কমিউনিটি</span> পোর্টাল
                </>
              ) : (
                <>
                  Verse <span className="bg-gradient-to-r from-neon-cyan via-[#00ff99] to-neon-yellow bg-clip-text text-transparent">Ecosystem</span> <br /> 
                  & <span className="bg-gradient-to-r from-neon-pink via-[#ca62fe] to-[#00f2ff] bg-clip-text text-transparent">Community</span> Station
                </>
              )}
            </h1>

            <p className="text-sm sm:text-base text-white/70 max-w-2xl leading-relaxed">
              {userLanguage === 'BN' ? (
                "ভার্স (VERSE) হলো Bitcoin.com-এর অফিসিয়াল ইউটিলিটি ইকোসিস্টেম টোকেন। এটি ডিসেন্ট্রালাইজড ফাইন্যান্স (DeFi), সিকিউর নন-কাস্টোডিয়াল ওয়ালেট ট্রেডিং, ডেক্স লিকুইডিটি পুল এবং লাখ লাখ বিশ্বস্ত মেম্বারদের সমন্বয়ে গঠিত একটি বৈশ্বিক শক্তিশালী কমিউনিটি দ্বারা চালিত হয়।"
              ) : (
                "Verse (VERSE) is the official utility ecosystem token of Bitcoin.com. It is powered by decentralized finance (DeFi), secure non-custodial wallet trading, liquidity pools, and is driven by an incredible global community of millions."
              )}
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-2">
              <a 
                href="https://t.me/GetVerse" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-[#0088cc] hover:bg-white hover:text-black text-white font-semibold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all flex items-center gap-2 border border-[#0088cc]/20 shadow-[0_0_20px_rgba(0,136,204,0.3)] cursor-pointer"
              >
                <MessageSquare size={18} />
                <span>টেলিগ্রাম গ্রুপ জয়েন করুন</span>
              </a>
              <div className="flex items-center gap-2">
                <a 
                  href="https://x.com/VerseEcosystem" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-black/40 border border-white/10 hover:border-white text-white font-semibold text-xs sm:text-sm px-4 py-3 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Twitter size={16} className="text-[#1DA1F2]" />
                  <span>@VerseEcosystem</span>
                </a>
                <a 
                  href="https://x.com/BitcoinCom" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-black/40 border border-white/10 hover:border-white text-white font-semibold text-[11px] sm:text-xs px-3.5 py-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Twitter size={14} className="text-white/60" />
                  <span>@BitcoinCom</span>
                </a>
              </div>
            </div>
          </div>

          {/* High-fidelity interactive concept poster & current Verse ticker */}
          <div className="w-full lg:w-[480px] shrink-0">
            <div className="relative rounded-3xl border border-neon-cyan/20 bg-slate-950/80 backdrop-blur-md p-6 shadow-[0_0_40px_rgba(0,242,255,0.08)]">
              
              <div className="absolute -top-3.5 -right-3 px-3 py-1 bg-neon-cyan text-neutral-950 font-black text-[10px] tracking-widest rounded-md uppercase shadow-lg select-none">
                LIVE METRICS
              </div>

              <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                <img 
                  src="https://i.ibb.co.com/PGJhM7zt/file-0000000099f071fd85bdf42c0cb05613.png" 
                  alt="Verse Community" 
                  className="w-12 h-12 rounded-xl object-contain bg-white/5 p-1 border border-white/10 shadow-[0_0_15px_rgba(0,242,255,0.15)]"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="font-display font-medium text-white text-lg">VERSE Utility Ecosystem</h3>
                  <p className="text-[11px] text-white/50 uppercase font-mono">Bitcoin.com Official Token</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider font-mono font-bold mb-1">Live Price (USD)</div>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tight tabular-nums">
                    ${verseLiveMarketPrice.toFixed(6)}
                  </div>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider font-mono font-bold mb-1">24H Market Move</div>
                  <div className={`text-xl sm:text-2xl font-mono font-bold tracking-tight flex items-center gap-1 ${verseLive24hChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span>{verseLive24hChange >= 0 ? '▲' : '▼'}</span>
                    <span>{Math.abs(verseLive24hChange).toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-neon-cyan/[0.03] border border-neon-cyan/15 rounded-2xl p-4 text-center">
                <div className="text-xs font-mono text-neon-cyan font-bold uppercase tracking-widest flex items-center justify-center gap-2 mb-1.5 animate-pulse">
                  <Activity size={12} />
                  <span>Interactive Real-time Target Value</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed font-mono">
                  {userLanguage === 'BN' ? (
                    `VERSE টোকেনের বর্তমান রেট ${verseLiveMarketPrice <= 0.0000281 && verseLiveMarketPrice >= 0.0000279 ? 'কাঙ্ক্ষিত US$0.000028' : `$${verseLiveMarketPrice.toFixed(6)}`} জেনুইন মার্কেট অনুযায়ী প্রতি সেকেন্ডে লাইভ রিফ্রেশ হচ্ছে!`
                  ) : (
                    `Current rate matches live decentralized order books at $${verseLiveMarketPrice.toFixed(6)}, syncing directly from active on-chain metrics.`
                  )}
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Interactive Tabs Navigation Menu */}
      <div className="bg-[#050608] sticky top-10 border-b border-white/5 z-[100] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto scrollbar-hide">
          <div className="flex space-x-1.5 py-4 shrink-0">
            {[
              { id: 'OVERVIEW', labelBN: 'ইকোসিস্টেম তথ্য', labelEN: 'Ecosystem', icon: Globe },
              { id: 'TRADING', labelBN: 'ওয়ালেট ট্রেডিং কনসোল', labelEN: 'Trading Station', icon: Wallet },
              { id: 'SWAP', labelBN: 'ডেক্স ক্যালেরকুলেটর', labelEN: 'Swap/Earn Hub', icon: ArrowLeftRight },
              { id: 'GOVERNANCE', labelBN: 'কমিউনিটি গর্ভনেন্স', labelEN: 'Dao Community', icon: Landmark },
              { id: 'GUIDE', labelBN: 'টিউটোরিয়াল ও নির্দেশিকা', labelEN: 'Ecosystem Guide', icon: BookOpen }
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    const audioNav = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
                    audioNav.volume = 0.04;
                    audioNav.play().catch(() => {});
                  }}
                  className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl border font-bold text-xs sm:text-sm tracking-tight transition-all uppercase cursor-pointer whitespace-nowrap
                    ${isActive 
                      ? 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan shadow-[0_0_12px_rgba(0,242,255,0.15)] font-black' 
                      : 'bg-transparent border-white/5 text-white/60 hover:text-white hover:border-white/10'
                    }
                  `}
                >
                  <IconComp size={16} />
                  <span>{userLanguage === 'BN' ? tab.labelBN : tab.labelEN}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 mt-8">
        
        {/* TAB 1: OVERVIEW & SYSTEM ARCHITECTURE */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-12">
            
            {/* Banner block introducing Verse Community */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#0d0e16] border border-white/5 rounded-3xl p-6 sm:p-10">
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-1 bg-neon-cyan/10 text-neon-cyan px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-widest uppercase">
                  ABOUT VERSE PROJECT
                </div>
                <h2 className="text-3xl font-display font-black tracking-tight text-white uppercase sm:text-4xl">
                  {userLanguage === 'BN' ? "মিট দ্য ভার্স কমিউনিটি ও ইকোসিস্টেম" : "Meet the Verse Community & Ecosystem"}
                </h2>
                <div className="h-1 w-20 bg-neon-cyan"></div>
                <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                  {userLanguage === 'BN' ? (
                    "ভার্স কমিউনিটি (Verse Community) হলো এমন একটি বিকেন্দ্রীকৃত প্লাটফর্ম যেখানে ক্রিপ্টো উৎসাহী ও ট্রেডাররা একত্রিত হয়ে বিটকয়েন ডট কমের (Bitcoin.com) নতুন ফাইন্যান্সিয়াল সিস্টেম নিয়ে কার্যক্রম চালান। Verse টোকেনটির মাধ্যমে ডেক্স সোয়াপ প্রোটোকলে রিওয়ার্ড পাওয়া, স্ট্যাকিংয়ে হাই এপিওয়াই জেনারেট করা এবং বিশ্বব্যাপী পেমেন্ট গেটওয়ে চালনার সুবিধা পাওয়া যায়। নিচের প্র্যাকটিক্যাল ল্যাপটপ/কম্পিউটার ইন্টারফেস ডায়াগ্রামের মাধ্যমে দেখে নিন সিস্টেমে টোকেন কীভাবে ফ্লো হয়।"
                  ) : (
                    "The Verse Community is a decentralized workspace where cryptocurrency enthusiasts, yield farmers, and traders interact to build Bitcoin.com's financial solutions. Staking VERSE unleashes premium tier incentives, high APY yields, smart-contract DEX integration, and global settlement features. Read our layout steps in the terminal mockup below."
                  )}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                  <div className="flex gap-3">
                    <div className="h-6 w-6 shrink-0 rounded bg-neon-cyan/20 flex items-center justify-center text-neon-cyan font-bold text-xs">✓</div>
                    <p className="text-xs text-white/80"><strong>Non-Custodial:</strong> {userLanguage === 'BN' ? 'আপনার তহবিলের চাবি সর্বদা আপনার নিজের ওয়ালেটেই থাকবে।' : 'Your money is entirely secured by your private seed phrase.'}</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-6 w-6 shrink-0 rounded bg-neon-cyan/20 flex items-center justify-center text-neon-cyan font-bold text-xs">✓</div>
                    <p className="text-xs text-white/80"><strong>EVM Compatible:</strong> {userLanguage === 'BN' ? 'Ethereum এবং Polygon চেইনে অতি সুরক্ষিত উপায়ে ইন্টিগ্রেটেড।' : 'Natively supported across Ethereum, Polygon, and major host networks.'}</p>
                  </div>
                </div>
              </div>

              {/* Box container with the custom logo image provided by the user */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center bg-[#151624] border border-white/10 rounded-2xl p-6 text-center shadow-lg">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#00ff99] mb-3 select-none flex items-center gap-1.5 font-bold">
                  <span className="h-2 w-2 bg-[#00ff99] rounded-full animate-ping"></span>
                  ORIGINAL VERSE EMBLEM
                </span>
                
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan to-neon-pink rounded-2xl blur opacity-30 animate-pulse"></div>
                  <img 
                    src="https://i.ibb.co.com/PGJhM7zt/file-0000000099f071fd85bdf42c0cb05613.png" 
                    alt="Verse Community & Ecosystem Logo" 
                    className="relative w-44 h-auto object-contain bg-black/40 rounded-2xl p-4 border border-white/10 transition-transform duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <p className="text-[11px] text-white/50 mt-4 leading-normal font-mono">
                  This genuine logo represents the unified voice of the Verse community ecosystem.
                </p>
                
                <a 
                  href="https://t.me/GetVerse" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="mt-4 text-xs font-mono text-neon-cyan hover:underline flex items-center gap-1"
                >
                  <span>Verify Telegram Node</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>

            {/* Interactive Concept Simulator (Computer Interface Mockup) */}
            <div className="space-y-6">
              <div className="text-center max-w-3xl mx-auto space-y-2">
                <h3 className="text-2xl font-display font-black uppercase text-neon-cyan">
                  {userLanguage === 'BN' ? "ইন্টারেক্টিভ কম্পিউটার ইকোসিস্টেম ডায়াগ্রাম" : "Interactive Computer Ecosystem Blueprint"}
                </h3>
                <p className="text-xs sm:text-sm text-white/60">
                  {userLanguage === 'BN' ? (
                    "নিচের কম্পিউটার উইন্ডোটির যেকোনো অপশনে ক্লিক করুন এবং প্র্যাকটিক্যালি দেখুন ভার্স এবং বিটকয়েন ডট কম প্রোটোকল কীভাবে নিখুঁতভাবে পরিচালিত হয়।"
                  ) : (
                    "Click on any module tab inside the monitor interface to explore the live network transaction dynamics."
                  )}
                </p>
              </div>

              {/* Graphic Layout representing a Computer Screen */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0c0d16] shadow-2xl">
                {/* Computer Title Bar */}
                <div className="bg-[#151726] border-b border-white/5 px-4 py-3 flex items-center justify-between font-mono text-[11px] text-white/40">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 bg-rose-500 rounded-full inline-block"></span>
                    <span className="h-3 w-3 bg-amber-500 rounded-full inline-block"></span>
                    <span className="h-3 w-3 bg-emerald-500 rounded-full inline-block"></span>
                    <span className="ml-2 font-semibold text-white/60 uppercase">SYSTEM_WORKSTATION_01 // VERSE-ENGINE-SIM</span>
                  </div>
                  <div className="hidden sm:block">STATUS: SECURE_ON_CHAIN_DEX_STABLE</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-1">
                  
                  {/* Computer Screen Left Menu */}
                  <div className="md:col-span-4 bg-slate-950/60 p-4 border-r border-[#151726] space-y-2">
                    <div className="text-[10px] text-white/40 uppercase font-mono font-bold px-2.5 mb-2">Architectural Modules</div>
                    {CONCEPT_STEPS.map((step, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveInteractiveConcept(idx)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer
                          ${activeInteractiveConcept === idx 
                            ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan shadow-[inset_0_0_8px_rgba(0,242,255,0.15)] font-bold' 
                            : 'bg-transparent border-transparent text-white/60 hover:bg-white/5'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-white/40">{idx + 1}</span>
                          <span>{step.title}</span>
                        </div>
                        <ChevronRight size={14} className={activeInteractiveConcept === idx ? 'text-neon-cyan' : 'text-white/20'} />
                      </button>
                    ))}

                    <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 space-y-1 mt-4">
                      <span className="text-[9px] uppercase font-mono text-neon-pink font-bold block">Current Utility Value</span>
                      <span className="text-lg font-mono font-bold text-white tabular-nums">${verseLiveMarketPrice.toFixed(6)}</span>
                      <span className="text-[9px] text-[#00ff99] block font-mono">Decentralized Asset Flow Live</span>
                    </div>
                  </div>

                  {/* Computer Screen Central Content Area */}
                  <div className="md:col-span-8 p-6 sm:p-8 flex flex-col justify-between bg-slate-950/25 relative min-h-[300px]">
                    
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <span className="bg-neon-pink/15 text-neon-pink text-[9px] font-mono px-2 py-0.5 rounded border border-neon-pink/20 uppercase font-bold">
                          {CONCEPT_STEPS[activeInteractiveConcept].badge}
                        </span>
                        <span className="font-mono text-[11px] text-white/40">STEP // 0{activeInteractiveConcept + 1}</span>
                      </div>

                      <h4 className="text-xl sm:text-2xl font-display font-medium text-white uppercase tracking-tight">
                        {CONCEPT_STEPS[activeInteractiveConcept].title}
                      </h4>

                      <hr className="border-white/5" />

                      {/* Premium Media Gallery (AUTOPLAYING MULTI-MEDIA VIDEO & DIAGRAMS) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-3 text-xs sm:text-sm">
                        {/* 2-3 Second Tech Video Loop */}
                        <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/90 shadow-inner group">
                          {CONCEPT_STEPS[activeInteractiveConcept].videoUrl && (
                            <video 
                              src={CONCEPT_STEPS[activeInteractiveConcept].videoUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          )}
                          <div className="absolute top-2 left-2 bg-black/75 text-[8px] font-mono text-[#00ff99] px-2 py-0.5 rounded border border-[#00ff99]/20 uppercase tracking-widest font-black">
                            Action Stream Loop
                          </div>
                        </div>

                        {/* High-Resolution Ecosystem Diagram Placeholder */}
                        <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/95 shadow-md group">
                          {CONCEPT_STEPS[activeInteractiveConcept].imageUrl && (
                            <img 
                              src={CONCEPT_STEPS[activeInteractiveConcept].imageUrl}
                              alt={CONCEPT_STEPS[activeInteractiveConcept].title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105"
                            />
                          )}
                          <div className="absolute top-2 left-2 bg-black/75 text-[8px] font-mono text-neon-cyan px-2 py-0.5 rounded border border-neon-cyan/20 uppercase tracking-widest font-black">
                            Concept Diagram
                          </div>
                        </div>
                      </div>

                      <p className="text-white/80 text-xs sm:text-sm leading-relaxed bg-white/[0.01] border border-white/5 p-4 rounded-xl font-mono">
                        {CONCEPT_STEPS[activeInteractiveConcept].detail}
                      </p>
                    </div>

                    {/* Highly descriptive flow visualization */}
                    <div className="mt-6">
                      <div className="text-[10px] uppercase font-mono text-white/40 mb-2">Simulated Asset/Governance Pipeline:</div>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] bg-slate-950/60 p-3 rounded-xl border border-white/5 text-center">
                        <span className="bg-neon-cyan/10 text-neon-cyan px-2 py-1 rounded">Bitcoin.com Wallet API</span>
                        <span className="text-white/40">⟶</span>
                        <span className="bg-neon-pink/10 text-neon-pink px-2 py-1 rounded">Verse Liquid DEX Pool</span>
                        <span className="text-white/40">⟶</span>
                        <span className="bg-[#00ff99]/10 text-[#00ff99] px-2 py-1 rounded">Community Rewards Distributed</span>
                        <span className="text-white/40">⟶</span>
                        <span className="bg-neon-yellow/10 text-neon-yellow px-2 py-1 rounded">DAO Voting Allocation</span>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            </div>

            {/* Core features listing Verse and community advantages */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-[#07080e] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full bg-neon-cyan"></div>
                <div className="bg-neon-cyan/10 text-neon-cyan h-10 w-10 rounded-xl flex items-center justify-center mb-4">
                  <Coins size={20} />
                </div>
                <h4 className="text-lg font-display font-semibold mb-2 uppercase">Decentralized Trade Swaps</h4>
                <p className="text-xs text-white/60 leading-relaxed">
                  {userLanguage === 'BN' ? (
                    "Bitcoin.com এবং Verse DEX-এর সমন্বয়ে গঠিত লিকুইডিটি পুলে কোনোপ্রকার মিডলম্যান ছাড়া ইকোসিস্টেমের মেম্বাররা অতি অল্প গ্যাসে টোকেন এক্সচেঞ্জ করতে পারেন।"
                  ) : (
                    "Swap effortlessly inside the Verse DEX pool. Avoid custody risk while retaining full private management of all processed tokens."
                  )}
                </p>
              </div>

              <div className="bg-[#07080e] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full bg-neon-pink"></div>
                <div className="bg-neon-pink/10 text-neon-pink h-10 w-10 rounded-xl flex items-center justify-center mb-4">
                  <Award size={20} />
                </div>
                <h4 className="text-lg font-display font-semibold mb-2 uppercase">Deflationary Mechanism</h4>
                <p className="text-xs text-white/60 leading-relaxed">
                  {userLanguage === 'BN' ? (
                    "প্রতিটি লিকুইডিটি সোয়াপ পুল ট্রানজেকশন চার্জ থেকে প্রাপ্ত লভ্যাংশ দিয়ে নিয়মিত Verse টোকেন ক্রয় করে অটো-বার্ন বা নষ্ট করে দেওয়া হয়, যা মার্কেট ডাইনামিক্স ব্যালেন্স করে।"
                  ) : (
                    "Verse executes transparent on-chain buy-backs utilizing fees to constantly shrink circulating supply over time, driving healthy deflation."
                  )}
                </p>
              </div>

              <div className="bg-[#07080e] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#00ff99]"></div>
                <div className="bg-[#00ff99]/10 text-[#00ff99] h-10 w-10 rounded-xl flex items-center justify-center mb-4">
                  <Users size={20} />
                </div>
                <h4 className="text-lg font-display font-semibold mb-2 uppercase">Global #VerseArmy Hive</h4>
                <p className="text-xs text-white/60 leading-relaxed">
                  {userLanguage === 'BN' ? (
                    "বিশ্বব্যাপী ছড়িয়ে থাকা কোটি ভক্তদের নিয়ে গঠিত গ্রুপ ও সোশ্যাল আর্মি যারা বিটকয়েন ডট কমের যাবতীয় প্রমোশনাল ও এডুকেশনাল প্রচারণা সফল করে থাকেন।"
                  ) : (
                    "Join hands with millions of proactive campaigners to coordinate online marketing initiatives, community challenges, and learn modules."
                  )}
                </p>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: TRADING TERMINAL SIMULATOR (BITCOIN.COM WALLET EXPERIENCE) */}
        {activeTab === 'TRADING' && (
          <div className="space-y-8">
            
            {/* Wallet Intro Header */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#0d0e16] border border-white/5 rounded-3xl p-6 sm:p-10">
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-1.5 bg-[#00ffff]/10 text-[#00ffff] px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-widest uppercase">
                  TRADE ON BITCOIN.COM WALLET
                </div>
                <h2 className="text-3xl font-display font-black tracking-tight text-white uppercase sm:text-4xl">
                  {userLanguage === 'BN' ? "বিটকয়েন ডট কম ওয়ালেট ট্রেডিং গেটওয়ে" : "Bitcoin.com Wallet Trade Portal"}
                </h2>
                <div className="h-1 w-20 bg-neon-pink"></div>
                <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                  {userLanguage === 'BN' ? (
                    "বিটকয়েন ডট কম ওয়ালেট (Bitcoin.com Wallet) বিশ্বের অন্যতম সুরক্ষিত সেলফ-কাস্টোডিয়াল ক্রিপ্টো প্ল্যাটফর্ম। যেখানে ইউজাররা তাদের প্রাইভেট কি ও ফান্ডের সম্পূর্ণ নিয়ন্ত্রণ নিজের কাছে রেখেই অত্যন্ত সহজ উপায়ে VERSE, BTC, ETH, এবং অন্যান্য মেইনস্ট্রিম ক্রিপ্টো টোকেন ট্রেড করতে পারেন। কাস্টমারদের সহায়তায় আমরা নিচে একটি ইন্টারেক্টিভ ওয়ালেট ট্রেডিং ক্রাফটেড টার্মিনাল সেটআপ করেছি যা রিয়েল-টাইম লাইভ প্রাইসের উপর ভিত্তি করে ট্রেড চালনা টেস্ট করতে সাহায্য করবে।"
                  ) : (
                    "Bitcoin.com Wallet is a legendary self-custodial app. It provides absolute control over your private seed phrase, allowing you to instantly buy, sell, swap, and leverage blockchain assets like VERSE, BTC, or ETH. Test our live, interactive trade execution engine mockup below, which incorporates our live pricing algorithms."
                  )}
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <span className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-white/80 border border-white/5 font-mono">✓ High Liquidity Swap Router</span>
                  <span className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-white/80 border border-white/5 font-mono">✓ 100% Direct Non-Custodial Safeguard</span>
                  <span className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-white/80 border border-white/5 font-mono">✓ Low Gas Cross-Chain Bridges</span>
                </div>
              </div>

              {/* Box of Bitcoin.com wallet logo provided by the user */}
              <div className="lg:col-span-4 bg-[#151624] border border-white/10 rounded-2xl p-6 text-center select-text shadow-lg">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#ff00ea] mb-3 select-none flex items-center justify-center gap-1.5 font-bold">
                  <span className="h-2 w-2 bg-[#ff00ea] rounded-full animate-ping"></span>
                  OFFICIAL WALLET LOGO
                </span>
                
                <div className="relative group mx-auto inline-block">
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-pink to-neon-cyan rounded-2xl blur opacity-30 animate-pulse"></div>
                  <img 
                    src="https://i.ibb.co.com/zWLQmb2F/IMG-20260603-145948.png" 
                    alt="Bitcoin.com Wallet Logo" 
                    className="relative w-44 h-auto object-contain bg-black/40 rounded-2xl p-3 border border-white/10 transition-transform duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <p className="text-[11px] text-white/50 mt-4 leading-normal font-mono">
                  Authentic brand visual representing the multi-chain decentralized Bitcoin.com Wallet.
                </p>
                
                <a 
                  href="https://x.com/BitcoinCom" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="mt-4 text-xs font-mono text-neon-pink hover:underline flex items-center justify-center gap-1"
                >
                  <span>Verify Wallet Authority</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>

            {/* Trading Interactive Interface Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Side: OrderBook / Order entry Desk */}
              <div className="lg:col-span-5 bg-[#0d0e16] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
                
                <div>
                  
                  {/* Form toggle BUY vs SELL */}
                  <div className="flex gap-2 mb-4 bg-slate-950 p-1.5 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setTradeType('BUY')}
                      className={`flex-1 py-2 rounded-lg font-display text-xs font-bold transition-all uppercase cursor-pointer
                        ${tradeType === 'BUY' 
                          ? 'bg-emerald-500 text-neutral-950 shadow-md' 
                          : 'text-white/60 hover:text-white'
                        }
                      `}
                    >
                      {userLanguage === 'BN' ? 'কিনুন VERSE' : 'Buy VERSE'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTradeType('SELL')}
                      className={`flex-1 py-2 rounded-lg font-display text-xs font-bold transition-all uppercase cursor-pointer
                        ${tradeType === 'SELL' 
                          ? 'bg-rose-500 text-white shadow-md' 
                          : 'text-white/60 hover:text-white'
                        }
                      `}
                    >
                      {userLanguage === 'BN' ? 'বিক্রয় VERSE' : 'Sell VERSE'}
                    </button>
                  </div>

                  {/* Brand Display of Bitcoin.com Logo Inside Trade Panel */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] border border-white/5 rounded-xl mb-4">
                    <img 
                      src="https://i.ibb.co.com/zWLQmb2F/IMG-20260603-145948.png" 
                      alt="Wallet small" 
                      className="w-7 h-7 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-[10px] sm:text-xs">
                      <span className="font-bold text-white block">Wallet Swap Gateway v4.8</span>
                      <span className="text-white/40 font-mono">PORTFOLIO // SECURE_NODE_100</span>
                    </div>
                  </div>

                  {/* Limits and inputs */}
                  <div className="space-y-3">
                    
                    {/* User Simulated Balances info */}
                    <div className="flex justify-between text-[11px] font-mono text-white/50 bg-slate-950/40 p-2.5 rounded-lg">
                      <div>
                        <span className="block">USDT Available:</span>
                        <span className="font-bold text-white font-mono">${userBalanceUSDT.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="text-right">
                        <span className="block">VERSE Owned:</span>
                        <span className="font-bold text-neon-cyan font-mono">{userBalanceVERSE.toLocaleString(undefined, { maximumFractionDigits: 0 })} VERSE</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTradePriceMode('MARKET')}
                        className={`flex-1 py-1 px-2.5 rounded border text-[10px] font-mono font-bold uppercase transition-all cursor-pointer
                          ${tradePriceMode === 'MARKET' ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan' : 'bg-transparent border-white/10 text-white/50'}
                        `}
                      >
                        Market (লাইভ স্পট)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTradePriceMode('LIMIT')}
                        className={`flex-1 py-1 px-2.5 rounded border text-[10px] font-mono font-bold uppercase transition-all cursor-pointer
                          ${tradePriceMode === 'LIMIT' ? 'bg-neon-pink/20 text-neon-pink border-neon-pink' : 'bg-transparent border-white/10 text-white/50'}
                        `}
                      >
                        Limit Order
                      </button>
                    </div>

                    {/* Show execution rates */}
                    <div>
                      <label className="block text-[10px] uppercase text-white/40 font-mono font-bold mb-1">Execution Price (USD)</label>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={tradePriceMode === 'MARKET'}
                          className="w-full bg-slate-950 font-mono text-sm border border-white/10 rounded-lg py-2.5 px-3 text-white disabled:opacity-75 focus:outline-none focus:border-neon-cyan"
                          value={tradePriceMode === 'MARKET' ? `${verseLiveMarketPrice.toFixed(6)}` : '0.000028'}
                          readOnly
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-[#00ff99] font-mono">LIVE API</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-white/40 font-mono font-bold mb-1">Trading Size (USD)</label>
                      <div className="relative">
                        <input
                          type="number"
                          className="w-full bg-slate-950 font-mono text-sm border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-neon-cyan"
                          placeholder="Amount in dollars"
                          value={tradeAmountUSD}
                          onChange={(e) => setTradeAmountUSD(e.target.value)}
                        />
                        <span className="absolute right-3 top-3 text-xs text-white/40 font-mono">USD</span>
                      </div>
                      <div className="flex gap-1.5 mt-1.5">
                        {['10', '50', '250', '1000'].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setTradeAmountUSD(amt)}
                            className="bg-white/5 hover:bg-white/10 border border-white/5 rounded px-2.5 py-0.5 text-[10px] font-mono cursor-pointer"
                          >
                            +${amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Leverage Slider Mock */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase text-white/40 font-mono font-bold">Simulated Leverage</span>
                        <span className="text-xs font-mono text-neon-pink font-bold">{leverage}X Multiplier</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        step="1"
                        value={leverage} 
                        onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
                        className="w-full accent-neon-pink cursor-pointer" 
                      />
                      <p className="text-[9px] text-white/40 flex items-center gap-1 mt-1 font-mono">
                        <Info size={10} />
                        <span>High leverage expands trading exposure and potential volume density.</span>
                      </p>
                    </div>

                  </div>

                </div>

                <div className="mt-6 border-t border-white/5 pt-4">
                  {/* Status notifications pop up */}
                  <AnimatePresence mode="popLayout">
                    {tradeActionMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`text-xs p-3 rounded-lg flex items-start gap-2 mb-3 font-mono
                          ${tradeActionMessage.error ? 'bg-rose-500/10 border border-rose-500/25 text-rose-300' : 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-300'}
                        `}
                      >
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>{tradeActionMessage.text}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={handleExecuteTrade}
                    className={`w-full py-3.5 rounded-xl text-center font-display font-bold uppercase text-sm tracking-tight transition-all cursor-pointer shadow-lg
                      ${tradeType === 'BUY' 
                        ? 'bg-[#00ff99] hover:bg-[#00ff99]/90 text-neutral-950 font-black shadow-[0_4px_15px_rgba(0,255,153,0.2)]' 
                        : 'bg-neon-pink hover:bg-neon-pink/90 text-white font-black shadow-[0_4px_15px_rgba(255,0,234,0.2)]'
                      }
                    `}
                  >
                    {tradeType === 'BUY' ? 'BUY VERSE TOKEN' : 'SELL VERSE TOKEN'}
                  </button>
                  
                  <div className="text-center mt-2">
                    <span className="text-[9px] font-mono text-white/30">SECURED LOCK WITH WALLET PRIVATE SEED KEYS</span>
                  </div>
                </div>

              </div>

              {/* Right Side: High Fidelity Graph Area & OrderBook logs */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Simulated Candle Chart Window */}
                <div className="bg-[#0d0e16] border border-white/10 rounded-2xl p-5">
                  
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/5 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-display font-medium text-white uppercase tracking-tight">VERSE / USDT Trading Feed</span>
                      <span className="text-xs bg-emerald-500/10 text-[#00ff99] px-2 py-0.5 rounded border border-[#00ff99]/10 font-mono font-bold animate-pulse">ONLINE</span>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-white/5 text-[10px] font-mono">
                      {['5M', '15M', '1H', '1D'].map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setChartTimeframe(tf as any)}
                          className={`px-2 py-1 rounded cursor-pointer uppercase ${chartTimeframe === tf ? 'bg-neon-cyan/20 text-neon-cyan font-bold' : 'text-white/40 hover:text-white'}`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SVG generated custom beautiful live crypto candle graph chart! */}
                  <div className="relative h-[250px] bg-slate-950/80 rounded-2xl border border-white/5 flex items-center justify-center overflow-hidden">
                    
                    {/* Grid overlay lines */}
                    <div className="absolute inset-0 pointer-events-none opacity-20">
                      <div className="w-full h-full cyber-grid"></div>
                    </div>

                    {/* Simulated live chart lines & candles using customized SVG */}
                    <div className="relative w-full h-full p-4 flex flex-col justify-between">
                      
                      {/* Live metrics labels inside graph area */}
                      <div className="flex justify-between text-[10px] font-mono text-white/30 z-10">
                        <span>RESIST: ${(verseLiveMarketPrice * 1.05).toFixed(6)}</span>
                        <span>SUPPORTS: ${(verseLiveMarketPrice * 0.95).toFixed(6)}</span>
                      </div>

                      {/* Actual SVG graphics mimicking financial candle movements */}
                      <div className="flex-1 w-full flex items-end justify-between items-baseline px-4 mb-2">
                        {[
                          { h: 42, type: 'g' },
                          { h: 63, type: 'r' },
                          { h: 35, type: 'g' },
                          { h: 84, type: 'g' },
                          { h: 51, type: 'r' },
                          { h: 72, type: 'r' },
                          { h: 90, type: 'g' },
                          { h: 110, type: 'g' },
                          { h: 95, type: 'r' },
                          { h: 125, type: 'g' },
                          { h: 155, type: 'g' },
                          { h: 135, type: 'r' },
                          { h: 165, type: 'g' },
                          { h: 195, type: 'g' }
                        ].map((cd, index) => {
                          const isGreen = cd.type === 'g';
                          return (
                            <div key={index} className="flex flex-col items-center flex-1 h-full justify-end max-w-[20px] mx-1 relative group">
                              
                              {/* Wick line */}
                              <div className={`w-[1px] absolute top-2 bottom-2 ${isGreen ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ height: '90%' }}></div>
                              
                              {/* Candle body */}
                              <div 
                                className={`w-full rounded-sm relative z-10 transition-all duration-500
                                  ${isGreen 
                                    ? 'bg-emerald-500/80 hover:bg-emerald-400 select-none shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                                    : 'bg-rose-500/80 hover:bg-rose-400 select-none shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                                  }
                                `}
                                style={{ height: `${cd.h * 1.1}px` }}
                              >
                                {/* Tooltip display on hover */}
                                <div className="absolute hidden group-hover:block bottom-full mb-2 left-1/2 -translate-x-1/2 bg-neutral-900 border border-white/20 text-[9px] font-mono p-1 rounded whitespace-nowrap text-white z-50">
                                  Price: ${(verseLiveMarketPrice * (cd.h / 150 + 0.3)).toFixed(6)}
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>

                      {/* Timeline labels */}
                      <div className="flex justify-between text-[9px] font-mono text-white/30 border-t border-white/5 pt-2">
                        <span>14:00</span>
                        <span>14:15</span>
                        <span>14:30</span>
                        <span>14:45</span>
                        <span>15:00 (NOW)</span>
                      </div>

                    </div>

                  </div>

                </div>

                {/* Simulated Order Book / Transactions Feed */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Orderbook bids asks */}
                  <div className="bg-[#0d0e16] border border-white/10 rounded-xl p-4">
                    <span className="text-xs uppercase font-mono font-bold text-white/50 block mb-3">Live Order Depth (VERSE/USDT)</span>
                    <div className="space-y-1.5 text-xs font-mono">
                      
                      {/* Sell Orders */}
                      {[
                        { ask: verseLiveMarketPrice * 1.012, size: 750000 },
                        { ask: verseLiveMarketPrice * 1.008, size: 1200000 },
                        { ask: verseLiveMarketPrice * 1.004, size: 450000 }
                      ].map((askObj, index) => (
                        <div key={index} className="flex justify-between text-rose-400 bg-rose-500/5 px-2 py-1 rounded">
                          <span>ASK: ${askObj.ask.toFixed(6)}</span>
                          <span className="text-white/60">{askObj.size.toLocaleString()} V</span>
                        </div>
                      ))}

                      {/* Current Spot Line */}
                      <div className="py-1 text-center font-bold bg-white/5 border-y border-white/10 text-[#00ff99] tracking-wider">
                        SPOT RATE: ${verseLiveMarketPrice.toFixed(6)}
                      </div>

                      {/* Buy Orders */}
                      {[
                        { bid: verseLiveMarketPrice * 0.996, size: 880000 },
                        { bid: verseLiveMarketPrice * 0.992, size: 1950000 },
                        { bid: verseLiveMarketPrice * 0.988, size: 1300000 }
                      ].map((bidObj, index) => (
                        <div key={index} className="flex justify-between text-emerald-400 bg-emerald-500/5 px-2 py-1 rounded">
                          <span>BID: ${bidObj.bid.toFixed(6)}</span>
                          <span className="text-white/60">{bidObj.size.toLocaleString()} V</span>
                        </div>
                      ))}

                    </div>
                  </div>

                  {/* Transactions transaction History ledger */}
                  <div className="bg-[#0d0e16] border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs uppercase font-mono font-bold text-white/50">Recent Wallet Trades</span>
                      <span className="text-[9px] bg-[#00ff99]/10 text-[#00ff99] px-2 py-0.5 rounded">AUTO TICK</span>
                    </div>
                    
                    <div className="space-y-1.5 font-mono text-[11px] overflow-y-auto max-h-[160px] scrollbar-hide">
                      {recentLiveTrades.map((trade, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/[0.01] hover:bg-white/[0.04] p-1.5 rounded transition-all">
                          <span className="text-white/40">{trade.time}</span>
                          <span className={`font-bold ${trade.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {trade.type}
                          </span>
                          <span className="text-white font-semibold">${trade.price.toFixed(6)}</span>
                          <span className="text-white/65 text-right">{trade.amount.toLocaleString()} VERSE</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 3: DEC DECENTRALIZED CALCULATOR & LIQUIDITY SWAP PROTCOLS */}
        {activeTab === 'SWAP' && (
          <div className="space-y-10">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="bg-neon-cyan/20 text-neon-cyan text-[10px] font-mono px-3 py-1 rounded border border-neon-cyan/20 uppercase font-black tracking-widest">
                VERIFY LIVE PRICING MECHANISM
              </span>
              <h2 className="text-3xl font-display font-black text-white uppercase sm:text-4xl">
                {userLanguage === 'BN' ? "ডেক্স সোয়াপ ও লিকুইডিটি পুল ক্যালকুলেটর" : "DEX Swap & Yield Pool Calculator"}
              </h2>
              <p className="text-white/75 text-sm">
                {userLanguage === 'BN' ? (
                  "আমাদের এই সোয়াপ ক্যালকুলেটরটি কোনো পুরাতন বা স্ট্যাটিক ডাটা ব্যবহার করে না। এটি সরাসরি Binance এবং DexScreener-এর অরিজিনাল লাইভ চেইন ডাটাবেজ রেটের সাথে সিনক্রোনাইজড। আপনি যেকোনো এমাউন্ট বসিয়ে রিয়েল টাইমে আউটপুট হিসাব করতে পারেন।"
                ) : (
                  "Our swap engine runs real calculations mapping directly with Binance and DexScreener's live network indices. Input any amount to simulate decentralised swaps instantaneously."
                )}
              </p>
            </div>

            {/* Swap Desk Panel + Yield Pool Simulator side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Item Swap Desk Block */}
              <div className="lg:col-span-6 bg-[#0d0e16] border border-neon-cyan/20 p-6 rounded-2xl relative shadow-lg">
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-neon-cyan text-black font-black text-[9px] px-3 py-1 rounded tracking-widest uppercase">
                  SWAP DEX SIM
                </div>

                <h3 className="font-display font-medium text-lg text-white mb-4 uppercase flex items-center gap-2">
                  <ArrowLeftRight size={18} className="text-neon-cyan" />
                  <span>DEX Routing Calculator</span>
                </h3>

                <div className="space-y-4">
                  
                  {/* From box */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-2">
                    <div className="flex justify-between text-xs text-white/55 font-mono">
                      <span>You Pay (From):</span>
                      <span>Balance: Dynamic on-chain</span>
                    </div>

                    <div className="flex gap-4">
                      <select
                        className="bg-neutral-900 text-white font-mono font-bold text-sm border border-white/10 rounded-lg p-2.5 outline-none focus:border-neon-cyan cursor-pointer"
                        value={swapFromToken}
                        onChange={(e) => setSwapFromToken(e.target.value)}
                      >
                        <option value="VERSE">VERSE (Live Token)</option>
                        <option value="BTC">BTC (Bitcoin)</option>
                        <option value="ETH">ETH (Ethereum)</option>
                        <option value="SOL">SOL (Solana)</option>
                        <option value="USDT">USDT (Tether)</option>
                      </select>

                      <input
                        type="number"
                        className="flex-1 bg-transparent text-right font-mono text-xl text-white outline-none"
                        value={swapInputAmount}
                        onChange={(e) => setSwapInputAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Icon separator arrow */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        const temp = swapFromToken;
                        setSwapFromToken(swapToToken);
                        setSwapToToken(temp);
                      }}
                      className="bg-slate-950 border border-white/10 rounded-full p-2.5 text-neon-cyan hover:border-neon-cyan hover:scale-110 transition-transform cursor-pointer"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>

                  {/* To box */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-2">
                    <div className="flex justify-between text-xs text-white/55 font-mono">
                      <span>You Receive (To):</span>
                      <span>Estimated Output</span>
                    </div>

                    <div className="flex gap-4">
                      <select
                        className="bg-neutral-900 text-white font-mono font-bold text-sm border border-white/10 rounded-lg p-2.5 outline-none focus:border-neon-cyan cursor-pointer"
                        value={swapToToken}
                        onChange={(e) => setSwapToToken(e.target.value)}
                      >
                        <option value="USDT">USDT (Tether)</option>
                        <option value="VERSE">VERSE (Live Token)</option>
                        <option value="BTC">BTC (Bitcoin)</option>
                        <option value="ETH">ETH (Ethereum)</option>
                        <option value="USDC">USDC (USD Coin)</option>
                      </select>

                      <div className="flex-1 text-right font-mono text-xl text-[#00ff99] font-bold">
                        {calculatedSwapResult.outAmount < 0.001 
                          ? calculatedSwapResult.outAmount.toFixed(8) 
                          : calculatedSwapResult.outAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </div>
                    </div>
                  </div>

                  {/* Swap Breakdown specs */}
                  <div className="bg-slate-950/40 p-3.5 rounded-xl border border-white/5 text-xs font-mono space-y-2 text-white/70">
                    <div className="flex justify-between">
                      <span>Estimated Slippage Risk:</span>
                      <span className="text-emerald-400 font-bold">{calculatedSwapResult.priceImpact}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DEX Protocol Fee (0.3%):</span>
                      <span className="text-white">${calculatedSwapResult.fee.toFixed(4)} USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Liquidity Swap Path:</span>
                      <span className="text-neon-pink font-bold">{calculatedSwapResult.path.join(' ➔ ')}</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Right Item Yield Pool Block */}
              <div className="lg:col-span-6 bg-[#0d0e16] border border-white/10 p-6 rounded-2xl flex flex-col justify-between">
                
                <div>
                  <h3 className="font-display font-medium text-lg text-white mb-2 uppercase flex items-center gap-2">
                    <Flame size={18} className="text-neon-pink" />
                    <span>Verse LP & Yield Staking Node</span>
                  </h3>
                  <p className="text-xs text-white/50 mb-4 leading-normal">
                    {userLanguage === 'BN' ? (
                      "আপনার টোকেনগুলো অলস ফেলে না রেখে ভার্স প্রোটোকলে স্ট্যাকিং করে সর্বোচ্চ লভ্যাংশ আয় করুন। লক-আপ পিরিয়ডের ওপর ভিত্তি করে ইন্টারেক্টিভ এপিওয়াই নিচে জেনারেট করুন।"
                    ) : (
                      "Make your tokens work for you. Locking VERSE inside the staking contract unlocks reward emissions directly distributed every block."
                    )}
                  </p>

                  <div className="space-y-4">
                    
                    <div>
                      <label className="block text-[10px] uppercase text-white/40 font-mono font-bold mb-1">Stacking VERSE Amount</label>
                      <input
                        type="number"
                        className="w-full bg-slate-950 font-mono text-sm border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-neon-cyan"
                        value={stakingVerseAmount}
                        onChange={(e) => setStakingVerseAmount(e.target.value)}
                        placeholder="e.g. 1000000 VERSE"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-white/40 font-mono font-bold mb-1.5">Ecosystem Lock Period</label>
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                        {[
                          { days: 30, apy: '12.5%' },
                          { days: 180, apy: '18.2%' },
                          { days: 365, apy: '24.8%' }
                        ].map((tier) => (
                          <button
                            key={tier.days}
                            type="button"
                            onClick={() => setStakingDurationDays(tier.days)}
                            className={`py-2 px-1 rounded-lg border text-center font-bold cursor-pointer transition-all
                              ${stakingDurationDays === tier.days 
                                ? 'bg-neon-pink/15 text-neon-pink border-neon-pink font-black' 
                                : 'bg-slate-900 border-white/5 text-white/60 hover:text-white'
                              }
                            `}
                          >
                            <div>{tier.days} Days</div>
                            <div className="text-[10px] text-white/40 font-medium">{tier.apy} APY</div>
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>

                <div className="mt-6 border-t border-white/5 pt-4">
                  
                  {/* Results box */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-white/15 grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] text-white/40 uppercase font-mono font-bold">Projected Yield</span>
                      <span className="text-base sm:text-lg font-mono font-bold text-[#00ff99]">
                        +{calculatedStakingYield.rewards.toLocaleString(undefined, { maximumFractionDigits: 0 })} VERSE
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="block text-[10px] text-white/40 uppercase font-mono font-bold">Estimated USD Value</span>
                      <span className="text-base sm:text-lg font-mono font-bold text-white">
                        +${calculatedStakingYield.valueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/[0.01] border border-white/5 rounded-lg p-2.5 text-center text-[10px] text-white/50 mt-3 font-mono">
                    APY Yield is dynamic according to total DEX liquidity depth globally.
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 4: GOVERNANCE & COMMUNITY PROPOSALS NODES */}
        {activeTab === 'GOVERNANCE' && (
          <div className="space-y-8">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#0d0e16] border border-white/10 rounded-3xl p-6 sm:p-10">
              <div className="lg:col-span-8 space-y-4">
                <span className="bg-neon-yellow/15 text-neon-yellow font-mono text-[9px] px-2.5 py-1 rounded uppercase font-bold text-center">
                  DECENTRALIZED COMMUNITY ON-CHAIN NODE
                </span>
                <h2 className="text-3xl font-display font-black text-white uppercase sm:text-4xl">
                  {userLanguage === 'BN' ? "ভার্স আর্মি গর্ভনেন্স ও প্রপোজাল সেন্টার" : "#VerseArmy Governance Hub"}
                </h2>
                <div className="h-1 w-20 bg-neon-cyan"></div>
                <p className="text-white/70 text-sm leading-relaxed">
                  {userLanguage === 'BN' ? (
                    "ভার্স কমিউনিটি শুধু একটি টোকেন নয়, এটি একটি গণতান্ত্রিক আন্দোলন। এখানে যেকোনো ইউজারের স্বাধীন মতামত এবং ভোটের মূল্যবান প্রভাব রয়েছে। ইকোসিস্টেমের নতুন কোনো ফিউচার ডেভলপমেন্ট, বা প্রমোশন প্রচারণার পূর্বে এখানে প্রপোজাল পাশ করা হয়। আপনিও নিচে আপনার মেম্বারশিপ ইউজারনেম দিয়ে নতুন গর্ভনেন্স প্রপোজাল বা ফিডব্যাক রাইট করে সাবমিট করতে পারেন এবং লাইভ অন-পেইজ ভোটিং চালাতে পারেন।"
                  ) : (
                    "Bitcoin.com's Verse is governed democratically by its community members. Every staking holder has direct voting power representing their allocation. Proposed ecosystem developments, staking tweaks, and global community marketing drives are thoroughly evaluated here. Submit your ideas below!"
                  )}
                </p>
              </div>

              {/* Verified badge or widget */}
              <div className="lg:col-span-4 bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-3">
                <div className="text-[11px] font-mono text-white/40 uppercase">Ecosystem Governance Standing</div>
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan">
                    <Users size={22} />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-white text-sm">Active Members voting</h4>
                    <p className="text-xs text-neon-cyan font-mono font-bold">140,281 VERSE Army Nodes</p>
                  </div>
                </div>
                <hr className="border-white/5" />
                <p className="text-[10px] text-white/50 font-mono">
                  All proposals are executed on Polygon network contracts via snapshots automatically once quorum threshold reached.
                </p>
              </div>
            </div>

            {/* Create Proposal Form + Active Proposals Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Submission Form Component */}
              <div className="lg:col-span-5 bg-[#0d0e16] border border-white/10 rounded-2xl p-5 sm:p-6 h-fit">
                <span className="text-[9px] uppercase font-mono text-neon-cyan font-bold tracking-widest block mb-2">PROPOSALS CONSOLE</span>
                <h3 className="font-display font-medium text-lg text-white mb-4 uppercase">Submit Governance Proposal</h3>
                
                <form onSubmit={handleCreateProposal} className="space-y-4 text-xs">
                  
                  <div>
                    <label className="block text-[10px] uppercase text-white/40 font-mono font-bold mb-1">Your Community handle / wallet ID</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 font-mono text-xs border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-neon-cyan"
                      placeholder="e.g. 0xVerseWarrior_01"
                      value={newProposalAuthor}
                      onChange={(e) => setNewProposalAuthor(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-white/40 font-mono font-bold mb-1">Ecosystem Objective</label>
                    <select
                      className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-white outline-none focus:border-neon-cyan cursor-pointer"
                      value={newProposalType}
                      onChange={(e) => setNewProposalType(e.target.value)}
                    >
                      <option value="Liquidity Enhancements">Liquidity Enhancements</option>
                      <option value="Staking Incentives">Staking Incentives</option>
                      <option value="Community Initiative">Community Initiative (#VerseArmy)</option>
                      <option value="Deflationary Burning">Deflationary Burning</option>
                      <option value="Wallet Integrations">Wallet Integrations</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-white/40 font-mono font-bold mb-1">Proposal / Feedback Title</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 font-mono border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-neon-cyan text-xs"
                      placeholder="e.g. Integrate LP farming multipliers on BSC Chain"
                      value={newProposalTitle}
                      onChange={(e) => setNewProposalTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-white/40 font-mono font-bold mb-1">Elaborated message details (English)</label>
                    <textarea
                      rows={4}
                      className="w-full bg-slate-950 font-sans border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-neon-cyan text-xs"
                      placeholder="Write the elaborate description of your proposal/feedback here..."
                      value={newProposalMessage}
                      onChange={(e) => setNewProposalMessage(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-neon-cyan hover:bg-white text-neutral-950 font-display font-bold py-3.5 rounded-xl uppercase tracking-wider text-xs transition-colors cursor-pointer"
                  >
                    SUBMIT TO DECENTRALIZED NODE
                  </button>

                  <div className="bg-slate-950/40 p-3 rounded-lg border border-white/5 text-[10px] text-white/50 leading-relaxed">
                    Note: Your vote is initialized instantly. Other community members can cast votes dynamically.
                  </div>

                </form>
              </div>

              {/* Feed lists */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs uppercase font-mono font-bold text-white/55">Active Snapshot votes</span>
                  <span className="text-xs text-neon-cyan font-mono font-bold">{governanceProposals.length} Proposals live</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {governanceProposals.map((prop) => (
                    <div key={prop.id} className="bg-[#0d0e16] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors">
                      
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <span className="bg-neon-pink/15 text-neon-pink text-[9px] font-mono px-2 py-0.5 rounded border border-neon-pink/20 uppercase font-black">
                          {prop.type}
                        </span>
                        <span className="text-[10px] text-white/40 font-mono">By {prop.author} // {prop.timestamp}</span>
                      </div>

                      <h4 className="text-base sm:text-lg font-display font-semibold text-white mb-2 leading-snug">
                        {prop.title}
                      </h4>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {prop.tags.map((tg, i) => (
                          <span key={i} className="bg-white/5 text-white/60 text-[9px] px-2 py-0.5 rounded-full font-mono">
                            {tg}
                          </span>
                        ))}
                      </div>

                      {/* Comments or details feedback inside */}
                      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/5 text-xs text-white/80 space-y-2 font-mono">
                        <div className="text-[9px] text-[#00ff99] font-bold uppercase tracking-widest border-b border-white/5 pb-1 flex items-center gap-1.5">
                          <MessageSquare size={10} />
                          <span>MEMBER CONVERSATION INSIGHTS:</span>
                        </div>
                        {prop.comments.map((cm, idx) => (
                          <p key={idx} className="leading-normal pl-2 border-l border-white/15 text-white/70 italic text-[11px]">
                            "{cm}"
                          </p>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-4 pl-1 border-t border-white/5 pt-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-white/50">Current Poll support:</span>
                          <span className="text-sm font-mono font-bold text-neon-cyan">{prop.votes} Votes</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleVoteProposal(prop.id)}
                          className="bg-neon-cyan/15 hover:bg-neon-cyan hover:text-black border border-neon-cyan/30 text-neon-cyan font-bold py-1.5 px-3.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <ThumbsUp size={12} />
                          <span>Vote Up</span>
                        </button>
                      </div>

                    </div>
                  ))}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 5 : DOCUMENTED GUIDE & TUTORIALS */}
        {activeTab === 'GUIDE' && (
          <div className="space-y-10">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="bg-neon-pink/15 text-neon-pink text-[10px] font-mono px-3 py-1 rounded border border-neon-pink/25 uppercase font-black tracking-widest">
                VERIFIED ECOSYSTEM GUIDE & TUTORIALS
              </span>
              <h2 className="text-3xl font-display font-black text-white uppercase sm:text-4xl">
                {userLanguage === 'BN' ? "ইকোসিস্টেম এবং ওয়ালেট ট্রেডিং গাইড" : "Ecosystem & Wallet Trading Deep-Dive"}
              </h2>
              <p className="text-white/75 text-sm">
                {userLanguage === 'BN' ? (
                  "ভার্স এবং বিটকয়েন ডট কম ওয়ার্ল্ড ওয়াইড ইকোসিস্টেম কীভাবে কাজ করে তা বোঝার জন্য বিস্তারিত চিত্রসহ বাস্তব পর্যালোচনা নিচে উপস্থাপন করা হলো।"
                ) : (
                  "Explore how the world of Bitcoin.com's decentralized liquidity and self-custody apps operate via our comprehensive walk-through guides below."
                )}
              </p>
            </div>

            {/* Documented Articles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Article 1: Verse token economics */}
              <div className="bg-[#0d0e16] border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <img 
                    src="https://i.ibb.co.com/PGJhM7zt/file-0000000099f071fd85bdf42c0cb05613.png" 
                    alt="Verse Logo Document" 
                    className="w-14 h-14 bg-white/5 p-1 rounded-xl border border-white/10 object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-xl font-display font-bold uppercase text-white">Verse Token Economics</h3>
                    <p className="text-[10px] text-neon-cyan font-mono font-bold uppercase">UTILITY MECHANICS & DEFLATION METHODOLOGY</p>
                  </div>
                </div>

                <hr className="border-white/5" />

                <div className="space-y-4 text-xs leading-relaxed text-white/80 font-mono">
                  <p>
                    <strong>1. Core Concept & Practical Utility:</strong> The VERSE token serves as the primary cryptographic engine powering Bitcoin.com's aggregate product line and decentralized finance (DeFi) networks. Users stake or lock up VERSE on our Decentralized Exchange (DEX) to receive yields, claim cashbacks, and participate in liquidity reward incentives.
                  </p>
                  <p>
                    <strong>2. Liquidity Generation & Reward Loops:</strong> In the on-chain environment, VERSE liquidity coordinates are driven dynamically. LP Providers seed dual-side digital tokens inside smart contracts which power algorithmic swap pairs for instant routing. In return, smart contract algorithms dynamically emit VERSE directly to stakers to ensure stable trading density.
                  </p>
                  <p>
                    <strong>3. Algorithmic Buy-back & Auto Burning:</strong> A key aspect of the Verse ecosystem is its robust buy-back and deflation protocol. A percentage of all exchange transaction fees is automatically deployed to buy back VERSE tokens on open markets and burn them permanently to optimize supply dynamics.
                  </p>
                  <p className="bg-slate-950 p-3 rounded-lg border border-white/5 font-mono text-[9px] text-white/50 leading-normal">
                    * VERSE is a cross-chain compatible asset built securely over Ethereum (ERC-20 standard) and optimized over highly responsive, ultra low-gas layers like Polygon, protecting retail users from excessive transaction network costs.
                  </p>
                </div>
              </div>

              {/* Article 2: Trading on Bitcoin.com wallet */}
              <div className="bg-[#0d0e16] border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <img 
                    src="https://i.ibb.co.com/zWLQmb2F/IMG-20260603-145948.png" 
                    alt="Wallet Logo Document" 
                    className="w-14 h-14 bg-white/5 p-1 rounded-xl border border-white/10 object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-xl font-display font-bold uppercase text-white">Bitcoin.com Wallet Trading</h3>
                    <p className="text-[10px] text-neon-pink font-mono font-bold uppercase">SECURED TRADING TUTORIAL GUIDE</p>
                  </div>
                </div>

                <hr className="border-white/5" />

                <div className="space-y-4 text-xs leading-relaxed text-white/80 font-mono">
                  <p>
                    <strong>1. Non-Custodial Trading Security (Self-Custody Mechanics):</strong> Unlike centralized exchanges or custodial servers, the legendary Bitcoin.com Wallet guarantees full personal control of your cash resources. Seed phrases stay permanently inside the physical device hardware, completely separate from corporate risk.
                  </p>
                  <p>
                    <strong>2. Automated Advanced Trading Routes:</strong> Trading inside the non-custodial wallet coordinates transactions directly with Uniswap pools and Bitcoin.com swap bridges. When you swipe 'Buy' or 'Sell', the application matches optimal gas-efficient contract routers to complete operations within 3 seconds, flashing automated blockchain receipt logs to users.
                  </p>
                  <p>
                    <strong>3. Educational Learn-to-Earn Rewards:</strong> Global community members are invited to test Web3 concepts with quizzes inside the application, earning free VERSE token allocations that can be deployed directly into active staking nodes or cash operations instantaneously.
                  </p>
                  <p className="bg-slate-950 p-3 rounded-lg border border-white/5 font-mono text-[9px] text-white/50 leading-normal">
                    * The Bitcoin.com card linked with the wallet also automatically provides rewards back to users' on-chain balances inside the application with zero delay of manual operations, maintaining decentralized flexibility.
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Decorative Outer ambient glow accents */}
      <div className="pointer-events-none absolute top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-neon-cyan/5 rounded-full blur-[120px] z-0"></div>
      <div className="pointer-events-none absolute bottom-40 left-1/4 w-[400px] h-[200px] bg-neon-pink/5 rounded-full blur-[100px] z-0"></div>

    </div>
  );
}
