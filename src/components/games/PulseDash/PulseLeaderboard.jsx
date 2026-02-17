import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../../hooks/useFirebase';
import { Trophy, User, Zap } from 'lucide-react';

const PulseLeaderboard = ({ currentUserScore }) => {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const gameId = 'pulse-dash';

    useEffect(() => {
        if (!db || !appId) return;

        const q = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'games', gameId, 'scores'),
            orderBy('score', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setScores(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="w-full max-w-md bg-black/80 backdrop-blur-md border border-indigo-500/30 rounded-3xl p-6 text-white overflow-hidden relative">
            {/* Indigo Neon Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.8)]"></div>

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-indigo-400">
                    <Trophy size={20} />
                    <h3 className="font-tech uppercase tracking-[0.2em] text-xs font-bold italic">Top Dashers</h3>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                    <Zap size={10} className="text-indigo-400" />
                    <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-widest">Points System</span>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8 text-indigo-300/30 font-tech text-[10px] animate-pulse uppercase tracking-widest">
                    SYNCING PULSE DATA...
                </div>
            ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent pr-2">
                    {scores.length === 0 ? (
                        <div className="text-center py-8 text-white/30 font-tech text-xs">
                            기록이 없습니다. 첫 주자가 되어보세요!
                        </div>
                    ) : (
                        scores.map((entry, index) => {
                            const isMe = entry.uid === currentUserScore?.uid;
                            return (
                                <div
                                    key={entry.id}
                                    className={`flex items-center justify-between p-3 rounded-xl transition-all ${isMe ? 'bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-white/5 border-white/5'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`font-tech text-xs w-5 italic ${index < 3 ? 'text-indigo-400' : 'text-gray-500'}`}>
                                            #{index + 1}
                                        </span>
                                        {entry.photoURL ? (
                                            <img src={entry.photoURL} alt="User" className="w-7 h-7 rounded-full border border-indigo-500/20 object-cover" />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                                <User size={14} className="text-indigo-400/50" />
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className={`font-brand text-xs font-bold uppercase tracking-tighter ${isMe ? 'text-indigo-100' : 'text-white/80'}`}>
                                                {entry.displayName || 'PILOT'}
                                            </span>
                                            {isMe && <span className="text-[8px] text-indigo-400 font-tech tracking-widest">CURRENT SCORE</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`font-mono font-black italic tracking-tighter text-lg ${isMe ? 'text-white' : 'text-indigo-400'}`}>
                                            {entry.score.toLocaleString()}
                                        </span>
                                        <span className="text-[10px] font-tech text-indigo-300/50 uppercase">PTS</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default PulseLeaderboard;
