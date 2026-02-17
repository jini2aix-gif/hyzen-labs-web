import React, { useState, useEffect } from 'react';
import { X, User, Edit2, Trash2, Save, Loader2, MessageSquare } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, limit, getCountFromServer } from 'firebase/firestore';
import { db, auth, appId } from '../../hooks/useFirebase';
import { motion, AnimatePresence } from 'framer-motion';

const MyPageModal = ({ isOpen, onClose, user, onEditPost }) => {
    const [nickname, setNickname] = useState('');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [myPosts, setMyPosts] = useState([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [gameStats, setGameStats] = useState({ score: 0, rank: '-' });

    useEffect(() => {
        if (isOpen && user) {
            setNickname(user.displayName || '');
            fetchMyPosts();
            fetchGameStats();
        }
    }, [isOpen, user]);

    const fetchGameStats = async () => {
        if (!user || !db || !appId) return;
        try {
            const scoresRef = collection(db, 'artifacts', appId, 'public', 'data', 'games', 'zero-g-drift', 'scores');

            // 1. Get All My Scores (Works w/ default indexing)
            const qUser = query(scoresRef, where('uid', '==', user.uid));
            const userSnapshot = await getDocs(qUser);

            if (!userSnapshot.empty) {
                // Find Max Score in JS to avoid composite index requirement
                const scores = userSnapshot.docs.map(d => d.data().score);
                const bestScore = Math.max(...scores);

                // 2. Get Rank (Default index on 'score' is enough for single-field range)
                const qRank = query(scoresRef, where('score', '>', bestScore));
                const rankSnapshot = await getCountFromServer(qRank);
                const rank = rankSnapshot.data().count + 1;

                setGameStats({ score: bestScore, rank });
            } else {
                setGameStats({ score: 0, rank: '-' });
            }
        } catch (error) {
            console.error("Error fetching game stats:", error);
        }
    };

    const fetchMyPosts = async () => {
        if (!user) return;
        setIsLoadingPosts(true);
        try {
            const q = query(
                collection(db, 'artifacts', appId, 'public', 'data', 'messages'),
                where('uid', '==', user.uid),
                // Note: Compound queries might require an index. 
                // If this fails, we might need to create an index in Firebase Console 
                // or remove orderBy and sort client-side.
                // Let's try client-side sorting to avoid index creation delay issues for now.
                // orderBy('createdAt', 'desc') 
            );

            const querySnapshot = await getDocs(q);
            const posts = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side sort
            posts.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });

            setMyPosts(posts);
        } catch (error) {
            console.error("Error fetching my posts:", error);
        } finally {
            setIsLoadingPosts(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (!nickname.trim() || nickname === user.displayName) return;

        setIsUpdatingProfile(true);
        try {
            await updateProfile(user, { displayName: nickname });
            // Force reload or state update if needed, but Firebase auth listener should catch it
            // However, useFirebase might not auto-trigger a re-render dependent on user object deep change immediately
            // But usually it does. Let's assume it works, or we might need a global context update.
            // Actually, updateProfile updates the object in place often, but let's see.
        } catch (error) {
            console.error("Profile update error:", error);
            alert("Failed to update profile.");
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleDeletePost = async (postId) => {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', postId));
            setMyPosts(prev => prev.filter(p => p.id !== postId));
            setDeleteId(null);
        } catch (error) {
            console.error("Delete error:", error);
            alert("Failed to delete post.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-md p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold font-brand tracking-tight">My Page</h2>
                        <p className="text-[10px] text-gray-400 font-tech tracking-widest uppercase">Simulation Records & Transmissions</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-black">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {/* Section 1: Profile */}
                    <section className="mb-10">
                        <h3 className="text-xs font-bold font-tech uppercase text-gray-400 mb-4 tracking-wider">Operational Identity</h3>
                        <form onSubmit={handleUpdateProfile} className="flex gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-xs font-bold text-gray-600 ml-1">Display Name</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black/20 focus:bg-white outline-none transition-all font-brand font-medium text-gray-800"
                                        placeholder="Enter new nickname"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isUpdatingProfile || nickname === user?.displayName}
                                className="h-11 px-6 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shrink-0"
                            >
                                {isUpdatingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                <span>Update</span>
                            </button>
                        </form>
                    </section>

                    {/* Section 2: Game Stats */}
                    <section className="mb-10">
                        <h3 className="text-xs font-bold font-tech uppercase text-gray-400 mb-4 tracking-wider">Simulation Record</h3>
                        <div className="bg-black rounded-2xl p-5 text-white relative overflow-hidden group">
                            {/* BG Effect */}
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1080')] bg-cover bg-center opacity-40 mix-blend-overlay transition-transform duration-700 group-hover:scale-110"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>

                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <h4 className="font-brand italic font-extrabold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-1">ZERO-G DRIFT</h4>
                                    <p className="text-[10px] font-mono text-cyan-300 tracking-widest uppercase">Best Survival Time</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-mono font-bold leading-none mb-1">
                                        {gameStats.score > 0 ? gameStats.score.toFixed(2) : '--'}
                                        <span className="text-sm text-gray-500 ml-1">s</span>
                                    </div>
                                    <div className="text-xs font-tech text-gray-400 uppercase tracking-wider">
                                        Global Rank: <span className="text-white font-bold">{gameStats.rank !== '-' ? `#${gameStats.rank}` : 'Unranked'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Posts */}
                    <section>
                        <h3 className="text-xs font-bold font-tech uppercase text-gray-400 mb-4 tracking-wider flex justify-between items-center">
                            <span>Transmission Log</span>
                            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px]">{myPosts.length} Records</span>
                        </h3>

                        <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden min-h-[200px]">
                            {isLoadingPosts ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
                                    <Loader2 size={24} className="animate-spin" />
                                    <span className="text-xs font-tech uppercase">Retrieving Data...</span>
                                </div>
                            ) : myPosts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
                                    <MessageSquare size={24} className="opacity-20" />
                                    <span className="text-xs font-tech uppercase">No transmissions found</span>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {myPosts.map(post => (
                                        <div key={post.id} className="p-4 hover:bg-white transition-colors group flex gap-4">
                                            {/* Image Thumbnail */}
                                            <div className="w-16 h-16 rounded-lg bg-gray-200 shrink-0 overflow-hidden border border-gray-200">
                                                {post.image ? (
                                                    <img src={post.image} alt="Thumbnail" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <MessageSquare size={16} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 py-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[10px] font-tech text-gray-400 uppercase">{post.date}</span>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => onEditPost(post)}
                                                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteId(post.id)}
                                                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-700 font-brand line-clamp-2 leading-relaxed">
                                                    {post.text}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Footer/Status */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                    <span className="text-[10px] text-gray-400 font-tech uppercase tracking-widest">
                        Logged in as {user.email}
                    </span>
                </div>
            </motion.div>

            {/* Delete Confirmation Overlay */}
            <AnimatePresence>
                {deleteId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
                        onClick={() => setDeleteId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <h4 className="text-lg font-bold mb-2 font-brand">Cofirm Deletion</h4>
                            <p className="text-sm text-gray-600 mb-6 font-brand">Are you sure you want to delete this transmission? This action cannot be undone.</p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold uppercase bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeletePost(deleteId)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold uppercase bg-red-600 text-white hover:bg-red-700 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MyPageModal;
