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
    getCleanWhaleData,
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

const ArbiscanDashboard = ({ user, onOpenLoginModal, onOpenRegisterModal }) => {
    const [data, setData] = useState({
        market: null, tvlData: null, supply: null,
        histPrice: [], histTvl: [], whales: []
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                const [market, tvlData, supply, histPrice, histTvl, whales] = await Promise.all([
                    fetchMarketComparison(),
                    fetchChainTVLs(),
                    fetchArbitrumSupply(),
                    fetchArbitrumPriceHistory(),
                    fetchArbitrumHistoricalTVL(),
                    getCleanWhaleData()
                ]);
                setData({ market, tvlData, supply, histPrice, histTvl, whales });
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

    const HYZEN_ARB = 130766;
    const TARGET_KRW = 800000000;
    const currentHyzenKRW = HYZEN_ARB * arb.priceKRW;
    const progressPct = Math.min((currentHyzenKRW / TARGET_KRW) * 100, 100);

    return (
        <section className="bg-[#050505] min-h-screen text-gray-200 font-sans pt-24 pb-20 px-4 md:px-8">
            <div className="max-w-[1400px] mx-auto">

                {/* Global Command Bar */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row items-center justify-between bg-[#111111] border border-gray-800 rounded-2xl p-4 md:p-6 mb-8 shadow-lg"
                >
                    <div className="flex items-center gap-4 mb-4 md:mb-0">
                        <div className="w-12 h-12 bg-[#00D1FF]/10 text-[#00D1FF] flex items-center justify-center rounded-xl border border-[#00D1FF]/20">
                            <Target size={24} />
                        </div>
                        <div>
                            <h2 className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mb-1">Hyzen Labs Asset target</h2>
                            <div className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                                {HYZEN_ARB.toLocaleString()} ARB
                                <span className="text-[#28A745] font-mono text-lg">({(currentHyzenKRW / 1e8).toFixed(1)}억 / 8억 ₩)</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-full md:w-1/3">
                        <div className="flex justify-between text-xs text-gray-400 mb-2 font-mono">
                            <span>Mission Progress</span>
                            <span>{progressPct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-[#00D1FF] to-[#0070FF]"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Top Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
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

                    {/* Whale Tracker */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                        className="bg-[#111111] border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col"
                    >
                        <div className="mb-6 border-b border-gray-800 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                                <ShieldAlert size={20} className="text-[#28A745]" />
                                Clean Whale Tracker (72h)
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-mono">Excluding CEX/Bridges. Smart Money active.</p>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="space-y-4">
                                {data.whales.map((whale, idx) => (
                                    <div key={idx} className="bg-[#1A1A1A] p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="text-white font-mono font-bold text-sm">{whale.id}</span>
                                                <span className="block text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{whale.type}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-gray-300 font-mono text-sm block">{(whale.balance / 1000).toFixed(0)}k ARB</span>
                                                <span className={`text-[10px] font-bold mt-1 ${whale.net72h > 0 ? 'text-[#28A745]' : whale.net72h < 0 ? 'text-[#DC3545]' : 'text-gray-500'}`}>
                                                    {whale.net72h > 0 ? '+' : ''}{whale.net72h.toLocaleString()} (72h)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-800/50">
                                            <span className="text-xs font-semibold px-2 py-1 rounded bg-[#050505] text-gray-400">
                                                {whale.badge}
                                            </span>
                                            <span className="text-[10px] text-gray-600 font-mono">Active {whale.lastActive}</span>
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
