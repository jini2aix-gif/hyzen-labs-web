import React, { useState, useEffect, useRef } from 'react';
import { X, Play, RotateCcw, LogOut, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../../../hooks/useFirebase';
import GameCanvas from './GameCanvas';
import PulsePointLeaderboard from './PulseLeaderboard';
import { motion, AnimatePresence } from 'framer-motion';
import { gameAudio } from '../../../utils/gameAudio';

const PulseDash = ({ isOpen, onClose, user }) => {
    const [gameState, setGameState] = useState('start'); // start, countdown, playing, gameover
    const [score, setScore] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const canvasRef = useRef(null);
    const [countdown, setCountdown] = useState(3);
    const [showConfirmQuit, setShowConfirmQuit] = useState(false);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [showLevelUp, setShowLevelUp] = useState(false);

    // Audio Sync
    useEffect(() => {
        if (isOpen && !isMuted) {
            gameAudio.setMute(false);
        } else {
            gameAudio.stopBGM();
        }
    }, [isOpen, isMuted]);

    // Countdown Logic
    useEffect(() => {
        let timer;
        if (gameState === 'countdown' && countdown > 0) {
            timer = setTimeout(() => {
                setCountdown(prev => prev - 1);
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

    const initiateGame = () => {
        gameAudio.playSFX('click');
        setGameState('countdown');
        setCountdown(3);
        setScore(0);
    };

    const handleGameOver = async (finalScore) => {
        setGameState('gameover');
        setScore(finalScore);
        gameAudio.playSFX('crash');
        gameAudio.stopBGM();

        if (user && db && appId) {
            try {
                const scoresCollection = collection(db, 'artifacts', appId, 'public', 'data', 'games', 'pulse-dash', 'scores');
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

    const requestQuit = () => {
        gameAudio.playSFX('click');
        setGameState('start');
        setScore(0);
    };

    const handleExitClick = () => {
        gameAudio.playSFX('click');
        setShowConfirmQuit(true);
    };

    const confirmExit = () => {
        gameAudio.playSFX('click');
        gameAudio.stopBGM();
        setShowConfirmQuit(false);
        onClose();
    };

    const cancelExit = () => {
        gameAudio.playSFX('click');
        setShowConfirmQuit(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden touch-none font-sans select-none text-white">

            {/* Audio Toggle */}
            <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute top-6 left-6 z-[60] text-white/50 hover:text-white transition-colors"
            >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>

            {/* Game Area */}
            {gameState === 'playing' && (
                <>
                    <GameCanvas
                        ref={canvasRef}
                        onGameOver={handleGameOver}
                        onScoreUpdate={setScore}
                        onLevelChange={(lvl) => {
                            setCurrentLevel(lvl);
                            setShowLevelUp(true);
                            setTimeout(() => setShowLevelUp(false), 2000);
                            gameAudio.playSFX('collect'); // Use collect sound for level up
                        }}
                        gameAudio={gameAudio}
                    />

                    {/* HUD Overlay */}
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                        <div className="text-6xl font-mono font-black tracking-tighter text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                            {score}
                        </div>
                    </div>

                    {/* In-Game Exit Button */}
                    <button
                        onClick={requestQuit}
                        className="absolute top-6 right-6 z-50 p-2 bg-black/50 backdrop-blur-md rounded-full text-white/50 hover:text-white hover:bg-red-500/80 transition-all border border-white/10"
                    >
                        <X size={24} />
                    </button>

                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 opacity-30 text-[10px] font-mono uppercase tracking-[0.4em] pointer-events-none">
                        Drag to move
                    </div>
                </>
            )}

            {/* Level Announcement Overlay */}
            <AnimatePresence>
                {showLevelUp && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2, y: -30 }}
                        className="absolute inset-0 z-[110] flex flex-col items-center justify-center pointer-events-none"
                    >
                        <div className="flex flex-col items-center py-10 px-20 bg-black/20 backdrop-blur-[2px] rounded-[4rem]">
                            <span className="text-cyan-400 font-tech text-[10px] md:text-xs tracking-[0.5em] uppercase mb-4 opacity-70">Sector Transition</span>
                            <h2 className="text-5xl md:text-8xl font-black italic text-white drop-shadow-[0_0_30px_rgba(34,211,238,0.5)] font-brand uppercase tracking-tighter">
                                LEVEL {currentLevel}
                            </h2>
                            <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mt-6"></div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Countdown Overlay */}
            <AnimatePresence>
                {gameState === 'countdown' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 2 }}
                        className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    >
                        <div className="text-[160px] font-black italic text-cyan-400 drop-shadow-[0_0_50px_rgba(34,211,238,0.8)] font-sans">
                            {countdown > 0 ? countdown : "GO!"}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* UI Overlay */}
            <AnimatePresence>
                {(gameState !== 'playing' && gameState !== 'countdown') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-6"
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

                        <div className="max-w-md w-full flex flex-col items-center text-center space-y-8">

                            {/* Title */}
                            <div>
                                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 font-brand italic tracking-tighter whitespace-nowrap uppercase px-4">
                                    PULSE DASH
                                </h1>
                                <p className="text-white/50 text-xs font-mono tracking-[0.3em] mt-2 uppercase">
                                    초고속 터널을 질주하세요
                                </p>
                            </div>

                            {/* Score Display */}
                            {gameState === 'gameover' && (
                                <div className="text-white">
                                    <div className="text-5xl font-mono font-bold text-cyan-400 mb-2">{score} pts</div>
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex flex-col gap-3 w-full max-w-xs">
                                <button
                                    onClick={initiateGame}
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
                                <PulsePointLeaderboard
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

export default PulseDash;
