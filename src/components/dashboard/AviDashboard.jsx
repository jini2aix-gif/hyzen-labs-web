import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { fetchMarketComparison, REFRESH } from '../../lib/api-fetcher';
import { MONTHLY_REALISTIC_BAND, TREASURY_ARB } from '../../constants/simulation-data';

// ─── Gauge constants ──────────────────────────────────────────────────────────
const GAUGE_MIN_PCT = -100;
const GAUGE_MAX_PCT = 100;
const GAUGE_START_DEG = -135;
const GAUGE_END_DEG   =  135;

const pctToAngle = (pct) => {
    const clamped = Math.max(GAUGE_MIN_PCT, Math.min(GAUGE_MAX_PCT, pct));
    const ratio = (clamped - GAUGE_MIN_PCT) / (GAUGE_MAX_PCT - GAUGE_MIN_PCT);
    return GAUGE_START_DEG + ratio * (GAUGE_END_DEG - GAUGE_START_DEG);
};

// ─── Car Odometer ─────────────────────────────────────────────────────────────
const CELL_H = 24; // px per digit row
const DIGITS  = ['0','1','2','3','4','5','6','7','8','9'];

// Single digit drum cell — pixel-based y translation (reliable)
const DrumCell = ({ digit, delay = 0 }) => {
    const idx = /\d/.test(digit) ? parseInt(digit, 10) : 0;
    return (
        <div style={{
            width: '17px',
            height: `${CELL_H}px`,
            overflow: 'hidden',
            background: 'linear-gradient(180deg,#06060e 0%,#0d0d1c 100%)',
            borderRight: '1px solid #ffffff0a',
            position: 'relative',
            flexShrink: 0,
        }}>
            {/* Top vignette */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height:'8px',
                background:'linear-gradient(to bottom,#06060e,transparent)', zIndex:3, pointerEvents:'none' }} />
            {/* Bottom vignette */}
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'8px',
                background:'linear-gradient(to top,#06060e,transparent)', zIndex:3, pointerEvents:'none' }} />
            {/* Highlight line (centre gleam) */}
            <div style={{ position:'absolute', top:'50%', left:0, right:0, height:'1px',
                background:'linear-gradient(to right,transparent,#ffffff0a,transparent)', zIndex:3, pointerEvents:'none' }} />
            <motion.div
                animate={{ y: -(idx * CELL_H) }}   /* px — unambiguous */
                transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
                style={{ display:'flex', flexDirection:'column', width:'100%' }}
            >
                {DIGITS.map((d) => (
                    <div key={d} style={{
                        height: `${CELL_H}px`,
                        lineHeight: `${CELL_H}px`,
                        textAlign: 'center',
                        fontSize: '13px',
                        fontFamily: '"Courier New", Courier, monospace',
                        fontWeight: 900,
                        color: '#e8f0ff',
                        userSelect: 'none',
                        flexShrink: 0,
                    }}>{d}</div>
                ))}
            </motion.div>
        </div>
    );
};

// Comma separator
const CommaSep = () => (
    <div style={{
        width: '8px', height: `${CELL_H}px`,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        paddingBottom: '3px',
        background: 'linear-gradient(180deg,#06060e,#0d0d1c)',
        borderRight: '1px solid #ffffff0a',
        flexShrink: 0,
    }}>
        <span style={{ fontSize: '10px', color: '#ffffff50', fontFamily:'monospace', fontWeight:900, lineHeight:1 }}>,</span>
    </div>
);

