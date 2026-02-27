import React, { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Plus } from 'lucide-react';
import { useFirebase } from '../../hooks/useFirebase';
import Hero from './Hero';
import BlogGrid from './BlogGrid';

const BlogPage = ({ onOpenWriteModal, onEditPost, user, onOpenDetail }) => {
    const { db, appId } = useFirebase();
    const [posts, setPosts] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const POSTS_PER_PAGE = 5;
    const scrollContainerRef = useRef(null);

    // Firestore Subscription
    useEffect(() => {
        if (!db || !appId) return;
        try {
            const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'blog'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort by date desc
                msgs.sort((a, b) => {
                    const dateA = a.createdAt ? a.createdAt.toDate() : new Date(a.date);
                    const dateB = b.createdAt ? b.createdAt.toDate() : new Date(b.date);
                    return dateB - dateA;
                });
                setPosts(msgs);
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
        const confirmDelete = window.confirm("Are you sure you want to delete this post?");
        if (!confirmDelete) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'blog', id));
        } catch (e) {
            console.error("Delete Error", e);
            alert("Failed to delete post.");
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
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-indigo-500">
                            Runner's Diary
                        </span>
                    </>
                }
                subtitle="My Running Journey & Records"
                debrisColors={['#8B5CF6', '#A855F7', '#C084FC', '#6366F1', '#818CF8']} // Cool & energetic violet/indigo
                debrisShapes={['diamond', 'line', 'triangle']}
                scrollContainerRef={scrollContainerRef}
            />

            <div className="relative pt-24 pb-24">
                <div className="absolute top-0 right-6 md:right-12 z-20 -translate-y-1/2">
                    <button
                        onClick={onOpenWriteModal}
                        className="w-14 h-14 rounded-full bg-violet-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 shadow-violet-500/30"
                        title="Write a New Log"
                    >
                        <Plus size={24} />
                    </button>
                </div>

                <BlogGrid
                    posts={posts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE)}
                    totalPosts={posts.length}
                    user={user}
                    onItemClick={handleItemClick}
                    onEdit={onEditPost}
                    onDelete={handleDelete}
                />

                {/* Pagination Controls */}
                {posts.length > POSTS_PER_PAGE && (
                    <div className="flex justify-center items-center gap-4 pb-20 pt-8">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 rounded-full border border-gray-200 text-gray-600 font-bold hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            &larr; Prev
                        </button>
                        <span className="font-tech text-sm tracking-widest text-gray-400">
                            PAGE {currentPage} / {Math.ceil(posts.length / POSTS_PER_PAGE)}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(posts.length / POSTS_PER_PAGE)))}
                            disabled={currentPage === Math.ceil(posts.length / POSTS_PER_PAGE)}
                            className="px-4 py-2 rounded-full border border-gray-200 text-gray-600 font-bold hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            Next &rarr;
                        </button>
                    </div>
                )}
            </div>

            <footer className="py-12 border-t border-gray-100 text-center">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-tech">© 2026 Hyzen Labs. All Rights Reserved.</p>
            </footer>
        </div>
    );
};

export default React.memo(BlogPage);
