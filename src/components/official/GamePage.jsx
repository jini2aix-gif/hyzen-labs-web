import React, { useState, useRef, useEffect } from 'react';
import { Play, Trophy, Activity, Zap } from 'lucide-react';
import Hero from './Hero';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../hooks/useFirebase';
import zeroGBg from '../../assets/games/zero-g-drift-bg.png';
import pulseDashBg from '../../assets/games/pulse-dash-bg.png';

const UnifiedLeaderboardTicker = () => {
    const [zeroGRanks, setZeroGRanks] = useState([]);
    const [pulseRanks, setPulseRanks] = useState([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        if (!db || !appId) return;

        // Fetch Zero-G Drift
        const zeroGRef = collection(db, 'artifacts', appId, 'public', 'data', 'games', 'zero-g-drift', 'scores');
        const q0 = query(zeroGRef, orderBy('score', 'desc'), limit(3));
        const unsub0 = onSnapshot(q0, (snap) => {
            setZeroGRanks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsInitialLoad(false);
        });

        // Fetch Pulse Dash
        const pulseRef = collection(db, 'artifacts', appId, 'public', 'data', 'games', 'pulse-dash', 'scores');
        const q1 = query(pulseRef, orderBy('score', 'desc'), limit(3));
        const unsub1 = onSnapshot(q1, (snap) => {
            setPulseRanks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => { unsub0(); unsub1(); };
    }, [db, appId]);

    const renderRanks = (ranks, label, color, isTime) => (
        <>
            <div className={`flex items-center gap-2 ${color} font-brand italic font-black text-sm ml-12`}>
                <Trophy size={14} />
                {label}
            </div>
            {ranks.map((rank, idx) => (
                <div key={rank.id} className="flex items-center gap-2">
                    <span className="font-tech text-[10px] text-gray-400">RANK{idx + 1}</span>
                    <span className="font-brand font-bold text-xs text-gray-800">{rank.displayName || 'Anonymous'}</span>
                    <span className={`font-mono text-[10px] font-bold ${color}`}>
                        {isTime ? `${rank.score.toFixed(2)}s` : `${Math.floor(rank.score).toLocaleString()} PTS`}
                    </span>
                </div>
            ))}
            {ranks.length === 0 && <span className="text-[10px] font-tech text-gray-300 uppercase tracking-widest pl-4">데이터 없음</span>}
        </>
    );

    const renderTickerContent = () => (
        <div className="flex items-center gap-16 whitespace-nowrap px-12">
            {renderRanks(zeroGRanks, 'ZERO-G DRIFT', 'text-cyan-500', true)}
            <div className="w-[1px] h-4 bg-gray-200 mx-4"></div>
            {renderRanks(pulseRanks, 'PULSE DASH', 'text-indigo-500', false)}
            {/* Loop Padding for smoothness */}
            <div className="w-[100px]"></div>
        </div>
    );

    const hasData = (zeroGRanks?.length || 0) > 0 || (pulseRanks?.length || 0) > 0;

    return (
        <div className="w-full bg-gray-50/30 border-b border-gray-100/50 overflow-hidden py-2 relative min-h-[40px] flex items-center">
            {/* CSS Animation Keyframe Definition */}
            <style>
                {`
                    @keyframes ticker-scroll {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                    .ticker-animate {
                        display: flex;
                        width: max-content;
                        animation: ticker-scroll 35s linear infinite;
                    }
                `}
            </style>

            <div className="flex w-full overflow-hidden">
                {hasData ? (
                    <div className="ticker-animate" style={{ opacity: 1 }}>
                        {renderTickerContent()}
                        {renderTickerContent()}
                    </div>
                ) : (
                    <div className="w-full flex justify-center items-center py-1">
                        <span className="text-[10px] font-tech text-gray-400 uppercase tracking-[0.3em] animate-pulse">
                            HYZEN REAL-TIME DATA SYNCING...
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

const GameGrid = ({ onOpenZeroG, onOpenPulseDash }) => {
    return (
        <div className="w-full px-4 md:px-10 pb-20">
            <div className="flex items-center gap-4 mb-8">
                <div className="h-[1px] flex-1 bg-gray-200"></div>
                <span className="font-tech text-xs tracking-[0.2em] text-gray-400 uppercase">System Ready</span>
                <div className="h-[1px] flex-1 bg-gray-200"></div>
            </div>

            {/* Compact Grid: Reduced height to 160px */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-[160px]">
                {/* Zero-G Drift Card */}
                <div
                    onClick={onOpenZeroG}
                    className="group relative w-full h-full bg-black rounded-3xl overflow-hidden border border-gray-800 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyan-500/20 cursor-pointer"
                >
                    <div className="absolute inset-0">
                        <img
                            src={zeroGBg}
                            alt="Zero-G Drift"
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                        />
                        {/* Title area black gradient */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,0,0,1)_0%,_rgba(0,0,0,0.8)_20%,_transparent_60%)]"></div>
                        {/* Bottom/Left mask */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-transparent"></div>
                    </div>
                    <div className="absolute top-1/2 left-10 -translate-y-1/2 w-48 h-48 bg-cyan-500/10 blur-[80px] rounded-full group-hover:bg-cyan-400/20 transition-colors"></div>

                    {/* Content Layout */}
                    <div className="absolute inset-0 p-6 z-10 flex flex-col justify-between">
                        <div className="flex justify-end items-start mt-2">
                            <h3 className="font-brand text-3xl md:text-4xl font-black italic tracking-tighter text-white group-hover:text-cyan-300 transition-all duration-500 text-right leading-[0.8]">
                                ZERO-G<br />DRIFT
                            </h3>
                        </div>

                        <div className="flex items-end justify-between">
                            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                <p className="font-tech text-[8px] tracking-[0.2em] text-gray-300 uppercase">
                                    Survival Sim
                                </p>
                            </div>

                            <div className="opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                                <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:bg-cyan-400">
                                    <Play size={16} fill="currentColor" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pulse Dash Card */}
                <div
                    onClick={onOpenPulseDash}
                    className="group relative w-full h-full bg-black rounded-3xl overflow-hidden border border-gray-800 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/20 cursor-pointer"
                >
                    <div className="absolute inset-0">
                        <img
                            src={pulseDashBg}
                            alt="Pulse Dash"
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                        />
                        {/* Title area black gradient */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,0,0,1)_0%,_rgba(0,0,0,0.8)_20%,_transparent_60%)]"></div>
                        {/* Bottom/Left mask */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-transparent"></div>
                    </div>

                    <div className="absolute top-1/2 left-10 -translate-y-1/2 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full group-hover:bg-indigo-400/20 transition-colors"></div>

                    {/* Content Layout */}
                    <div className="absolute inset-0 p-6 z-10 flex flex-col justify-between">
                        <div className="flex justify-end items-start mt-2">
                            <h3 className="font-brand text-3xl md:text-4xl font-black italic tracking-tighter text-white group-hover:text-indigo-300 transition-all duration-500 text-right leading-[0.8]">
                                PULSE<br />DASH
                            </h3>
                        </div>

                        <div className="flex items-end justify-between">
                            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                                <p className="font-tech text-[8px] tracking-[0.2em] text-gray-300 uppercase">
                                    High Speed
                                </p>
                            </div>

                            <div className="opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                                <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:bg-indigo-400">
                                    <Play size={16} fill="currentColor" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const GamePage = ({ user, onOpenZeroG, onOpenPulseDash }) => {
    const scrollContainerRef = useRef(null);

    return (
        <div
            ref={scrollContainerRef}
            className="w-full h-full overflow-y-auto overflow-x-hidden relative bg-white scroll-smooth"
        >
            <Hero
                title={
                    <>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
                            Playground
                        </span>
                    </>
                }
                subtitle="Digital Experience Laboratory"
                debrisColors={['#22c1c3', '#fdbb2d', '#fc466b', '#3f5efb', '#e100ff', '#00d2ff']}
                scrollContainerRef={scrollContainerRef}
            />

            <div className="relative pt-0 pb-24 flex flex-col">
                <UnifiedLeaderboardTicker />
                <div className="pt-24">
                    <GameGrid onOpenZeroG={onOpenZeroG} onOpenPulseDash={onOpenPulseDash} />
                </div>

                {/* Footer moved inside scroll container */}
                <footer className="py-12 border-t border-gray-100 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-tech">© 2026 Hyzen Labs. All Rights Reserved.</p>
                </footer>
            </div>
        </div>
    );
};

export default React.memo(GamePage);
