import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Users, Mail, TrendingUp, Activity, Eye,
    Crown, Shield, BarChart2, Clock, UserCheck,
    ChevronRight, RefreshCw
} from 'lucide-react';
import {
    collection, getDocs, query, orderBy, limit,
    onSnapshot, doc
} from 'firebase/firestore';

const ADMIN_EMAIL = 'jini2aix@gmail.com';

// ────────────────────────────────────────
// StatCard
// ────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'blue', loading }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        green: 'bg-emerald-50 text-emerald-600',
        orange: 'bg-orange-50 text-orange-600',
        pink: 'bg-pink-50 text-pink-600',
        gray: 'bg-gray-100 text-gray-600',
    };
    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <div className={`p-2.5 rounded-xl shrink-0 ${colors[color]}`}>
                <Icon size={18} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                {loading ? (
                    <div className="h-5 w-16 bg-gray-100 animate-pulse rounded" />
                ) : (
                    <p className="text-xl font-black text-gray-900 leading-tight">{value ?? '—'}</p>
                )}
                {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
};

// ────────────────────────────────────────
// AdminPanel
// ────────────────────────────────────────
const AdminPanel = ({ isOpen, onClose, db, appId }) => {
    const [stats, setStats] = useState({ members: 0, visitors: 0, hnrcPosts: 0, todayLogins: 0 });
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const panelRef = useRef(null);

    const fetchData = async () => {
        if (!db || !appId) return;
        setRefreshing(true);
        try {
            // Members
            const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
            const usersSnap = await getDocs(usersRef);
            const memberList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setMembers(memberList);

            // HNRC posts
            let hnrcCount = 0;
            try {
                const postsRef = collection(db, 'artifacts', appId, 'public', 'data', 'posts');
                const postsSnap = await getDocs(postsRef);
                hnrcCount = postsSnap.size;
            } catch (_) { }

            // Today logins (lastLoginAt within 24h)
            const now = Date.now();
            const todayLogins = memberList.filter(m => {
                if (!m.lastLoginAt) return false;
                return now - new Date(m.lastLoginAt).getTime() < 86400000;
            }).length;

            setStats(prev => ({
                ...prev,
                members: memberList.length,
                hnrcPosts: hnrcCount,
                todayLogins,
            }));
        } catch (e) {
            console.error('AdminPanel fetch error', e);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    // Visitor count real-time
    useEffect(() => {
        if (!isOpen || !db || !appId) return;
        const statsRef = doc(db, 'artifacts', appId, 'public', 'data', 'stats', 'general');
        const unsub = onSnapshot(statsRef, snap => {
            if (snap.exists()) setStats(prev => ({ ...prev, visitors: snap.data().visitorCount || 0 }));
        });
        return () => unsub();
    }, [isOpen, db, appId]);

    useEffect(() => {
        if (isOpen) { setLoading(true); fetchData(); }
    }, [isOpen]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose(); };
        if (isOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose]);

    const tabs = [
        { id: 'overview', label: '개요', icon: BarChart2 },
        { id: 'members', label: '회원 목록', icon: Users },
        { id: 'emails', label: '이메일', icon: Mail },
    ];

    const providerBadge = (provider) => {
        if (provider === 'google') return <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[9px] font-bold">G</span>;
        return <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[9px] font-bold">E</span>;
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-start justify-end">
                    {/* Dim backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, x: 60 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 60 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        className="relative h-full w-full max-w-sm bg-gray-50 flex flex-col shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-black text-white px-5 py-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-white/10 rounded-lg">
                                    <Shield size={16} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black tracking-tight">Admin Dashboard</h2>
                                    <p className="text-[9px] text-white/50 font-tech uppercase tracking-widest">Hyzen Labs Control Panel</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={fetchData}
                                    className={`p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all ${refreshing ? 'animate-spin' : ''}`}
                                    title="새로고침"
                                >
                                    <RefreshCw size={14} />
                                </button>
                                <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Admin Badge */}
                        <div className="bg-yellow-50 border-b border-yellow-100 px-5 py-2 flex items-center gap-2">
                            <Crown size={12} className="text-yellow-500" />
                            <span className="text-[10px] font-bold text-yellow-700 tracking-widest uppercase">Super Admin · jini2aix@gmail.com</span>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 bg-white shrink-0">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === tab.id
                                            ? 'border-black text-black'
                                            : 'border-transparent text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    <tab.icon size={12} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            {/* Overview Tab */}
                            {activeTab === 'overview' && (
                                <div className="p-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <StatCard icon={Users} label="총 회원수" value={stats.members.toLocaleString()} sub="누적 가입자" color="blue" loading={loading} />
                                        <StatCard icon={Eye} label="총 방문자" value={stats.visitors.toLocaleString()} sub="세션 기반" color="purple" loading={loading} />
                                        <StatCard icon={UserCheck} label="오늘 로그인" value={stats.todayLogins.toLocaleString()} sub="최근 24시간" color="green" loading={loading} />
                                        <StatCard icon={Activity} label="HNRC 기록" value={stats.hnrcPosts.toLocaleString()} sub="총 게시물" color="orange" loading={loading} />
                                    </div>

                                    {/* Conversion Rate */}
                                    {!loading && stats.visitors > 0 && (
                                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">회원가입 전환율</p>
                                            <div className="flex items-end gap-2 mb-2">
                                                <span className="text-2xl font-black text-gray-900">
                                                    {((stats.members / stats.visitors) * 100).toFixed(1)}%
                                                </span>
                                                <span className="text-xs text-gray-400 mb-0.5">방문자 대비</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min((stats.members / stats.visitors) * 100 * 5, 100)}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut' }}
                                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Provider Breakdown */}
                                    {!loading && members.length > 0 && (
                                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">가입 방식 분포</p>
                                            {(() => {
                                                const google = members.filter(m => m.provider === 'google').length;
                                                const email = members.filter(m => m.provider !== 'google').length;
                                                const total = members.length;
                                                return (
                                                    <div className="space-y-2">
                                                        <div>
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="text-gray-500">🔵 Google</span>
                                                                <span className="font-bold">{google}명 ({total ? ((google / total) * 100).toFixed(0) : 0}%)</span>
                                                            </div>
                                                            <div className="h-1.5 bg-gray-100 rounded-full">
                                                                <motion.div initial={{ width: 0 }} animate={{ width: `${total ? (google / total) * 100 : 0}%` }} transition={{ duration: 0.8 }} className="h-full bg-blue-500 rounded-full" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="text-gray-500">⚫ 이메일</span>
                                                                <span className="font-bold">{email}명 ({total ? ((email / total) * 100).toFixed(0) : 0}%)</span>
                                                            </div>
                                                            <div className="h-1.5 bg-gray-100 rounded-full">
                                                                <motion.div initial={{ width: 0 }} animate={{ width: `${total ? (email / total) * 100 : 0}%` }} transition={{ duration: 0.8 }} className="h-full bg-gray-700 rounded-full" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* Recent Signups */}
                                    {!loading && members.length > 0 && (
                                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">최근 가입자 TOP 5</p>
                                            <div className="space-y-3">
                                                {[...members]
                                                    .sort((a, b) => new Date(b.lastLoginAt || 0) - new Date(a.lastLoginAt || 0))
                                                    .slice(0, 5)
                                                    .map((m, i) => (
                                                        <div key={m.id} className="flex items-center gap-2.5">
                                                            <span className="text-[10px] font-black text-gray-300 w-4">{i + 1}</span>
                                                            {m.photoURL ? (
                                                                <img src={m.photoURL} className="w-7 h-7 rounded-full border border-gray-100 object-cover" />
                                                            ) : (
                                                                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                                    {(m.displayName || m.email || '?').charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-gray-900 truncate">{m.displayName || '이름 없음'}</p>
                                                                <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                {providerBadge(m.provider)}
                                                                <span className="text-[9px] text-gray-300">{formatDate(m.lastLoginAt)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Members Tab */}
                            {activeTab === 'members' && (
                                <div className="p-4 space-y-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                        총 {members.length}명
                                    </p>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="h-14 bg-white border border-gray-100 rounded-xl animate-pulse" />
                                        ))
                                    ) : members.length === 0 ? (
                                        <p className="text-center text-sm text-gray-400 py-8">가입자가 없습니다.</p>
                                    ) : (
                                        [...members]
                                            .sort((a, b) => new Date(b.lastLoginAt || 0) - new Date(a.lastLoginAt || 0))
                                            .map(m => (
                                                <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                                                    {m.photoURL ? (
                                                        <img src={m.photoURL} className="w-9 h-9 rounded-full border border-gray-100 object-cover shrink-0" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-400 shrink-0">
                                                            {(m.displayName || m.email || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                            <p className="text-xs font-bold text-gray-900 truncate">{m.displayName || '이름 없음'}</p>
                                                            {providerBadge(m.provider)}
                                                            {m.email === ADMIN_EMAIL && (
                                                                <Crown size={10} className="text-yellow-500 shrink-0" />
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-[9px] text-gray-300">최근 로그인</p>
                                                        <p className="text-[9px] font-bold text-gray-500">{formatDate(m.lastLoginAt)}</p>
                                                    </div>
                                                </div>
                                            ))
                                    )}
                                </div>
                            )}

                            {/* Emails Tab */}
                            {activeTab === 'emails' && (
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            수집된 이메일 {members.filter(m => m.email).length}개
                                        </p>
                                        <button
                                            onClick={() => {
                                                const emails = members.filter(m => m.email).map(m => m.email).join('\n');
                                                navigator.clipboard.writeText(emails);
                                            }}
                                            className="text-[9px] font-bold text-blue-600 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 transition-all"
                                        >
                                            전체 복사
                                        </button>
                                    </div>

                                    {loading ? (
                                        Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-white border border-gray-100 rounded-xl animate-pulse" />)
                                    ) : (
                                        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                            {members.filter(m => m.email).map((m, i, arr) => (
                                                <div
                                                    key={m.id}
                                                    className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-gray-700 truncate">{m.email}</p>
                                                        <p className="text-[9px] text-gray-400">{m.displayName || '이름 없음'} · {providerBadge(m.provider)}</p>
                                                    </div>
                                                    {m.email === ADMIN_EMAIL && (
                                                        <Crown size={10} className="text-yellow-500 shrink-0" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex gap-2">
                                        <Shield size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-amber-700 leading-relaxed">
                                            수집된 이메일은 서비스 안내 목적으로만 사용하며, 가입 시 동의한 범위 내에서 관리됩니다.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 bg-white border-t border-gray-100 shrink-0">
                            <p className="text-[9px] text-gray-300 text-center font-tech tracking-widest uppercase">
                                Hyzen Labs Admin Console · {new Date().toLocaleDateString('ko-KR')}
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export { ADMIN_EMAIL };
export default AdminPanel;
