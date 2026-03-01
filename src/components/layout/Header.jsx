import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { motion } from 'framer-motion';
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
        <div className="flex items-center gap-1 ml-2 opacity-60 hover:opacity-100 transition-opacity">
            <span className="text-[11px] sm:text-[12px] font-tech text-black tracking-widest leading-none">[{formattedCount}]</span>
        </div>
    );
};

const Header = ({ onOpenMyPage, onOpenLoginModal, currentIndex, onNavigate }) => {
    const { user, profile, logout } = useFirebase();

    const handleReload = () => {
        window.location.reload();
    };

    const navItems = [
        { label: 'Playground', index: 0 },
        { label: 'HNRC', index: 1 },
        { label: 'Arbiscan', index: 2 },
    ];

    return (
        <nav className="fixed top-0 left-0 w-full z-[100] backdrop-blur-md bg-white/80 border-b border-gray-100/50 transition-all duration-300">
            <div className="px-6 py-4 md:px-12 md:py-5 flex justify-between items-center whitespace-nowrap">
                {/* Logo & Navigation */}
                <div className="flex items-center gap-8">
                    <button onClick={handleReload} className="flex flex-col text-left group">
                        <span className="font-brand text-sm tracking-tighter text-black font-bold uppercase group-hover:text-gray-600 transition-colors">
                            Hyzen Labs.
                        </span>
                    </button>

                    {/* Official Nav Menu */}
                    <div className="hidden md:flex items-center gap-6 border-l border-gray-100 pl-8">
                        {navItems.map((item) => (
                            <button
                                key={item.index}
                                onClick={() => onNavigate(item.index)}
                                className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative py-1 ${currentIndex === item.index ? 'text-black' : 'text-gray-300 hover:text-gray-500'}`}
                            >
                                {item.label}
                                {currentIndex === item.index && (
                                    <motion.div
                                        layoutId="navUnderline"
                                        className="absolute bottom-0 left-0 w-full h-[2px] bg-black"
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="-ml-6 md:hidden scale-75 opacity-30 origin-left">
                        <VisitorCounter />
                    </div>
                </div>

                {/* Actions Area */}
                <div className="flex items-center gap-4 md:gap-6">
                    {user ? (
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2 md:gap-3">
                                <button
                                    onClick={onOpenMyPage}
                                    className="flex flex-row items-center gap-2 md:gap-3 group"
                                    title="My Page"
                                >
                                    {(profile?.photoURL || user.photoURL) ? (
                                        <img src={profile?.photoURL || user.photoURL} alt="Profile" className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-gray-200 group-hover:border-blue-600 transition-colors" />
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
                            <div className="hidden md:flex">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                    <span className="text-black/70">{profile?.displayName || user.displayName || 'Guest'}</span>님 환영합니다. ✨
                                </span>
                            </div>
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
