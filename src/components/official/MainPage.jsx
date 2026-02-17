import React, { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { Plus } from 'lucide-react';
import { useFirebase } from '../../hooks/useFirebase';
import Hero from './Hero';
import GuestbookGrid from './GuestbookGrid';
import DetailModal from '../modals/DetailModal';
import { AnimatePresence } from 'framer-motion';

const MainPage = ({ onOpenWriteModal, onEditPost, user, onOpenDetail }) => {
    const { db, appId } = useFirebase();
    const [messages, setMessages] = useState([]);
    const scrollContainerRef = useRef(null); // Ref for scrolling container

    // Firestore Subscription
    useEffect(() => {
        if (!db || !appId) return;
        try {
            const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'messages'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort by date desc
                msgs.sort((a, b) => {
                    const dateA = a.createdAt ? a.createdAt.toDate() : new Date(a.date);
                    const dateB = b.createdAt ? b.createdAt.toDate() : new Date(b.date);
                    return dateB - dateA;
                });
                setMessages(msgs);
            });
            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase Error", e);
        }
    }, [db, appId]);

    const handleItemClick = useCallback((item) => {
        if (onOpenDetail) {
            onOpenDetail(item);
        }
    }, [onOpenDetail]);

    const handleDelete = useCallback(async (id) => {
        if (!db || !appId) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', id));
        } catch (e) {
            console.error("Delete Error", e);
            alert("Failed to delete message.");
        }
    }, [db, appId]);

    return (
        <div
            ref={scrollContainerRef}
            className="w-full h-full overflow-y-auto overflow-x-hidden relative bg-white scroll-smooth"
        >
            <Hero
                title={
                    <>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
                            Community
                        </span>
                    </>
                }
                subtitle="Leave Your Mark"
                debrisColors={['#fdba74', '#fca5a5', '#f9a8d4', '#c4b5fd', '#86efac']} // Warm/Social colors
                debrisShapes={['circle', 'ring', 'pill']} // Community shapes
                scrollContainerRef={scrollContainerRef}
            />

            <div className="relative pt-24 pb-24">
                <div className="absolute top-0 right-6 md:right-12 z-20 -translate-y-1/2">
                    <button
                        onClick={onOpenWriteModal}
                        className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95"
                        title="Write a Guestbook Entry"
                    >
                        <Plus size={24} />
                    </button>
                </div>

                <GuestbookGrid
                    messages={messages}
                    user={user}
                    onItemClick={handleItemClick}
                    onEdit={onEditPost}
                    onDelete={handleDelete}
                />
            </div>

            {/* Footer moved inside scroll container */}
            <footer className="py-12 border-t border-gray-100 text-center">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-tech">© 2026 Hyzen Labs. All Rights Reserved.</p>
            </footer>
        </div>
    );
};

export default React.memo(MainPage);
