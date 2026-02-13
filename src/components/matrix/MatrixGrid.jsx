import React, { forwardRef } from 'react';
import { User } from 'lucide-react';

const MatrixGrid = forwardRef(({
    messages,
    isSynthesizing,
    onItemClick,
    scrollRef
}, ref) => {
    return (
        <div className="matrix-container">
            {isSynthesizing && <div className="energy-sweep-layer" />}
            <div className="matrix-grid" ref={ref || scrollRef}>
                {messages.map((item, idx) => (
                    <div
                        key={item.id || idx}
                        className={`data-packet group ${isSynthesizing ? 'animate-quantum-synthesis' : `packet-drift-${idx % 4}`}`}
                        style={{ animationDelay: isSynthesizing ? `${idx * 0.02}s` : '0s', opacity: isSynthesizing ? 0 : 0.8 }}
                        onClick={() => onItemClick(item)}
                    >
                        <div className="absolute inset-0 overflow-hidden">
                            {item.image ? (
                                <img
                                    src={item.image}
                                    className="absolute inset-0 w-full h-full object-cover opacity-50 brightness-75 group-hover:opacity-100 transition-all"
                                    alt=""
                                />
                            ) : (
                                <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center">
                                    <User size={18} className="text-white/10" />
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/90 to-transparent">
                            <span className="block text-[6.5px] font-brand font-black text-cyan-400/80 truncate uppercase tracking-tight">
                                {item.name || 'ANON'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default MatrixGrid;
