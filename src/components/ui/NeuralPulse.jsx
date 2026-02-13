import React from 'react';

const NeuralPulse = () => (
    <div className="inline-flex items-center gap-1 h-full px-1">
        <div className="flex items-end gap-[1.2px] h-3.5">
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-[1.8px] bg-cyan-400/80 rounded-full" style={{ height: '100%', animation: `syncPulse ${1 + i * 0.2}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
            ))}
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
    </div>
);

export default NeuralPulse;
