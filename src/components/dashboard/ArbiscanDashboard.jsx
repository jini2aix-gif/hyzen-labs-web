import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, TrendingUp, DollarSign, Database,
    Clock, BarChart2, LogIn, Target, ChevronRight, Zap
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ComposedChart, Line, PieChart, Pie, Cell, Legend, Bar
} from 'recharts';
import { doc, setDoc, getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { db, appId } from '../../hooks/useFirebase';
import {
    fetchMarketComparison,
    fetchChainTVLs,
    fetchArbitrumHistoricalTVL,
    fetchArbitrumSupply,
    fetchArbitrumPriceHistory,
    fetchArbitrumMonthlyPriceHistory,
    fetchArbitrumProtocols,
    fetchArbitrumStablecoins,
    fetchArbitrumYields,
    fetchArbitrumStablecoinHistory,
    fetchSequencerMargin,
    fetchArbEthMcapRatio,
    fetchKRWRate,
    fetchExchangeFlows,
    REFRESH
} from '../../lib/api-fetcher';
import { MONTHLY_REALISTIC_BAND, TREASURY_ARB } from '../../constants/simulation-data';

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
        <div className="flex items-center gap-1.5 sm:gap-3 font-mono text-xl sm:text-2xl md:text-3xl font-black text-[#00D1FF] drop-shadow-[0_0_15px_rgba(0,209,255,0.4)]">
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
    <div className={`relative p-4 sm:p-6 rounded-2xl border ${highlight ? 'bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border-[#00D1FF]/30 shadow-[0_0_30px_rgba(0,209,255,0.05)]' : 'bg-[#111111] border-gray-800'}`}>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-mono text-[11px] tracking-widest uppercase">{title}</h3>
            <Icon size={18} className={colorClass} />
        </div>
        <div className="flex items-end justify-between">
            <div>
                <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">{value}</div>
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

// TREASURY_ARB is now imported from constants/simulation-data.js



// ─── Treasury Card ────────────────────────────────────────────────────────────
const TreasuryCard = ({ priceKRW, priceUSD, krwRate, history }) => {
    const [chartRange, setChartRange] = useState('ALL');
    const currentValueKRW = TREASURY_ARB * (priceKRW || 0);
    const currentValueUSD = currentValueKRW / (krwRate || 1350);

    // Find current month band for deviation logic
    const todayStr = new Date().toISOString().substring(0, 7);
    const currentBand = MONTHLY_REALISTIC_BAND.find(b => b.date === todayStr);

    let lowerDev = 0;
    let upperDev = 0;
    let status = "계산 중...";
    let statusColor = "#555";

    if (currentBand && priceKRW) {
        lowerDev = ((priceKRW - currentBand.priceLow) / currentBand.priceLow) * 100;
        upperDev = ((priceKRW - currentBand.priceHigh) / currentBand.priceHigh) * 100;

        if (priceKRW < currentBand.priceLow) {
            status = "저평가 (과매도) 구간 진입";
            statusColor = "#FFD700"; // Gold/Yellow
        } else if (priceKRW > currentBand.priceHigh) {
            status = "고평가 (과매수) 구간 도달";
            statusColor = "#DC3545"; // Red
        } else {
            status = "밴드 내 정상 순항 중";
            statusColor = "#10B981"; // Emerald
        }
    }

    const targetRate = ((priceKRW || 0) / 7500) * 100;

    const enrichedHistory = history.map(h => {
        const monthStr = h.date.substring(0, 7);
        const band = MONTHLY_REALISTIC_BAND.find(b => b.date === monthStr);
        return {
            ...h,
            bandLow: band?.valueLow,
            bandTarget: band?.valueTarget,
            bandHigh: band?.valueHigh,
            displayDate: h.shortDate // Use shortDate ("03/18") for historic points
        };
    });

    const lastDate = history.length > 0 ? new Date(history[history.length - 1].date) : new Date();
    const futureProjections = MONTHLY_REALISTIC_BAND.filter(b => {
        const [y, m] = b.date.split('-').map(Number);
        const bandDate = new Date(y, m - 1, 1);
        return bandDate > lastDate;
    }).map(b => ({
        date: b.date + '-01',
        displayDate: b.date.substring(2).replace('-', '/'), // e.g., "26/04"
        bandLow: b.valueLow,
        bandTarget: b.valueTarget,
        bandHigh: b.valueHigh,
        valueKRW: null
    }));

    const fullChartData = [...enrichedHistory, ...futureProjections];

    const filteredData = React.useMemo(() => {
        if (chartRange === 'ALL') return fullChartData;
        if (chartRange === 'Mid Term') {
            const limit = new Date('2026-12-31');
            return fullChartData.filter(d => new Date(d.date) <= limit);
        }
        // Short Term: Last 30 records
        return enrichedHistory.slice(-30);
    }, [chartRange, fullChartData, enrichedHistory]);

    const formatKRW = (val) => {
        if (val >= 1e8) return `₩${(val / 1e8).toFixed(1)}억`;
        if (val >= 1e4) return `₩${(val / 1e4).toFixed(0)}만`;
        return `₩${val.toLocaleString()}`;
    };

    const bandColor = '#6366f1'; // Indigo for Prediction
    const bandColorOpacity = 'rgba(99, 102, 241, 0.15)';
    const neonGreen = '#39FF14';
    // eslint-disable-next-line no-unused-vars
    const emeraldFaint = 'rgba(16, 185, 129, 0.12)';
    // eslint-disable-next-line no-unused-vars
    const emeraldFainter = 'rgba(16, 185, 129, 0.06)';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="relative overflow-hidden rounded-3xl mb-6"
            style={{
                background: 'linear-gradient(135deg, #050505 0%, #0A0A0A 100%)',
                border: `1px solid rgba(0, 209, 255, 0.2)`,
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(0, 209, 255, 0.1)'
            }}
        >
            {/* Background scanner effect */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    background: 'linear-gradient(transparent 0%, rgba(16, 185, 129, 0.1) 50%, transparent 100%)',
                    backgroundSize: '100% 4px'
                }} />

            <div className="relative z-10 p-4 sm:p-7">
                {/* ── Title Area ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                            <span className="w-2 h-5 sm:h-6 bg-[#00D1FF] rounded-full inline-block" />
                            Hyzen Labs. Predictive Asset Navigation
                        </h2>
                        <p className="text-[10px] text-gray-500 font-mono mt-1 uppercase tracking-widest">Autonomous Financial Trajectory Monitor</p>
                    </div>
                    <div className="flex items-center gap-3 bg-black/40 border border-emerald-900/50 rounded-2xl px-4 py-2">
                        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <Target size={14} className="text-[#00D1FF]" />
                        </div>
                        <div>
                            <div className="text-[9px] text-gray-500 font-mono uppercase tracking-tighter line-clamp-1">2027 Target (7,500 KRW)</div>
                            <div className="text-sm font-bold font-mono text-white">{targetRate.toFixed(1)}% Achieved</div>
                        </div>
                    </div>
                </div>

                {/* ── Status Widget ── */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-3 mb-6">
                    <div className="bg-black/30 border border-emerald-900/40 rounded-lg sm:rounded-xl p-2 sm:p-3 flex flex-col justify-center">
                        <div className="text-[7px] sm:text-[9px] text-gray-500 font-mono uppercase tracking-tighter sm:tracking-wider mb-0.5 sm:mb-1 truncate">Navigation</div>
                        <div className="text-[9px] sm:text-xs font-bold font-mono uppercase tracking-tighter sm:tracking-tight flex items-center gap-1 sm:gap-2" style={{ color: statusColor }}>
                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: statusColor }} />
                            <span className="truncate">{status}</span>
                        </div>
                    </div>
                    <div className="bg-black/30 border border-emerald-900/40 rounded-lg sm:rounded-xl p-2 sm:p-3 flex flex-col justify-center text-center">
                        <div className="text-[7px] sm:text-[9px] text-gray-500 font-mono uppercase tracking-tighter sm:tracking-wider mb-0.5 sm:mb-1 truncate">Lower Dev</div>
                        <div className="text-[10px] sm:text-sm font-black font-mono text-[#00D1FF] truncate">
                            {lowerDev >= 0 ? '+' : ''}{lowerDev.toFixed(1)}% <span className="hidden sm:inline text-[10px] text-gray-600 font-normal ml-0.5">above base</span>
                        </div>
                    </div>
                    <div className="bg-black/30 border border-emerald-900/40 rounded-lg sm:rounded-xl p-2 sm:p-3 flex flex-col justify-center text-right">
                        <div className="text-[7px] sm:text-[9px] text-gray-500 font-mono uppercase tracking-tighter sm:tracking-wider mb-0.5 sm:mb-1 truncate">Upper Dev</div>
                        <div className="text-[10px] sm:text-sm font-black font-mono truncate" style={{ color: upperDev > 0 ? '#DC3545' : '#10B981' }}>
                            {upperDev >= 0 ? '+' : ''}{upperDev.toFixed(1)}% <span className="hidden sm:inline text-[10px] text-gray-600 font-normal ml-0.5">from cap</span>
                        </div>
                    </div>
                </div>

                {/* ── Main Figures ── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-8 mt-2 p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-[#00D1FF]/10 to-transparent border border-[#00D1FF]/10">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D1FF]/20 text-[#00D1FF] font-mono font-bold border border-[#00D1FF]/20">REAL-TIME POSITION</span>
                        </div>
                        <div className="text-3xl sm:text-5xl font-black text-white tracking-tighter leading-none mb-2 tabular-nums">
                            ₩{Math.round(currentValueKRW).toLocaleString()}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <div className="text-sm sm:text-lg text-gray-400 font-mono font-bold tracking-tight">
                                ≈ ${currentValueUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                            </div>
                            <div className="hidden sm:block h-4 w-px bg-gray-800" />
                            <div className="text-[10px] sm:text-xs text-gray-500 font-mono uppercase tracking-widest">
                                {TREASURY_ARB.toLocaleString()} ARB
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t border-[#00D1FF]/10 sm:border-0 pt-4 sm:pt-0">
                        <div className="text-left sm:text-right">
                            <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mb-1">Live ARB Price</div>
                            <div className="text-lg sm:text-xl font-black text-white font-mono leading-none">₩{(priceKRW || 0).toLocaleString()}</div>
                            <div className="text-[10px] sm:text-xs text-[#00D1FF]/70 font-mono mt-1">${priceUSD?.toFixed(4) ?? '—'}</div>
                        </div>
                    </div>
                </div>

                {/* ── Predictive Chart ── */}
                <div className="pt-6 border-t border-[#00D1FF]/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Activity size={14} className="text-[#00D1FF]" />
                            <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Asset Value Trajectory</div>
                        </div>
                        <div className="flex items-center p-0.5 bg-black/60 border border-gray-800/50 rounded-lg backdrop-blur-md">
                            {['Short', 'Mid', '2027'].map((r, i) => {
                                const labels = ['Short Term', 'Mid Term', 'ALL'];
                                const actualLabel = labels[i];
                                return (
                                    <button
                                        key={actualLabel}
                                        type="button"
                                        onClick={() => setChartRange(actualLabel)}
                                        className={`px-3 py-1.5 rounded-md text-[10px] sm:text-[11px] font-mono transition-all cursor-pointer relative z-20 whitespace-nowrap ${chartRange === actualLabel ? 'bg-[#00D1FF] text-black font-black' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        {r}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart key={chartRange} data={filteredData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={bandColor} stopOpacity={0.15} />
                                        <stop offset="95%" stopColor={bandColor} stopOpacity={0.02} />
                                    </linearGradient>
                                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={neonGreen} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={neonGreen} stopOpacity={0.2} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 209, 255, 0.05)" vertical={false} />
                                <XAxis dataKey="displayDate" stroke="rgba(0, 209, 255, 0.2)" fontSize={9} tickLine={false} axisLine={false} dy={5} minTickGap={30} />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    stroke="rgba(0, 209, 255, 0.2)"
                                    fontSize={9}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={formatKRW}
                                    width={55}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#050505', borderColor: 'rgba(0, 209, 255, 0.3)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                    itemStyle={{ color: neonGreen, fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}
                                    labelStyle={{ color: '#888', fontSize: '10px', marginBottom: '4px', fontFamily: 'monospace', fontWeight: 'bold' }}
                                    formatter={(value, name) => {
                                         if (name === 'bandLow') return null;
                                        const label = name === 'valueKRW' ? 'Actual Asset Value' : name === 'bandTarget' ? 'Target Trajectory' : 'Hyzen Labs Prediction Band';
                                        return [formatKRW(value), label];
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="bandHigh"
                                    stroke={bandColor}
                                    strokeWidth={1}
                                    fill={bandColor}
                                    fillOpacity={0.25}
                                    name="Hyzen Labs Prediction Band"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="bandLow"
                                    stroke="transparent"
                                    fill="#050505"
                                    fillOpacity={1}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="bandTarget"
                                    stroke={bandColor}
                                    strokeWidth={1.2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                    name="Target Trajectory"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="valueKRW"
                                    stroke={neonGreen}
                                    strokeWidth={1.5}
                                    dot={false}
                                    activeDot={{ r: 6, fill: neonGreen, strokeWidth: 0, shadow: '0 0 10px #39FF14' }}
                                    style={{ filter: 'drop-shadow(0 0 8px rgba(57, 255, 20, 0.4))' }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-6 mt-4 justify-center">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-3 rounded-sm opacity-20" style={{ backgroundColor: bandColor }} />
                            <span className="text-[10px] text-gray-600 font-mono uppercase tracking-widest underline decoration-indigo-500/30 underline-offset-4">Hyzen Labs Prediction Band</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-1 rounded-full" style={{ backgroundColor: neonGreen }} />
                            <span className="text-[10px] text-gray-600 font-mono uppercase tracking-widest underline decoration-neonGreen/30 underline-offset-4">Actual Asset Value</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const ArbiscanDashboard = () => {
    const [data, setData] = useState({
        market: null, tvlData: null, supply: null,
        histPrice: [], histTvl: [], monthlyPrice: [],
        protocols: [], stablecoins: { total: 0, top: [] }, yields: [],
        stablecoinHistory: [],
        exchangeFlows: [],
        seqMargin: null,
        arbEthRatio: [],
        krwRate: 1350,
        treasuryHistory: []
    });
    const [stableTrendDays, setStableTrendDays] = useState(30);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                const [
                    market, tvlData, supply, histPrice, histTvl, monthlyPrice,
                    protocols, stablecoins, yields, stablecoinHistory,
                    seqMargin, arbEthRatio, krwRate, exchangeFlows
                ] = await Promise.all([
                    fetchMarketComparison(),
                    fetchChainTVLs(),
                    fetchArbitrumSupply(),
                    fetchArbitrumPriceHistory(),
                    fetchArbitrumHistoricalTVL(),
                    fetchArbitrumMonthlyPriceHistory(),
                    fetchArbitrumProtocols(),
                    fetchArbitrumStablecoins(),
                    fetchArbitrumYields(),
                    fetchArbitrumStablecoinHistory(),
                    fetchSequencerMargin(),
                    fetchArbEthMcapRatio(),
                    fetchKRWRate(),
                    fetchExchangeFlows()
                ]);

                const today = new Date().toISOString().split('T')[0];
                const krwRateRes = krwRate || 1350;
                const currentValueUSD = TREASURY_ARB * market.arb.priceUSD;
                const currentValueKRW = TREASURY_ARB * market.arb.priceKRW;
                let th = [];

                if (db && appId) {
                    try {
                        const todayRef = doc(db, 'artifacts', appId, 'public', 'data', 'treasury_history', today);

                        // 하루에 한 번만 (오전 9시 KST 기준 새 날짜 시작 시 첫 로드 때) 기록하도록 설정
                        const qRef = query(
                            collection(db, 'artifacts', appId, 'public', 'data', 'treasury_history'),
                            orderBy('timestamp', 'desc'),
                            limit(2000)
                        );
                        const snap = await getDocs(qRef);
                        const historyDocs = snap.docs.map(d => d.data());
                        const lastRecordDate = historyDocs[0]?.date;

                        // 오늘 날짜의 기록이 없거나, 보유량이 바뀌었다면 현재 시세를 기록/업데이트
                        if (lastRecordDate !== today || historyDocs[0]?.arbAmount !== TREASURY_ARB) {
                            await setDoc(todayRef, {
                                date: today,
                                timestamp: Date.now(),
                                arbAmount: TREASURY_ARB,
                                priceKRW: market.arb.priceKRW,
                                priceUSD: market.arb.priceUSD, // Added priceUSD for better tracking
                                krwRate: krwRateRes,
                                valueKRW: currentValueKRW,
                                valueUSD: currentValueUSD
                            }, { merge: true });
                            console.log('Daily treasury snap recorded or updated (amount change/new day)');
                        }

                        th = snap.docs.map(d => {
                            const dData = d.data();
                            const dObj = new Date(dData.date);
                            return {
                                ...dData,
                                shortDate: `${String(dObj.getMonth() + 1).padStart(2, '0')}/${String(dObj.getDate()).padStart(2, '0')}`
                            };
                        }).reverse(); // Sort ASC for Recharts

                        // Recharts AreaChart requires at least 2 points to render an area/line
                        if (th.length === 1) {
                            th.push({ ...th[0], shortDate: 'Now' });
                        }
                    } catch (err) {
                        console.error('Treasury history sync failed', err);
                    }
                }

                setData({
                    market, tvlData, supply, histPrice, histTvl, monthlyPrice,
                    protocols, stablecoins, yields, stablecoinHistory,
                    seqMargin, arbEthRatio, krwRate: krwRateRes, treasuryHistory: th,
                    exchangeFlows
                });
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

    // const isAuthGated = !user; // Removed

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


    return (
        <section className="relative bg-[#050505] min-h-screen text-gray-200 font-sans pt-20 sm:pt-24 pb-12 sm:pb-20 px-3 sm:px-8 overflow-hidden">
            <div className="max-w-[1400px] mx-auto transition-all duration-700">

                {/* === TREASURY STATUS === */}
                <TreasuryCard
                    priceKRW={arb.priceKRW}
                    priceUSD={arb.priceUSD}
                    krwRate={data.krwRate}
                    history={data.treasuryHistory}
                />

                {/* ── ARB / ETH Mcap Ratio Chart ── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                    className="bg-[#111111] border border-gray-800 rounded-3xl p-6 shadow-xl mb-8"
                >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 border-b border-gray-800 pb-4 gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                                <TrendingUp size={20} className="text-[#00D1FF]" />
                                ARB / ETH Market Cap Ratio
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-mono">ARB 시가총액이 이더리움 대비 차지하는 비율 (%) · 주별 · 1년</p>
                        </div>
                        {/* Live ratio badge */}
                        {data.arbEthRatio.length > 0 && (() => {
                            const cur = data.arbEthRatio[data.arbEthRatio.length - 1];
                            const isFair = cur.ratioPct >= cur.fairLow && cur.ratioPct <= cur.fairHigh;
                            const isUnder = cur.ratioPct < cur.fairLow;
                            const color = isUnder ? '#F0A500' : isFair ? '#28A745' : '#DC3545';
                            const label = isUnder ? '저평가 구간' : isFair ? '적정 구간' : '고평가 구간';
                            return (
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <div className="font-black font-mono text-3xl" style={{ color }}>
                                        {cur.ratioPct.toFixed(3)}%
                                    </div>
                                    <div className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold" style={{ color, background: `${color}18` }}>
                                        {label}
                                    </div>
                                    <div className="text-[10px] text-gray-600 font-mono">적정 밴드 1.5%~3.0%</div>
                                </div>
                            );
                        })()}
                    </div>

                    {data.arbEthRatio.length > 1 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart data={data.arbEthRatio} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="ratioGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#00D1FF" stopOpacity={0.35} />
                                        <stop offset="100%" stopColor="#00D1FF" stopOpacity={0.02} />
                                    </linearGradient>
                                    {/* Fair-value band fill */}
                                    <linearGradient id="fairBandGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#28A745" stopOpacity={0.12} />
                                        <stop offset="100%" stopColor="#28A745" stopOpacity={0.04} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
                                    tickLine={false} axisLine={false}
                                    interval="preserveStartEnd"
                                    minTickGap={65}
                                    tickFormatter={(str) => {
                                        // e.g. "2024-05-12" -> "05-12"
                                        if (str?.length > 7) return str.substring(5);
                                        return str;
                                    }}
                                />
                                <YAxis
                                    tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
                                    tickFormatter={v => `${v}%`}
                                    tickLine={false} axisLine={false}
                                    width={48}
                                    domain={[0, 'dataMax + 0.5']}
                                />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (!active || !payload?.length) return null;
                                        const d = payload[0]?.payload;
                                        return (
                                            <div className="bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 shadow-2xl text-xs font-mono">
                                                <p className="text-gray-500 mb-2">{label}</p>
                                                <p className="text-[#00D1FF] font-bold">ARB/ETH: {d?.ratioPct?.toFixed(4)}%</p>
                                                <p className="text-gray-400">ARB Mcap: ${d?.arbMcapB}B</p>
                                                <p className="text-gray-400">ETH Mcap: ${d?.ethMcapB}B</p>
                                                <div className="mt-2 pt-2 border-t border-gray-800">
                                                    <p className="text-[#28A745]">적정 밴드: 1.5% ~ 3.0%</p>
                                                    <p className="text-[#F0A500] text-[10px] mt-0.5">이론적 중심치: 2.25%</p>
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                                {/* Fair-value upper bound */}
                                <Line type="monotone" dataKey="fairHigh" stroke="#28A745" strokeWidth={1}
                                    strokeDasharray="6 3" dot={false} name="상단 적정" />
                                {/* Fair-value mid line */}
                                <Line type="monotone" dataKey="fairMid" stroke="#28A745" strokeWidth={1.5}
                                    strokeDasharray="2 4" dot={false} name="이론 중심" />
                                {/* Fair-value lower bound */}
                                <Line type="monotone" dataKey="fairLow" stroke="#F0A500" strokeWidth={1}
                                    strokeDasharray="6 3" dot={false} name="하단 적정" />
                                {/* Actual ratio area */}
                                <Area
                                    type="monotone" dataKey="ratioPct" name="ARB/ETH 비율"
                                    stroke="#00D1FF" strokeWidth={2.5}
                                    fill="url(#ratioGrad)" dot={false}
                                    activeDot={{ r: 5, fill: '#00D1FF', strokeWidth: 0 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-700 text-sm font-mono">
                            <Activity className="animate-spin mr-2" size={16} /> 데이터 로딩 중...
                        </div>
                    )}

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mt-4 text-[11px] font-mono text-gray-500">
                        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#00D1FF] inline-block" />실제 ARB/ETH 비율</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#28A745] inline-block" style={{ borderTop: '1px dashed #28A745' }} />상단 적정 (3.0%)</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#28A745] inline-block" />이론 중심치 (2.25%)</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#F0A500] inline-block" style={{ borderTop: '1px dashed #F0A500' }} />하단 적정 (1.5%)</span>
                        <span className="ml-auto text-gray-700">* L2 적정비율: 연구 기반 이론치 (이더리움 대비 1.5~3%)</span>
                    </div>
                </motion.div>

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

            </div>



            {/* ════════════════════════════════════════════════════════════ */}
            {/* ═══  ARB Alpha Intelligence Section  ══════════════════════ */}
            {/* ════════════════════════════════════════════════════════════ */}
            <div className="max-w-[1400px] mx-auto pb-24 px-4 md:px-8">

                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                    className="flex items-center gap-3 mt-10 mb-6"
                >
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#00D1FF]/30" />
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00D1FF]/20 bg-[#00D1FF]/5">
                        <Zap size={13} className="text-[#00D1FF]" />
                        <span className="text-[11px] font-mono font-bold text-[#00D1FF] uppercase tracking-[0.2em]">ARB Alpha Intelligence</span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#00D1FF]/30" />
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Global Exchange ARB Net Flow Chart ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
                        className="lg:col-span-3 bg-[#0D0D0D] border border-gray-800 rounded-3xl p-6 shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-5 border-b border-gray-800 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                                    <TrendingUp size={20} className="text-[#00D1FF]" />
                                    Global Exchange ARB Net Flow
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 font-mono">바이낸스, 업비트 등 주요 거래소 순유입/순유출 통계 (Est. $M)</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#28A745] rounded-full" /> <span className="text-[10px] text-gray-500 font-mono">INFLOW</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#DC3545] rounded-full" /> <span className="text-[10px] text-gray-500 font-mono">OUTFLOW</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-[#00D1FF] rounded-full" /> <span className="text-[10px] text-gray-500 font-mono uppercase">7D Net Trend</span></div>
                            </div>
                        </div>

                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={data.exchangeFlows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#28A745" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#28A745" stopOpacity={0.1} />
                                        </linearGradient>
                                        <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#DC3545" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#DC3545" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} minTickGap={20} />
                                    <YAxis tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-[#111] border border-gray-700 rounded-xl px-4 py-3 shadow-2xl text-xs font-mono">
                                                    <p className="text-gray-500 mb-2">{d.date}</p>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-gray-400">Inflow:</span>
                                                            <span className="text-[#28A745] font-bold">+${d.inflow}M</span>
                                                        </div>
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-gray-400">Outflow:</span>
                                                            <span className="text-[#DC3545] font-bold">-${Math.abs(d.outflow).toFixed(2)}M</span>
                                                        </div>
                                                        <div className="pt-1 mt-1 border-t border-gray-800 flex justify-between gap-4">
                                                            <span className="text-white font-bold">Net Flow:</span>
                                                            <span className={d.net >= 0 ? 'text-[#28A745] font-black' : 'text-[#DC3545] font-black'}>
                                                                {d.net >= 0 ? '+' : ''}{d.net}M
                                                            </span>
                                                        </div>
                                                        <div className="pt-1 mt-1 border-t border-gray-800 flex justify-between gap-4">
                                                            <span className="text-[#00D1FF] font-bold">7D Trend:</span>
                                                            <span className="text-[#00D1FF] font-black">
                                                                {d.trend >= 0 ? '+' : ''}{d.trend}M
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Bar dataKey="inflow" fill="url(#inflowGrad)" radius={[4, 4, 0, 0]} barSize={8} />
                                    <Bar dataKey="outflow" fill="url(#outflowGrad)" radius={[0, 0, 4, 4]} barSize={8} />
                                    <Line type="monotone" dataKey="trend" stroke="#00D1FF" strokeWidth={2.5} dot={false} strokeDasharray="5 2" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>


                </div>
            </div>
        </section>
    );
};

export default ArbiscanDashboard;
