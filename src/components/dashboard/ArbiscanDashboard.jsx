import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, TrendingUp, DollarSign, Database,
    Lock, Clock, BarChart2, ShieldAlert, LogIn
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import {
    fetchArbitrumMarketData,
    fetchArbitrumTVL,
    getWhaleTrackerData,
    fetchArbitrumPriceHistory,
    REFRESH
} from '../../lib/api-fetcher';

const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg backdrop-blur-md">
                <p className="text-gray-500 text-xs font-medium tracking-wider mb-1">{label}</p>
                <p className="text-gray-900 font-semibold font-mono">
                    {prefix}{Number(payload[0].value).toLocaleString()}
                </p>
            </div>
        );
    }
    return null;
};

const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const targetDate = new Date('2027-03-16T00:00:00').getTime();

        const updateTime = () => {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                setTimeLeft('FULLY EMITTED');
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft(`${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="font-mono text-xl font-bold text-blue-600">
            {timeLeft}
        </div>
    );
};

const ArbiscanDashboard = ({ user, onOpenLoginModal, onOpenRegisterModal }) => {
    const [marketData, setMarketData] = useState(null);
    const [tvlData, setTvlData] = useState([]);
    const [priceData, setPriceData] = useState([]);
    const [whaleData, setWhaleData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // ── [A] PRICE LOOP: every 20 s — Binance has no strict rate-limit ────
        const refreshPrice = async () => {
            try {
                const data = await fetchArbitrumMarketData();
                if (data) setMarketData(data);
            } catch (e) {
                console.error('[Price] refresh error:', e);
            }
        };

        // ── [B] WHALE LOOP: every 5 min — Dune + Blockscout ─────────────────
        const refreshWhales = async () => {
            try {
                const data = await getWhaleTrackerData();
                if (data?.length) setWhaleData(data);
            } catch (e) {
                console.error('[Whale] refresh error:', e);
            }
        };

        // ── [C] CHART LOOP: every 24 h — DeFiLlama & Binance monthly klines ─
        const refreshCharts = async () => {
            try {
                const [tvl, hist] = await Promise.allSettled([
                    fetchArbitrumTVL(),
                    fetchArbitrumPriceHistory(),
                ]);
                if (tvl.status === 'fulfilled' && tvl.value?.length) setTvlData(tvl.value);
                if (hist.status === 'fulfilled' && hist.value?.length) setPriceData(hist.value);
            } catch (e) {
                console.error('[Charts] refresh error:', e);
            } finally {
                setIsLoading(false);
            }
        };

        // Initial load – run all three immediately, then schedule
        (async () => {
            await Promise.all([refreshPrice(), refreshCharts(), refreshWhales()]);
        })();

        const pI = setInterval(refreshPrice, REFRESH.PRICE);  // 20 s
        const wI = setInterval(refreshWhales, REFRESH.WHALE);  // 5 min
        const cI = setInterval(refreshCharts, REFRESH.SLOW);   // 24 h
        return () => { clearInterval(pI); clearInterval(wI); clearInterval(cI); };
    }, []);

    if (isLoading) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-blue-600 font-sans min-h-screen">
                <Activity className="animate-spin mb-4" size={48} />
                <p className="tracking-[0.2em] text-sm uppercase font-bold text-gray-500">Initializing Dashboard...</p>
            </div>
        );
    }


    const { priceUSD = 0, marketCapUSD = 0, priceChange24h = 0, volume24hUSD = 0 } = marketData || {};

    // ── Auth Gate ─────────────────────────────────────────────────────────────
    if (!user) {
        return (
            <section className="relative bg-gray-50 min-h-screen pt-20 sm:pt-24 pb-20 sm:pb-32 px-4 md:px-10 text-gray-900 font-sans overflow-hidden flex items-center justify-center">
                {/* Blurred background preview */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
                    <div className="opacity-20 blur-xl scale-105 origin-top">
                        {/* Fake shimmer cards */}
                        <div className="max-w-[1400px] mx-auto pt-24 space-y-6">
                            <div className="grid grid-cols-4 gap-4">
                                {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-3xl" />)}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl" />)}
                            </div>
                            <div className="h-72 bg-gradient-to-br from-indigo-100 to-blue-50 rounded-3xl" />
                        </div>
                    </div>
                </div>

                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-indigo-600/5 pointer-events-none" />

                {/* Center Login Gate Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 bg-white/80 backdrop-blur-2xl border border-white/60 shadow-2xl shadow-blue-500/10 rounded-[32px] p-10 sm:p-14 flex flex-col items-center text-center max-w-md w-full mx-4"
                >
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
                        <ShieldAlert size={28} className="text-white" />
                    </div>

                    {/* Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-blue-600 text-[10px] font-bold uppercase tracking-widest">Members Only</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tighter leading-tight mb-3">
                        ARBISCAN
                    </h2>
                    <p className="text-gray-500 text-sm leading-relaxed mb-8">
                        Hyzen Labs 회원 로그인 후 확인 가능합니다.
                    </p>

                    <button
                        onClick={onOpenLoginModal}
                        className="w-full flex items-center justify-center gap-2.5 bg-gray-900 hover:bg-blue-600 text-white font-bold text-sm py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <LogIn size={18} />
                        회원 로그인
                    </button>

                    <p className="mt-5 text-xs text-gray-400">
                        계정이 없으신가요?{' '}
                        <button onClick={onOpenRegisterModal} className="text-blue-600 font-semibold hover:underline">가입하러 가기 →</button>
                    </p>
                </motion.div>
            </section>
        );
    }

    // Calculate global sentiment for top whales
    const totalBought7D = whaleData.reduce((acc, w) => acc + (w.bought7d || 0), 0);
    const totalSold7D = whaleData.reduce((acc, w) => acc + (w.sold7d || 0), 0);
    const totalActivity = totalBought7D + totalSold7D;
    const accumulationSentiment = totalActivity > 0 ? (totalBought7D / totalActivity) * 100 : 50;

    // Whale list sorted by 7D net accumulation
    const sortedWhales = [...whaleData].sort((a, b) => (b.netAccumulation7d || 0) - (a.netAccumulation7d || 0));

    // Dynamic Max for visual bar width
    const maxAbsNet = Math.max(...sortedWhales.map(w => Math.abs(w.netAccumulation7d || 0)), 1);

    return (
        <section className="bg-gray-50 min-h-screen pt-20 sm:pt-24 pb-20 sm:pb-32 px-4 md:px-10 text-gray-900 font-sans overflow-x-hidden">
            <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 sm:gap-6 mb-8 sm:mb-12">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 text-blue-600 font-bold text-xs tracking-widest uppercase mb-2"
                        >
                            <Database size={14} />
                            <span>On-Chain Intelligence</span>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-5xl sm:text-6xl md:text-8xl font-black text-gray-900 tracking-tighter leading-none"
                        >
                            ARBISCAN
                        </motion.h1>
                    </div>
                </div>

                {/* 1. Market Overview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Price Card */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-3 sm:mb-4 text-gray-500">
                            <DollarSign size={16} />
                            <h3 className="text-xs font-medium uppercase tracking-widest">ARB Price</h3>
                        </div>
                        <div className="flex items-end gap-3">
                            <span className="text-[28px] sm:text-4xl leading-none font-mono font-semibold text-gray-900">${priceUSD?.toFixed(4)}</span>
                            <span className={`text-sm font-medium mb-1 ${priceChange24h >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                {priceChange24h >= 0 ? '+' : ''}{priceChange24h?.toFixed(2)}%
                            </span>
                        </div>
                    </div>

                    {/* Market Cap Card */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-3 sm:mb-4 text-gray-500">
                            <TrendingUp size={16} />
                            <h3 className="text-xs font-medium uppercase tracking-widest">Market Cap</h3>
                        </div>
                        <div className="text-xl sm:text-3xl leading-none font-mono font-semibold text-gray-900">
                            ${(marketCapUSD / 1e9).toFixed(2)}B
                        </div>
                    </div>

                    {/* Volume Card */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-3 sm:mb-4 text-gray-500">
                            <Activity size={16} />
                            <h3 className="text-xs font-medium uppercase tracking-widest">24h Volume</h3>
                        </div>
                        <div className="text-xl sm:text-3xl leading-none font-mono font-semibold text-gray-900">
                            ${(volume24hUSD / 1e6).toFixed(1)}M
                        </div>
                    </div>

                    {/* Countdown Card */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-3 sm:mb-4 text-blue-600">
                            <Clock size={16} />
                            <h3 className="text-[10px] sm:text-xs font-medium uppercase tracking-widest font-sans">Supply Shock ETA</h3>
                        </div>
                        <div>
                            <CountdownTimer />
                            <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1.5 sm:mt-2 uppercase tracking-widest font-medium">Target: March 16, 2027</p>
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* 2. TVL Chart */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-gray-200 shadow-sm flex flex-col h-[300px] sm:h-[400px]">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <div className="flex items-center gap-3">
                                <Lock className="text-gray-900" size={20} />
                                <h2 className="text-base sm:text-lg font-semibold tracking-widest uppercase">Active DeFi TVL</h2>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={tvlData}>
                                    <defs>
                                        <linearGradient id="tvlColor" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#9ca3af"
                                        tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                                        tickMargin={10}
                                        minTickGap={50}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        scale="auto"
                                        domain={['auto', 'auto']}
                                        stroke="#9ca3af"
                                        tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                                        tickFormatter={(value) => `$${(value / 1e9).toFixed(1)}B`}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip prefix="$" />} />
                                    <Area
                                        type="monotone"
                                        dataKey="tvl"
                                        stroke="#2563eb"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#tvlColor)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 3. Price History Chart */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-gray-200 shadow-sm flex flex-col h-[300px] sm:h-[400px]">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <div className="flex items-center gap-3">
                                <DollarSign className="text-gray-900" size={20} />
                                <h2 className="text-base sm:text-lg font-semibold tracking-widest uppercase">ARB Price (Monthly)</h2>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={priceData}>
                                    <defs>
                                        <linearGradient id="priceColor" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#9ca3af"
                                        tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                                        tickMargin={10}
                                        minTickGap={50}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        domain={['auto', 'auto']}
                                        stroke="#9ca3af"
                                        tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                                        tickFormatter={(value) => `$${value.toFixed(3)}`}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip prefix="$" />} />
                                    <Area
                                        type="monotone"
                                        dataKey="price"
                                        stroke="#8b5cf6"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#priceColor)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 4. Whale Tracker Section */}
                <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-gray-200 shadow-sm mb-4 sm:mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 sm:mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2 sm:mb-3">
                                <BarChart2 className="text-gray-900" size={20} />
                                <h2 className="text-base sm:text-lg font-semibold tracking-widest uppercase">Smart Money Accumulators (7D)</h2>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-xl">
                                Live on-chain tracking of top wallets. Identifies smart money behavioral patterns based on their latest 7-day Arbitrum transactions on Arbiscan.
                            </p>
                        </div>

                        {/* Overall Sentiment Progress Bar */}
                        <div className="w-full md:w-72 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2.5">
                                <span>Whale Sentiment</span>
                                <span className={accumulationSentiment >= 50 ? 'text-blue-600' : 'text-red-500'}>
                                    {accumulationSentiment >= 50 ? 'Accumulating' : 'Distributing'} ({accumulationSentiment.toFixed(1)}%)
                                </span>
                            </div>
                            <div className="h-2 w-full bg-red-100 rounded-full overflow-hidden flex relative">
                                <div className="h-full bg-blue-600 transition-all duration-1000 ease-out z-10" style={{ width: `${accumulationSentiment}%` }} />
                                {/* Center Line Indicator */}
                                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white bg-opacity-70 z-20" />
                            </div>
                            <div className="flex justify-between text-[9px] font-semibold text-gray-400 mt-1.5 uppercase tracking-wider">
                                <span>Buying Pressure</span>
                                <span>Selling Pressure</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {sortedWhales.slice(0, 10).map((whale, idx) => {
                            const address = whale.id || 'Unknown Wallet';

                            // Visual bar mapped to netAccumulation7d
                            const isPositive = (whale.netAccumulation7d || 0) >= 0;
                            const barColor = isPositive ? 'bg-blue-100/50' : 'bg-red-100/50';
                            const barWidth = (Math.abs(whale.netAccumulation7d || 0) / maxAbsNet) * 100;

                            return (
                                <div key={whale.id || idx} className="flex relative overflow-hidden flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:bg-gray-100 hover:shadow-md group gap-4">
                                    {/* Visual Bar Background for Increase */}
                                    <div
                                        className={`absolute left-0 top-0 bottom-0 ${barColor} transition-all duration-1000 ease-out`}
                                        style={{ width: `${barWidth}%` }}
                                    />

                                    <div className="flex items-center gap-3 sm:gap-5 overflow-hidden relative z-10 flex-1 pr-2">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 bg-white flex items-center justify-center font-bold text-sm sm:text-base text-gray-700 border border-gray-200 shadow-sm">
                                            {idx + 1}
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <div className="flex items-center gap-2 mb-1 sm:mb-1.5 flex-wrap">
                                                <p className="font-mono text-gray-900 text-xs sm:text-sm font-semibold truncate leading-tight" title={address}>
                                                    {address.length > 15 ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : address}
                                                </p>
                                                <span className="px-2 py-0.5 whitespace-nowrap bg-white rounded-md text-[9px] sm:text-[10px] uppercase font-bold text-gray-700 border border-gray-200 shadow-sm">
                                                    {whale.badge || 'Pending'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-widest font-medium">
                                                Holdings: {Number(whale.currentBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} ARB
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`flex-shrink-0 relative z-10 sm:text-right font-mono text-xs sm:text-sm font-bold pl-11 sm:pl-0 ${isPositive ? 'text-blue-600' : 'text-red-500'}`}>
                                        <div className="bg-white/90 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-gray-100 shadow-sm inline-block min-w-[140px] text-right">
                                            <span className="text-[9px] sm:text-[10px] uppercase text-gray-400 mr-2 sm:mr-3 font-sans tracking-widest font-semibold">7D Net Flow</span>
                                            {isPositive ? '+' : ''}{Number(whale.netAccumulation7d || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} ARB
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </section>
    );
};

export default ArbiscanDashboard;
