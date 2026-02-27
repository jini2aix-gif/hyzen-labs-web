import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { useFirebase } from '../../hooks/useFirebase';
import { doc, getDoc, setDoc, increment, updateDoc, onSnapshot } from 'firebase/firestore';



const VisitorCounter = () => {
    const { db, appId } = useFirebase();
    const [count, setCount] = useState(null);

    useEffect(() => {
        if (!db || !appId) return;

        const statsRef = doc(db, 'artifacts', appId, 'public', 'data', 'stats', 'general');

        const incrementCount = async () => {
            try {
                const sessionKey = `visited_${appId}`;
                if (!sessionStorage.getItem(sessionKey)) {
                    await updateDoc(statsRef, { visitorCount: increment(1) }).catch(async (e) => {
                        await setDoc(statsRef, { visitorCount: 1 }, { merge: true });
                    });
                    sessionStorage.setItem(sessionKey, 'true');
                }
            } catch (e) {
                console.error("Counter Error", e);
            }
        };

        incrementCount();

        const unsubscribe = onSnapshot(statsRef, (doc) => {
            if (doc.exists()) {
                setCount(doc.data().visitorCount || 0);
            }
        });

        return () => unsubscribe();
    }, [db, appId]);

    if (count === null) return null;

    const formattedCount = count.toString().padStart(5, '0');

    return (
        <div className="flex items-center gap-1 ml-2 opacity-50 hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-tech text-black tracking-widest leading-none">[{formattedCount}]</span>
        </div>
    );
};

const Header = ({ onOpenMyPage, currentIndex, onNavigate, onOpenLoginModal }) => {
    const { user, logout } = useFirebase();

    const handleReload = () => {
        window.location.reload();
    };

    return (
        <nav className="fixed top-0 left-0 w-full z-[100] backdrop-blur-md bg-white/80 border-b border-gray-100/50 transition-all duration-300">
            <div className="px-6 py-4 md:px-12 md:py-5 flex justify-between items-center whitespace-nowrap">
                {/* Logo Area */}
                <div className="flex items-center gap-3">
                    <button onClick={handleReload} className="flex flex-col text-left group">
                        <span className="font-brand text-sm tracking-tighter text-black font-bold uppercase group-hover:text-gray-600 transition-colors">
                            Hyzen Labs.
                        </span>
                    </button>
                    <VisitorCounter />
                </div>

                {/* Desktop Navigation Index (PC 전용) */}
                <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
                    <button
                        onClick={() => onNavigate(0)}
                        className={`font-tech text-xs tracking-[0.2em] uppercase transition-all ${currentIndex === 0 ? 'text-black font-bold border-b-2 border-black pb-1' : 'text-gray-400 hover:text-black'}`}
                    >
                        01 Playground
                    </button>
                    <button
                        onClick={() => onNavigate(1)}
                        className={`font-tech text-xs tracking-[0.2em] uppercase transition-all ${currentIndex === 1 ? 'text-black font-bold border-b-2 border-black pb-1' : 'text-gray-400 hover:text-black'}`}
                    >
                        02 Runner's
                    </button>
                    <button
                        onClick={() => onNavigate(2)}
                        className={`font-tech text-xs tracking-[0.2em] uppercase transition-all ${currentIndex === 2 ? 'text-black font-bold border-b-2 border-black pb-1' : 'text-gray-400 hover:text-black'}`}
                    >
                        03 Community
                    </button>
                </div>

                {/* Actions Area */}
                <div className="flex items-center gap-4 md:gap-6">
                    {user && (
                        <div className="flex items-center animate-fade-in mr-[-4px]">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <span className="text-black">{user.displayName || 'Guest'}</span>님 환영합니다.
                            </span>
                        </div>
                    )}

                    {user ? (
                        <div className="flex items-center gap-2 md:gap-3">
                            <button
                                onClick={onOpenMyPage}
                                className="flex flex-row items-center gap-2 md:gap-3 group"
                                title="My Page"
                            >
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="Profile" className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-gray-200 group-hover:border-blue-600 transition-colors" />
                                ) : (
                                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 group-hover:border-blue-600 transition-colors">
                                        <User size={12} className="text-gray-500 group-hover:text-blue-600 transition-colors" />
                                    </div>
                                )}
                            </button>
                            <button
                                onClick={logout}
                                className="p-1.5 md:p-2 rounded-full hover:bg-gray-100 transition-all text-gray-500 hover:text-black"
                                title="Sign out"
                            >
                                <LogOut size={14} className="md:w-[16px] md:h-[16px]" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onOpenLoginModal}
                            className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-all hover:scale-105 shadow-md whitespace-nowrap"
                        >
                            <span>Sign In</span>
                            <LogIn size={10} className="md:w-[12px] md:h-[12px]" />
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default React.memo(Header);
