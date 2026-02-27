import React, { useRef, useEffect, useCallback, memo } from 'react';
import { X, Loader2, Camera, LogIn, Save, Trash2, ImagePlus, Bold, Palette, Heading1, Heading2, Type } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../../hooks/useFirebase';

const EditableBlock = memo(({ id, content, onChange, onFocus, onPasteImage, isFirst }) => {
    const elRef = useRef(null);

    useEffect(() => {
        if (elRef.current && content !== undefined && elRef.current.innerHTML !== content) {
            elRef.current.innerHTML = content;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handlePaste = async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) {
                    const selection = window.getSelection();
                    let savedRange = null;
                    if (selection.rangeCount > 0) {
                        savedRange = selection.getRangeAt(0).cloneRange();
                    }

                    const compressed = await onPasteImage(file);
                    if (compressed && elRef.current) {
                        elRef.current.focus();
                        if (savedRange) {
                            selection.removeAllRanges();
                            selection.addRange(savedRange);
                        } else {
                            // If no range, fallback to end
                            const range = document.createRange();
                            range.selectNodeContents(elRef.current);
                            range.collapse(false);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                        const imgHTML = `<br/><img src="${compressed}" class="max-w-full rounded-2xl mx-auto my-4 shadow-sm border border-gray-100" style="max-height: 600px; object-fit: contain;" alt="media" /><br/>`;
                        document.execCommand('insertHTML', false, imgHTML);
                        onChange(elRef.current.innerHTML);
                    }
                }
                return;
            }
        }
    };

    return (
        <div
            ref={elRef}
            contentEditable
            onInput={(e) => onChange(e.currentTarget.innerHTML)}
            onFocus={onFocus}
            onPaste={handlePaste}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '50px' }}
            className="w-full bg-transparent border-none outline-none font-sans text-[17px] leading-[1.8] text-gray-800 py-2 focus:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 cursor-text format-area"
            data-placeholder={isFirst ? "본문 내용을 입력하세요. 상단 '볼드/컬러' 툴바를 활용할 수 있습니다." : "내용을 계속해서 입력하세요..."}
        />
    );
});

