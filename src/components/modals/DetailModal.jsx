import React from 'react';
import { X, Fingerprint, Trash2 } from 'lucide-react';

const DetailModal = ({
    isOpen,
    selectedItem,
    onClose,
    onDeleteRequest,
    modalExitDir,
    modalDragY,
    handleModalTouchStart,
    handleModalTouchMove,
    handleModalTouchEnd
}) => {
    if (!isOpen || !selectedItem) return null;

    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-4" onClick={onClose}>
            <div
                className={`w-full max-w-4xl glass-panel relative rounded-[2rem] overflow-hidden flex flex-col lg:flex-row transition-all duration-300
          ${modalExitDir === 'up' ? 'modal-exit-up' : ''} 
          ${modalExitDir === 'down' ? 'modal-exit-down' : ''}
        `}
                style={{
                    transform: modalExitDir ? undefined : `translateY(${modalDragY}px) scale(${1 - Math.abs(modalDragY) / 3000})`,
                    opacity: modalExitDir ? undefined : 1 - Math.abs(modalDragY) / 1000
                }}
                onClick={e => e.stopPropagation()}
                onTouchStart={handleModalTouchStart}
                onTouchMove={handleModalTouchMove}
                onTouchEnd={handleModalTouchEnd}
            >
                {/* Media Section (Left/Top) */}
                <div className="h-[40vh] lg:h-[60vh] lg:w-1/2 bg-black relative overflow-hidden group">
                    {selectedItem.type === 'youtube' ? (
                        <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${selectedItem.id}?autoplay=1&rel=0&modestbranding=1`}
                            title={selectedItem.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    ) : (
                        selectedItem.image ? <img src={selectedItem.image} className="w-full h-full object-cover animate-image-scan" alt="" /> : <div className="w-full h-full flex items-center justify-center text-white/5"><Fingerprint size={100} /></div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    <div className="absolute bottom-6 left-6 flex items-center gap-2 pointer-events-none">
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${selectedItem.type === 'youtube' ? 'bg-red-500' : 'bg-cyan-400'}`} />
                        <span className={`font-brand text-[8px] font-black uppercase tracking-[0.4em] ${selectedItem.type === 'youtube' ? 'text-red-500' : 'text-cyan-400'}`}>
                            {selectedItem.type === 'youtube' ? 'Video Feed Active' : 'Node Tracking Active'}
                        </span>
                    </div>
                </div>

                {/* Content Section (Right/Bottom) */}
                <div className="flex-1 p-8 lg:p-12 flex flex-col justify-between">
                    <div className="space-y-6">
                        <span className={`font-brand text-[9px] font-black uppercase tracking-[0.3em] inline-block mb-1 ${selectedItem.type === 'youtube' ? 'text-red-500' : 'text-cyan-400'}`}>
                            {selectedItem.type === 'youtube' ? 'Hyzen.TV Stream' : 'Identity Analysis'}
                        </span>
                        <h2 className="text-2xl lg:text-4xl font-black font-title text-white uppercase tracking-tighter leading-tight line-clamp-2">
                            {selectedItem.title || selectedItem.name}
                        </h2>
                        <p className="text-xs lg:text-sm italic text-white/70 leading-relaxed font-sans max-h-[150px] overflow-y-auto scrollbar-hide">
                            "{selectedItem.description || selectedItem.text}"
                        </p>
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[7px] font-mono text-white/30 uppercase tracking-[0.3em]">Temporal Stamp</span>
                            <span className={`text-[10px] font-mono uppercase tracking-tight ${selectedItem.type === 'youtube' ? 'text-red-500' : 'text-cyan-400'}`}>
                                {selectedItem.publishedAt ? new Date(selectedItem.publishedAt).toLocaleDateString() : selectedItem.date}
                            </span>
                        </div>
                        {selectedItem.type !== 'youtube' && (
                            <button onClick={onDeleteRequest} className="p-3 text-white/20 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                        )}
                    </div>
                </div>
                <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-black/40 rounded-full border border-white/10 text-white/60 hover:text-white transition-all backdrop-blur-md z-50"><X size={20} /></button>
            </div>
        </div>
    );
};

export default DetailModal;
