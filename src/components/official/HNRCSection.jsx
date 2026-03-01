import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, MapPin, Calendar, Clock, Trophy, MessageSquare, ChevronRight, PenTool, Trash2, Edit2, Plus, X, ChevronLeft, User, Zap, Heart, MessageCircle, CornerDownRight, Send, Loader2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { db, appId } from '../../hooks/useFirebase';
import HNRCRecordModal from '../modals/HNRCRecordModal';
import HNRCHeroCanvas from './HNRCHeroCanvas';

const HNRCSection = ({ user, profile, onModalChange }) => {
    const [posts, setPosts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [selectedPost, setSelectedPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [replyTo, setReplyTo] = useState(null); // { id, author }
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const postsPerPage = 10;

    useEffect(() => {
        if (onModalChange) onModalChange(isModalOpen || !!selectedPost);
    }, [isModalOpen, selectedPost, onModalChange]);

    // 1. Firebase 실시간 리스너 연결
    useEffect(() => {
        if (!db || !appId) return;

        const q = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'hnrc_posts'),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate() || new Date()
            }));
            setPosts(fetchedPosts);
        });

        return () => unsubscribe();
    }, [db, appId]);

    // 2. 새로운 기록 업로드 및 수정 핸들러
    const handleAddRecord = async (recordData) => {
        if (!db || !appId) return;

        try {
            if (recordData.id) {
                // 수정 모드
                const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'hnrc_posts', recordData.id);
                await updateDoc(postRef, {
                    ...recordData,
                    updatedAt: serverTimestamp()
                });
            } else {
                // 새 기록 생성 모드
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'hnrc_posts'), {
                    ...recordData,
                    author: profile?.displayName || user?.displayName || 'Guest',
                    authorId: user.uid,
                    authorPhoto: profile?.photoURL || user?.photoURL || null,
                    timestamp: serverTimestamp(),
                    likes: []
                });
            }
        } catch (error) {
            console.error("Error saving post:", error);
            alert("기록 저장 중 오류가 발생했습니다.");
        }
        setEditingRecord(null);
    };

    const handleDeleteRecord = async (e, id) => {
        e.stopPropagation();
        if (!db || !appId) return;
        if (window.confirm("정말 이 기록을 삭제하시겠습니까?\n(누적 거리에서 차감됩니다)")) {
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'hnrc_posts', id));
            } catch (error) {
                console.error("Error deleting post:", error);
            }
        }
    };

    const handleEditClick = (e, post) => {
        e.stopPropagation();
        setEditingRecord(post);
        setIsModalOpen(true);
    };

    // --- Likes & Comments Logic ---
    const handleToggleLike = async (e, post) => {
        e.stopPropagation();
        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }
        if (!db || !appId) return;

        const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'hnrc_posts', post.id);
        const currentLikes = post.likes || [];
        const newLikes = currentLikes.includes(user.uid)
            ? currentLikes.filter(id => id !== user.uid)
            : [...currentLikes, user.uid];

        try {
            await updateDoc(postRef, { likes: newLikes });
        } catch (error) {
            console.error("Error updating likes:", error);
        }
    };

    // Fetch comments for selected post
    useEffect(() => {
        if (!selectedPost || !db || !appId) {
            setComments([]);
            return;
        }

        const q = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'hnrc_posts', selectedPost.id, 'comments'),
            orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate() || new Date()
            }));
            setComments(fetchedComments);
        });

        return () => unsubscribe();
    }, [selectedPost, db, appId]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }
        if (!newComment.trim() || !selectedPost) return;

        setIsSubmittingComment(true);
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'hnrc_posts', selectedPost.id, 'comments'), {
                author: profile?.displayName || user.displayName || 'Guest',
                authorId: user.uid,
                authorPhoto: profile?.photoURL || user.photoURL || null,
                text: newComment,
                parentId: replyTo?.id || null, // For nested comments
                replyToAuthor: replyTo?.author || null,
                timestamp: serverTimestamp()
            });

            // Update comment count on post
            const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'hnrc_posts', selectedPost.id);
            await updateDoc(postRef, {
                commentCount: (selectedPost.commentCount || 0) + 1
            });

            setNewComment("");
            setReplyTo(null);
        } catch (error) {
            console.error("Error adding comment:", error);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!selectedPost || !window.confirm("댓글을 삭제하시겠습니까?")) return;

        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'hnrc_posts', selectedPost.id, 'comments', commentId));

            // Note: In a production app, we should also delete child replies or mark as "Deleted"
            const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'hnrc_posts', selectedPost.id);
            await updateDoc(postRef, {
                commentCount: Math.max(0, (selectedPost.commentCount || 1) - 1)
            });
        } catch (error) {
            console.error("Error deleting comment:", error);
        }
    };

    // 3. 월간 누적 랭킹 (리더보드) 계산 로직
    const monthlyLeaderboard = useMemo(() => {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const runnerStats = {};

        posts.forEach(post => {
            if (post.timestamp >= firstDayOfMonth) {
                if (!runnerStats[post.author]) {
                    runnerStats[post.author] = {
                        name: post.author,
                        totalKm: 0,
                        photo: post.authorPhoto
                    };
                }
                runnerStats[post.author].totalKm += (parseFloat(post.distance) || 0);
            }
        });

        return Object.values(runnerStats)
            .sort((a, b) => b.totalKm - a.totalKm)
            .slice(0, 3);
    }, [posts]);

    // Pagination logic
    const indexOfLastPost = currentPage * postsPerPage;
    const indexOfFirstPost = indexOfLastPost - postsPerPage;
    const currentPosts = posts.slice(indexOfFirstPost, indexOfLastPost);
    const totalPages = Math.ceil(posts.length / postsPerPage);

    return (
        <section className="min-h-screen bg-gray-50/50 pt-20 lg:pt-24 pb-32 px-4 md:px-10 relative overflow-hidden">
            <HNRCHeroCanvas />

            <div className="w-full relative z-10">
                <div className="w-full">
                    {/* Header Profile / Title Area */}
                    <div className="flex items-start justify-between mb-8 md:mb-12 pt-4">
                        <div>
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-1.5 sm:gap-2 text-indigo-600 font-bold text-[10px] sm:text-xs tracking-widest uppercase mb-1 sm:mb-2"
                            >
                                <Activity size={14} />
                                <span>현대차 남양연구소 러닝크루</span>
                            </motion.div>
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-5xl sm:text-6xl md:text-8xl font-black text-gray-900 tracking-tighter leading-none"
                            >
                                HNRC
                            </motion.h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* Left Sidebar: Leaderboard (4 cols) */}
                        <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white rounded-[32px] p-6 sm:p-8 border border-blue-50 shadow-xl shadow-blue-900/5 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                    <Trophy size={80} />
                                </div>

                                <div className="flex items-center justify-between mb-8 relative z-10 text-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl p-2 min-w-[45px] border border-gray-100 shadow-sm">
                                            <span className="text-[10px] font-bold text-gray-400 leading-none mb-1 uppercase tracking-tighter">Month</span>
                                            <span className="text-xl font-black text-blue-600 leading-none">{new Date().getMonth() + 1}월</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900 leading-tight">리더보드</h3>
                                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">이달의 TOP 3</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-end justify-center gap-2 h-56 relative z-10 w-full px-2 pb-2">
                                    {monthlyLeaderboard.length === 0 ? (
                                        <div className="w-full text-center py-8 text-gray-400 font-medium text-sm self-center">
                                            아직 이번 달 기록이 없습니다.
                                        </div>
                                    ) : (
                                        <>
                                            {/* 2nd Place */}
                                            {monthlyLeaderboard[1] && (
                                                <div className="flex flex-col items-center w-1/3 transition-all duration-500"
                                                    style={{ height: `${45 + 50 * (monthlyLeaderboard[1].totalKm / monthlyLeaderboard[0].totalKm)}%` }}>
                                                    <div className="flex flex-col items-center mb-1 shrink-0">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center font-bold text-gray-700 border-2 border-white shadow-md overflow-hidden mb-1">
                                                            {monthlyLeaderboard[1].photo ? <img src={monthlyLeaderboard[1].photo} className="w-full h-full object-cover" /> : <span>{(monthlyLeaderboard[1].name || 'Guest').charAt(0).toUpperCase()}</span>}
                                                        </div>
                                                        <div className="flex flex-col items-center leading-none">
                                                            <span className="font-bold text-gray-800 text-[8px] truncate max-w-[50px]">{monthlyLeaderboard[1].name}</span>
                                                            <span className="font-black italic text-gray-500 text-[9px]">{monthlyLeaderboard[1].totalKm.toFixed(1)}<span className="text-[6px] ml-0.5">KM</span></span>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-t-xl flex items-start justify-center pt-2 grow border-t border-x border-white shadow-inner">
                                                        <span className="font-black text-gray-400 text-sm">2</span>
                                                    </div>
                                                </div>
                                            )}
                                            {/* 1st Place */}
                                            {monthlyLeaderboard[0] && (
                                                <div className="flex flex-col items-center w-1/3 h-full relative">
                                                    <div className="flex flex-col items-center mb-1 shrink-0 z-20">
                                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center font-bold text-yellow-900 border-4 border-white shadow-xl overflow-hidden mb-1">
                                                            {monthlyLeaderboard[0].photo ? <img src={monthlyLeaderboard[0].photo} className="w-full h-full object-cover" /> : <span>{(monthlyLeaderboard[0].name || 'Guest').charAt(0).toUpperCase()}</span>}
                                                        </div>
                                                        <div className="flex flex-col items-center leading-none">
                                                            <span className="font-bold text-yellow-900 text-[9px] truncate max-w-[60px]">{monthlyLeaderboard[0].name}</span>
                                                            <span className="font-black italic text-yellow-700 text-[11px]">{monthlyLeaderboard[0].totalKm.toFixed(1)}<span className="text-[7px] ml-0.5">KM</span></span>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-gradient-to-b from-yellow-400 to-yellow-500 rounded-t-xl flex items-start justify-center pt-3 grow shadow-lg border-t-2 border-x-2 border-yellow-200">
                                                        <span className="font-black text-yellow-900 text-xl">1</span>
                                                    </div>
                                                </div>
                                            )}
                                            {/* 3rd Place */}
                                            {monthlyLeaderboard[2] && (
                                                <div className="flex flex-col items-center w-1/3 transition-all duration-500"
                                                    style={{ height: `${40 + 45 * (monthlyLeaderboard[2].totalKm / monthlyLeaderboard[0].totalKm)}%` }}>
                                                    <div className="flex flex-col items-center mb-1 shrink-0">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-200 to-orange-300 flex items-center justify-center font-bold text-orange-800 border-2 border-white shadow-md overflow-hidden mb-1">
                                                            {monthlyLeaderboard[2].photo ? <img src={monthlyLeaderboard[2].photo} className="w-full h-full object-cover" /> : <span>{(monthlyLeaderboard[2].name || 'Guest').charAt(0).toUpperCase()}</span>}
                                                        </div>
                                                        <div className="flex flex-col items-center leading-none">
                                                            <span className="font-bold text-gray-800 text-[8px] truncate max-w-[50px]">{monthlyLeaderboard[2].name}</span>
                                                            <span className="font-black italic text-gray-500 text-[9px]">{monthlyLeaderboard[2].totalKm.toFixed(1)}<span className="text-[6px] ml-0.5">KM</span></span>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-gray-50 rounded-t-xl flex items-start justify-center pt-2 grow border-t border-x border-white shadow-inner">
                                                        <span className="font-black text-gray-400 text-xs">3</span>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        {/* Right: Main Feed (8 cols) */}
                        <div className="lg:col-span-8">
                            {/* Feed Section Header */}
                            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-8">
                                <div className="flex items-center gap-2">
                                    <Activity size={18} className="text-gray-400" />
                                    <h4 className="font-bold tracking-widest text-xs text-gray-400 uppercase">최신 피드</h4>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                        setEditingRecord(null);
                                        setIsModalOpen(true);
                                    }}
                                    className="p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors shadow-md"
                                >
                                    <Plus size={20} />
                                </motion.button>
                            </div>

                            {/* Posts List */}
                            <div className="space-y-6">
                                <AnimatePresence mode="popLayout">
                                    {posts.length === 0 && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-center py-20 text-gray-400 flex flex-col items-center bg-white rounded-3xl border border-dashed border-gray-200"
                                        >
                                            <Activity size={48} className="opacity-20 mb-4" />
                                            <p className="font-medium">기록이 비어있습니다.</p>
                                            <p className="text-sm mt-1 opacity-60">첫 번째 러닝을 인증해보세요!</p>
                                        </motion.div>
                                    )}
                                    {currentPosts.map((post, idx) => (
                                        <motion.article
                                            key={post.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: idx * 0.05 }}
                                            onClick={() => setSelectedPost(post)}
                                            className="relative bg-white rounded-[32px] p-5 border border-gray-100 shadow-sm hover:shadow-2xl hover:translate-y-[-4px] transition-all cursor-pointer flex flex-row overflow-hidden group min-h-[180px]"
                                        >
                                            {/* Right Image Background - Expanded Area */}
                                            {post.image && (
                                                <div className="absolute right-0 top-0 bottom-0 w-[60%] h-full z-0 overflow-hidden">
                                                    <div className="absolute inset-0 z-10 bg-gradient-to-r from-white via-white/40 to-transparent"></div>
                                                    <img
                                                        src={post.image}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                        alt="Run record"
                                                    />
                                                </div>
                                            )}

                                            {/* Left Content Area */}
                                            <div className="relative z-20 w-[50%] flex flex-col justify-between">
                                                <div className="w-full pr-4">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-[10px] border border-white shrink-0">
                                                            {(user?.uid === post.authorId && profile?.photoURL) ? <img src={profile.photoURL} className="w-full h-full object-cover" /> : (post.authorPhoto ? <img src={post.authorPhoto} className="w-full h-full object-cover" /> : (post.author || 'Guest').charAt(0).toUpperCase())}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-gray-900 text-[11px] truncate tracking-tight">{(user?.uid === post.authorId && profile?.displayName) ? profile.displayName : post.author}</p>
                                                            <p className="text-gray-400 text-[10px] font-medium leading-none">{post.timestamp.toLocaleDateString()}</p>
                                                        </div>

                                                        {user && user.uid === post.authorId && (
                                                            <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={(e) => handleEditClick(e, post)} className="text-gray-400 hover:text-indigo-500 p-1 bg-white/90 rounded-full backdrop-blur-sm shadow-sm">
                                                                    <Edit2 size={10} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <h3 className="text-base font-black text-gray-900 truncate mb-1 leading-tight">{post.title}</h3>
                                                    <p className="text-gray-500 text-[12px] line-clamp-2 leading-tight mb-4">{post.content}</p>
                                                </div>

                                                <div className="space-y-2 pb-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
                                                            <MapPin size={10} />
                                                            <span className="font-black italic text-xs">{post.distance.toFixed(1)} <span className="text-[9px] not-italic opacity-60">KM</span></span>
                                                        </div>
                                                        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-gray-50 border border-gray-100 text-gray-600">
                                                            <Zap size={10} className="text-gray-400" />
                                                            <span className="font-black italic text-xs">{post.pace || "--'--\""}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 text-gray-400 pl-1">
                                                        <button
                                                            onClick={(e) => handleToggleLike(e, post)}
                                                            className={`flex items-center gap-1 transition-colors ${post.likes?.includes(user?.uid) ? 'text-red-500' : 'hover:text-red-500'}`}
                                                        >
                                                            <Heart size={14} fill={post.likes?.includes(user?.uid) ? "currentColor" : "none"} />
                                                            <span className="text-[10px] font-black">{post.likes?.length || 0}</span>
                                                        </button>
                                                        <div className="flex items-center gap-1">
                                                            <MessageSquare size={14} />
                                                            <span className="text-[10px] font-black">{post.commentCount || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.article>
                                    ))}
                                </AnimatePresence>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex justify-center items-center gap-4 pt-8">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <div className="flex gap-2">
                                            {[...Array(totalPages)].map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setCurrentPage(i + 1)}
                                                    className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Post View Modal (Social/Blog Style Popup) */}
            <AnimatePresence>
                {selectedPost && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md" onClick={() => { setSelectedPost(null); setReplyTo(null); }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 50 }}
                            className="w-full max-w-6xl max-h-[90vh] sm:h-[85vh] bg-white rounded-[24px] sm:rounded-[40px] shadow-2xl flex flex-col md:flex-row relative overflow-y-auto md:overflow-hidden custom-scrollbar"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Desktop Close Button */}
                            <button
                                onClick={() => { setSelectedPost(null); setReplyTo(null); }}
                                className="absolute top-6 right-6 z-[160] p-3 bg-white/20 backdrop-blur-xl hover:bg-white/40 text-black rounded-full transition-all hidden md:flex border border-white/30 shadow-sm"
                            >
                                <X size={24} />
                            </button>

                            {/* Mobile Pull Indicator */}
                            <div className="md:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-4 mb-2 shrink-0"></div>

                            {/* Left Side: Post Content & Data */}
                            <div className="w-full md:w-[60%] shrink-0 md:h-full md:overflow-y-auto bg-white custom-scrollbar">
                                {/* Image Box */}
                                {selectedPost.image ? (
                                    <div className="w-full aspect-video sm:aspect-[4/3] bg-gray-100 overflow-hidden relative">
                                        <img src={selectedPost.image} className="w-full h-full object-cover" alt="Run" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

                                        {/* Mobile Exit Button on Image */}
                                        <button
                                            onClick={() => { setSelectedPost(null); setReplyTo(null); }}
                                            className="absolute top-4 right-4 z-[110] p-2 bg-black/40 backdrop-blur-md text-white rounded-full transition-all md:hidden border border-white/20"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-full h-48 sm:h-64 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center relative">
                                        <Activity size={48} className="text-white/20" />
                                        {/* Mobile Exit Button */}
                                        <button
                                            onClick={() => { setSelectedPost(null); setReplyTo(null); }}
                                            className="absolute top-4 right-4 z-[110] p-2 bg-black/20 backdrop-blur-md text-white rounded-full transition-all md:hidden border border-white/20"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                )}

                                <div className="p-6 sm:p-10 md:p-12">
                                    <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-indigo-50 shadow-sm bg-gray-100 flex-shrink-0">
                                            {(user?.uid === selectedPost.authorId && profile?.photoURL) ? (
                                                <img src={profile.photoURL} className="w-full h-full object-cover" alt={profile.displayName} />
                                            ) : (
                                                selectedPost.authorPhoto ? (
                                                    <img src={selectedPost.authorPhoto} className="w-full h-full object-cover" alt={selectedPost.author} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 bg-gray-100">{selectedPost.author.charAt(0)}</div>
                                                )
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base sm:text-lg font-black text-gray-900 truncate">{(user?.uid === selectedPost.authorId && profile?.displayName) ? profile.displayName : selectedPost.author}</h3>
                                            <p className="text-[10px] sm:text-xs font-bold text-indigo-500 uppercase tracking-widest">{selectedPost.timestamp.toLocaleDateString()}</p>
                                        </div>

                                        <div className="ml-auto flex gap-2">
                                            <button
                                                onClick={(e) => handleToggleLike(e, selectedPost)}
                                                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs transition-all border ${selectedPost.likes?.includes(user?.uid) ? 'bg-red-50 border-red-100 text-red-500' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'}`}
                                            >
                                                <Heart size={14} className="sm:w-4 sm:h-4" fill={selectedPost.likes?.includes(user?.uid) ? "currentColor" : "none"} />
                                                <span>{selectedPost.likes?.length || 0}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stats Grid - High Contrast */}
                                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-8 sm:mb-10">
                                        <div className="bg-indigo-600 p-3 sm:p-4 rounded-2xl sm:rounded-3xl text-white shadow-lg shadow-indigo-100">
                                            <p className="text-[9px] sm:text-[10px] font-black opacity-60 uppercase tracking-widest mb-0.5 sm:mb-1">DISTANCE</p>
                                            <p className="text-xl sm:text-2xl font-black italic">{selectedPost.distance.toFixed(1)}<span className="text-[10px] sm:text-xs not-italic ml-0.5 opacity-60">KM</span></p>
                                        </div>
                                        <div className="bg-gray-900 p-3 sm:p-4 rounded-2xl sm:rounded-3xl text-white shadow-lg shadow-gray-100">
                                            <p className="text-[9px] sm:text-[10px] font-black opacity-60 uppercase tracking-widest mb-0.5 sm:mb-1">TIME</p>
                                            <p className="text-xl sm:text-2xl font-black italic">{selectedPost.time || '--:--'}</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 sm:p-4 rounded-2xl sm:rounded-3xl text-gray-900 border border-gray-100/50">
                                            <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 sm:mb-1">PACE</p>
                                            <p className="text-xl sm:text-2xl font-black italic text-indigo-600">{selectedPost.pace || "--'--\""}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 sm:space-y-6">
                                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight whitespace-pre-wrap break-keep">{selectedPost.title}</h2>
                                        <p className="text-gray-600 text-[15px] sm:text-lg leading-relaxed whitespace-pre-wrap font-medium pb-4">
                                            {selectedPost.content}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Comments Section */}
                            <div className="w-full md:w-[40%] shrink-0 flex flex-col bg-gray-50/50 md:h-full overflow-hidden border-t md:border-l md:border-t-0 border-gray-100">
                                <div className="p-4 sm:p-6 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 sm:p-2 bg-indigo-50 rounded-lg">
                                            <MessageCircle size={16} className="text-indigo-600 sm:w-4 sm:h-4 w-3.5 h-3.5" />
                                        </div>
                                        <span className="font-bold text-gray-900 text-sm sm:text-base">댓글 <span className="text-indigo-600">{selectedPost.commentCount || 0}</span></span>
                                    </div>
                                    <button onClick={() => { setSelectedPost(null); setReplyTo(null); }} className="hidden md:block p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar min-h-0 bg-gray-50/10">
                                    {comments.length === 0 ? (
                                        <div className="h-40 flex flex-col items-center justify-center text-gray-400 gap-2">
                                            <MessageSquare size={32} className="opacity-10" />
                                            <p className="text-sm font-medium">아직 댓글이 없습니다.</p>
                                        </div>
                                    ) : (
                                        comments.filter(c => !c.parentId).map(comment => (
                                            <div key={comment.id} className="space-y-4">
                                                {/* Parent Comment */}
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                                                        {comment.authorPhoto ? <img src={comment.authorPhoto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">{comment.author.charAt(0)}</div>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2 mb-1">
                                                            <span className="font-bold text-gray-900 text-sm">{comment.author}</span>
                                                            <span className="text-[10px] text-gray-400">{comment.timestamp.toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 leading-relaxed mb-2">{comment.text}</p>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => setReplyTo({ id: comment.id, author: comment.author })}
                                                                className="text-[10px] font-bold text-indigo-600 hover:underline"
                                                            >
                                                                답글 달기
                                                            </button>
                                                            {user?.uid === comment.authorId && (
                                                                <button
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    className="text-[10px] font-bold text-gray-400 hover:text-red-500"
                                                                >
                                                                    삭제
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Replies */}
                                                {comments.filter(reply => reply.parentId === comment.id).map(reply => (
                                                    <div key={reply.id} className="flex gap-3 ml-8 pl-4 border-l-2 border-gray-50">
                                                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                                                            {reply.authorPhoto ? <img src={reply.authorPhoto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">{reply.author.charAt(0)}</div>}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                                <span className="font-bold text-gray-900 text-[13px]">{reply.author}</span>
                                                                <span className="text-[9px] text-gray-400">{reply.timestamp.toLocaleDateString()}</span>
                                                            </div>
                                                            <p className="text-[13px] text-gray-600 leading-relaxed">
                                                                {reply.replyToAuthor && <span className="text-indigo-600 font-bold mr-1">@{reply.replyToAuthor}</span>}
                                                                {reply.text}
                                                            </p>
                                                            <div className="flex items-center gap-3 mt-1.5">
                                                                <button
                                                                    onClick={() => setReplyTo({ id: comment.id, author: reply.author })}
                                                                    className="text-[9px] font-bold text-indigo-600 hover:underline"
                                                                >
                                                                    답글 달기
                                                                </button>
                                                                {user?.uid === reply.authorId && (
                                                                    <button
                                                                        onClick={() => handleDeleteComment(reply.id)}
                                                                        className="text-[9px] font-bold text-gray-400 hover:text-red-500"
                                                                    >
                                                                        삭제
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Persistent Comment Input Area */}
                                <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0">
                                    <AnimatePresence>
                                        {replyTo && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="mb-2 px-3 py-1.5 bg-gray-50 rounded-lg flex items-center justify-between"
                                            >
                                                <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                                                    <CornerDownRight size={12} />
                                                    {replyTo.author}님에게 답글 남기는 중...
                                                </span>
                                                <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600">
                                                    <X size={14} />
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <form onSubmit={handleAddComment} className="relative">
                                        <textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder={user ? "댓글을 입력하세요..." : "로그인이 필요합니다"}
                                            disabled={!user || isSubmittingComment}
                                            className="w-full bg-gray-50 rounded-2xl p-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none min-h-[50px] max-h-[150px] placeholder:text-gray-400"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleAddComment(e);
                                                }
                                            }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!user || !newComment.trim() || isSubmittingComment}
                                            className="absolute right-3 bottom-3 p-2 bg-black text-white rounded-xl disabled:bg-gray-200 disabled:text-gray-400 transition-all hover:scale-105 active:scale-95"
                                        >
                                            {isSubmittingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={18} />}
                                        </button>
                                    </form>
                                    {!user && (
                                        <p className="text-[10px] text-gray-400 text-center mt-2">이메일/구글 계정으로 로그인 후 이용 가능합니다.</p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Write Record Modal */}
            <HNRCRecordModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingRecord(null);
                }}
                user={user}
                onSubmit={handleAddRecord}
                initialData={editingRecord}
            />

        </section >
    );
};

export default HNRCSection;