const BlogWriteModal = ({
    isOpen,
    onClose,
    user,
    loginWithGoogle,
    newPost, // Expected shape: { title: '', blocks: [{ id: '1', type: 'text', content: '' }] }
    setNewPost,
    isUploading,
    setIsUploading,
    compressImage,
    editMode = false,
    postId = null
}) => {
    const fileInputRef = useRef(null);
    const activeBlockIndexRef = useRef(null);
    const savedRangeRef = useRef(null);
    const [localPost, setLocalPost] = React.useState({ title: '', blocks: [] });

    useEffect(() => {
        if (isOpen) {
            setLocalPost(newPost || { title: '', blocks: [{ id: 'init', type: 'text', content: '' }] });
            document.body.style.overflow = 'hidden';
            document.getElementById('blog-title-input')?.focus();
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleTextChange = (index, value) => {
        setLocalPost(prev => {
            const updatedBlocks = [...prev.blocks];
            updatedBlocks[index].content = value;
            return { ...prev, blocks: updatedBlocks };
        });
    };

    const triggerImageUpload = (index) => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedRangeRef.current = selection.getRangeAt(0).cloneRange();
        } else {
            savedRangeRef.current = null;
        }
        activeBlockIndexRef.current = index;
        fileInputRef.current?.click();
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const compressed = await compressImage(file);

        const blockIndex = activeBlockIndexRef.current !== null && activeBlockIndexRef.current !== -1 ? activeBlockIndexRef.current : localPost.blocks.length - 1;
        const areas = document.querySelectorAll('.format-area');
        const targetArea = areas[blockIndex];

        if (targetArea) {
            targetArea.focus();
            const selection = window.getSelection();
            if (savedRangeRef.current) {
                selection.removeAllRanges();
                selection.addRange(savedRangeRef.current);
            } else {
                const range = document.createRange();
                range.selectNodeContents(targetArea);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }

            const imgHTML = `<br/><img src="${compressed}" class="max-w-full rounded-2xl mx-auto my-4 shadow-sm border border-gray-100" style="max-height: 600px; object-fit: contain;" alt="media" /><br/>`;
            document.execCommand('insertHTML', false, imgHTML);

            setLocalPost(prev => {
                const currentBlocks = [...prev.blocks];
                if (currentBlocks[blockIndex]) {
                    currentBlocks[blockIndex].content = targetArea.innerHTML;
                }
                return { ...prev, blocks: currentBlocks };
            });
        }

        setIsUploading(false);
        e.target.value = ''; // Reset input
        savedRangeRef.current = null;
        activeBlockIndexRef.current = null;
    };

    const handleImagePaste = async (file) => {
        setIsUploading(true);
        const compressed = await compressImage(file);
        setIsUploading(false);
        return compressed;
    };

    const removeBlock = (index) => {
        // Only allow removing image blocks to keep text flow simple
        setLocalPost(prev => {
            const currentBlocks = [...prev.blocks];
            if (currentBlocks[index].type === 'image') {
                currentBlocks.splice(index, 1);
                return { ...prev, blocks: currentBlocks };
            }
            return prev;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user) {
            loginWithGoogle();
            return;
        }

        const validBlocks = localPost.blocks.filter(b => b.type === 'image' || (b.type === 'text' && b.content.replace(/<[^>]*>?/gm, '').trim() !== ''));
        if (!localPost.title.trim() || validBlocks.length === 0 || isUploading) return;

        setIsUploading(true);
        try {
            const collectionPath = ['artifacts', appId, 'public', 'data', 'blog'];

            if (editMode && postId) {
                const docRef = doc(db, ...collectionPath, postId);
                await updateDoc(docRef, {
                    title: localPost.title,
                    blocks: validBlocks,
                    isEdited: true,
                    updatedAt: serverTimestamp()
                });
            } else {
                const q = collection(db, ...collectionPath);
                const now = new Date();
                const dateString = now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');
                const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                const fullDateTime = `${dateString} ${timeString}`;

                await addDoc(q, {
                    title: localPost.title,
                    name: user.displayName || 'Anonymous',
                    uid: user.uid,
                    photoURL: user.photoURL,
                    blocks: validBlocks,
                    createdAt: serverTimestamp(),
                    date: fullDateTime
                });
            }
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to save post.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
            <div
                className="w-[95%] md:w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden relative border border-gray-100 flex flex-col h-[85dvh] lg:h-[85vh] ring-1 ring-black/5"
            >
                <div className="flex justify-between items-center px-6 py-5 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 text-white z-10 shadow-lg shrink-0">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold tracking-tight font-brand text-white">
                            {editMode ? 'Edit Runner\'s Log' : 'New Runner\'s Log'}
                        </h2>
                        <span className="text-[10px] text-white/80 font-tech tracking-widest uppercase">
                            Runner's Diary Editor
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/90 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {!user ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center px-8 bg-white/50">
                        <div className="w-20 h-20 rounded-full bg-violet-50 flex items-center justify-center text-violet-500 mb-2 shadow-inner">
                            <LogIn size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="font-brand text-xl font-bold text-gray-800">Authentication Required</p>
                            <p className="text-gray-500 text-sm leading-relaxed">Please sign in with Google to post content.</p>
                        </div>
                        <button
                            onClick={loginWithGoogle}
                            className="w-full py-4 bg-black text-white rounded-xl font-bold hover:scale-[1.02] transition-transform font-tech uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 mt-4"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                            <span>Sign in with Google</span>
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden bg-white h-full relative">
                        {isUploading && (
                            <div className="absolute inset-0 bg-white/95 flex items-center justify-center flex-col gap-4 z-50">
                                <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
                                <span className="font-tech uppercase text-xs tracking-widest text-violet-600">Processing Media...</span>
                            </div>
                        )}
                        <div className="flex-1 overflow-auto p-6 space-y-4 scroll-smooth">
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />

                            <div className="border-b-2 border-violet-50 focus-within:border-violet-200 transition-colors pb-4 shrink-0 relative flex items-center justify-between pt-4 gap-2">
                                <input
                                    id="blog-title-input"
                                    type="text"
                                    placeholder="제목 (Title)"
                                    value={localPost.title || ''}
                                    onChange={e => setLocalPost({ ...localPost, title: e.target.value })}
                                    required
                                    className="flex-1 text-3xl font-bold font-brand text-black outline-none bg-transparent placeholder:text-gray-300 min-w-0"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); document.execCommand('fontSize', false, '6'); }}
                                        className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                                        title="가장 큰 폰트"
                                    >
                                        <Heading1 size={22} />
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); document.execCommand('fontSize', false, '5'); }}
                                        className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                                        title="큰 폰트"
                                    >
                                        <Heading2 size={22} />
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); document.execCommand('fontSize', false, '3'); }}
                                        className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                                        title="기본 폰트"
                                    >
                                        <Type size={22} />
                                    </button>
                                    <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold', false, null); }}
                                        className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                                        title="굵게 (Bold)"
                                    >
                                        <Bold size={22} />
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); document.execCommand('foreColor', false, '#8B5CF6'); }}
                                        className="p-2 text-gray-400 hover:text-violet-500 hover:bg-violet-50 rounded-full transition-colors"
                                        title="포인트 컬러 (Violet)"
                                    >
                                        <Palette size={22} />
                                    </button>
                                    <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>
                                    <button
                                        type="button"
                                        onClick={() => triggerImageUpload(-1)}
                                        className="p-2 text-gray-400 hover:text-violet-500 hover:bg-violet-50 rounded-full transition-colors"
                                        title="이미지 추가"
                                    >
                                        <ImagePlus size={22} />
                                    </button>
                                </div>
                            </div>

                            {/* Block Editor Area */}
                            <div className="flex-1 flex flex-col w-full h-full pb-20">
                                {(localPost.blocks || []).map((block, index) => {
                                    if (block.type === 'text') {
                                        return (
                                            <div key={block.id} className="relative flex flex-col w-full">
                                                <EditableBlock
                                                    id={block.id}
                                                    content={block.content}
                                                    onChange={(value) => handleTextChange(index, value)}
                                                    onFocus={() => { activeBlockIndexRef.current = index; }}
                                                    onPasteImage={handleImagePaste}
                                                    isFirst={index === 0}
                                                />
                                            </div>
                                        );
                                    } else if (block.type === 'image') {
                                        return (
                                            <div key={block.id} className="relative group w-full my-6 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden flex items-center justify-center">
                                                <img src={block.url} alt="Uploaded block" className="max-w-full h-auto object-contain" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeBlock(index)}
                                                    className="absolute top-4 right-4 p-2 bg-white/90 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-md opacity-0 group-hover:opacity-100"
                                                    title="Remove Image"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}

                                {/* Dummy space so the user can easily click/type at the bottom */}
                                <div className="flex-1 min-h-[100px]" onClick={() => {
                                    const texts = document.querySelectorAll('.format-area');
                                    if (texts.length > 0) texts[texts.length - 1].focus();
                                }}></div>
                            </div>

                        </div>

                        {/* Fixed Footer Action */}
                        <div className="px-6 py-4 bg-white border-t border-gray-50 shrink-0 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
                            <button
                                type="submit"
                                className="w-full py-4 bg-violet-500 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                disabled={isUploading || !localPost.title?.trim() || (localPost.blocks || []).filter(b => b.type === 'image' || (b.type === 'text' && b.content.replace(/<[^>]*>?/gm, '').trim() !== '')).length === 0}
                            >
                                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                <span className="font-tech uppercase tracking-[0.2em] ml-1">
                                    {editMode ? "Update Post" : "Publish Post"}
                                </span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default React.memo(BlogWriteModal);