// The full strip: ₩ prefix + drum slots with chrome frame
const OdometerStrip = ({ assetKRW }) => {
    // Build array of cells: always 9 digits padded, commas at positions 3 & 6
    const buildCells = (krw) => {
        const abs = Math.abs(Math.round(krw));
        const str = abs.toString().padStart(9, '0');
        const out = [];
        str.split('').forEach((d, i) => {
            out.push({ type: 'digit', val: d, delay: (9 - i) * 0.04 });
            if (i === 2 || i === 5) out.push({ type: 'comma' });
        });
        return out;
    };

    const cells = assetKRW != null ? buildCells(assetKRW) : null;

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'stretch',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1.5px solid #36365a',
            boxShadow: [
                '0 0 0 0.5px #00000088',
                '0 2px 14px #00000077',
                'inset 0 1px 0 #ffffff0e',
                'inset 0 -1px 0 #00000055',
            ].join(', '),
        }}>
            {/* ₩ prefix cell */}
            <div style={{
                height: `${CELL_H}px`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(180deg,#0e0e22,#080814)',
                borderRight: '1.5px solid #36365a',
                padding: '0 7px',
                flexShrink: 0,
            }}>
                <span style={{ fontSize: '11px', color: '#00D1FFbb', fontFamily: 'monospace', fontWeight: 900 }}>₩</span>
            </div>

            {/* Digit/comma cells */}
            {cells == null
                ? (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                        height:`${CELL_H}px`, padding:'0 16px',
                        background:'linear-gradient(180deg,#06060e,#0d0d1c)',
                        fontSize:'11px', fontFamily:'monospace', color:'#ffffff22', letterSpacing:'0.15em' }}>
                        — — — — —
                    </div>
                )
                : cells.map((c, i) =>
                    c.type === 'digit'
                        ? <DrumCell key={i} digit={c.val} delay={c.delay} />
                        : <CommaSep key={i} />
                )
            }
        </div>
    );
};


