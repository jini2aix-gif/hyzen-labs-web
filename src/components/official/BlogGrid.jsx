import React, { forwardRef } from 'react';
import { User, Trash2, Edit2, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const BlogGrid = forwardRef(({
    posts,
    totalPosts,
    user,
    onItemClick,
    onEdit,
    onDelete
}, ref) => {

    return (
        <div ref={ref} className="w-full max-w-[1000px] mx-auto px-4 md:px-0 pb-32">
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                <h2 className="text-sm font-bold tracking-tight uppercase font-tech">Runner's Log</h2>
                <span className="text-xs text-black/40 font-tech">{totalPosts ?? posts.length} POSTS</span>
            </div>

            <div className="flex flex-col gap-8">
                {posts.map((item, idx) => {
                    const isOwner = user && (user.uid === item.uid);

                    // Format date
                    let displayDate = 'Unknown Date';
                    if (item.date) {
                        displayDate = item.date;
                    } else if (item.createdAt && item.createdAt.seconds) {
                        const date = new Date(item.createdAt.seconds * 1000);
                        displayDate = date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
                    }

                    // Determine preview text and thumbnail
                    let previewText = item.text || '';
                    let imageList = [];
                    if (item.image) imageList.push(item.image);

                    if (item.blocks && item.blocks.length > 0) {
                        const images = item.blocks.filter(b => b.type === 'image');
                        const texts = item.blocks.filter(b => b.type === 'text');

                        let extractedImages = [];
                        texts.forEach(t => {
                            const imgRegex = /<img[^>]+src="([^">]+)"/g;
                            let match;
                            while ((match = imgRegex.exec(t.content)) !== null) {
                                extractedImages.push(match[1]);
                            }
                        });

                        const mixedImages = [...images.map(img => img.url), ...extractedImages];
                        if (mixedImages.length > 0) {
                            imageList = [...imageList, ...mixedImages];
                        }

                        const firstText = texts.find(b => b.content.replace(/<[^>]*>?/gm, '').trim() !== '');
                        if (firstText) previewText = firstText.content.replace(/<[^>]*>?/gm, '');
                    }

                    const maxOffset = Math.max(0, Math.min(imageList.length - 1, 2)) * 8;

                    return (
                        <motion.div
                            key={item.id || idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                            className="group flex flex-row gap-4 md:gap-6 bg-white rounded-3xl p-4 md:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-xl transition-all duration-300 border border-gray-100 cursor-pointer relative"
                            onClick={() => onItemClick(item)}
                        >
                            {/* Controls for Owner */}
                            {isOwner && (
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                                        className="p-2 bg-gray-100/50 text-gray-600 rounded-full hover:bg-gray-200 transition-colors backdrop-blur-sm"
                                        title="Edit"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm('Delete this post?')) onDelete(item.id);
                                        }}
                                        className="p-2 bg-red-50/50 text-red-500 rounded-full hover:bg-red-100 transition-colors backdrop-blur-sm"
                                        title="Delete"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Image Section (Thumbnail) */}
                            {imageList.length > 0 && (
                                <div className="w-[100px] h-[66px] sm:w-[120px] sm:h-[80px] md:w-[180px] md:h-[120px] shrink-0 relative isolate order-last">
                                    {imageList.slice(0, 3).reverse().map((url, revIdx, arr) => {
                                        const i = arr.length - 1 - revIdx; // Original index: 0, 1, 2
                                        const isLast = i === 2 && imageList.length > 3;
                                        return (
                                            <div
                                                key={i}
                                                className="absolute rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-2 border-white bg-gray-100 transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_8px_16px_rgba(0,0,0,0.12)]"
                                                style={{
                                                    zIndex: 10 - i,
                                                    top: `${i * 8}px`,
                                                    left: `${i * 8}px`,
                                                    width: `calc(100% - ${maxOffset}px)`,
                                                    height: `calc(100% - ${maxOffset}px)`,
                                                    transform: i > 0 ? `rotate(${i * 1.5}deg)` : 'none'
                                                }}
                                            >
                                                <img
                                                    src={url}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    alt={`Runner's Diary Thumbnail ${i + 1}`}
                                                />
                                                {isLast && (
                                                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center backdrop-blur-[2px] transition-colors group-hover:bg-black/50">
                                                        <ImageIcon size={20} className="text-white/90 mb-1" />
                                                        <span className="text-white font-bold text-xl font-brand tracking-widest">
                                                            +{imageList.length - 2}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Content Section */}
                            <div className="flex flex-col flex-1 justify-center relative">
                                <h3 className="text-lg md:text-xl font-brand font-bold text-gray-900 mb-2 group-hover:text-violet-500 transition-colors break-keep">
                                    {item.title || 'Untitled'}
                                </h3>

                                <p className="text-gray-600 font-sans text-sm mb-4 line-clamp-2 md:line-clamp-3 leading-relaxed">
                                    {previewText}
                                </p>

                                {/* Meta Footer */}
                                <div className="flex items-center gap-3 mt-auto">
                                    {item.photoURL ? (
                                        <img src={item.photoURL} alt="Author" className="w-6 h-6 rounded-full border border-gray-200" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                            <User size={12} />
                                        </div>
                                    )}
                                    <span className="text-xs font-bold text-gray-800 font-brand">{item.name || 'Anonymous'}</span>
                                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                    <span className="text-[10px] uppercase font-tech tracking-widest text-gray-400">{displayDate}</span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {posts.length === 0 && (
                    <div className="w-full py-20 flex flex-col items-center justify-center text-gray-400">
                        <ImageIcon size={48} className="opacity-20 mb-4" />
                        <span className="font-tech text-xs tracking-[0.2em] uppercase">No posts yet</span>
                    </div>
                )}
            </div>
        </div>
    );
});

export default React.memo(BlogGrid);
