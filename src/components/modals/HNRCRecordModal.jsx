import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, MapPin, Send, Save, Clock, Zap } from 'lucide-react';

const WheelPicker = ({ items, value, onChange, label }) => {
    const scrollRef = useRef(null);
    const itemHeight = 40; // px

    useEffect(() => {
        const index = items.indexOf(value);
        if (index !== -1 && scrollRef.current) {
            // Use setTimeout to ensure the container is rendered and scrollable
            const timer = setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = index * itemHeight;
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [value]); // Update whenever value changes from outside (like initialData load)

    const handleScroll = (e) => {
        const scrollTop = e.target.scrollTop;
        const index = Math.round(scrollTop / itemHeight);
        if (items[index] !== undefined && items[index] !== value) {
            onChange(items[index]);
        }
    };

    return (
        <div className="flex flex-col items-center">
            <span className="text-[10px] font-black opacity-40 mb-2 uppercase tracking-tighter">{label}</span>
            <div className="relative h-[120px] w-12 overflow-hidden flex flex-col items-center">
                {/* Overlay Highlights */}
                <div className="absolute top-[40px] left-0 w-full h-[40px] border-y border-white/20 pointer-events-none z-10 bg-white/10"></div>

                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="w-full h-full overflow-y-scroll snap-y snap-mandatory py-[40px] scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                >
                    {items.map((item, i) => (
                        <div
                            key={i}
                            className={`h-[40px] flex items-center justify-center snap-center transition-all duration-200 font-mono tabular-nums w-full text-center ${value === item ? 'text-white font-bold scale-110' : 'text-white/30 text-sm font-bold scale-100'}`}
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                            {item.toString().padStart(2, '0')}
                        </div>
                    ))}
                    {/* Padding bottom */}
                    {/* <div className="h-[40px] shrink-0"></div> */}
                </div>
            </div>
        </div>
    );
};

const HNRCRecordModal = ({ isOpen, onClose, user, onSubmit, initialData }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [distance, setDistance] = useState(5.0);

    // Time components
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(30);
    const [seconds, setSeconds] = useState(0);

    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const calculatePace = (dist, h, m, s) => {
        const totalSeconds = (h * 3600) + (m * 60) + s;
        if (dist === 0 || totalSeconds === 0) return "--'--\"";

        const secondsPerKm = totalSeconds / dist;
        const paceMin = Math.floor(secondsPerKm / 60);
        const paceSec = Math.round(secondsPerKm % 60);

        return `${paceMin}'${paceSec.toString().padStart(2, '0')}"`;
    };

    const pace = calculatePace(distance, hours, minutes, seconds);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title || '');
                setContent(initialData.content || '');
                setDistance(initialData.distance || 5.0);
                const t = initialData.time || '00:30:00';
                const parts = t.split(':');
                setHours(parseInt(parts[0]) || 0);
                setMinutes(parseInt(parts[1]) || 0);
                setSeconds(parseInt(parts[2]) || 0);
                setImagePreview(initialData.image || null);
            } else {
                setTitle('');
                setContent('');
                setDistance(5.0);
                setHours(0);
                setMinutes(30);
                setSeconds(0);
                setImagePreview(null);
            }
        }
    }, [isOpen, initialData]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDistanceChange = (e) => {
        setDistance(parseFloat(e.target.value));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            alert('제목과 내용을 입력해주세요.');
            return;
        }

        onSubmit({
            ...(initialData || {}),
            author: user?.displayName || 'Guest Runner',
            authorId: user?.uid || 'guest',
            authorPhoto: user?.photoURL || null,
            title,
            content,
            distance: parseFloat(distance),
            time: timeString,
            pace,
            image: imagePreview,
            timestamp: initialData?.timestamp || new Date()
        });

        onClose();
    };

    if (!isOpen) return null;

    const hoursItems = [...Array(24).keys()];
    const minsItems = [...Array(60).keys()];
    const secsItems = [...Array(60).keys()];

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[150] flex items-center justify-center p-4"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
            >
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                >
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">러닝 기록</h3>
                        <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        <form id="hnrc-form" onSubmit={handleSubmit} className="space-y-6">

                            {/* Stats Display Pane */}
                            <div className="bg-indigo-600 rounded-3xl p-5 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Zap size={80} />
                                </div>
                                <div className="relative z-10 space-y-6">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">DISTANCE</p>
                                            <p className="text-4xl font-black italic">{distance.toFixed(1)}<span className="text-sm not-italic opacity-60 ml-1">KM</span></p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">PACE</p>
                                            <p className="text-2xl font-black italic">{pace}</p>
                                        </div>
                                    </div>

                                    <input
                                        type="range"
                                        min="0.1"
                                        max="50.0"
                                        step="0.1"
                                        value={distance}
                                        onChange={handleDistanceChange}
                                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                                    />

                                    <div className="flex flex-col items-center pt-4 border-t border-white/10">
                                        <div className="flex items-center gap-6">
                                            <WheelPicker items={hoursItems} value={hours} onChange={setHours} label="HR" />
                                            <div className="h-full flex items-center pt-6 opacity-30 font-black">:</div>
                                            <WheelPicker items={minsItems} value={minutes} onChange={setMinutes} label="MIN" />
                                            <div className="h-full flex items-center pt-6 opacity-30 font-black">:</div>
                                            <WheelPicker items={secsItems} value={seconds} onChange={setSeconds} label="SEC" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="오늘 러닝의 한 줄 요약 (제목)"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-transparent border-b-2 border-gray-100 py-3 text-xl font-bold text-gray-900 focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-300"
                                    />
                                </div>
                                <div>
                                    <textarea
                                        placeholder="바람, 호흡, 발끝의 감각... 어땠나요?"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        rows={4}
                                        className="w-full bg-gray-50 rounded-2xl p-4 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-transparent focus:border-indigo-500 transition-all placeholder-gray-400 resize-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                />
                                {imagePreview ? (
                                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white font-bold text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">사진 변경</span>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current.click()}
                                        className="w-full py-8 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-500 transition-all group"
                                    >
                                        <div className="p-3 bg-gray-100 rounded-full group-hover:bg-indigo-50 transition-colors">
                                            <Camera size={24} />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-widest">사진 첨부</span>
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end sticky bottom-0">
                        <button
                            type="submit"
                            form="hnrc-form"
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-black text-white px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-indigo-600 hover:scale-105 transition-all shadow-lg"
                        >
                            {initialData ? (
                                <>변경사항 저장 <Save size={14} /></>
                            ) : (
                                <>기록 업로드 <Send size={14} /></>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default HNRCRecordModal;
