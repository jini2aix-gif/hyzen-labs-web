// NEON GHOST RUN — index.jsx v1.0
// Game shell: countdown → playing → gameover flow
// Inherits Zero-G Drift / Pulse Dash UI philosophy

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, RotateCcw, LogOut, Volume2, VolumeX, AlertTriangle, Zap, Ghost } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../../../hooks/useFirebase';
import GameCanvas from './GameCanvas';
import NeonGhostLeaderboard from './Leaderboard';
import { motion, AnimatePresence } from 'framer-motion';
import { gameAudio } from '../../../utils/gameAudio';

const GHOST_STORAGE_KEY = 'ngr_ghost_v1';

const NeonGhostRun = ({ isOpen, onClose, user }) => {
    const [gameState, setGameState] = useState('start');
    const [countdown, setCountdown] = useState(3);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showConfirmQuit, setShowConfirmQuit] = useState(false);
    const [hasGhost, setHasGhost] = useState(false);
    const [ghostLabel, setGhostLabel] = useState('');
    // Item states
    const [hasShield, setHasShield] = useState(false);
    const [phantomSecs, setPhantomSecs] = useState(0);
    const [boostSecs, setBoostSecs] = useState(0);
    const ghostDataRef = useRef(null);
    const currentRunFramesRef = useRef([]);
    const itemTimersRef = useRef({});

    // ─── Load ghost from localStorage on open ────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        try {
            const saved = localStorage.getItem(GHOST_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                ghostDataRef.current = parsed.frames;
                setGhostLabel(`Ghost: ${parsed.score?.toLocaleString() ?? '?'} pts`);
                setHasGhost(true);
            }
        } catch { ghostDataRef.current = null; }
    }, [isOpen]);

    // ─── Audio sync ────────────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen && !isMuted) gameAudio.setMute(false);
        else gameAudio.stopBGM();
    }, [isOpen, isMuted]);

    // ─── Scroll lock ───────────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            gameAudio.stopBGM();
            setGameState('start');
            setScore(0); setCombo(0); setMaxCombo(0); setCurrentLevel(1);
            setHasShield(false); setPhantomSecs(0); setBoostSecs(0);
            setShowConfirmQuit(false);
        }
        return () => { document.body.style.overflow = 'unset'; gameAudio.stopBGM(); };
    }, [isOpen]);

    // ─── Countdown logic ───────────────────────────────────────────────────
    useEffect(() => {
        let timer;
        if (gameState === 'countdown' && countdown > 0) {
            timer = setTimeout(() => {
                setCountdown(p => p - 1);
                gameAudio.playSFX('click');
            }, 1000);
        } else if (gameState === 'countdown' && countdown === 0) {
            setGameState('playing');
            setCurrentLevel(1);
            setShowLevelUp(true);
            setTimeout(() => setShowLevelUp(false), 2000);
            if (!isMuted) gameAudio.playBGM();
        }
        return () => clearTimeout(timer);
    }, [gameState, countdown, isMuted]);

    // ─── Start game ────────────────────────────────────────────────────────
    const initiateGame = useCallback(() => {
        gameAudio.playSFX('click');
        currentRunFramesRef.current = [];
        setGameState('countdown');
        setCountdown(3);
        setScore(0); setCombo(0); setMaxCombo(0); setCurrentLevel(1);
        setHasShield(false); setPhantomSecs(0); setBoostSecs(0);
        // Clear any item timers
        Object.values(itemTimersRef.current).forEach(clearInterval);
        itemTimersRef.current = {};
    }, []);

    // ─── Item collect handler ──────────────────────────────────────────────
    const handleItemCollect = useCallback((kind) => {
        if (kind === 'shield') {
            setHasShield(true);
        } else if (kind === 'ghost') {
            setPhantomSecs(4);
            clearInterval(itemTimersRef.current.phantom);
            itemTimersRef.current.phantom = setInterval(() => {
                setPhantomSecs(prev => { if (prev <= 1) { clearInterval(itemTimersRef.current.phantom); return 0; } return prev - 1; });
            }, 1000);
        } else if (kind === 'boost') {
            setBoostSecs(8);
            clearInterval(itemTimersRef.current.boost);
            itemTimersRef.current.boost = setInterval(() => {
                setBoostSecs(prev => { if (prev <= 1) { clearInterval(itemTimersRef.current.boost); return 0; } return prev - 1; });
            }, 1000);
        }
    }, []);

    // ─── Game over ─────────────────────────────────────────────────────────
    const handleGameOver = useCallback(async (finalScore, finalMaxCombo, frames) => {
        setGameState('gameover');
        setScore(finalScore);
        setMaxCombo(finalMaxCombo);
        gameAudio.playSFX('crash');
        gameAudio.stopBGM();

        // Save ghost if new best
        try {
            const saved = localStorage.getItem(GHOST_STORAGE_KEY);
            const prev = saved ? JSON.parse(saved) : null;
            if (!prev || finalScore > prev.score) {
                localStorage.setItem(GHOST_STORAGE_KEY, JSON.stringify({ score: finalScore, frames }));
                ghostDataRef.current = frames;
                setGhostLabel(`Ghost: ${finalScore.toLocaleString()} pts`);
                setHasGhost(true);
            }
        } catch { /* ignore */ }

        // Save to Firebase
        if (user && db && appId) {
            try {
                const ref = collection(db, 'artifacts', appId, 'public', 'data', 'games', 'neon-ghost-run', 'scores');
                await addDoc(ref, {
                    uid: user.uid,
                    displayName: user.displayName || 'Ghost Runner',
                    photoURL: user.photoURL || null,
                    score: finalScore,
                    maxCombo: finalMaxCombo,
                    timestamp: serverTimestamp(),
                });
            } catch (e) { console.error('Score save error', e); }
        }
    }, [user]);

    // ─── Level change ──────────────────────────────────────────────────────
    const handleLevelChange = useCallback((lvl) => {
        setCurrentLevel(lvl);
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 2000);
        gameAudio.playSFX('collect');
    }, []);

    // ─── Quit handlers ─────────────────────────────────────────────────────
    const requestQuit = () => { gameAudio.playSFX('click'); setGameState('start'); setScore(0); };
    const handleExitClick = () => { gameAudio.playSFX('click'); setShowConfirmQuit(true); };
    const confirmExit = () => { gameAudio.playSFX('click'); gameAudio.stopBGM(); setShowConfirmQuit(false); onClose(); };
    const cancelExit = () => { gameAudio.playSFX('click'); setShowConfirmQuit(false); };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden touch-none font-sans select-none text-white"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
        >
            {/* Mute Button */}
            <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute top-6 left-6 z-[60] text-white/50 hover:text-white transition-colors"
            >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>

            {/* Ghost Indicator (when playing) */}
            {gameState === 'playing' && hasGhost && (
                <div className="absolute top-6 left-16 z-[60] flex items-center gap-1.5 bg-white/5 border border-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <Ghost size={10} className="text-white/50" />
                    <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{ghostLabel}</span>
                </div>
            )}

            {/* ── Game Canvas ─────────────────────────────────────────── */}
            {gameState === 'playing' && (
                <>
                    <GameCanvas
                        onGameOver={handleGameOver}
                        onScoreUpdate={setScore}
                        onLevelChange={handleLevelChange}
                        onComboUpdate={setCombo}
                        onItemCollect={handleItemCollect}
                        gameAudio={gameAudio}
                        ghostData={ghostDataRef.current}
                    />

                    {/* Item HUD */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 pointer-events-none">
                        {hasShield && (
                            <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                                <span className="text-red-400 text-sm">♥</span>
                                <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">SHIELD</span>
                            </div>
                        )}
                        {phantomSecs > 0 && (
                            <div className="flex items-center gap-1 bg-violet-500/20 border border-violet-500/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                                <span className="text-violet-400 text-sm">◈</span>
                                <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest">PHANTOM {phantomSecs}s</span>
                            </div>
                        )}
                        {boostSecs > 0 && (
                            <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                                <span className="text-amber-400 text-sm">✦</span>
                                <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest">×2 BOOST {boostSecs}s</span>
                            </div>
                        )}
                    </div>

                    {/* HUD: Score */}
                    <div className="absolute top-16 right-6 z-50 pointer-events-none text-right">
                        <div className="text-4xl font-mono font-black tracking-tighter text-fuchsia-400 drop-shadow-[0_0_20px_rgba(192,38,211,0.6)]">
                            {score.toLocaleString()}
                        </div>
                        <div className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">pts</div>
                    </div>

                    {/* HUD: Combo */}
                    <AnimatePresence>
                        {combo >= 3 && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.6, opacity: 0 }}
                                className="absolute top-36 right-6 z-50 pointer-events-none text-right"
                            >
                                <div className="text-2xl font-black font-mono text-white drop-shadow-[0_0_12px_rgba(192,38,211,0.8)]">
                                    ×{combo}
                                </div>
                                <div className="text-[8px] font-mono text-fuchsia-400/70 uppercase tracking-widest">combo</div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* In-game control hint */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 opacity-25 text-[9px] font-mono uppercase tracking-[0.4em] pointer-events-none hidden md:block">
                        ↑ Jump / Double jump &nbsp;|&nbsp; ↓ Slide
                    </div>
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 opacity-25 text-[9px] font-mono uppercase tracking-[0.4em] pointer-events-none md:hidden">
                        Swipe ↑ Jump &nbsp;|&nbsp; Swipe ↓ Slide
                    </div>

                    {/* In-game Exit */}
                    <button
                        onClick={requestQuit}
                        className="absolute top-6 right-6 z-50 p-2 bg-black/50 backdrop-blur-md rounded-full text-white/50 hover:text-white hover:bg-red-500/80 transition-all border border-white/10"
                    >
                        <X size={24} />
                    </button>
                </>
            )}

            {/* ── Level Up Overlay — identical structure to Zero-G Drift ── */}
            <AnimatePresence>
                {showLevelUp && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.5, y: 20 }}
                        className="absolute inset-0 z-[110] flex items-center justify-center pointer-events-none"
                    >
                        <div className="flex flex-col items-center">
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.7 }}
                                className="text-fuchsia-400 font-mono text-[10px] md:text-xs uppercase mb-4"
                            >
                                Neon Sector Reached
                            </motion.span>
                            <h2 className="text-6xl md:text-8xl font-black italic text-white drop-shadow-[0_0_30px_rgba(192,38,211,0.6)] font-brand uppercase tracking-tighter">
                                LEVEL {currentLevel}
                            </h2>
                            <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent mt-6 shadow-[0_0_15px_rgba(192,38,211,0.8)] opacity-50"></div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Countdown — identical to Zero-G Drift ───────────────── */}
            <AnimatePresence>
                {gameState === 'countdown' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={countdown}
                                initial={{ scale: 2, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                className="flex items-center justify-center"
                            >
                                <span className="text-[12rem] font-black italic text-white font-brand drop-shadow-[0_0_30px_rgba(192,38,211,0.9)]">
                                    {countdown > 0 ? countdown : 'GO!'}
                                </span>
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Start / Game-Over Overlay ─────────────────────────────── */}
            <AnimatePresence>
                {(gameState !== 'playing' && gameState !== 'countdown') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-6 overflow-y-auto"
                    >
                        {/* Confirm Quit */}
                        {showConfirmQuit && (
                            <div className="absolute inset-0 z-20 bg-black/95 flex items-center justify-center">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-gray-900 border border-red-500/30 p-8 rounded-2xl flex flex-col items-center text-center max-w-sm"
                                >
                                    <AlertTriangle size={48} className="text-red-500 mb-4" />
                                    <h3 className="text-white text-xl font-bold mb-8 tracking-wider">게임을 종료하시겠습니까?</h3>
                                    <div className="flex gap-4 w-full">
                                        <button onClick={cancelExit} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 font-bold uppercase tracking-widest text-sm">
                                            취소
                                        </button>
                                        <button onClick={confirmExit} className="flex-1 py-3 rounded-xl bg-red-600 text-white hover:bg-red-500 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                                            <LogOut size={16} /> 종료
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        <div className="max-w-md w-full flex flex-col items-center text-center space-y-7">
                            {/* Title */}
                            <div>
                                <div className="flex items-center justify-center gap-2 mb-3">
                                    <Ghost size={18} className="text-fuchsia-400" />
                                    <Zap size={14} className="text-blue-400" />
                                </div>
                                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-400 to-blue-400 font-brand italic tracking-tighter whitespace-nowrap uppercase px-4">
                                    NEON GHOST RUN
                                </h1>
                                <p className="text-white/40 text-[10px] font-mono tracking-[0.3em] mt-2 uppercase">
                                    Outrun your own ghost. Beat the Kyle-AI.
                                </p>
                            </div>

                            {/* Ghost status */}
                            {hasGhost && gameState === 'start' && (
                                <div className="flex items-center gap-2 bg-white/5 border border-fuchsia-500/20 rounded-full px-4 py-2">
                                    <Ghost size={12} className="text-fuchsia-400/60" />
                                    <span className="text-[10px] font-mono text-fuchsia-400/60 uppercase tracking-widest">{ghostLabel} loaded</span>
                                </div>
                            )}

                            {/* Controls quick guide (start only) */}
                            {gameState === 'start' && (
                                <div className="w-full bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
                                    <h3 className="text-white/40 font-mono text-[9px] uppercase tracking-widest mb-3 border-b border-white/10 pb-2">How to Play</h3>
                                    <div className="grid grid-cols-3 gap-2 text-left">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-8 h-8 rounded-lg border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400 text-base">↑</div>
                                            <div className="text-[8px] text-fuchsia-300 font-mono uppercase text-center">Jump</div>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-8 h-8 rounded-lg border border-purple-500/40 flex items-center justify-center text-purple-400 text-base">↑↑</div>
                                            <div className="text-[8px] text-purple-300 font-mono uppercase text-center">D-Jump</div>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-8 h-8 rounded-lg border border-blue-500/40 flex items-center justify-center text-blue-400 text-base">↓</div>
                                            <div className="text-[8px] text-blue-300 font-mono uppercase text-center">Slide</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 border-t border-white/10 pt-3 grid grid-cols-3 gap-2">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-red-400 text-base">♥</span>
                                            <div className="text-[7px] text-red-300 font-mono uppercase text-center">Shield</div>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-violet-400 text-base">◈</span>
                                            <div className="text-[7px] text-violet-300 font-mono uppercase text-center">Phantom</div>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-amber-400 text-base">✦</span>
                                            <div className="text-[7px] text-amber-300 font-mono uppercase text-center">×2 Boost</div>
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-white/20 font-mono text-center mt-3 uppercase tracking-widest">
                                        Mobile: Left tap=Slide · Right tap=Jump
                                    </p>
                                </div>
                            )}

                            {/* Score (gameover) */}
                            {gameState === 'gameover' && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="space-y-1 py-2"
                                >
                                    <div className="text-5xl font-mono font-black text-fuchsia-400 drop-shadow-[0_0_20px_rgba(192,38,211,0.5)]">
                                        {score.toLocaleString()} <span className="text-2xl text-white/40">pts</span>
                                    </div>
                                    {maxCombo > 0 && (
                                        <div className="text-sm font-mono text-white/40">
                                            Best Combo <span className="text-fuchsia-400 font-bold">×{maxCombo}</span>
                                        </div>
                                    )}
                                    {hasGhost && (
                                        <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mt-1">
                                            {score > 0 ? '👻 ghost updated — next run will be harder' : ''}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Buttons */}
                            <div className="flex flex-col gap-3 w-full max-w-xs">
                                <button
                                    onClick={initiateGame}
                                    className="group relative px-8 py-4 bg-white text-black font-bold uppercase tracking-widest text-sm rounded-full overflow-hidden hover:scale-105 transition-transform w-full"
                                >
                                    <div className="absolute inset-0 bg-fuchsia-400 mix-blend-multiply opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative flex items-center justify-center gap-2 font-mono">
                                        {gameState === 'start' ? <Play size={18} /> : <RotateCcw size={18} />}
                                        <span>{gameState === 'start' ? '게임 시작' : '재도전'}</span>
                                    </div>
                                </button>
                                <button
                                    onClick={handleExitClick}
                                    className="px-8 py-4 bg-transparent border border-white/20 text-white/50 font-bold uppercase tracking-widest text-sm rounded-full hover:bg-white/10 hover:text-white transition-all w-full flex items-center justify-center gap-2 font-mono"
                                >
                                    <LogOut size={14} /> 게임 종료
                                </button>
                            </div>

                            {/* Leaderboard */}
                            <div className="w-full pt-6 border-t border-white/10">
                                <NeonGhostLeaderboard
                                    currentUserScore={gameState === 'gameover' ? { uid: user?.uid, score } : null}
                                />
                            </div>

                            {!user && (
                                <p className="text-[10px] text-gray-400 font-mono">
                                    * 랭킹에 등록하려면 로그인이 필요합니다.
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NeonGhostRun;
