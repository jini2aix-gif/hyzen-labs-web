import React from 'react';

const SectionNav = ({ currentIndex, onNavigate }) => {
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex md:hidden items-center gap-4 px-6 py-3 bg-white/80 backdrop-blur-md rounded-full border border-gray-100 shadow-xl shadow-black/5">
            <button
                onClick={() => onNavigate(0)}
                className={`font-tech text-[10px] tracking-widest uppercase transition-colors ${currentIndex === 0 ? 'text-black font-bold' : 'text-gray-400 hover:text-gray-600'}`}
            >
                01 Play
            </button>
            <div className="w-[1px] h-3 bg-gray-200"></div>
            <button
                onClick={() => onNavigate(1)}
                className={`font-tech text-[10px] tracking-widest uppercase transition-colors ${currentIndex === 1 ? 'text-black font-bold' : 'text-gray-400 hover:text-gray-600'}`}
            >
                02 Runner's
            </button>
        </div>
    );
};

export default React.memo(SectionNav);
