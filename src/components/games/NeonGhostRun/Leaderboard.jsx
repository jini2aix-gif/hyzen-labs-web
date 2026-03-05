import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../../hooks/useFirebase';
import { Trophy, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const MEDALS = ['🥇', '🥈', '🥉'];

const NeonGhostLeaderboard = ({ currentUserScore }) => {
    const [ranks, setRanks] = useState([]);

    useEffect(() => {
        if (!db || !appId) return;
        const ref = collection(db, 'artifacts', appId, 'public', 'data', 'games', 'neon-ghost-run', 'scores');
        const q = query(ref, orderBy('score', 'desc'), limit(5));
        const unsub = onSnapshot(q, (snap) => {
            setRanks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    return (
        <div className="w-full">
            <div className="flex items-center gap-2 mb-3">
                <Trophy size={12} className="text-fuchsia-400" />
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">Top Runners</span>
            </div>
            {ranks.length === 0 ? (
                <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest text-center py-4">
                    No records yet — be the first!
                </p>
            ) : (
                <div className="flex flex-col gap-1.5">
                    {ranks.map((r, i) => {
                        const isCurrentUser = currentUserScore && r.uid === currentUserScore.uid;
                        const isNewBest = isCurrentUser && currentUserScore.score >= r.score;
                        return (
                            <motion.div
                                key={r.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${isCurrentUser
                                    ? 'bg-fuchsia-500/10 border-fuchsia-500/40'
                                    : 'bg-white/[0.03] border-white/[0.06]'
                                    }`}
                            >
                                <span className="text-sm w-5 text-center">{MEDALS[i] || `${i + 1}`}</span>
                                {r.photoURL ? (
                                    <img src={r.photoURL} className="w-6 h-6 rounded-full object-cover" alt="" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-fuchsia-500/20 flex items-center justify-center">
                                        <Zap size={10} className="text-fuchsia-400" />
                                    </div>
                                )}
                                <span className="flex-1 text-xs font-mono text-white/70 truncate">
                                    {r.displayName || 'Ghost'}
                                </span>
                                <div className="text-right">
                                    <div className="text-xs font-mono font-bold text-fuchsia-400">
                                        {r.score.toLocaleString()} <span className="text-[9px] text-white/30">pts</span>
                                    </div>
                                    {r.maxCombo > 0 && (
                                        <div className="text-[9px] font-mono text-white/30">
                                            ×{r.maxCombo} combo
                                        </div>
                                    )}
                                </div>
                                {isNewBest && (
                                    <span className="text-[8px] font-mono text-fuchsia-400 uppercase tracking-widest animate-pulse">NEW</span>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NeonGhostLeaderboard;
