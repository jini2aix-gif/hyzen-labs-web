import React from 'react';
import { motion } from 'framer-motion';
import { X, User } from 'lucide-react';

const BlogDetailModal = ({ item, onClose }) => {
    // Scroll Lock
    React.useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!item) return null;

    // Parse Date Logic
    let displayDate = 'Unknown Date';
    if (item.date) {
        displayDate = item.date;
    } else if (item.createdAt && item.createdAt.seconds) {
        const date = new Date(item.createdAt.seconds * 1000);
        displayDate = date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    return (
        <motion.div
            key={`blog-modal-${item.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-10"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, transition: { duration: 0.2 } }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-4xl bg-white rounded-3xl md:rounded-[2rem] shadow-2xl overflow-hidden relative border border-gray-100 flex flex-col h-full max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Navbar */}
                <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-100 z-10 shrink-0 sticky top-0">
                    <span className="text-xs font-bold font-tech tracking-[0.2em] uppercase text-violet-500">
                        Runner's Diary
                    </span>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black">
                        <X size={20} />
                    </button>
                </div>

                {/* Content Container - Scrollable */}
                <div className="flex flex-col flex-1 overflow-y-auto px-6 py-8 md:px-16 md:py-12 bg-white scroll-smooth relative">

                    {/* Post Meta */}
                    <div className="mb-10 max-w-3xl mx-auto w-full">
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-brand font-bold text-gray-900 leading-snug mb-8 break-keep">
                            {item.title || 'Untitled Post'}
                        </h1>

                        <div className="flex items-center gap-4 py-4 border-y border-gray-100/80">
                            {item.photoURL ? (
                                <img src={item.photoURL} alt="Author" className="w-12 h-12 rounded-full border border-gray-200 object-cover" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                    <User size={24} />
                                </div>
                            )}
                            <div className="flex flex-col flex-1">
                                <span className="font-brand font-bold text-gray-900 text-lg">
                                    {item.name || 'Anonymous User'}
                                </span>
                                <div className="text-xs text-gray-400 font-tech tracking-wider uppercase mt-1">
                                    {displayDate} <span className="mx-2">|</span> ID: {item.id?.slice(0, 8)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Blocks Section */}
                    <div className="w-full max-w-3xl mx-auto pb-12">
                        {(() => {
                            let blocks = item.blocks;
                            if (!blocks || blocks.length === 0) {
                                blocks = [];
                                if (item.image) blocks.push({ id: 'legacy-img', type: 'image', url: item.image });
                                if (item.text) blocks.push({ id: 'legacy-txt', type: 'text', content: item.text });
                            }

                            return blocks.map((block) => {
                                if (block.type === 'image') {
                                    return (
                                        <div key={block.id} className="w-full max-w-4xl mx-auto rounded-2xl overflow-hidden my-8 bg-gray-50 border border-gray-100 flex justify-center">
                                            <img
                                                loading="lazy"
                                                src={block.url}
                                                className="w-full h-auto object-contain max-h-[700px]"
                                                alt="Running Log Visual"
                                            />
                                        </div>
                                    );
                                } else if (block.type === 'text') {
                                    return (
                                        <div key={block.id} className="prose prose-lg prose-violet text-gray-800 my-4 max-w-full">
                                            <div
                                                className="font-sans text-[17px] md:text-lg leading-[1.8] md:leading-[1.9] whitespace-pre-wrap break-words m-0"
                                                dangerouslySetInnerHTML={{ __html: block.content }}
                                            />
                                        </div>
                                    );
                                }
                                return null;
                            });
                        })()}
                    </div>

                </div>

                {/* Scroll to top gradient indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            </motion.div>
        </motion.div>
    );
};

export default React.memo(BlogDetailModal);
