import React, { useState, useEffect, useRef } from 'react';
import { X, User, Save, Loader2, Activity, Camera, Trash2, AlertTriangle } from 'lucide-react';
import { updateProfile, deleteUser, reauthenticateWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, where, getDocs, getCountFromServer, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../../hooks/useFirebase';
import { compressImage } from '../../utils/image';
import { motion, AnimatePresence } from 'framer-motion';

const MyPageModal = ({ isOpen, onClose, user, profile }) => {
    const [nickname, setNickname] = useState('');
    const [profileImage, setProfileImage] = useState('');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [gameStats, setGameStats] = useState({ score: 0, rank: '-' });
    const [hnrcStats, setHNRCStats] = useState({ totalDistance: 0, rank: '-' });
    const fileInputRef = useRef(null);

    // ── Delete Account State ──
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    useEffect(() => {
        if (isOpen && user) {
            setNickname(profile?.displayName || user.displayName || '');
            setProfileImage(profile?.photoURL || user.photoURL || '');
            fetchGameStats();
            fetchHNRCStats();
        }
    }, [isOpen, user, profile]);

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setProfileImage(compressed);
            } catch (error) {
                console.error('Image compression error:', error);
            }
        }
    };

    const fetchHNRCStats = async () => {
        if (!user || !db || !appId) return;
        try {
            const postsRef = collection(db, 'artifacts', appId, 'public', 'data', 'hnrc_posts');
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const q = query(postsRef, where('timestamp', '>=', startOfMonth));
            const querySnapshot = await getDocs(q);

            const userDistances = {};
            querySnapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                const uid = data.authorId;
                const dist = parseFloat(data.distance) || 0;
                userDistances[uid] = (userDistances[uid] || 0) + dist;
            });

            const myDist = userDistances[user.uid] || 0;
            const sortedDistances = Object.values(userDistances).sort((a, b) => b - a);
            const rank = myDist > 0 ? sortedDistances.indexOf(myDist) + 1 : '-';
            setHNRCStats({ totalDistance: myDist, rank });
        } catch (error) {
            console.error('Error fetching HNRC stats:', error);
        }
    };

    const fetchGameStats = async () => {
        if (!user || !db || !appId) return;
        try {
            const scoresRef = collection(db, 'artifacts', appId, 'public', 'data', 'games', 'zero-g-drift', 'scores');
            const qUser = query(scoresRef, where('uid', '==', user.uid));
            const userSnapshot = await getDocs(qUser);

            if (!userSnapshot.empty) {
                const scores = userSnapshot.docs.map(d => d.data().score);
                const bestScore = Math.max(...scores);
                const qRank = query(scoresRef, where('score', '>', bestScore));
                const rankSnapshot = await getCountFromServer(qRank);
                setGameStats({ score: bestScore, rank: rankSnapshot.data().count + 1 });
            } else {
                setGameStats({ score: 0, rank: '-' });
            }
        } catch (error) {
            console.error('Error fetching game stats:', error);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        const currentName = profile?.displayName || user.displayName || '';
        const currentPhoto = profile?.photoURL || user.photoURL || '';
        const hasNameChanged = nickname.trim() && nickname !== currentName;
        const hasPhotoChanged = profileImage !== currentPhoto;
        if (!hasNameChanged && !hasPhotoChanged) return;

        setIsUpdatingProfile(true);
        try {
            if (hasNameChanged) await updateProfile(user, { displayName: nickname });
            if (db && appId) {
                const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
                await setDoc(userRef, {
                    displayName: nickname,
                    photoURL: profileImage,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            }
            alert('프로필이 업데이트되었습니다.');
        } catch (error) {
            console.error('Profile update error:', error);
            alert('프로필 업데이트에 실패했습니다. ' + error.message);
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    // ── Delete Account ──
    const handleDeleteAccount = async () => {
        if (!user) return;
        if (deleteConfirmInput.trim() !== user.email) {
            setDeleteError('이메일 주소가 일치하지 않습니다.');
            return;
        }

        setIsDeleting(true);
        setDeleteError('');

        try {
            // Re-authenticate if needed (Google accounts)
            const isGoogle = user.providerData?.some(p => p.providerId === 'google.com');
            if (isGoogle) {
                const provider = new GoogleAuthProvider();
                await reauthenticateWithPopup(user, provider);
            }

            // Delete Firestore user document
            if (db && appId) {
                const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
                await deleteDoc(userRef);
            }

            // Delete Firebase Auth account (triggers auth state change → logout)
            await deleteUser(user);

            setShowDeleteConfirm(false);
            onClose();
        } catch (error) {
            console.error('Account deletion error:', error);
            if (error.code === 'auth/requires-recent-login') {
                setDeleteError('보안을 위해 다시 로그인 후 시도해 주세요.');
            } else {
                setDeleteError('오류가 발생했습니다: ' + error.message);
            }
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* ── Main Modal ── */}
            <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-md p-4"
                onClick={onClose}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h2 className="text-xl font-bold font-brand tracking-tight text-gray-900">마이페이지</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-black">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-6">

                            {/* ── Section 1: Profile ── */}
                            <section className="mb-12">
                                <div className="flex flex-col items-center max-w-sm mx-auto">
                                    <div className="relative mb-6 group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                                        <div className="w-24 h-24 rounded-full overflow-hidden ring-1 ring-gray-100 shadow-sm bg-gray-50 flex items-center justify-center relative">
                                            {profileImage ? (
                                                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={32} className="text-gray-300" />
                                            )}
                                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Camera size={20} className="text-white drop-shadow-sm" />
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 p-1.5 bg-white border border-gray-100 rounded-full shadow-sm text-gray-400">
                                            <Camera size={12} />
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                                    </div>

                                    <div className="w-full space-y-6">
                                        <input
                                            type="text"
                                            value={nickname}
                                            onChange={(e) => setNickname(e.target.value)}
                                            className="w-full px-0 py-2 bg-transparent border-b border-gray-100 focus:border-black outline-none transition-all font-brand font-bold text-gray-800 text-2xl text-center placeholder:text-gray-200"
                                            placeholder="이름을 입력하세요"
                                        />
                                        <button
                                            onClick={handleUpdateProfile}
                                            disabled={isUpdatingProfile || (nickname === (profile?.displayName || user?.displayName) && profileImage === (profile?.photoURL || user?.photoURL))}
                                            className="w-full h-12 bg-black text-white rounded-full font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-gray-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            {isUpdatingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            <span>프로필 업데이트</span>
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* ── Section 2: Game Stats ── */}
                            <section className="mb-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                                    <h3 className="text-[11px] font-bold font-tech uppercase text-gray-900 tracking-wider">게임 기록</h3>
                                </div>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
                                    className="bg-gray-50/80 rounded-[24px] p-6 border border-gray-100 flex items-center justify-between group transition-all hover:shadow-lg hover:shadow-gray-200/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 text-blue-600">
                                            <Activity size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-brand font-bold text-gray-800 text-base">ZERO-G DRIFT</h4>
                                            <div className="text-[10px] font-tech text-gray-400 uppercase tracking-wider">
                                                글로벌 순위: <span className="text-blue-600 font-bold">{gameStats.rank !== '-' ? `#${gameStats.rank}` : '순위 없음'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right text-gray-900">
                                        <div className="text-3xl font-mono font-black leading-none italic">
                                            {gameStats.score > 0 ? gameStats.score.toFixed(2) : '--'}
                                            <span className="text-sm text-gray-300 ml-1 not-italic">s</span>
                                        </div>
                                        <div className="text-[9px] font-mono text-gray-400 tracking-widest uppercase mt-1">Best Survival</div>
                                    </div>
                                </motion.div>
                            </section>

                            {/* ── Section 3: Running Stats ── */}
                            <section className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                                    <h3 className="text-[11px] font-bold font-tech uppercase text-gray-900 tracking-wider">러닝 기록</h3>
                                </div>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileHover={{ y: -2 }}
                                    className="bg-gray-50/80 rounded-[24px] p-6 border border-gray-100 flex items-center justify-between group transition-all hover:shadow-lg hover:shadow-gray-200/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 text-emerald-500">
                                            <Activity size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-brand font-bold text-gray-800 text-base">HNRC RUNNING</h4>
                                            <div className="text-[10px] font-tech text-gray-400 uppercase tracking-wider">
                                                시즌 순위: <span className="text-emerald-500 font-bold">{hnrcStats.rank !== '-' ? `#${hnrcStats.rank}` : '순위 없음'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right text-gray-900">
                                        <div className="text-3xl font-mono font-black leading-none italic">
                                            {hnrcStats.totalDistance.toFixed(1)}
                                            <span className="text-sm text-gray-300 ml-1 not-italic">km</span>
                                        </div>
                                        <div className="text-[9px] font-mono text-gray-400 tracking-widest uppercase mt-1">Monthly Total</div>
                                    </div>
                                </motion.div>
                            </section>

                            {/* ── Section 4: Danger Zone ── */}
                            <section className="mt-10 mb-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-4 bg-red-500 rounded-full" />
                                    <h3 className="text-[11px] font-bold font-tech uppercase text-red-500 tracking-wider">위험 구역</h3>
                                </div>
                                <div className="rounded-2xl border border-red-100 bg-red-50/40 p-5 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">계정 삭제</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                                            계정을 삭제하면 모든 데이터가 영구적으로 제거됩니다.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmInput(''); setDeleteError(''); }}
                                        className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-bold hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                                    >
                                        <Trash2 size={13} />
                                        회원탈퇴
                                    </button>
                                </div>
                            </section>

                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                            <span className="text-[10px] text-gray-400 font-tech uppercase tracking-widest">
                                로그인 계정: {user.email}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ── Delete Confirmation Modal (z-[70], above main modal) ── */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div
                        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => !isDeleting && setShowDeleteConfirm(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Warning header */}
                            <div className="bg-red-50 px-6 pt-8 pb-6 text-center border-b border-red-100">
                                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle size={28} className="text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">정말로 탈퇴하시겠습니까?</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    이 작업은 <span className="font-bold text-red-500">되돌릴 수 없습니다.</span><br />
                                    게임 기록, 러닝 기록, 프로필 등 모든 데이터가 삭제됩니다.
                                </p>
                            </div>

                            {/* Confirmation input area */}
                            <div className="p-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    확인을 위해 이메일 주소를 입력하세요
                                </label>
                                {/* Readonly email hint */}
                                <div className="text-xs text-gray-400 font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 select-all cursor-text">
                                    {user?.email}
                                </div>
                                <input
                                    type="email"
                                    value={deleteConfirmInput}
                                    onChange={e => { setDeleteConfirmInput(e.target.value); setDeleteError(''); }}
                                    placeholder="이메일 주소 입력"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none text-sm transition-all font-mono"
                                    autoComplete="off"
                                    disabled={isDeleting}
                                />
                                {deleteError && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                        className="mt-2 text-xs text-red-500 font-medium"
                                    >
                                        {deleteError}
                                    </motion.p>
                                )}

                                <div className="flex gap-3 mt-5">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        disabled={isDeleting}
                                        className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-50"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={isDeleting || deleteConfirmInput.trim() !== user?.email}
                                        className="flex-1 h-12 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isDeleting ? (
                                            <><Loader2 size={16} className="animate-spin" />탈퇴 처리 중...</>
                                        ) : (
                                            <><Trash2 size={16} />계정 영구 삭제</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default MyPageModal;