// ─── SVG Gauge Face (no asset text inside) ────────────────────────────────────
const GaugeFace = ({ gapPct, isLive, indicatorColor }) => {
    const cx = 200, cy = 200, r = 155;
    const needleAngleDeg = pctToAngle(gapPct);
    const needleAngleRad = (needleAngleDeg - 90) * (Math.PI / 180);

    const arcPath = (innerR, outerR, startDeg, endDeg) => {
        const toRad = (d) => (d - 90) * (Math.PI / 180);
        const s = toRad(startDeg), e = toRad(endDeg);
        const x1 = cx + outerR * Math.cos(s), y1 = cy + outerR * Math.sin(s);
        const x2 = cx + outerR * Math.cos(e), y2 = cy + outerR * Math.sin(e);
        const x3 = cx + innerR * Math.cos(e), y3 = cy + innerR * Math.sin(e);
        const x4 = cx + innerR * Math.cos(s), y4 = cy + innerR * Math.sin(s);
        const largeArc = (endDeg - startDeg) > 180 ? 1 : 0;
        return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    };

    const ticks = [];
    const totalArc = GAUGE_END_DEG - GAUGE_START_DEG;
    [-100, -75, -50, -25, 0, 25, 50, 75, 100].forEach((v) => {
        const ratio = (v - GAUGE_MIN_PCT) / (GAUGE_MAX_PCT - GAUGE_MIN_PCT);
        const deg   = GAUGE_START_DEG + ratio * totalArc;
        const rad   = (deg - 90) * (Math.PI / 180);
        const isMajor = v % 25 === 0;
        const inner = isMajor ? r - 22 : r - 12;
        ticks.push({
            x1: cx + inner * Math.cos(rad),   y1: cy + inner * Math.sin(rad),
            x2: cx + (r - 2) * Math.cos(rad), y2: cy + (r - 2) * Math.sin(rad),
            lx: cx + (r - 36) * Math.cos(rad), ly: cy + (r - 36) * Math.sin(rad),
            label: isMajor ? `${v > 0 ? '+' : ''}${v}` : null,
            isMajor, isZero: v === 0, value: v,
        });
    });

    const negEnd = GAUGE_START_DEG + ((0 - GAUGE_MIN_PCT) / (GAUGE_MAX_PCT - GAUGE_MIN_PCT)) * totalArc;

    const needleTipR  =  r - 30;
    const needleTailR = -25;
    const tipX  = cx + needleTipR  * Math.cos(needleAngleRad);
    const tipY  = cy + needleTipR  * Math.sin(needleAngleRad);
    const tailX = cx + needleTailR * Math.cos(needleAngleRad);
    const tailY = cy + needleTailR * Math.sin(needleAngleRad);
    const perpRad = needleAngleRad + Math.PI / 2;
    const w = 5;
    const pts = [
        [tipX, tipY],
        [cx + w * Math.cos(perpRad), cy + w * Math.sin(perpRad)],
        [tailX, tailY],
        [cx - w * Math.cos(perpRad), cy - w * Math.sin(perpRad)],
    ].map(p => p.join(',')).join(' ');

    const glowColor = gapPct >= 0 ? '#39FF14' : '#FF4444';

    return (
        <svg viewBox="0 0 400 400" className="w-full h-full" style={{ overflow: 'visible' }}>
            <defs>
                <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor="#1A1A2E" />
                    <stop offset="100%" stopColor="#050510" />
                </radialGradient>
                <linearGradient id="negGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#FF2020" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#FFa020" stopOpacity="0.4"  />
                </linearGradient>
                <linearGradient id="posGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#20FFa0" stopOpacity="0.4"  />
                    <stop offset="100%" stopColor="#39FF14" stopOpacity="0.85" />
                </linearGradient>
                <filter id="needleGlow">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <radialGradient id="ringGrad" cx="50%" cy="30%" r="70%">
                    <stop offset="0%"   stopColor="#555" />
                    <stop offset="100%" stopColor="#111" />
                </radialGradient>
            </defs>

            <circle cx={cx} cy={cy} r="195" fill="url(#ringGrad)" />
            <circle cx={cx} cy={cy} r="190" fill="none" stroke="#333" strokeWidth="1" />
            <circle cx={cx} cy={cy} r="185" fill="url(#bgGrad)" />

            <path d={arcPath(r - 20, r, GAUGE_START_DEG, negEnd - 1)} fill="url(#negGrad)" opacity="0.7" />
            <path d={arcPath(r - 20, r, negEnd + 1, GAUGE_END_DEG)} fill="url(#posGrad)" opacity="0.7" />
            <path d={arcPath(r - 22, r, GAUGE_START_DEG, GAUGE_END_DEG)} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

            {ticks.map((t, i) => (
                <g key={i}>
                    <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                        stroke={t.isZero ? '#00D1FF' : t.isMajor ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)'}
                        strokeWidth={t.isZero ? 3 : t.isMajor ? 2 : 1} />
                    {t.label && (
                        <text x={t.lx} y={t.ly} textAnchor="middle" dominantBaseline="middle"
                            fill={t.isZero ? '#00D1FF' : t.value < 0 ? '#FF8888' : '#88FF88'}
                            fontSize={t.isZero ? 11 : 9} fontFamily="monospace"
                            fontWeight={t.isZero ? '900' : '600'}>
                            {t.label}%
                        </text>
                    )}
                </g>
            ))}

            <text x={cx - 130} y={cy + 60} textAnchor="middle" fill="#FF8888" fontSize="22" fontFamily="monospace" fontWeight="900" opacity="0.8">−</text>
            <text x={cx + 130} y={cy + 60} textAnchor="middle" fill="#88FF88" fontSize="22" fontFamily="monospace" fontWeight="900" opacity="0.8">+</text>
            <line x1={cx} y1={cy - r + 5} x2={cx} y2={cy - r + 28} stroke="#00D1FF" strokeWidth="3" />
            <circle cx={cx} cy={cy} r={r - 25} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

            <polygon points={pts} fill={glowColor} opacity="0.3" filter="url(#needleGlow)" />
            <polygon points={pts} fill={glowColor} filter="url(#needleGlow)" />

            <circle cx={cx} cy={cy} r="18" fill="#111" stroke="#444" strokeWidth="2" />
            <circle cx={cx} cy={cy} r="10" fill={glowColor} opacity="0.9" />
            <circle cx={cx} cy={cy} r="5"  fill="#fff"      opacity="0.8" />

            {isLive && (
                <circle cx={cx + 130} cy={cy - 130} r="6" fill={indicatorColor} opacity="0.9">
                    <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.5s" repeatCount="indefinite" />
                </circle>
            )}
        </svg>
    );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const AviDashboard = () => {
    const [priceKRW, setPriceKRW]       = useState(null);
    const [isLoading, setIsLoading]     = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [displayPct, setDisplayPct]   = useState(0);
    const animRef = useRef(null);
    const prevPct = useRef(0);

    const todayStr    = new Date().toISOString().substring(0, 7);
    const currentBand = MONTHLY_REALISTIC_BAND.find(b => b.date === todayStr) || MONTHLY_REALISTIC_BAND[0];
    const scenarioTarget = currentBand?.priceTarget ?? 180;
    const scenarioLow    = currentBand?.priceLow    ?? 140;
    const scenarioHigh   = currentBand?.priceHigh   ?? 250;

    const rawGapPct     = priceKRW != null ? ((priceKRW - scenarioTarget) / scenarioTarget) * 100 : 0;
    const clampedGapPct = Math.max(-100, Math.min(100, rawGapPct));
    const assetKRW      = priceKRW != null ? priceKRW * TREASURY_ARB : null;

    // Smooth needle animation
    useEffect(() => {
        if (priceKRW == null) return;
        const start = prevPct.current, end = clampedGapPct;
        const startTime = performance.now();
        const animate = (now) => {
            const t = Math.min((now - startTime) / 1800, 1);
            setDisplayPct(start + (end - start) * (1 - Math.pow(1 - t, 3)));
            if (t < 1) animRef.current = requestAnimationFrame(animate);
            else prevPct.current = end;
        };
        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, [clampedGapPct, priceKRW]);

    // Data fetch
    useEffect(() => {
        const load = async () => {
            try {
                const market = await fetchMarketComparison();
                setPriceKRW(market.arb.priceKRW);
                setLastUpdated(new Date());
            } catch (e) { console.error('AviDashboard load error', e); }
            finally { setIsLoading(false); }
        };
        load();
        const id = setInterval(load, REFRESH.FAST);
        return () => clearInterval(id);
    }, []);

    const isPositive = displayPct >= 0;
    const gapColor   = isPositive ? '#39FF14' : '#FF4444';

    const indicatorColor = (() => {
        if (priceKRW == null) return '#555';
        if (priceKRW < scenarioLow) return '#FF4444'; // Red
        if (priceKRW > scenarioHigh) return '#00D1FF'; // Blue
        return '#39FF14'; // Green
    })();

    return (
        <main className="relative min-h-screen bg-[#050510] flex flex-col items-center justify-center overflow-hidden px-4 py-24">

            {/* Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20"
                    style={{ background: `radial-gradient(circle, ${isPositive ? 'rgba(57,255,20,0.3)' : 'rgba(255,60,60,0.3)'} 0%, transparent 70%)`, transition: 'background 1s ease' }} />
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'linear-gradient(rgba(0,209,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,209,255,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            </div>

            {/* Title */}
            <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
                className="relative z-10 text-center mb-6">
                <h1 className="text-[10px] font-mono tracking-[0.5em] text-[#00D1FF] uppercase mb-2 opacity-70">
                    Hyzen Labs · Asset Navigator
                </h1>
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">
                    RUN<span className="text-[#00D1FF] animate-pulse">.</span>
                </h2>
                <p className="text-xs font-mono text-gray-500 mt-2 tracking-widest uppercase">
                    Real-time Gap vs. Scenario Target
                </p>
            </motion.div>

            {/* Gauge */}
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-[520px] mx-auto">

                <div className="absolute inset-0 rounded-full opacity-20 blur-3xl"
                    style={{ background: `radial-gradient(circle, ${gapColor}55 0%, transparent 60%)`, transition: 'background 1s' }} />

                <GaugeFace gapPct={displayPct} isLive={!isLoading} indicatorColor={indicatorColor} />

                {/* Center readout overlay — gap % + single odometer */}
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-[15%] pointer-events-none">
                    {isLoading
                        ? <Activity className="animate-spin text-[#00D1FF]" size={24} />
                        : (
                            <div className="flex flex-col items-center gap-1.5">
                                {/* Gap percentage */}
                                <span className="font-black font-mono tabular-nums tracking-tight leading-none"
                                    style={{
                                        fontSize: 'clamp(20px, 5.5vw, 32px)',
                                        color: gapColor,
                                        textShadow: `0 0 20px ${gapColor}88`,
                                        transition: 'color 0.5s',
                                    }}>
                                    {displayPct >= 0 ? '+' : ''}{displayPct.toFixed(1)}%
                                </span>

                                <span className="text-[8px] font-mono text-gray-500 tracking-widest uppercase">
                                    vs. Target
                                </span>

                                {/* ── Car odometer — single source ── */}
                                <div className="flex flex-col items-center gap-0.5 mt-1">
                                    <span className="text-[6.5px] font-mono text-[#00D1FF]/35 uppercase tracking-[0.3em] mb-0.5">
                                        Total Asset
                                    </span>
                                    <OdometerStrip assetKRW={assetKRW} />
                                    <span className="text-[6px] font-mono text-gray-700 uppercase tracking-widest mt-0.5">
                                        {TREASURY_ARB.toLocaleString('en-US')} ARB
                                    </span>
                                </div>
                            </div>
                        )}
                </div>
            </motion.div>

            {/* Asset Performance Bands */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="relative z-10 w-full max-w-[560px] flex flex-col gap-5 mt-2">
                
                {/* Scenario Band */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 backdrop-blur-md">
                    <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-3 text-center">
                        {todayStr} · Scenario Band
                    </p>
                    <div className="relative h-2.5 rounded-full overflow-visible bg-white/10"
                        style={{ background: 'linear-gradient(to right, #FF4444 0%, #FFaa00 50%, #39FF14 100%)' }}>
                        {priceKRW != null && (() => {
                            const pPos = Math.max(0, Math.min(100, ((priceKRW - scenarioLow) / (scenarioHigh - scenarioLow)) * 100));
                            return (
                                <motion.div 
                                    initial={false}
                                    animate={{ left: `${pPos}%` }}
                                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_10px_rgba(255,255,255,0.5)] z-20"
                                    style={{ background: indicatorColor }} />
                            );
                        })()}
                    </div>
                    <div className="flex justify-between mt-2.5 px-0.5">
                        <div className="flex flex-col items-start gap-0.5">
                            <span className="text-[7.5px] text-gray-500 font-mono uppercase">Low</span>
                            <span className="text-[10px] text-red-400/80 font-mono font-bold">₩{scenarioLow.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[7.5px] text-gray-500 font-mono uppercase">Target</span>
                            <span className="text-[10px] text-[#00D1FF] font-mono font-bold">₩{scenarioTarget.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[7.5px] text-gray-500 font-mono uppercase">High</span>
                            <span className="text-[10px] text-green-400/80 font-mono font-bold">₩{scenarioHigh.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Asset Growth Band (Dynamic Target) */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 backdrop-blur-md">
                    {assetKRW != null && (() => {
                        const principal = 20000000;
                        const baseTarget = 1000000000; // 1B is 100%
                        const targetDistance = baseTarget - principal;
                        const currentDistance = assetKRW - principal;
                        const currentPct = (currentDistance / targetDistance) * 100;

                        // Dynamic maxPct: 100, 200, 300, etc.
                        const maxPctLimit = Math.max(100, Math.ceil(currentPct / 100) * 100);
                        const progress = Math.max(0, Math.min(100, (currentPct / maxPctLimit) * 100));
                        
                        return (
                            <>
                                <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-3 text-center">
                                    Principal Growth Progress (Current: {currentPct.toFixed(1)}%)
                                </p>
                                <div className="relative h-2.5 rounded-full overflow-visible bg-white/10">
                                    {/* Progress fill */}
                                    <motion.div 
                                        initial={false}
                                        animate={{ width: `${progress}%` }}
                                        className="absolute inset-y-0 left-0 rounded-full"
                                        style={{ background: 'linear-gradient(to right, #00D1FF, #39FF14)' }} 
                                    />
                                    <motion.div 
                                        initial={false}
                                        animate={{ left: `${progress}%` }}
                                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_10px_rgba(255,255,255,0.5)] z-20"
                                        style={{ background: '#39FF14' }} />
                                </div>
                                {/* Percentage Labels */}
                                <div className="flex justify-between mt-2.5 px-0.5 relative">
                                    {[0, 25, 50, 75, 100].map((step) => {
                                        const labelPct = (maxPctLimit * (step / 100)).toFixed(0);
                                        const labelValue = principal + (targetDistance * (parseInt(labelPct) / 100));
                                        return (
                                            <div key={step} className="flex flex-col items-center gap-0.5">
                                                <span className="text-[7.5px] text-gray-500 font-mono uppercase">{labelPct}%</span>
                                                <span className="text-[9px] text-white/40 font-mono">
                                                    {labelValue >= 1000000000 ? `${(labelValue / 1000000000).toFixed(1)}B` : `${(labelValue / 1000000).toFixed(0)}M`}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        );
                    })()}
                </div>
            </motion.div>

            {/* Status */}
            <div className="relative z-10 mt-6 text-[9px] text-gray-700 font-mono tracking-widest uppercase">
                {lastUpdated ? `Last sync · ${lastUpdated.toLocaleTimeString('en-US', { hour12: false })}` : 'Connecting...'}
                {!isLoading && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#39FF14] ml-2 animate-pulse align-middle" />}
            </div>
        </main>
    );
};

export default AviDashboard;
