import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, TrendingUp, DollarSign, Database,
    Lock, Clock, BarChart2, ShieldAlert, LogIn, Target, ChevronRight, Zap
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ComposedChart, Line
} from 'recharts';
import {
    fetchMarketComparison,
    fetchChainTVLs,
    fetchArbitrumHistoricalTVL,
    fetchArbitrumSupply,
    fetchArbitrumPriceHistory,
    fetchArbitrumMonthlyPriceHistory,
    getCleanWhaleData,
    fetchKRWRate,
    REFRESH
} from '../../lib/api-fetcher';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#111111] border border-gray-800 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                <p className="text-gray-400 text-xs font-mono tracking-wider mb-2">{label}</p>
                {payload.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-gray-300 text-xs font-medium">{entry.name}:</span>
                        <span className="text-white font-semibold font-mono">
                            {entry.value > 1000 ? `$${(entry.value / 1e9).toFixed(2)}B` : `$${entry.value.toFixed(2)}`}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const SupplyCountdown = () => {
    const [timeLeft, setTimeLeft] = useState({ d: '00', h: '00', m: '00', s: '00' });

    useEffect(() => {
        const targetDate = new Date('2027-03-16T00:00:00').getTime();
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                setTimeLeft({ d: '00', h: '00', m: '00', s: '00' });
                clearInterval(interval);
                return;
            }
            setTimeLeft({
                d: String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0'),
                h: String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0'),
                m: String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0'),
                s: String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0')
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-3 font-mono text-2xl md:text-3xl font-black text-[#00D1FF] drop-shadow-[0_0_15px_rgba(0,209,255,0.4)]">
            <div className="flex flex-col items-center"><span className="leading-none">{timeLeft.d}</span><span className="text-[10px] text-gray-500 uppercase">Days</span></div>
            <span className="text-gray-600 pb-3">:</span>
            <div className="flex flex-col items-center"><span className="leading-none">{timeLeft.h}</span><span className="text-[10px] text-gray-500 uppercase">Hrs</span></div>
            <span className="text-gray-600 pb-3">:</span>
            <div className="flex flex-col items-center"><span className="leading-none">{timeLeft.m}</span><span className="text-[10px] text-gray-500 uppercase">Min</span></div>
            <span className="text-gray-600 pb-3">:</span>
            <div className="flex flex-col items-center text-[#DC3545]"><span className="leading-none">{timeLeft.s}</span><span className="text-[10px] text-gray-500 uppercase font-bold text-[#DC3545]/70">Sec</span></div>
        </div>
    );
};

const ValueMetricCard = ({ title, value, subValue, change, icon: Icon, colorClass, highlight = false }) => (
    <div className={`relative p-6 rounded-2xl border ${highlight ? 'bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border-[#00D1FF]/30 shadow-[0_0_30px_rgba(0,209,255,0.05)]' : 'bg-[#111111] border-gray-800'}`}>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-mono text-[11px] tracking-widest uppercase">{title}</h3>
            <Icon size={18} className={colorClass} />
        </div>
        <div className="flex items-end justify-between">
            <div>
                <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
                {subValue && <div className="text-gray-500 text-sm mt-1">{subValue}</div>}
            </div>
            {change !== undefined && (
                <div className={`text-xs font-bold px-2 py-1 rounded-md ${change >= 0 ? 'bg-[#28A745]/20 text-[#28A745]' : 'bg-[#DC3545]/20 text-[#DC3545]'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                </div>
            )}
        </div>
    </div>
);

// ─── Treasury Constants ───────────────────────────────────────────────────────
const TREASURY_ARB = 130766;
const TARGET_KRW = 800_000_000; // 8억 원

// ─── Value Gap Gauge Component ────────────────────────────────────────────────
const ValueGapGauge = ({ index }) => {
    // index: opMcapTvl / arbMcapTvl — >1 means ARB is underpriced vs OP
    const capped = Math.min(Math.max(index, 0), 3);
    const pct = capped / 3; // 0 to 1
    const angle = -135 + pct * 270; // -135° to +135°
    const r = 80;
    const cx = 110;
    const cy = 110;
    // Arc path helper
    const polarToCart = (deg) => {
        const rad = (deg - 90) * Math.PI / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    };
    const start = polarToCart(-135);
    const end = polarToCart(135);
    const needleEnd = polarToCart(angle);
    // Colour zones
    const color = index >= 1.5 ? '#28A745' : index >= 1.0 ? '#F0A500' : '#DC3545';
    const label = index >= 1.5 ? 'DEEPLY UNDERPRICED' : index >= 1.0 ? 'UNDERPRICED' : 'FAIRLY VALUED';

    return (
        <div className="flex flex-col items-center">
            <svg viewBox="0 0 220 150" className="w-full max-w-[200px]">
                {/* Track */}
                <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${end.x} ${end.y}`}
                    fill="none" stroke="#222" strokeWidth="14" strokeLinecap="round" />
                {/* Active arc */}
                {pct > 0 && (
                    <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${needleEnd.x} ${needleEnd.y}`}
                        fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
                )}
                {/* Needle dot */}
                <circle cx={needleEnd.x} cy={needleEnd.y} r="7" fill={color}
                    style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
                {/* Center value */}
                <text x={cx} y={cy + 10} textAnchor="middle" fill="white" fontSize="22" fontWeight="900" fontFamily="monospace">
                    {index.toFixed(2)}x
                </text>
                {/* Labels */}
                <text x="28" y="138" fill="#666" fontSize="9" fontFamily="monospace">FAIR</text>
                <text x="175" y="138" fill="#28A745" fontSize="9" fontFamily="monospace">MAX</text>
            </svg>
            <span className="text-xs font-bold tracking-widest uppercase mt-1" style={{ color }}>
                {label}
            </span>
        </div>
    );
};

// ─── Treasury Progress Bar ────────────────────────────────────────────────────
const TreasuryCard = ({ priceKRW, priceUSD, krwRate }) => {
    const currentValueKRW = TREASURY_ARB * priceKRW;
    const progressPct = Math.min((currentValueKRW / TARGET_KRW) * 100, 100);
    const targetPriceUSD = TARGET_KRW / TREASURY_ARB / (krwRate || 1350);
    const targetPriceKRW = TARGET_KRW / TREASURY_ARB;
    const gapMultiple = targetPriceKRW / (priceKRW || 1);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-6"
            style={{
                background: 'linear-gradient(135deg, #0D0D0D 0%, #1A1200 100%)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                boxShadow: '0 0 40px rgba(212, 175, 55, 0.08), inset 0 1px 0 rgba(212, 175, 55, 0.15)'
            }}
        >
            {/* Gold shimmer overlay */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at top left, rgba(212,175,55,0.08) 0%, transparent 60%)' }} />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}>
                            <span className="text-sm">🏛️</span>
                        </div>
                        <div>
                            <h3 className="text-xs font-mono tracking-[0.2em] uppercase" style={{ color: '#D4AF37' }}>HYZEN Labs. Treasury</h3>
                            <p className="text-[10px] text-gray-600 font-mono mt-0.5">Private · Real-time ARB Holdings</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider">Total ARB</div>
                        <div className="text-xl font-black font-mono" style={{ color: '#D4AF37' }}>
                            {TREASURY_ARB.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Main Value Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    <div className="sm:col-span-2">
                        <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">Estimated Value</div>
                        <div className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: '#D4AF37' }}>
                            ₩{Math.round(currentValueKRW).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500 font-mono mt-1">
                            ≈ ${(currentValueKRW / (krwRate || 1350)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">Live ARB Price</div>
                        <div className="text-xl font-black text-white font-mono">${priceUSD?.toFixed(4)}</div>
                        <div className="text-sm text-gray-500 font-mono">₩{priceKRW?.toLocaleString()}</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Road to ₩800,000,000</span>
                        <span className="text-sm font-black font-mono" style={{ color: '#D4AF37' }}>{progressPct.toFixed(2)}%</span>
                    </div>
                    <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div
                            className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${progressPct}%`,
                                background: 'linear-gradient(90deg, #8B6914 0%, #D4AF37 50%, #FFD700 100%)',
                                boxShadow: '0 0 10px rgba(212,175,55,0.6)'
                            }}
                        />
                    </div>
                </div>

                {/* Target Distance */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 rounded-xl p-3" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)' }}>
                        <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">Target Price for 8억</div>
                        <div className="font-mono font-black" style={{ color: '#D4AF37' }}>
                            ₩{Math.round(targetPriceKRW).toLocaleString()} <span className="text-gray-600 text-xs">/ ARB</span>
                        </div>
                        <div className="text-xs text-gray-600 font-mono">≈ ${targetPriceUSD.toFixed(2)}</div>
                    </div>
                    <div className="flex-1 rounded-xl p-3" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)' }}>
                        <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">Required Multiplier</div>
                        <div className="text-xl font-black font-mono" style={{ color: gapMultiple >= 100 ? '#DC3545' : '#D4AF37' }}>
                            {gapMultiple.toFixed(1)}x
                        </div>
                        <div className="text-xs text-gray-600 font-mono">vs. current price</div>
                    </div>
                    <div className="flex-1 rounded-xl p-3" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)' }}>
                        <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">Remaining</div>
                        <div className="font-mono font-black text-white">
                            ₩{Math.max(0, Math.round(TARGET_KRW - currentValueKRW)).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600 font-mono">to goal</div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const ArbiscanDashboard = ({ user, onOpenLoginModal, onOpenRegisterModal }) => {
    const [data, setData] = useState({
        market: null, tvlData: null, supply: null,
        histPrice: [], histTvl: [], whales: [], monthlyPrice: [],
        krwRate: 1350
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                const [market, tvlData, supply, histPrice, histTvl, whales, monthlyPrice, krwRate] = await Promise.all([
                    fetchMarketComparison(),
                    fetchChainTVLs(),
                    fetchArbitrumSupply(),
                    fetchArbitrumPriceHistory(),
                    fetchArbitrumHistoricalTVL(),
                    getCleanWhaleData(),
                    fetchArbitrumMonthlyPriceHistory(),
                    fetchKRWRate()
                ]);
                setData({ market, tvlData, supply, histPrice, histTvl, whales, monthlyPrice, krwRate });
            } catch (e) {
                console.error("Dashboard Data Load Error", e);
            } finally {
                setIsLoading(false);
            }
        };

        loadAllData();
        const interval = setInterval(loadAllData, REFRESH.NORMAL);
        return () => clearInterval(interval);
    }, []);

    // Auth gate 
    if (!user) {
        return (
            <section className="relative bg-[#050505] min-h-screen pt-24 pb-32 px-4 md:px-10 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00D1FF]/5 to-transparent pointer-events-none" />
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 bg-[#111111] border border-gray-800 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl"
                >
                    <Lock className="w-16 h-16 mx-auto mb-6 text-[#00D1FF]" />
                    <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">On-Chain Terminal</h2>
                    <p className="text-gray-400 mb-8 text-sm">Authentication required to access Hyzen Labs Arbitration Control Tower.</p>
                    <button onClick={onOpenLoginModal} className="w-full py-4 bg-[#00D1FF] text-black font-bold uppercase tracking-widest rounded-xl hover:bg-[#00b8e6] transition-colors mb-3">
                        Sign In
                    </button>
                    <button onClick={onOpenRegisterModal} className="w-full py-4 bg-transparent border border-gray-700 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-colors">
                        Register
                    </button>
                </motion.div>
            </section>
        );
    }

    if (isLoading || !data.market) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <Activity className="animate-spin text-[#00D1FF]" size={40} />
            </div>
        );
    }

    // Calculations
    const { arb, op } = data.market;
    const arbTvl = data.tvlData.arb || 1;
    const opTvl = data.tvlData.op || 1;

    const arbMcapTvlRatio = arb.mcapUSD / arbTvl;
    const opMcapTvlRatio = op.mcapUSD / opTvl;

    const isUnderpriced = arbMcapTvlRatio < opMcapTvlRatio;
    const scarcityIndex = ((data.supply.circulating / data.supply.total) * 100).toFixed(1);

    // Merge history data for Divergence Chart
    // Assuming histPrice and histTvl have compatible 'date' MM/DD formats
    const mergedHistory = data.histPrice.map(p => {
        const tvlPoint = data.histTvl.find(t => t.date === p.date);
        return {
            date: p.date,
            price: p.price,
            tvl: tvlPoint ? tvlPoint.tvl : null
        };
    });

    const valueGapIndex = opMcapTvlRatio > 0 && arbMcapTvlRatio > 0
        ? opMcapTvlRatio / arbMcapTvlRatio
        : 1;

    return (
        <section className="bg-[#050505] min-h-screen text-gray-200 font-sans pt-24 pb-20 px-4 md:px-8">
            <div className="max-w-[1400px] mx-auto">

                {/* === TREASURY STATUS === */}
                <TreasuryCard
                    priceKRW={arb.priceKRW}
                    priceUSD={arb.priceUSD}
                    krwRate={data.krwRate}
                />

                {/* Top Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 mt-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                        <ValueMetricCard
                            title="ARB Price (Live)"
                            value={`$${arb.priceUSD.toFixed(4)}`}
                            subValue={`₩${arb.priceKRW.toLocaleString()}`}
                            change={arb.change24h}
                            icon={DollarSign} colorClass="text-[#00D1FF]" highlight
                        />
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                        <ValueMetricCard
                            title="Mcap / TVL Ratio"
                            value={arbMcapTvlRatio.toFixed(2)}
                            subValue={`Optimism: ${opMcapTvlRatio.toFixed(2)}`}
                            icon={Activity} colorClass={isUnderpriced ? "text-[#28A745]" : "text-[#DC3545]"}
                        />
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <ValueMetricCard
                            title="Real-time Scarcity Index"
                            value={`${scarcityIndex}%`}
                            subValue="Emission phase"
                            icon={Zap} colorClass="text-yellow-500"
                        />
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                        <div className="relative p-6 rounded-2xl bg-[#111111] border border-[#DC3545]/30 h-full flex flex-col justify-center shadow-[0_0_20px_rgba(220,53,69,0.05)]">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-gray-400 font-mono text-[11px] tracking-widest uppercase">Zero Inflation ETA</h3>
                                <Clock size={16} className="text-[#DC3545]" />
                            </div>
                            <SupplyCountdown />
                        </div>
                    </motion.div>
                </div>

                {/* Monthly Price Chart */}
                <div className="mb-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                        className="bg-[#111111] border border-gray-800 rounded-3xl p-6 shadow-xl"
                    >
                        <div className="mb-6 border-b border-gray-800 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                                <BarChart2 size={20} className="text-[#00D1FF]" />
                                ARB Monthly Price Action
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-mono">Long-term monthly closing prices.</p>
                        </div>
                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.monthlyPrice} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#28A745" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#28A745" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                    <XAxis dataKey="date" stroke="#555" tick={{ fill: '#777', fontSize: 12 }} tickMargin={10} minTickGap={20} />
                                    <YAxis stroke="#28A745" tick={{ fill: '#28A745', fontSize: 12 }} tickFormatter={(val) => `$${val.toFixed(2)}`} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#444', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                    <Area type="monotone" dataKey="price" name="Monthly Close" stroke="#28A745" strokeWidth={3} fillOpacity={1} fill="url(#colorMonthly)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>

                {/* Dual Layout: Chart & Whales */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* TVL vs Price Divergence Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                        className="lg:col-span-2 bg-[#111111] border border-gray-800 rounded-3xl p-6 shadow-xl"
                    >
                        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                                    <TrendingUp size={20} className="text-[#00D1FF]" />
                                    Divergence Analysis: Value vs Price
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 font-mono">Comparing ARB Market Price against Network TVL (DeFiLlama)</p>
                            </div>
                            {isUnderpriced && (
                                <div className="bg-[#28A745]/10 border border-[#28A745]/30 text-[#28A745] px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider animate-pulse">
                                    Undervalued Signal
                                </div>
                            )}
                        </div>
                        <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={mergedHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00D1FF" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#00D1FF" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                    <XAxis dataKey="date" stroke="#555" tick={{ fill: '#777', fontSize: 12 }} tickMargin={10} minTickGap={30} />
                                    <YAxis yAxisId="left" stroke="#00D1FF" tick={{ fill: '#00D1FF', fontSize: 12 }} tickFormatter={(val) => `$${(val / 1e9).toFixed(1)}B`} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#DC3545" tick={{ fill: '#DC3545', fontSize: 12 }} tickFormatter={(val) => `$${val.toFixed(2)}`} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#444', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                    <Area yAxisId="left" type="monotone" dataKey="tvl" name="DeFi TVL" stroke="#00D1FF" strokeWidth={2} fillOpacity={1} fill="url(#colorTvl)" />
                                    <Line yAxisId="right" type="monotone" dataKey="price" name="Price" stroke="#DC3545" strokeWidth={3} dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 flex gap-4 text-xs font-mono text-gray-500 justify-end">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#00D1FF] rounded-sm" /> Network Value (TVL)</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#DC3545] rounded-sm" /> Market Price</div>
                        </div>
                    </motion.div>
                </div>

                {/* Value Gap Index + Whale Tracker row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">

                    {/* Value Gap Index */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                        className="bg-[#111111] border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center"
                        style={{ borderColor: valueGapIndex >= 1 ? 'rgba(40,167,69,0.3)' : 'rgba(100,100,100,0.3)' }}
                    >
                        <div className="w-full mb-4 border-b border-gray-800 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                                <Target size={20} className={valueGapIndex >= 1 ? 'text-[#28A745]' : 'text-gray-500'} />
                                Value Gap Index
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-mono">OP Mcap/TVL ÷ ARB Mcap/TVL. &gt;1 = ARB Underpriced</p>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center w-full py-4">
                            <ValueGapGauge index={valueGapIndex} />
                            <div className="mt-6 w-full grid grid-cols-2 gap-3">
                                <div className="rounded-xl p-3 bg-[#0A0A0A] border border-gray-800 text-center">
                                    <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">ARB Mcap/TVL</div>
                                    <div className="font-mono font-black text-white">{arbMcapTvlRatio.toFixed(2)}x</div>
                                </div>
                                <div className="rounded-xl p-3 bg-[#0A0A0A] border border-gray-800 text-center">
                                    <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">OP Mcap/TVL</div>
                                    <div className="font-mono font-black text-white">{opMcapTvlRatio.toFixed(2)}x</div>
                                </div>
                            </div>
                            {valueGapIndex >= 1 && (
                                <div className="mt-4 w-full bg-[#28A745]/10 border border-[#28A745]/30 text-[#28A745] px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-center animate-pulse">
                                    🟢 ARB is {valueGapIndex.toFixed(2)}x Cheaper than Optimism per TVL $
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Whale Tracker */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                        className="lg:col-span-2 bg-[#111111] border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col"
                    >
                        <div className="mb-6 border-b border-gray-800 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                                <ShieldAlert size={20} className="text-[#28A745]" />
                                Clean Whale Tracker (72h)
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-mono">Excluding CEX/Bridges. Smart Money active.</p>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {data.whales.length === 0 ? (
                                    <p className="text-gray-600 text-sm font-mono col-span-2 text-center py-8">No whale data available.</p>
                                ) : data.whales.map((whale, idx) => (
                                    <div key={idx} className="bg-[#1A1A1A] p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
                                        <div className="flex flex-col justify-between items-start gap-3 mb-2">
                                            <div className="min-w-0 w-full">
                                                <span className="text-white font-mono font-bold text-sm block truncate pr-2">{whale.id}</span>
                                                <span className="block text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{whale.type}</span>
                                            </div>
                                            <div className="flex flex-row justify-between items-center w-full">
                                                <span className="text-gray-300 font-mono text-sm block">
                                                    {whale.balance > 1000000
                                                        ? `${(whale.balance / 1000000).toFixed(1)}M`
                                                        : `${(whale.balance / 1000).toFixed(0)}k`
                                                    } ARB
                                                </span>
                                                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${whale.net24hPct > 0 ? 'bg-[#28A745]/20 text-[#28A745]' : whale.net24hPct < 0 ? 'bg-[#DC3545]/20 text-[#DC3545]' : 'bg-gray-800 text-gray-500'}`}>
                                                    {whale.net24hPct > 0 ? '+' : ''}{whale.net24hPct.toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-800/50">
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#050505] text-gray-400">{whale.badge}</span>
                                            <span className="text-[10px] text-gray-600 font-mono">24H Active</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

export default ArbiscanDashboard;
