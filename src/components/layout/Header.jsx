import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useFirebase } from '../../hooks/useFirebase';
import { doc, setDoc, increment, updateDoc, onSnapshot } from 'firebase/firestore';

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
                    await updateDoc(statsRef, { visitorCount: increment(1) }).catch(async () => {
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

const Header = ({ currentIndex, onNavigate, hidden }) => {
    const { db, appId } = useFirebase();

    const handleReload = () => {
        window.location.reload();
    };

    const navItems = [
        { label: 'Playground', index: 0 },
        { label: 'Hyzen Collection', index: 1 },
        { label: 'Arbiscan', index: 2 },
    ];

    return (
        <>
            <nav className={`fixed top-0 left-0 w-full z-[100] backdrop-blur-md bg-white/80 border-b border-gray-100/50 transition-all duration-500 overflow-hidden ${hidden ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
                <div className="px-6 py-4 md:px-12 md:py-5 flex justify-between items-center whitespace-nowrap">
                    {/* Logo & Navigation */}
                    <div className="flex items-center gap-8">
                        <button onClick={handleReload} className="flex items-center gap-1.5 group">
                            <img src="/hl_logo_clean.png" alt="HL Logo" className="h-[14px] w-auto object-contain invert opacity-90 group-hover:opacity-60 transition-opacity" />
                            <span className="font-brand text-[14px] leading-none tracking-tighter text-black font-bold uppercase group-hover:text-gray-600 transition-colors">
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
                    <div className="flex items-center gap-3 md:gap-4">
                        {/* Visitor Counter (desktop) */}
                        <div className="hidden md:block">
                            <VisitorCounter />
                        </div>
                    </div>
                </div>
            </nav>

        </>
    );
};

export default React.memo(Header);
