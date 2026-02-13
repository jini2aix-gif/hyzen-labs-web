import React, { useRef } from 'react';
import { X, Loader2, Camera } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../../hooks/useFirebase';

const GuestbookModal = ({
    isOpen,
    onClose,
    modalExitDir,
    modalDragY,
    handleModalTouchStart,
    handleModalTouchMove,
    handleModalTouchEnd,
    playSystemSound,
    setModalExitDir,
    newMessage,
    setNewMessage,
    isUploading,
    setIsUploading,
    compressImage
}) => {
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setIsUploading(true);
            const compressed = await compressImage(file);
            setNewMessage(prev => ({ ...prev, image: compressed }));
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newMessage.name || !newMessage.text || isUploading) return;
        setIsUploading(true);
        try {
            const q = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
            const now = new Date();
            const dateString = now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');
            const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
            const fullDateTime = `${dateString} ${timeString}`;
            await addDoc(q, { name: newMessage.name, text: newMessage.text, image: newMessage.image, createdAt: serverTimestamp(), date: fullDateTime });
            setNewMessage({ name: '', text: '', image: null });
            setModalExitDir('up');
            setTimeout(onClose, 400);
            playSystemSound('popup');
        } catch (err) { console.error(err); } finally { setIsUploading(false); }
    };

    return (
        <div className="fixed inset-0 z-[7000] flex items-end sm:items-center justify-center bg-black/95 backdrop-blur-3xl" onClick={onClose}>
            <div
                className={`w-full sm:max-w-md glass-panel rounded-t-[3.5rem] sm:rounded-[2.5rem] p-10 sm:p-12 shadow-[0_0_100px_rgba(34,211,238,0.1)] relative cursor-grab active:cursor-grabbing transition-all duration-300
          ${modalExitDir === 'up' ? 'modal-exit-up' : ''} 
          ${modalExitDir === 'down' ? 'modal-exit-down' : ''}
        `}
                style={{
                    transform: modalExitDir ? undefined : `translateY(${modalDragY}px) scale(${1 - Math.abs(modalDragY) / 2000})`,
                    opacity: modalExitDir ? undefined : 1 - Math.abs(modalDragY) / 800
                }}
                onClick={e => e.stopPropagation()}
                onTouchStart={handleModalTouchStart}
                onTouchMove={handleModalTouchMove}
                onTouchEnd={handleModalTouchEnd}
            >
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/10 rounded-full" />
                <div className="flex justify-between items-center mb-10 pointer-events-none">
                    <div className="flex flex-col gap-1.5">
                        <h2 className="text-xl font-black font-brand uppercase tracking-tight text-white">New Trace</h2>
                        <span className="text-[7px] font-mono text-cyan-400/60 uppercase tracking-[0.4em]">Swipe Up/Down to Dismiss</span>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-white/5 rounded-full hover:bg-white/10 transition-all text-white/40 pointer-events-auto"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-10">
                    <div className="space-y-1.5">
                        <label className="text-[8px] font-brand text-cyan-400/60 uppercase tracking-[0.3em] ml-1">Identity Name</label>
                        <input type="text" placeholder="AUTHOR_ID" className="w-full bg-white/5 border-b border-white/10 px-1 py-4 text-sm font-brand outline-none focus:border-cyan-500 transition-all uppercase tracking-widest text-white placeholder:text-white/10" value={newMessage.name} onChange={e => setNewMessage({ ...newMessage, name: e.target.value.toUpperCase() })} required />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[8px] font-brand text-cyan-400/60 uppercase tracking-[0.3em] ml-1">Narrative Data</label>
                        <textarea placeholder="ENTER FRAGMENTED THOUGHTS..." className="w-full h-24 bg-white/5 border-b border-white/10 px-1 py-4 text-sm font-title outline-none focus:border-cyan-500 resize-none transition-all text-white/90 placeholder:text-white/10" value={newMessage.text} onChange={e => setNewMessage({ ...newMessage, text: e.target.value })} required />
                    </div>
                    <div className="flex flex-col gap-3">
                        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className={`h-16 flex items-center justify-center gap-4 rounded-3xl border transition-all ${newMessage.image ? 'border-cyan-500 text-cyan-400 bg-cyan-400/5' : 'border-white/10 text-white/30 hover:border-white/20'}`}>
                            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                            <span className="text-[9px] font-brand font-black uppercase tracking-widest">{newMessage.image ? "Visual Ready" : "Attach Image"}</span>
                        </button>
                    </div>
                    {newMessage.image && <div className="w-full h-32 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl"><img src={newMessage.image} className="w-full h-full object-cover" alt="Preview" /></div>}
                    <button type="submit" className="w-full h-14 bg-white text-black rounded-2xl font-brand font-black uppercase tracking-[0.5em] text-[13px] active:scale-[0.98] disabled:opacity-50 shadow-xl transition-all hover:bg-cyan-400" disabled={isUploading}>{isUploading ? "Syncing..." : "SYNC"}</button>
                </form>
            </div>
        </div>
    );
};

export default React.memo(GuestbookModal);
