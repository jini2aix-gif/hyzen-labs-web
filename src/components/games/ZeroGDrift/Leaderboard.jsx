import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../../hooks/useFirebase';
import { Trophy, User } from 'lucide-react';

const Leaderboard = ({ currentUserScore, gameId = 'zero-g-drift' }) => {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);

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
    }, [gameId]); // Add gameId to dependency array

    return (
        <div className="w-full max-w-md bg-black/80 backdrop-blur-md border border-white/10 rounded-3xl p-6 text-white overflow-hidden relative">
            {/* Neon Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.8)]"></div>

            <div className="flex items-center gap-2 mb-6 text-cyan-400">
                <Trophy size={20} />
                <h3 className="font-tech uppercase tracking-[0.2em] text-sm font-bold">명예의 전당</h3>
            </div>

            {loading ? (
                <div className="text-center py-8 text-white/30 font-tech text-xs animate-pulse">
                    데이터 동기화 중...
                </div>
            ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent pr-2">
                    {scores.length === 0 ? (
                        <div className="text-center py-8 text-white/30 font-tech text-xs">
                            기록이 없습니다. 첫 번째 주인공이 되어보세요.
                        </div>
                    ) : (
                        scores.map((entry, index) => (
                            <div
                                key={entry.id}
                                className={`flex items-center justify-between p-3 rounded-xl border shrink-0 ${entry.id === currentUserScore?.uid ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-white/5 border-white/5'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`font-tech text-sm w-4 ${index < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>
                                        {index + 1}
                                    </span>
                                    {entry.photoURL ? (
                                        <img src={entry.photoURL} alt="User" className="w-6 h-6 rounded-full border border-white/10" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                                            <User size={12} className="text-white/50" />
                                        </div>
                                    )}
                                    <span className="font-brand text-sm font-bold truncate max-w-[120px]">
                                        {entry.displayName || 'Pilot'}
                                    </span>
                                </div>
                                <span className="font-mono text-cyan-300 font-bold tracking-wider">
                                    {entry.score.toFixed(2)}초
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
