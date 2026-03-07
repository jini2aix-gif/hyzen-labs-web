import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, TrendingUp, DollarSign, Database,
    Lock, Clock, BarChart2, LogIn, Target, ChevronRight, Zap
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ComposedChart, Line, PieChart, Pie, Cell, Legend
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
    fetchNativeAlphaIndex,
    fetchGMXSentiment,
    fetchSequencerMargin,
    fetchM2ArbElasticity,
    fetchArbEthMcapRatio,
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

// ─── Treasury Card ────────────────────────────────────────────────────────────
const TreasuryCard = ({ priceKRW, priceUSD, krwRate, history }) => {
    const currentValueKRW = TREASURY_ARB * (priceKRW || 0);
    const currentValueUSD = currentValueKRW / (krwRate || 1350);

    const gold = '#D4AF37';
    const goldFaint = 'rgba(212,175,55,0.12)';
    const goldFainter = 'rgba(212,175,55,0.06)';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="relative overflow-hidden rounded-3xl mb-6"
            style={{
                background: 'linear-gradient(135deg, #0D0D0D 0%, #1A1200 100%)',
                border: `1px solid rgba(212,175,55,0.3)`,
                boxShadow: '0 0 40px rgba(212,175,55,0.07), inset 0 1px 0 rgba(212,175,55,0.12)'
            }}
        >
            {/* shimmer */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at top left, rgba(212,175,55,0.07) 0%, transparent 55%)' }} />

            <div className="relative z-10 p-5 sm:p-7">

                {/* ── Row 1: Label + ARB count ── */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(212,175,55,0.15)', border: `1px solid ${goldFaint}` }}>
                            <span className="text-xs">🏛️</span>
                        </div>
                        <div>
                            <div className="text-[10px] font-mono tracking-[0.18em] uppercase" style={{ color: gold }}>HYZEN Labs. Treasury</div>
                            <div className="text-[10px] text-gray-600 font-mono">Private · Real-time ARB</div>
                        </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                        <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider">Holdings</div>
                        <div className="text-base font-black font-mono leading-tight" style={{ color: gold }}>
                            {TREASURY_ARB.toLocaleString()} ARB
                        </div>
                    </div>
                </div>

                {/* ── Row 2: KRW Value + Price Pills ── */}
                <div className="flex flex-col sm:flex-row sm:items-stretch gap-3">
                    {/* Big KRW value */}
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">Estimated Value</div>
                        <div className="text-2xl sm:text-3xl font-black tracking-tight leading-none" style={{ color: gold }}>
                            ₩{Math.round(currentValueKRW).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-1.5">
                            ≈ ${currentValueUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                        </div>
                    </div>
                    {/* Right pills */}
                    <div className="flex sm:flex-col gap-2 shrink-0">
                        <div className="flex-1 sm:flex-none rounded-xl px-4 py-3" style={{ background: goldFainter, border: `1px solid ${goldFaint}` }}>
                            <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">Live ARB</div>
                            <div className="text-lg font-black text-white font-mono leading-none">${priceUSD?.toFixed(4) ?? '—'}</div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">₩{(priceKRW || 0).toLocaleString()}</div>
                        </div>
                        <div className="flex-1 sm:flex-none rounded-xl px-4 py-3" style={{ background: goldFainter, border: `1px solid ${goldFaint}` }}>
                            <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">USD Value</div>
                            <div className="text-lg font-black font-mono leading-none" style={{ color: gold }}>
                                ${currentValueUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">{(currentValueUSD / 1000).toFixed(1)}K</div>
                        </div>
                    </div>
                </div>

                {/* ── Row 3: Historical Chart ── */}
                {history && history.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-[rgba(212,175,55,0.15)]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Treasury Value History (KRW)</div>
                            <div className="text-[10px] text-gray-500 font-mono tracking-wider">{history.length} Days</div>
                        </div>
                        <div className="h-[140px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorValueKRW" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={gold} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={gold} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.05)" vertical={false} />
                                    <XAxis dataKey="shortDate" stroke="rgba(212,175,55,0.3)" fontSize={9} tickLine={false} axisLine={false} dy={5} />
                                    <YAxis
                                        domain={['auto', 'auto']}
                                        stroke="rgba(212,175,55,0.3)"
                                        fontSize={9}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `₩${(val / 1e6).toFixed(1)}M`}
                                        width={52}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(212,175,55,0.3)', borderRadius: '8px' }}
                                        itemStyle={{ color: gold, fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}
                                        labelStyle={{ color: '#888', fontSize: '10px', marginBottom: '4px', fontFamily: 'monospace' }}
                                        formatter={(value) => [`₩${Math.round(value).toLocaleString()}`, 'Value']}
                                    />
                                    <Area type="monotone" dataKey="valueKRW" stroke={gold} strokeWidth={2} fillOpacity={1} fill="url(#colorValueKRW)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

            </div>
        </motion.div>
    );
};

const ArbiscanDashboard = ({ user, onOpenLoginModal, onOpenRegisterModal }) => {
    const [data, setData] = useState({
        market: null, tvlData: null, supply: null,
        histPrice: [], histTvl: [], monthlyPrice: [],
        protocols: [], stablecoins: { total: 0, top: [] }, yields: [],
        stablecoinHistory: [],
        nativeAlpha: [], gmxSentiment: null, seqMargin: null, m2Elasticity: [],
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
                    nativeAlpha, gmxSentiment, seqMargin, m2Elasticity,
                    arbEthRatio, krwRate
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
                    fetchNativeAlphaIndex(),
                    fetchGMXSentiment(),
                    fetchSequencerMargin(),
                    fetchM2ArbElasticity(),
                    fetchArbEthMcapRatio(),
                    fetchKRWRate()
                ]);

                const today = new Date().toISOString().split('T')[0];
                const krwRateRes = krwRate || 1350;
                const currentValueKRW = TREASURY_ARB * market.arb.priceKRW;
                const currentValueUSD = currentValueKRW / krwRateRes;
                let th = [];

                if (db && appId) {
                    try {
                        const todayRef = doc(db, 'artifacts', appId, 'public', 'data', 'treasury_history', today);

                        // 하루에 한 번만 (오전 9시 KST 기준 새 날짜 시작 시 첫 로드 때) 기록하도록 설정
                        const qRef = query(
                            collection(db, 'artifacts', appId, 'public', 'data', 'treasury_history'),
                            orderBy('timestamp', 'desc'),
                            limit(90)
                        );
                        const snap = await getDocs(qRef);
                        const historyDocs = snap.docs.map(d => d.data());
                        const lastRecordDate = historyDocs[0]?.date;

                        // 오늘 날짜의 기록이 없으면 현재 시세를 9시 기준 시세로 저장
                        if (lastRecordDate !== today) {
                            await setDoc(todayRef, {
                                date: today,
                                timestamp: Date.now(),
                                arbAmount: TREASURY_ARB,
                                priceKRW: market.arb.priceKRW,
                                krwRate: krwRateRes,
                                valueKRW: currentValueKRW,
                                valueUSD: currentValueUSD
                            }, { merge: true });
                            console.log('Daily treasury snap recorded at 9 AM KST (or first load after 9 AM)');
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
                    nativeAlpha, gmxSentiment, seqMargin, m2Elasticity,
                    arbEthRatio, krwRate: krwRateRes, treasuryHistory: th
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

    const isAuthGated = !user;

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
        <section className="relative bg-[#050505] min-h-screen text-gray-200 font-sans pt-24 pb-20 px-4 md:px-8 overflow-hidden">
            {/* ─── Non-member Auth Overlay ─── */}
            <AnimatePresence>
                {isAuthGated && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[#050505]/60 backdrop-blur-md pointer-events-none"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative z-10 bg-[#111111] border border-gray-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00D1FF] to-[#6366f1]" />
                            <Lock className="w-12 h-12 mx-auto mb-5 text-[#00D1FF]" />
                            <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Exclusive Content</h2>
                            <p className="text-gray-400 mb-8 text-xs leading-relaxed">Arbiscan On-Chain Terminal은 회원 전용 서비스입니다. 가입 후 실시간 대시보드와 온체인 데이터를 무제한으로 확인하세요.</p>

                            <div className="space-y-3">
                                <button onClick={onOpenLoginModal} className="w-full py-3.5 bg-[#00D1FF] text-black font-extrabold uppercase tracking-widest text-[11px] rounded-xl hover:bg-[#00b8e6] transition-all shadow-[0_0_20px_rgba(0,209,255,0.2)]">
                                    Sign In to Access
                                </button>
                                <button onClick={onOpenRegisterModal} className="w-full py-3.5 bg-transparent border border-gray-700 text-white font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-white/5 transition-all">
                                    Create Free Account
                                </button>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-800 flex items-center justify-center gap-4 grayscale opacity-40">
                                <Activity size={14} className="text-[#00D1FF]" />
                                <BarChart2 size={14} className="text-indigo-400" />
                                <Target size={14} className="text-red-400" />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ─── Main Dashboard Content (Blurred if gated) ─── */}
            <div className={`max-w-[1400px] mx-auto transition-all duration-700 ${isAuthGated ? 'blur-xl grayscale pointer-events-none select-none opacity-40' : ''}`}>

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

                {/* ─── Value Gap Index + Ecosystem Monitor ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">

                    {/* Value Gap Index */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                        className="bg-[#111111] border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col"
                        style={{ borderColor: valueGapIndex >= 1 ? 'rgba(40,167,69,0.3)' : 'rgba(100,100,100,0.3)' }}
                    >
                        <div className="w-full mb-4 border-b border-gray-800 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                                <Target size={20} className={valueGapIndex >= 1 ? 'text-[#28A745]' : 'text-gray-500'} />
                                Value Gap Index
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-mono">OP Mcap/TVL ÷ ARB Mcap/TVL. &gt;1 = ARB Underpriced</p>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center w-full py-2">
                            <ValueGapGauge index={valueGapIndex} />
                            <div className="mt-4 w-full grid grid-cols-2 gap-3">
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
                                <div className="mt-3 w-full bg-[#28A745]/10 border border-[#28A745]/30 text-[#28A745] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-center animate-pulse">
                                    🟢 {valueGapIndex.toFixed(2)}x Cheaper than OP per TVL $
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Ecosystem Monitor — 2 cols */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                        className="lg:col-span-2 bg-[#111111] border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col gap-6"
                    >
                        {/* Header */}
                        <div className="border-b border-gray-800 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                                <Activity size={20} className="text-[#00D1FF]" />
                                ARB Ecosystem Monitor
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-mono">Live on-chain metrics · DeFiLlama</p>
                        </div>

                        {/* ── Stablecoin Inflow Trend Chart ── */}
                        {(() => {
                            const days = stableTrendDays;
                            const sliced = data.stablecoinHistory.slice(-days);
                            if (sliced.length < 2) return null;

                            const first = sliced[0]?.valueB || 0;
                            const last = sliced[sliced.length - 1]?.valueB || 0;
                            const pctChange = first > 0 ? ((last - first) / first) * 100 : 0;
                            const isUp = pctChange >= 0;
                            const trendColor = isUp ? '#2ECC71' : '#EF4444';
                            const trendBg = isUp ? 'rgba(46,204,113,0.08)' : 'rgba(239,68,68,0.08)';

                            // thin ticks: every ~15 days show a label
                            const tickInterval = days <= 30 ? 6 : 14;

                            return (
                                <div className="border border-gray-800 rounded-2xl p-4 bg-[#0A0A0A]">
                                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                        <div>
                                            <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Stablecoin Inflow Trend · Arbitrum</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-lg font-black text-white font-mono">${last.toFixed(2)}B</span>
                                                <span
                                                    className="text-[11px] font-bold px-2 py-0.5 rounded-full font-mono"
                                                    style={{ color: trendColor, background: trendBg }}
                                                >
                                                    {isUp ? '▲' : '▼'} {Math.abs(pctChange).toFixed(1)}% ({days}d)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            {[30, 90].map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => setStableTrendDays(d)}
                                                    className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all ${days === d
                                                        ? 'bg-[#00D1FF]/20 border-[#00D1FF]/50 text-[#00D1FF]'
                                                        : 'bg-transparent border-gray-700 text-gray-500 hover:border-gray-500'
                                                        }`}
                                                >{d}D</button>
                                            ))}
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={120}>
                                        <AreaChart data={sliced} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="stableGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={trendColor} stopOpacity={0.35} />
                                                    <stop offset="100%" stopColor={trendColor} stopOpacity={0.02} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fill: '#4B5563', fontSize: 9, fontFamily: 'monospace' }}
                                                interval={tickInterval}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                tick={{ fill: '#4B5563', fontSize: 9, fontFamily: 'monospace' }}
                                                tickFormatter={v => `$${v.toFixed(1)}B`}
                                                tickLine={false}
                                                axisLine={false}
                                                width={50}
                                            />
                                            <Tooltip
                                                content={({ active, payload, label }) => {
                                                    if (!active || !payload?.length) return null;
                                                    return (
                                                        <div className="bg-[#111111] border border-gray-700 rounded-xl px-3 py-2 shadow-2xl">
                                                            <p className="text-gray-500 text-[10px] font-mono mb-1">{label}</p>
                                                            <p className="text-white font-black font-mono text-sm">
                                                                ${payload[0].value?.toFixed(3)}B
                                                            </p>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="valueB"
                                                name="Stablecoin Supply"
                                                stroke={trendColor}
                                                strokeWidth={2}
                                                fill="url(#stableGrad)"
                                                dot={false}
                                                activeDot={{ r: 4, fill: trendColor, strokeWidth: 0 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            );
                        })()}

                        {/* Stablecoins + Yields (full width now) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                            {/* Stablecoin supply breakdown */}
                            <div className="flex flex-col gap-4">

                                {/* Stablecoin supply breakdown */}
                                <div>
                                    <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-3">Stablecoin Composition</div>
                                    <div className="text-2xl font-black text-white font-mono">
                                        ${(data.stablecoins.total / 1e9).toFixed(2)}B
                                    </div>
                                    <p className="text-[10px] text-gray-600 font-mono mb-2">Total stablecoins on Arbitrum</p>
                                    <div className="space-y-1.5">
                                        {data.stablecoins.top.map((s, i) => {
                                            const colors = ['#2ECC71', '#3498DB', '#E67E22', '#9B59B6'];
                                            const pct = data.stablecoins.total > 0
                                                ? (s.amount / data.stablecoins.total * 100).toFixed(1)
                                                : 0;
                                            return (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: colors[i % 4] }} />
                                                        <span className="text-[11px] text-gray-400 font-mono">{s.symbol}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] text-gray-500 font-mono">${(s.amount / 1e9).toFixed(2)}B</span>
                                                        <span className="text-[10px] text-gray-700 font-mono">{pct}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Top Yields */}
                                {data.yields.length > 0 && (
                                    <div>
                                        <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-3">Top Yield Opportunities</div>
                                        <div className="space-y-1.5">
                                            {data.yields.slice(0, 4).map((y, i) => (
                                                <div key={i} className="flex items-center justify-between bg-[#0A0A0A] rounded-lg px-3 py-2">
                                                    <div className="min-w-0">
                                                        <span className="text-[11px] text-white font-mono font-bold truncate block max-w-[120px]">{y.symbol}</span>
                                                        <span className="text-[9px] text-gray-600 font-mono capitalize">{y.project}</span>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-2">
                                                        <div className="text-sm font-black font-mono text-[#28A745]">{y.apy.toFixed(1)}%</div>
                                                        <div className="text-[9px] text-gray-700 font-mono">${(y.tvlUsd / 1e6).toFixed(0)}M TVL</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

                    {/* ── M2-ARB Elasticity Chart ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
                        whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400 } }}
                        className="xl:col-span-2 bg-[#0D0D0D] border border-gray-800 rounded-3xl p-5 shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">M2-ARB Elasticity</div>
                                <div className="text-sm font-bold text-white">Global Liquidity vs. ARB TVL Inflow</div>
                            </div>
                            <div className="text-[10px] font-mono text-[#00D1FF]/60 bg-[#00D1FF]/5 border border-[#00D1FF]/10 px-2 py-1 rounded-lg">Weekly · 30pts</div>
                        </div>
                        {data.m2Elasticity.length > 1 ? (
                            <ResponsiveContainer width="100%" height={180}>
                                <ComposedChart data={data.m2Elasticity} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#00D1FF" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#00D1FF" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                                    <XAxis dataKey="date" tick={{ fill: '#4B5563', fontSize: 9, fontFamily: 'monospace' }} interval={5} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" tick={{ fill: '#00D1FF', fontSize: 9, fontFamily: 'monospace' }} tickFormatter={v => `$${v}B`} tickLine={false} axisLine={false} width={42} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#F0A500', fontSize: 9, fontFamily: 'monospace' }} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} width={36} />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (!active || !payload?.length) return null;
                                            return (
                                                <div className="bg-[#111] border border-gray-700 rounded-xl px-3 py-2 shadow-2xl text-xs font-mono">
                                                    <p className="text-gray-500 mb-1">{label}</p>
                                                    {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: {p.value}{p.name === 'Elasticity' ? '%' : 'B'}</p>)}
                                                </div>
                                            );
                                        }}
                                    />
                                    <Area yAxisId="left" type="monotone" dataKey="tvlB" name="ARB TVL" stroke="#00D1FF" strokeWidth={2} fill="url(#tvlGrad)" dot={false} />
                                    <Line yAxisId="right" type="monotone" dataKey="elasticity" name="Elasticity" stroke="#F0A500" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[180px] flex items-center justify-center text-gray-700 text-xs font-mono">Loading data...</div>
                        )}
                        <div className="flex gap-4 mt-3 text-[10px] font-mono">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#00D1FF] inline-block" />ARB TVL (B)</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#F0A500] inline-block border-dashed" />Elasticity %</span>
                        </div>
                    </motion.div>

                    {/* ── Native Alpha Index (Donut) ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                        whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400 } }}
                        className="bg-[#0D0D0D] border border-gray-800 rounded-3xl p-5 shadow-xl"
                    >
                        <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">Native Alpha Index</div>
                        <div className="text-sm font-bold text-white mb-4">ARB-Native TVL Share</div>
                        {(() => {
                            const COLORS = ['#00D1FF', '#F0A500', '#28A745', '#9B59B6', '#E74C3C', '#3498DB', '#555'];
                            const top = data.nativeAlpha.slice(0, 6);
                            if (!top.length) return <div className="h-[180px] flex items-center justify-center text-gray-700 text-xs font-mono">Loading...</div>;
                            const totalTvl = top.reduce((s, x) => s + x.tvl, 0) || 1;
                            return (
                                <>
                                    <ResponsiveContainer width="100%" height={160}>
                                        <PieChart>
                                            <Pie
                                                data={top}
                                                cx="50%" cy="50%"
                                                innerRadius={48} outerRadius={72}
                                                dataKey="tvl" paddingAngle={3}
                                                stroke="none"
                                            >
                                                {top.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (!active || !payload?.length) return null;
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-xs font-mono shadow-2xl">
                                                            <p className="text-white font-bold">{d.name}</p>
                                                            <p className="text-gray-400">${(d.tvl / 1e6).toFixed(0)}M · {(d.tvl / totalTvl * 100).toFixed(1)}%</p>
                                                        </div>
                                                    );
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="space-y-1.5 mt-2">
                                        {top.slice(0, 5).map((p, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                                    <span className="text-[10px] text-gray-400 font-mono">{p.name}</span>
                                                </div>
                                                <span className="text-[10px] text-gray-500 font-mono">{(p.tvl / totalTvl * 100).toFixed(1)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            );
                        })()}
                    </motion.div>

                    {/* ── GMX Whale Sentiment + Sequencer Margin ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}
                        whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400 } }}
                        className="bg-[#0D0D0D] border border-gray-800 rounded-3xl p-5 shadow-xl flex flex-col gap-5"
                    >
                        {/* GMX Whale Sentiment */}
                        <div>
                            <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">GMX Whale Sentiment</div>
                            <div className="text-sm font-bold text-white mb-3">Long / Short OI</div>
                            {data.gmxSentiment ? (() => {
                                const { longPct, longOI, shortOI, bullish } = data.gmxSentiment;
                                const shortPct = 100 - longPct;
                                const sentColor = bullish ? '#28A745' : '#DC3545';
                                return (
                                    <div>
                                        {/* SVG arc gauge */}
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-2xl font-black font-mono" style={{ color: sentColor }}>{longPct}%</span>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold" style={{ color: sentColor, background: `${sentColor}18` }}>
                                                {bullish ? '🟢 LONG BIAS' : '🔴 SHORT BIAS'}
                                            </span>
                                        </div>
                                        <div className="relative h-3 rounded-full bg-[#1A1A1A] overflow-hidden">
                                            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                                                style={{ width: `${longPct}%`, background: `linear-gradient(90deg, #28A745, #2ECC71)`, boxShadow: '0 0 8px #28A74560' }} />
                                        </div>
                                        <div className="flex justify-between mt-1.5">
                                            <span className="text-[9px] font-mono text-[#28A745]">Long ${longOI}M</span>
                                            <span className="text-[9px] font-mono text-[#DC3545]">Short ${shortOI}M</span>
                                        </div>
                                        {/* Mini segments */}
                                        <div className="flex gap-0.5 mt-2">
                                            {Array.from({ length: 20 }).map((_, i) => (
                                                <div key={i} className="flex-1 h-1 rounded-full"
                                                    style={{ background: i < Math.round(longPct / 5) ? '#28A745' : '#DC3545', opacity: 0.7 }} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })() : <div className="text-gray-700 text-xs font-mono">Loading...</div>}
                        </div>

                        <div className="border-t border-gray-800" />

                        {/* Sequencer Margin */}
                        <div>
                            <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">Sequencer Margin</div>
                            <div className="text-sm font-bold text-white mb-3">L2 Revenue vs L1 Cost</div>
                            {data.seqMargin ? (() => {
                                const { revenue24h, cost24h, marginPct, trend } = data.seqMargin;
                                const marginColor = marginPct >= 55 ? '#28A745' : marginPct >= 35 ? '#F0A500' : '#DC3545';
                                return (
                                    <div>
                                        <div className="flex items-end justify-between mb-2">
                                            <span className="text-2xl font-black font-mono" style={{ color: marginColor }}>{marginPct}%</span>
                                            <span className="text-[10px] font-mono text-gray-500">
                                                {trend === 'up' ? '↑' : '↓'} 24h rev: ${(revenue24h / 1000).toFixed(1)}K
                                            </span>
                                        </div>
                                        <div className="relative h-3 rounded-full bg-[#1A1A1A] overflow-hidden">
                                            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                                                style={{ width: `${marginPct}%`, background: `linear-gradient(90deg, ${marginColor}99, ${marginColor})`, boxShadow: `0 0 8px ${marginColor}60` }} />
                                        </div>
                                        <div className="flex justify-between mt-1.5">
                                            <span className="text-[9px] font-mono text-[#00D1FF]">Revenue ${(revenue24h / 1000).toFixed(1)}K</span>
                                            <span className="text-[9px] font-mono text-gray-600">L1 Cost ${(cost24h / 1000).toFixed(1)}K</span>
                                        </div>
                                    </div>
                                );
                            })() : <div className="text-gray-700 text-xs font-mono">Loading...</div>}
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

export default ArbiscanDashboard;
