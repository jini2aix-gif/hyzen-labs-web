import React, { forwardRef } from 'react';
import { User, Trash2, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';

const GuestbookGrid = forwardRef(({
    messages,
    user,
    onItemClick,
    onEdit,
    onDelete
}, ref) => {

    return (
        <div ref={ref} className="w-full max-w-[1400px] mx-auto px-6 pb-32">
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                <h2 className="text-sm font-bold tracking-tight uppercase font-tech">Digital Consciousness</h2>
                <span className="text-xs text-black/40 font-tech">{messages.length} NODES DETECTED</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {messages.map((item, idx) => {
                    const isOwner = user && (user.uid === item.uid);

                    return (
                        <motion.div
                            key={item.id || idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.05, duration: 0.5 }}
                            className="group aspect-square relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100"
                            onClick={() => onItemClick(item)}
                        >
                            {/* Image / Thumbnail */}
                            <div className="absolute inset-0">
                                {(item.image || item.thumbnail) ? (
                                    <img
                                        src={item.image || item.thumbnail}
                                        loading="lazy"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        alt=""
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-200">
                                        <User size={24} />
                                    </div>
                                )}
                            </div>

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

                            {/* Controls for Owner */}
                            {isOwner && (
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                                        className="p-1.5 bg-white/90 text-black rounded-lg hover:bg-white shadow-sm transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm('Delete this memory?')) onDelete(item.id);
                                        }}
                                        className="p-1.5 bg-white/90 text-red-500 rounded-lg hover:bg-red-50 hover:text-red-600 shadow-sm transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )}

                            {/* Content */}
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                <span className="block text-xs font-bold text-white truncate font-brand">
                                    {item.name || 'ANON'}
                                </span>
                                <span className="block text-[10px] text-white/80 truncate mt-0.5 font-tech">
                                    {item.text || 'No data...'}
                                </span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
});

export default React.memo(GuestbookGrid);
