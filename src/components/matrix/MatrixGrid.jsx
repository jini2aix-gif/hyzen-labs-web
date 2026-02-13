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
    // Pagination State
    const [currentPage, setCurrentPage] = React.useState(0);
    const itemsPerPage = 12; // 4 cols x 3 rows = 12 items (No scroll, max 3 vertical)
    // Filter messages based on section if needed, but App.jsx handles passing correct array
    const totalPages = Math.ceil(messages.length / itemsPerPage);

    // Swipe State
    const touchStart = React.useRef(null);
    const touchEnd = React.useRef(null);

    // Reset page when section changes
    React.useEffect(() => {
        setCurrentPage(0);
    }, [currentSection]);

    // Swipe Handlers
    const onTouchStart = (e) => {
        touchEnd.current = null;
        touchStart.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e) => {
        touchEnd.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;
        const distance = touchStart.current - touchEnd.current;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        if (isLeftSwipe && currentPage < totalPages - 1) {
            setCurrentPage(prev => prev + 1);
        }
        if (isRightSwipe && currentPage > 0) {
            setCurrentPage(prev => prev - 1);
        }
    };

    // Determine Animation Direction
    // Determine Animation Direction
    const prevSectionRef = React.useRef(currentSection);
    const prevPageRef = React.useRef(currentPage);
    const [animClass, setAnimClass] = React.useState('');

    React.useEffect(() => {
        // Section Switch Animation
        if (prevSectionRef.current !== currentSection) {
            if (currentSection === 'portfolio') {
                setAnimClass('animate-slide-in-right');
            } else {
                setAnimClass('animate-slide-in-left');
            }
            prevSectionRef.current = currentSection;
            // Page reset is handled in the other useEffect
        }
        // Page Switch Animation
        else if (prevPageRef.current !== currentPage) {
            if (currentPage > prevPageRef.current) {
                setAnimClass('animate-slide-in-right');
            } else {
                setAnimClass('animate-slide-in-left');
            }
            prevPageRef.current = currentPage;
        }
    }, [currentSection, currentPage]);

    const currentItems = messages.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

    return (
        <div className="matrix-container flex flex-col h-full relative matrix-perspective" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
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
                    PORTFOLIO
                </button>
            </div>

            {isSynthesizing && <div className="energy-sweep-layer" />}

            <div
                key={`${currentSection}-${currentPage}`}
                className={`grid grid-cols-4 grid-rows-[repeat(3,minmax(0,1fr))] gap-1.5 p-2 pb-32 flex-1 min-h-0 w-full content-stretch transform-style-3d ${animClass}`}
                ref={ref || scrollRef}
            >
                {currentItems.map((item, idx) => (
                    <div
                        key={item.id || idx}
                        className={`data-packet group aspect-square relative overflow-hidden bg-zinc-900/50 border border-white/5 hover:border-white/20 transition-all cursor-pointer 
                        ${isSynthesizing ? 'animate-quantum-synthesis' : `packet-drift-${idx % 4}`}`}
                        style={{ animationDelay: isSynthesizing ? `${idx * 0.02}s` : '0s', opacity: isSynthesizing ? 0 : 0.8 }}
                        onClick={() => onItemClick(item)}
                    >
                        {/* Image / Thumbnail */}
                        <div className="absolute inset-0">
                            {(item.image || item.thumbnail) ? (
                                <img
                                    src={item.image || item.thumbnail}
                                    className={`w-full h-full object-cover opacity-90 brightness-110 group-hover:opacity-100 transition-all duration-500 ${currentSection === 'portfolio' ? 'group-hover:scale-110' : ''}`}
                                    alt=""
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/10">
                                    <User size={18} />
                                </div>
                            )}
                        </div>

                        {/* Play Icon Overlay for Video (Simple) */}
                        {currentSection === 'portfolio' && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="w-8 h-8 rounded-full bg-red-600/90 flex items-center justify-center blur-[1px] group-hover:blur-0 transition-all">
                                    <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[8px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
                                </div>
                            </div>
                        )}

                        {/* Title Overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                            <span className={`block text-[8px] font-brand font-black truncate uppercase tracking-tight ${currentSection === 'portfolio' ? 'text-white/90' : 'text-cyan-400/80'}`}>
                                {item.title || item.name || 'ANON'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Indicators */}
            {totalPages > 1 && (
                <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-2 pointer-events-none">
                    <span className="text-[8px] font-brand font-black text-white/30 tracking-widest">
                        PAGE {String(currentPage + 1).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
                    </span>
                    <div className="flex gap-1">
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-0.5 rounded-full transition-all duration-300 ${i === currentPage ? (currentSection === 'portfolio' ? 'w-4 bg-red-500' : 'w-4 bg-cyan-400') : 'w-1 bg-white/20'}`}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

export default MatrixGrid;
