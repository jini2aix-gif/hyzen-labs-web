import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Header from './components/layout/Header';
const ArbiscanDashboard = React.lazy(() => import('./components/dashboard/ArbiscanDashboard'));
const ArbiRunDashboard = React.lazy(() => import('./components/dashboard/AviDashboard'));

const ZeroGDrift = React.lazy(() => import('./components/games/ZeroGDrift'));
const PulseDash = React.lazy(() => import('./components/games/PulseDash'));
const NeonGhostRun = React.lazy(() => import('./components/games/NeonGhostRun'));
const LikeADino = React.lazy(() => import('./components/games/LikeADino'));

import { useFirebase } from './hooks/useFirebase';
import { compressImage } from './utils/image';

const App = () => {
  const { db, appId } = useFirebase();

  // Navigation State
  const [viewIndex, setViewIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  // Swipe State
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const isNavigating = useRef(false);

  // Modal State (Global)
  const [isZeroGOpen, setIsZeroGOpen] = useState(false);
  const [isPulseDashOpen, setIsPulseDashOpen] = useState(false);
  const [isNeonGhostOpen, setIsNeonGhostOpen] = useState(false);
  const [isLikeADinoOpen, setIsLikeADinoOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isAnyModalOpenFromSections, setIsAnyModalOpenFromSections] = useState(false);

  const isAnyModalOpen = React.useMemo(() => {
    return isZeroGOpen || isPulseDashOpen || isNeonGhostOpen || isLikeADinoOpen || isAnyModalOpenFromSections;
  }, [isZeroGOpen, isPulseDashOpen, isNeonGhostOpen, isLikeADinoOpen, isAnyModalOpenFromSections]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1200); // 1s visible + transition padding
    return () => clearTimeout(timer);
  }, []);


  // Game Modal Handlers
  const handleOpenZeroG = useCallback(() => {
    setIsZeroGOpen(true);
  }, []);

  const handleCloseZeroG = useCallback(() => {
    setIsZeroGOpen(false);
  }, []);

  const handleOpenPulseDash = useCallback(() => {
    setIsPulseDashOpen(true);
  }, []);

  const handleClosePulseDash = useCallback(() => {
    setIsPulseDashOpen(false);
  }, []);

  const handleOpenNeonGhost = useCallback(() => {
    setIsNeonGhostOpen(true);
  }, []);

  const handleCloseNeonGhost = useCallback(() => {
    setIsNeonGhostOpen(false);
  }, []);

  const handleOpenLikeADino = useCallback(() => {
    setIsLikeADinoOpen(true);
  }, []);

  const handleCloseLikeADino = useCallback(() => {
    setIsLikeADinoOpen(false);
  }, []);

  // Swipe Handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e) => {
    if (isAnyModalOpen) return;
    const currentEnd = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    setTouchEnd(currentEnd);

    // Prevent browser swipe-to-go-back/forward at navigation boundaries
    if (touchStart) {
      const distanceX = touchStart.x - currentEnd.x;
      const distanceY = touchStart.y - currentEnd.y;
      const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
      if (isHorizontalSwipe) {
        // Block right swipe on first page (would trigger browser back)
        if (distanceX < 0 && viewIndex === 0) e.preventDefault();
        // Block left swipe on last page (would trigger browser forward)
        // Block left swipe on last page (would trigger browser forward)
        const maxIndex = 1;
        if (distanceX > 0 && viewIndex === maxIndex) e.preventDefault();
      }
    }
  };

  const handleNavigate = (newIndex) => {
    if (newIndex === viewIndex || isNavigating.current) return;

    isNavigating.current = true;
    setDirection(newIndex > viewIndex ? 1 : -1);
    setViewIndex(newIndex);

    // Release look after animation duration
    setTimeout(() => {
      isNavigating.current = false;
    }, 450); // Matches spring animation duration approx
  };

  const onTouchEnd = () => {
    if (isAnyModalOpen) return;
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontalSwipe) {
      const isLeftSwipe = distanceX > minSwipeDistance;
      const isRightSwipe = distanceX < -minSwipeDistance;

      if (isLeftSwipe) {
        const maxIndex = 1;
        if (viewIndex < maxIndex) {
          handleNavigate(viewIndex + 1);
        }
      }
      if (isRightSwipe && viewIndex > 0) {
        handleNavigate(viewIndex - 1);
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="flex flex-col items-center justify-center gap-4 md:gap-6">
                <img src="/hl_logo_clean.png" alt="Hyzen Labs CI" className="h-[60px] md:h-[80px] w-auto object-contain invert" />
                <div className="flex flex-col items-center">
                  <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-gray-900 font-brand">
                    HYZEN LABS.
                  </h2>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-screen w-full bg-white text-black font-sans selection:bg-black selection:text-white overflow-hidden">
        {/* SEO Hidden Header for Search Engines */}
        <h1 style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: '0' }}>
          하이젠 랩스 - Hyzen Labs Advanced AI Research & 게이밍 디지털 융합 연구소
        </h1>

        {!showSplash && (
          <Header
            currentIndex={viewIndex}
            onNavigate={handleNavigate}
            setViewIndex={setViewIndex}
            hidden={isAnyModalOpen}
          />
        )}

        <motion.main
          className="relative h-screen overflow-hidden"
          style={{ perspective: '1200px' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          ref={(el) => {
            if (el) {
              // Must be non-passive to allow preventDefault() on touchmove
              el.addEventListener('touchmove', onTouchMove, { passive: false, capture: false });
            }
          }}
        >
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={viewIndex}
              custom={direction}
              variants={{
                initial: (direction) => ({
                  x: direction > 0 ? '100%' : '-100%',
                  opacity: 0,
                  scale: 0.92,
                  rotateY: direction > 0 ? 30 : -30,
                  zIndex: 0
                }),
                animate: {
                  x: 0,
                  opacity: 1,
                  scale: 1,
                  rotateY: 0,
                  zIndex: 1,
                  position: 'relative'
                },
                exit: (direction) => ({
                  x: direction < 0 ? '100%' : '-100%',
                  opacity: 0,
                  scale: 0.92,
                  rotateY: direction < 0 ? 30 : -30,
                  zIndex: 0,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transition: {
                    duration: 0.4,
                    ease: [0.32, 0, 0.67, 0]
                  }
                })
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{
                x: { type: "spring", damping: 30, stiffness: 200, mass: 1 },
                opacity: { duration: 0.4 },
                scale: { duration: 0.5, ease: "easeOut" },
                rotateY: { duration: 0.5, ease: "easeOut" }
              }}
              style={{ transformOrigin: direction > 0 ? "right center" : "left center", backfaceVisibility: "hidden" }}
              className="w-full h-full"
            >
              <React.Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-white text-black font-brand italic uppercase tracking-widest">Initialising Hyzen Systems...</div>}>
                {viewIndex === 0 ? (
                  <div className="h-full overflow-y-auto bg-[#050505] scroll-smooth">
                    <ArbiRunDashboard />
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto bg-[#050505] scroll-smooth">
                    <ArbiscanDashboard />
                  </div>
                )}
              </React.Suspense>
            </motion.div>
          </AnimatePresence>
        </motion.main>

        {/* Mobile Floating Index */}
        <div className={`md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 bg-black/80 backdrop-blur-md rounded-full shadow-lg border border-white/10 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isAnyModalOpen ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
          <button
            onClick={() => handleNavigate(0)}
            className={`relative overflow-hidden flex items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${viewIndex === 0 ? 'bg-white text-black px-4 py-1.5' : 'bg-transparent text-white/50 w-8 h-8 hover:bg-white/10'}`}
            aria-label="Arbi Run"
          >
            <span className={`text-[10px] font-bold tracking-widest uppercase transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${viewIndex === 0 ? 'opacity-100 max-w-[100px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
              Run
            </span>
            <span className={`text-[10px] font-bold transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] absolute ${viewIndex === 0 ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
              R
            </span>
          </button>
          <button
            onClick={() => handleNavigate(1)}
            className={`relative overflow-hidden flex items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${viewIndex === 1 ? 'bg-white text-black px-4 py-1.5' : 'bg-transparent text-white/50 w-8 h-8 hover:bg-white/10'}`}
            aria-label="Arbiscan"
          >
            <span className={`text-[10px] font-bold tracking-widest uppercase transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${viewIndex === 1 ? 'opacity-100 max-w-[100px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
              Arbi
            </span>
            <span className={`text-[10px] font-bold transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] absolute ${viewIndex === 1 ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
              A
            </span>
          </button>
        </div>

        <React.Suspense fallback={null}>
          <ZeroGDrift
            isOpen={isZeroGOpen}
            onClose={handleCloseZeroG}
          />

          <PulseDash
            isOpen={isPulseDashOpen}
            onClose={handleClosePulseDash}
          />

          <NeonGhostRun
            isOpen={isNeonGhostOpen}
            onClose={handleCloseNeonGhost}
          />

          <LikeADino
            isOpen={isLikeADinoOpen}
            onClose={handleCloseLikeADino}
          />
        </React.Suspense>
      </div >
    </>
  );
};

export default App;