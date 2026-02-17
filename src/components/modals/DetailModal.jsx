import React from 'react';
import { motion } from 'framer-motion'; // Removed AnimatePresence from here
import { X, User } from 'lucide-react';

const DetailModal = ({ item, onClose }) => {
    // Scroll Lock
    React.useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Swipe to close logic
    const handleDragEnd = (event, info) => {
        if (info.offset.y > 100 || info.offset.y < -100) {
            onClose();
        }
    };

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
            key={`modal-overlay-${item.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
            onClick={onClose}
        >
            <motion.div
                key={`modal-card-${item.id}`}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                initial={{ scale: 0.9, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.2 } }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-[95%] md:w-full max-w-md bg-white/95 backdrop-blur-3xl rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white/60 flex flex-col h-[70vh] md:h-[600px] ring-1 ring-white/20"
                onClick={e => e.stopPropagation()}
            >
                {/* Header: Consistent Gradient */}
                <div className="flex justify-between items-center px-5 py-4 md:px-6 md:py-5 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-white z-10 shadow-lg shadow-rose-500/20 shrink-0 cursor-grab active:cursor-grabbing">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold tracking-tight font-brand text-white">Memory Record</h2>
                        <span className="text-[10px] text-white/80 font-tech tracking-widest uppercase">Archived Data</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/90 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Content Container - 50:50 Split */}
                <div className="flex flex-col flex-1 overflow-hidden h-full">

                    {/* Image Section - 50% Height */}
                    <div className="relative w-full flex-1 bg-black overflow-hidden border-b border-white/50 shrink-0 basis-0 min-h-0 bg-gray-100 flex items-center justify-center group">
                        {(item.image || item.thumbnail) ? (
                            <motion.img
                                key={`tracker-img-${item.id}`}
                                src={item.image || item.thumbnail}
                                className="w-full h-full object-cover will-change-transform"
                                alt="Visual Record"
                                initial={{ scale: 1.4, objectPosition: "50% 0%" }}
                                animate={{
                                    objectPosition: ["50% 0%", "50% 100%", "50% 50%", "50% 50%"],
                                    scale: [1.4, 1.4, 1.4, 1.0]
                                }}
                                transition={{
                                    duration: 5,
                                    times: [0, 0.4, 0.7, 1],
                                    ease: "easeInOut"
                                }}
                            />
                        ) : (
                            <div className="text-gray-400 flex flex-col items-center gap-2 opacity-70">
                                <User size={48} />
                                <span className="text-[10px] font-tech uppercase tracking-widest">No Visual Data</span>
                            </div>
                        )}

                        {/* Scanline Effect (Optional, but adds to the 'tracking' feel) */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent bg-[length:100%_200%] animate-scan pointer-events-none opacity-50" />
                    </div>

                    {/* Text Section - 50% Height */}
                    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-white/60 shrink-0 basis-0 min-h-0">
                        <div className="mb-4">
                            <h2 className="text-2xl font-brand font-bold text-gray-900 mb-1 leading-tight">
                                {item.name || 'Anonymous User'}
                            </h2>
                            <div className="flex items-center gap-3 text-[10px] text-gray-400 font-tech uppercase tracking-widest">
                                <span className="text-orange-500 font-bold">{displayDate}</span>
                                <span className="w-px h-2 bg-gray-300"></span>
                                <span>ID: {item.id?.slice(0, 8)}</span>
                            </div>
                        </div>

                        {/* Text Block */}
                        <div className="relative pl-4">
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-rose-400 to-orange-400 rounded-full"></div>
                            <p className="text-gray-700 font-brand text-base leading-relaxed whitespace-pre-wrap">
                                {item.text}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer status */}
                <div className="px-6 py-3 bg-gray-50/90 backdrop-blur-sm border-t border-white/50 flex justify-between items-center shrink-0">
                    <span className="text-[9px] font-tech text-gray-400 uppercase tracking-[0.2em]">Secure Transmission</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest animate-pulse">Live</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default DetailModal;
