import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Activity, TrendingUp, DollarSign, Database,
    Lock, Clock, BarChart2
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import {
    fetchArbitrumMarketData,
    fetchArbitrumTVL,
    getWhaleTrackerData
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

const ArbiscanDashboard = () => {
    const [marketData, setMarketData] = useState(null);
    const [tvlData, setTvlData] = useState([]);
    const [whaleData, setWhaleData] = useState([]);
    const [isLogScale, setIsLogScale] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const results = await Promise.allSettled([
                    fetchArbitrumMarketData(),
                    fetchArbitrumTVL(),
                    getWhaleTrackerData()
                ]);

                if (results[0].status === 'fulfilled' && results[0].value) setMarketData(results[0].value);
                if (results[1].status === 'fulfilled' && results[1].value) setTvlData(results[1].value);
                if (results[2].status === 'fulfilled' && results[2].value) setWhaleData(results[2].value);

            } catch (err) {
                console.error("Dashboard data load error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
        const interval = setInterval(loadData, 15 * 1000); // 15 seconds auto-refresh
        return () => clearInterval(interval);
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

    return (
        <section className="bg-gray-50 min-h-screen pt-24 pb-32 px-4 md:px-10 text-gray-900 font-sans overflow-x-hidden">
            <div className="max-w-[1400px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 text-blue-600 font-bold text-xs tracking-widest uppercase mb-2"
                        >
                            <Database size={14} />
                            <span>Real-Time</span>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl font-semibold text-gray-900 tracking-tighter"
                        >
                            ARB Dashboard
                        </motion.h1>
                    </div>
                </div>

                {/* 1. Market Overview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Price Card */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-4 text-gray-500">
                            <DollarSign size={16} />
                            <h3 className="text-xs font-medium uppercase tracking-widest">ARB Price</h3>
                        </div>
                        <div className="flex items-end gap-3">
                            <span className="text-3xl sm:text-4xl font-mono font-semibold text-gray-900">${priceUSD?.toFixed(4)}</span>
                            <span className={`text-sm font-medium mb-1 ${priceChange24h >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                {priceChange24h >= 0 ? '+' : ''}{priceChange24h?.toFixed(2)}%
                            </span>
                        </div>
                    </div>

                    {/* Market Cap Card */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-4 text-gray-500">
                            <TrendingUp size={16} />
                            <h3 className="text-xs font-medium uppercase tracking-widest">Market Cap</h3>
                        </div>
                        <div className="text-2xl sm:text-3xl font-mono font-semibold text-gray-900">
                            ${(marketCapUSD / 1e9).toFixed(2)}B
                        </div>
                    </div>

                    {/* Volume Card */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-4 text-gray-500">
                            <Activity size={16} />
                            <h3 className="text-xs font-medium uppercase tracking-widest">24h Volume</h3>
                        </div>
                        <div className="text-2xl sm:text-3xl font-mono font-semibold text-gray-900">
                            ${(volume24hUSD / 1e6).toFixed(1)}M
                        </div>
                    </div>

                    {/* Countdown Card */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-4 text-blue-600">
                            <Clock size={16} />
                            <h3 className="text-xs font-medium uppercase tracking-widest font-sans">Supply Shock ETA</h3>
                        </div>
                        <div>
                            <CountdownTimer />
                            <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest font-medium">Target: March 16, 2027</p>
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div>
                    {/* 2. TVL Chart */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm flex flex-col h-[450px]">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <Lock className="text-gray-900" size={20} />
                                <h2 className="text-base sm:text-lg font-semibold tracking-widest uppercase">Total Value Locked</h2>
                            </div>
                            <button
                                onClick={() => setIsLogScale(!isLogScale)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${isLogScale ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-transparent text-gray-500 border-gray-200 hover:text-gray-900'}`}
                            >
                                LOG SCALE
                            </button>
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
                                        scale={isLogScale ? 'log' : 'auto'}
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
                </div>

                {/* 4. Whale Tracker Section */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <BarChart2 className="text-gray-900" size={20} />
                        <h2 className="text-base sm:text-lg font-semibold tracking-widest uppercase">Top 10 Accumulators (24H)</h2>
                    </div>
                    <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-2xl">
                        Real-time filtering isolating pure individual whale wallets, excluding CEX and foundation addresses. Ranked by 24-hour balance increase.
                    </p>

                    <div className="space-y-3">
                        {whaleData.slice(0, 10).map((whale, idx) => {
                            const address = whale.id || 'Unknown Wallet';

                            return (
                                <div key={whale.id || idx} className="flex relative overflow-hidden items-center justify-between p-4 sm:p-5 bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:bg-gray-100 hover:shadow-md group">
                                    {/* Visual Bar Background for Increase */}
                                    <div
                                        className="absolute left-0 top-0 bottom-0 bg-blue-100/50 transition-all duration-1000 ease-out"
                                        style={{ width: `${Math.min((Number(whale.increase24h) || 0) / 50, 100)}%` }}
                                    />

                                    <div className="flex items-center gap-3 sm:gap-5 overflow-hidden relative z-10 flex-1 pr-2">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 bg-white flex items-center justify-center font-medium text-sm sm:text-base text-gray-700 border border-gray-200 shadow-sm">
                                            {idx + 1}
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <p className="font-mono text-gray-900 text-xs sm:text-sm font-medium truncate leading-tight mb-0.5" title={address}>
                                                {address}
                                            </p>
                                            <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-widest font-medium">
                                                Holdings: {Number(whale.currentBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} ARB
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`flex-shrink-0 relative z-10 text-right font-mono text-xs sm:text-sm font-semibold ${Number(whale.increase24h) >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                        <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-gray-100 shadow-sm inline-block">
                                            {Number(whale.increase24h) > 0 ? '+' : ''}{Number(whale.increase24h || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}%
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
