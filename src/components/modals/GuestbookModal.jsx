import React, { useRef, useEffect } from 'react';
import { X, Loader2, Camera, LogIn, Save, Image as ImageIcon } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../../hooks/useFirebase';
import { motion } from 'framer-motion';

const GuestbookModal = ({
    isOpen,
    onClose,
    user,
    loginWithGoogle,
    newMessage,
    setNewMessage,
    isUploading,
    setIsUploading,
    compressImage,
    editMode = false,
    messageId = null
}) => {
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

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

        // If not logged in, prompt login
        if (!user) {
            loginWithGoogle();
            return;
        }

        if (!newMessage.text.trim() || isUploading) return;

        setIsUploading(true);
        try {
            const collectionPath = ['artifacts', appId, 'public', 'data', 'messages'];

            if (editMode && messageId) {
                // Update existing document
                const docRef = doc(db, ...collectionPath, messageId);
                await updateDoc(docRef, {
                    text: newMessage.text,
                    image: newMessage.image,
                    isEdited: true,
                    updatedAt: serverTimestamp()
                });
            } else {
                // Create new document
                const q = collection(db, ...collectionPath);
                const now = new Date();
                const dateString = now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');
                const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                const fullDateTime = `${dateString} ${timeString}`;

                await addDoc(q, {
                    name: user.displayName || 'Anonymous',
                    uid: user.uid,
                    photoURL: user.photoURL,
                    text: newMessage.text,
                    image: newMessage.image,
                    createdAt: serverTimestamp(),
                    date: fullDateTime
                });
            }

            setNewMessage({ name: '', text: '', image: null });
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to save message.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
            <div
                className="w-[95%] md:w-full max-w-md bg-white/95 backdrop-blur-3xl rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white/60 flex flex-col h-[85dvh] md:max-h-[800px] ring-1 ring-white/20"
            >
                {/* Header: UPDATED Vivid Gradient */}
                <div className="flex justify-between items-center px-5 py-4 md:px-6 md:py-5 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-white z-10 shadow-lg shadow-rose-500/20 shrink-0">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold tracking-tight font-brand text-white">
                            {editMode ? 'Edit Memory' : 'New Memory'}
                        </h2>
                        <span className="text-[10px] text-white/80 font-tech tracking-widest uppercase">
                            Share your moment
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/90 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {!user ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center px-8 bg-white/50">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center text-pink-500 mb-2 shadow-inner">
                            <LogIn size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="font-brand text-xl font-bold text-gray-800">Authentication Required</p>
                            <p className="text-gray-500 text-sm leading-relaxed">Please sign in with Google to leave your mark on the guestbook.</p>
                        </div>
                        <button
                            onClick={loginWithGoogle}
                            className="w-full py-4 bg-black text-white rounded-xl font-bold hover:scale-[1.02] transition-transform font-tech uppercase tracking-widest shadow-xl shadow-orange-500/10 flex items-center justify-center gap-3 mt-4"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                            <span>Sign in with Google</span>
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden bg-white/50 h-full">

                        {/* TOP: Image Area - 50% Height */}
                        <div className="relative w-full flex-1 bg-gray-50/50 border-b border-gray-100 group flex items-center justify-center overflow-hidden shrink-0 basis-0 min-h-0">
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />

                            {newMessage.image ? (
                                <div className="relative w-full h-full bg-black">
                                    <img src={newMessage.image} className="w-full h-full object-contain absolute inset-0" alt="Preview" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                                    <button
                                        type="button"
                                        onClick={() => setNewMessage(p => ({ ...p, image: null }))}
                                        className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-red-500 transition-all backdrop-blur-md shadow-lg"
                                        title="Remove Image"
                                    >
                                        <X size={18} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-4 right-4 px-5 py-2.5 bg-white text-black text-[10px] font-bold rounded-full shadow-xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-opacity duration-300 uppercase font-tech tracking-widest"
                                    >
                                        Change Photo
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center gap-4 text-gray-400 group-hover:text-pink-500 transition-colors w-full h-full p-6"
                                >
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-orange-400 to-pink-500 blur-xl opacity-0 group-hover:opacity-30 transition-opacity rounded-full" />
                                        <div className="relative p-5 rounded-2xl bg-white border-2 border-dashed border-gray-200 group-hover:border-pink-300 transition-all shadow-sm">
                                            <Camera size={28} strokeWidth={1.5} />
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase font-tech tracking-[0.25em]">Tap to Upload Visual</span>
                                </button>
                            )}

                            {isUploading && (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center flex-col gap-4 z-20">
                                    <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
                                </div>
                            )}
                        </div>

                        {/* BOTTOM: Text Area - 50% Height */}
                        <div className="flex-1 p-5 md:p-6 flex flex-col bg-white shrink-0 basis-0 min-h-0">
                            <div className="flex items-center gap-3 mb-4 shrink-0">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border-2 border-orange-100 shadow-sm object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400">
                                        <user size={20} />
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900 font-brand tracking-tight">{user.displayName}</span>
                                    <span className="text-[9px] text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500 font-tech font-bold tracking-wider">OFFICIAL TRANSMISSION</span>
                                </div>
                            </div>

                            <textarea
                                ref={textareaRef}
                                placeholder="What's on your mind?"
                                className="flex-1 w-full bg-transparent border-none outline-none resize-none font-sans text-base leading-relaxed placeholder:text-gray-300 text-gray-800"
                                value={newMessage.text}
                                onChange={e => setNewMessage({ ...newMessage, text: e.target.value })}
                                required
                            />
                        </div>

                        {/* Footer Action - Fixed at bottom */}
                        <div className="p-4 md:p-5 border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm shrink-0">
                            <button
                                type="submit"
                                className="w-full py-3.5 md:py-4 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                                disabled={isUploading || !newMessage.text.trim()}
                            >
                                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                <span className="font-tech uppercase tracking-[0.2em] ml-1">
                                    {editMode ? "Save Changes" : "Publish Memory"}
                                </span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default React.memo(GuestbookModal);
