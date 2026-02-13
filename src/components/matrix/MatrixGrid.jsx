import React, { forwardRef } from 'react';
import { User } from 'lucide-react';

const MatrixGrid = forwardRef(({
    messages,
    currentSection,
    onSectionChange,
    isSynthesizing,
    onItemClick,
    scrollRef
}, ref) => {
    return (
        <div className="matrix-container flex flex-col">
            {/* Section Tabs */}
            <div className="flex items-center gap-6 px-4 py-3 border-b border-white/5 bg-black/20 backdrop-blur-sm z-10 sticky top-0 shrink-0">
                <button
                    onClick={() => onSectionChange('guestbook')}
                    className={`text-[9px] font-brand font-black tracking-[0.2em] transition-all ${currentSection === 'guestbook' ? 'text-cyan-400 scale-105' : 'text-white/20 hover:text-white/50'}`}
                >
                    GUESTBOOK
                </button>
                <button
                    onClick={() => onSectionChange('portfolio')}
                    className={`text-[9px] font-brand font-black tracking-[0.2em] transition-all ${currentSection === 'portfolio' ? 'text-red-500 scale-105' : 'text-white/20 hover:text-white/50'}`}
                >
                    HYZEN.TV
                </button>
            </div>

            {isSynthesizing && <div className="energy-sweep-layer" />}

            <div className="matrix-grid flex-1" ref={ref || scrollRef}>
                {messages.map((item, idx) => (
                    <div
                        key={item.id || idx}
                        className={`data-packet group ${isSynthesizing ? 'animate-quantum-synthesis' : `packet-drift-${idx % 4}`}`}
                        style={{ animationDelay: isSynthesizing ? `${idx * 0.02}s` : '0s', opacity: isSynthesizing ? 0 : 0.8 }}
                        onClick={() => onItemClick(item)}
                    >
                        <div className="absolute inset-0 overflow-hidden">
                            {(item.image || item.thumbnail) ? (
                                <img
                                    src={item.image || item.thumbnail}
                                    className={`absolute inset-0 w-full h-full object-cover opacity-60 brightness-75 group-hover:opacity-100 transition-all duration-500 ${currentSection === 'portfolio' ? 'group-hover:scale-110' : ''}`}
                                    alt=""
                                />
                            ) : (
                                <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center">
                                    <User size={18} className="text-white/10" />
                                </div>
                            )}

                            {/* Play Icon Overlay for Video */}
                            {currentSection === 'portfolio' && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="w-8 h-8 rounded-full bg-red-600/90 flex items-center justify-center blur-[1px] group-hover:blur-0 transition-all">
                                        <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[8px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                            <span className={`block text-[8px] font-brand font-black truncate uppercase tracking-tight ${currentSection === 'portfolio' ? 'text-white/90' : 'text-cyan-400/80'}`}>
                                {item.title || item.name || 'ANON'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default MatrixGrid;
