// Last Updated: 2026-02-18 20:35 (Force Build v4.9.1)
import React, { useState, useEffect } from 'react';
import { X, Play, RotateCcw, LogOut, Heart, Volume2, VolumeX } from 'lucide-react';
import { doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../../../hooks/useFirebase';
import GameCanvas from './GameCanvas';
import Leaderboard from './Leaderboard';
import { motion, AnimatePresence } from 'framer-motion';
import { gameAudio } from '../../../utils/gameAudio';

const ZeroGDrift = ({ isOpen, onClose, user }) => {
    const [gameState, setGameState] = useState('start'); // start, playing, gameover
    const [score, setScore] = useState(0);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [showConfirmQuit, setShowConfirmQuit] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Life System States
    const [lives, setLives] = useState(2);
    const [heartBits, setHeartBits] = useState(0);

    // Initialize & Manage Audio
    useEffect(() => {
        if (isOpen) {
            gameAudio.setMute(isMuted);
            // Start BGM if not muted
            if (!isMuted) {
                gameAudio.playBGM();
            }
        } else {
            gameAudio.stopBGM();
        }
    }, [isOpen]);

    useEffect(() => {
        gameAudio.setMute(isMuted);
        if (!isMuted && isOpen) {
            gameAudio.playBGM();
        } else {
            gameAudio.stopBGM();
        }
    }, [isMuted, isOpen]);

    // Reset game when modal opens
    useEffect(() => {
        if (isOpen) {
            setGameState('start');
            setScore(0);
            setLives(2);
            setHeartBits(0);
            setShowConfirmQuit(false);
            // Lock Scroll
            document.body.style.overflow = 'hidden';
        } else {
            // Unlock Scroll
            document.body.style.overflow = 'unset';
            gameAudio.stopBGM();
        }
        return () => {
            document.body.style.overflow = 'unset';
            gameAudio.stopBGM();
        }
    }, [isOpen]);

    const toggleMute = () => {
        setIsMuted(!isMuted);
        gameAudio.playSFX('click');
    };

    const handleGameOver = async (finalScore) => {
        setScore(finalScore);
        setGameState('gameover');
        gameAudio.playSFX('crash');

        if (user && db && appId) {
            try {
                // Use addDoc to create a NEW record every time (Permanent History)
                const scoresCollection = collection(db, 'artifacts', appId, 'public', 'data', 'games', 'zero-g-drift', 'scores');
                await addDoc(scoresCollection, {
                    uid: user.uid,
                    displayName: user.displayName || 'Anonymous',
                    photoURL: user.photoURL,
                    score: finalScore,
                    timestamp: serverTimestamp()
                });
            } catch (e) {
                console.error("Score Save Error", e);
            }
        }
    };

    // Life Management
    const handleCollision = (currentScore) => {
        setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
                handleGameOver(currentScore);
                return 0;
            }
            return newLives;
        });
        return lives - 1 <= 0; // returns true if game over
    };

    const handleHeartCollect = () => {
        setHeartBits(prev => {
            const newBits = prev + 1;
            if (newBits >= 5) {
                setLives(l => l + 1);
                gameAudio.playSFX('collect'); // Extra feedback for life up
                return 0;
            }
            return newBits;
        });
    };

    const startGame = () => {
        gameAudio.playSFX('click');
        setGameState('start'); // Keep in start UI during countdown
        setCountdown(3);

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setGameState('playing');
                    setCountdown(null);
                    setScore(0);
                    setLives(2);
                    setHeartBits(0);
                    setCurrentLevel(1);
                    // Initial Level Announcement
                    setShowLevelUp(true);
                    setTimeout(() => setShowLevelUp(false), 2000);
                    return null;
                }
                gameAudio.playSFX('click');
                return prev - 1;
            });
        }, 1000);
    };

    const requestQuit = () => {
        gameAudio.playSFX('click');
        setGameState('start');
        setScore(0);
    };

    // Quit from Menu
    const handleExitClick = () => {
        gameAudio.playSFX('click');
        setShowConfirmQuit(true);
    };

    const confirmExit = () => {
        gameAudio.playSFX('click');
        gameAudio.stopBGM();
        setShowConfirmQuit(false);
        onClose(); // Actual Exit
    };

    const cancelExit = () => {
        gameAudio.playSFX('click');
        setShowConfirmQuit(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden touch-none font-sans">

            {/* Audio Toggle (Global) */}
            <button
                onClick={toggleMute}
                className="absolute top-6 left-6 z-[60] text-white/50 hover:text-white transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
            >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>

            {/* Game Canvas - Only active when playing */}
            {gameState === 'playing' && (
                <>
                    <GameCanvas
                        onGameOver={handleGameOver}
                        onCollision={handleCollision}
                        onHeartCollect={handleHeartCollect}
                        onScoreUpdate={(s) => setScore(s)}
                        gameAudio={gameAudio}
                        onLevelChange={(lvl) => {
                            setCurrentLevel(lvl);
                            setShowLevelUp(true);
                            setTimeout(() => setShowLevelUp(false), 2000);
                            gameAudio.playSFX('collect');
                        }}
                    />

                    {/* In-Game HUD (Lives) */}
                    <div className="absolute top-6 left-16 z-50 flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            {Array.from({ length: lives }).map((_, i) => (
                                <motion.div
                                    key={`heart-${i}`}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                >
                                    <Heart size={20} fill="currentColor" />
                                </motion.div>
                            ))}
                            {heartBits > 0 && (
                                <div className="ml-2 flex gap-1">
                                    {Array.from({ length: heartBits }).map((_, i) => (
                                        <div key={`bit-${i}`} className="w-1.5 h-1.5 rounded-full bg-red-400/50" />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* In-Game Exit Button */}
                    <button
                        onClick={requestQuit}
                        className="absolute top-6 right-6 z-50 p-2 bg-black/50 backdrop-blur-md rounded-full text-white/50 hover:text-white hover:bg-red-500/80 transition-all border border-white/10"
                        title="Quit to Menu"
                    >
                        <X size={24} />
                    </button>

                    {/* Instructions Removed */}
                    {/* Level Announcement Overlay */}
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
                                        initial={{ tracking: "1em", opacity: 0 }}
                                        animate={{ tracking: "0.5em", opacity: 0.7 }}
                                        className="text-cyan-400 font-mono text-[10px] md:text-xs uppercase mb-4"
                                    >
                                        Orbital Sector Reached
                                    </motion.span>
                                    <h2 className="text-6xl md:text-8xl font-black italic text-white drop-shadow-[0_0_30px_rgba(6,182,212,0.5)] font-brand uppercase tracking-tighter">
                                        LEVEL {currentLevel}
                                    </h2>
                                    <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mt-6 shadow-[0_0_15px_rgba(6,182,212,0.8)] opacity-50"></div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}

            {/* UI Overlay */}
            <AnimatePresence>
                {gameState !== 'playing' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-6 ${countdown !== null ? 'bg-black/40 backdrop-blur-[2px]' : 'bg-black/90 backdrop-blur-sm'}`}
                    >
                        {/* Confirmation Overlay */}
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
                                        <button
                                            onClick={cancelExit}
                                            className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 font-bold uppercase tracking-widest text-sm"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={confirmExit}
                                            className="flex-1 py-3 rounded-xl bg-red-600 text-white hover:bg-red-500 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                                        >
                                            <LogOut size={16} /> 종료
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        {countdown !== null ? (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={countdown}
                                    initial={{ scale: 2, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    className="flex items-center justify-center"
                                >
                                    <span className="text-[12rem] font-black italic text-white font-brand drop-shadow-[0_0_30px_rgba(6,182,212,0.8)]">
                                        {countdown}
                                    </span>
                                </motion.div>
                            </AnimatePresence>
                        ) : (
                            <div className="max-w-md w-full flex flex-col items-center text-center space-y-8">
                                {/* Logo / Title */}
                                <div>
                                    <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 font-brand italic tracking-tighter whitespace-nowrap">
                                        ZERO-G DRIFT
                                    </h1>
                                    <div className="text-[10px] text-cyan-400/50 font-mono mt-1 uppercase tracking-[0.3em]">
                                        v4.9.0 - Life System Active
                                    </div>
                                </div>

                                {/* Item Guide (Start Screen Only) */}
                                {gameState === 'start' && (
                                    <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                                        <h3 className="text-white/70 font-mono text-xs uppercase tracking-widest mb-3 border-b border-white/10 pb-2">아이템 설명</h3>
                                        <div className="grid grid-cols-3 gap-2 text-left">
                                            <div className="flex flex-col items-center text-center gap-1">
                                                <div className="w-6 h-6 rounded-full border border-[#4ade80] flex items-center justify-center shadow-[0_0_5px_#4ade80]">
                                                    <div className="w-2.5 h-2.5 bg-[#4ade80] rounded-[1px]"></div>
                                                </div>
                                                <div className="text-[#4ade80] font-bold text-[10px] font-mono">TIME +5</div>
                                            </div>
                                            <div className="flex flex-col items-center text-center gap-1">
                                                <div className="w-6 h-6 rounded-full border border-[#60a5fa] border-dashed flex items-center justify-center shadow-[0_0_5px_#60a5fa]">
                                                    <div className="w-2.5 h-2.5 bg-[#60a5fa] rotate-45"></div>
                                                </div>
                                                <div className="text-[#60a5fa] font-bold text-[10px] font-mono">PAUSE</div>
                                            </div>
                                            <div className="flex flex-col items-center text-center gap-1">
                                                <div className="w-6 h-6 flex items-center justify-center">
                                                    <Heart size={14} fill="#ff4d4d" className="text-[#ff4d4d] drop-shadow-[0_0_5px_#ff4d4d]" />
                                                </div>
                                                <div className="text-[#ff4d4d] font-bold text-[10px] font-mono leading-tight">LIFE UP<br />(5 PIECES)</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Score Display (Game Over) */}
                                {gameState === 'gameover' && (
                                    <div className="text-white animate-bounce-short">
                                        <span className="text-5xl font-mono font-bold text-white">{score.toFixed(2)}초</span>
                                    </div>
                                )}

                                {/* Main Action Buttons */}
                                <div className="flex flex-col gap-3 w-full max-w-xs">
                                    <button
                                        onClick={startGame}
                                        className="group relative px-8 py-4 bg-white text-black font-bold uppercase tracking-widest text-sm rounded-full overflow-hidden hover:scale-105 transition-transform w-full"
                                    >
                                        <div className="absolute inset-0 bg-cyan-400 mix-blend-multiply opacity-0 group-hover:opacity-100 transition-opacity" />
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

                                {/* Leaderboard Section */}
                                <div className="w-full pt-8 border-t border-white/10">
                                    <Leaderboard currentUserScore={gameState === 'gameover' ? { uid: user?.uid, score } : null} />
                                </div>

                                {!user && (
                                    <p className="text-[10px] text-gray-500 font-mono uppercase">
                                        * 기록을 저장하려면 로그인이 필요합니다.
                                    </p>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ZeroGDrift;
