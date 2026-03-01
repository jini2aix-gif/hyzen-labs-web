import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Header from './components/layout/Header';
const GamePage = React.lazy(() => import('./components/official/GamePage'));
const HNRCSection = React.lazy(() => import('./components/official/HNRCSection'));
const ArbiscanDashboard = React.lazy(() => import('./components/dashboard/ArbiscanDashboard'));

const MyPageModal = React.lazy(() => import('./components/modals/MyPageModal'));
const ZeroGDrift = React.lazy(() => import('./components/games/ZeroGDrift'));
const PulseDash = React.lazy(() => import('./components/games/PulseDash'));
const AuthModal = React.lazy(() => import('./components/modals/AuthModal'));

import { useFirebase } from './hooks/useFirebase';
import { compressImage } from './utils/image';

const App = () => {
  const { user, profile, loginWithGoogle, registerWithEmail, loginWithEmail, appId, db } = useFirebase();

  // Navigation State
  const [viewIndex, setViewIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  // Swipe State
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const isNavigating = useRef(false);

  // Modal State (Global)
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [isZeroGOpen, setIsZeroGOpen] = useState(false);
  const [isPulseDashOpen, setIsPulseDashOpen] = useState(false);
  const [isHNRCModalOpen, setIsHNRCModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1200); // 1s visible + transition padding
    return () => clearTimeout(timer);
  }, []);

  const handleOpenAuthModal = useCallback(() => {
    setAuthInitialMode('login');
    setIsAuthModalOpen(true);
  }, []);

  const handleOpenRegisterModal = useCallback(() => {
    setAuthInitialMode('register');
    setIsAuthModalOpen(true);
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    try {
      await loginWithGoogle();
      setIsAuthModalOpen(false);
    } catch (e) {
      if (e.code === 'auth/popup-blocked') {
        alert('팝업 차단이 감지되었습니다. 브라우저 설정에서 팝업을 허용해 주세요.');
      } else if (e.code === 'auth/unauthorized-domain') {
        alert('인증 도메인 오류가 발생했습니다. 관리자에게 문의하세요.');
      } else if (e.code === 'auth/popup-closed-by-user') {
        // User closed the popup, do nothing
      } else {
        console.error(e);
        alert(`로그인 오류: ${e.message}`);
      }
    }
  }, [loginWithGoogle]);

  // Modal Handlers
  const handleOpenMyPage = useCallback(() => {
    setIsMyPageOpen(true);
  }, []);

  const handleCloseMyPage = useCallback(() => {
    setIsMyPageOpen(false);
  }, []);

  // Game Modal Handlers
  const handleOpenZeroG = useCallback(() => {
    if (!user) { setIsAuthModalOpen(true); return; }
    setIsZeroGOpen(true);
  }, [user]);

  const handleCloseZeroG = useCallback(() => {
    setIsZeroGOpen(false);
  }, []);

  const handleOpenPulseDash = useCallback(() => {
    if (!user) { setIsAuthModalOpen(true); return; }
    setIsPulseDashOpen(true);
  }, [user]);

  const handleClosePulseDash = useCallback(() => {
    setIsPulseDashOpen(false);
  }, []);

  // Swipe Handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e) => setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });

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
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontalSwipe) {
      const isLeftSwipe = distanceX > minSwipeDistance;
      const isRightSwipe = distanceX < -minSwipeDistance;

      if (isLeftSwipe && viewIndex < 2) {
        handleNavigate(viewIndex + 1);
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
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-gray-900">
                Hyzen Labs<span className="text-blue-600">.</span>
              </h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-screen w-full bg-white text-black font-sans selection:bg-black selection:text-white overflow-hidden">
        {/* SEO Hidden Header for Search Engines */}
        <h1 style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: '0' }}>
          하이젠 랩스 - Hyzen Labs AI & 게이밍 연구소
        </h1>

        <Header
          onOpenMyPage={handleOpenMyPage}
          onOpenLoginModal={handleOpenAuthModal}
          currentIndex={viewIndex}
          onNavigate={handleNavigate}
        />

        <motion.main
          className="relative h-screen overflow-hidden"
          style={{ perspective: '1200px' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
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
                  <div className="h-full overflow-y-auto">
                    <GamePage
                      user={user}
                      onOpenZeroG={handleOpenZeroG}
                      onOpenPulseDash={handleOpenPulseDash}
                    />
                  </div>
                ) : viewIndex === 1 ? (
                  <div className="h-full overflow-y-auto bg-gray-50 scroll-smooth">
                    <HNRCSection user={user} profile={profile} onModalChange={setIsHNRCModalOpen} onOpenLoginModal={handleOpenAuthModal} />
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto bg-gray-50 scroll-smooth">
                    <ArbiscanDashboard user={user} onOpenLoginModal={handleOpenAuthModal} onOpenRegisterModal={handleOpenRegisterModal} />
                  </div>
                )}
              </React.Suspense>
            </motion.div>
          </AnimatePresence>
        </motion.main>

        {/* Mobile Floating Index */}
        <div className={`md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 bg-black/80 backdrop-blur-md rounded-full shadow-lg border border-white/10 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isHNRCModalOpen ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
          <button
            onClick={() => handleNavigate(0)}
            className={`relative overflow-hidden flex items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${viewIndex === 0 ? 'bg-white text-black px-4 py-1.5' : 'bg-transparent text-white/50 w-8 h-8 hover:bg-white/10'}`}
            aria-label="Playground"
          >
            <span className={`text-[10px] font-bold tracking-widest uppercase transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${viewIndex === 0 ? 'opacity-100 max-w-[100px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
              Playground
            </span>
            <span className={`text-[10px] font-bold transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] absolute ${viewIndex === 0 ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
              P
            </span>
          </button>
          <button
            onClick={() => handleNavigate(1)}
            className={`relative overflow-hidden flex items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${viewIndex === 1 ? 'bg-white text-black px-4 py-1.5' : 'bg-transparent text-white/50 w-8 h-8 hover:bg-white/10'}`}
            aria-label="HNRC"
          >
            <span className={`text-[10px] font-bold tracking-widest uppercase transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${viewIndex === 1 ? 'opacity-100 max-w-[100px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
              HNRC
            </span>
            <span className={`text-[10px] font-bold transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] absolute ${viewIndex === 1 ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
              H
            </span>
          </button>
          <button
            onClick={() => handleNavigate(2)}
            className={`relative overflow-hidden flex items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${viewIndex === 2 ? 'bg-white text-black px-4 py-1.5' : 'bg-transparent text-white/50 w-8 h-8 hover:bg-white/10'}`}
            aria-label="Arbiscan"
          >
            <span className={`text-[10px] font-bold tracking-widest uppercase transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${viewIndex === 2 ? 'opacity-100 max-w-[100px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
              Arbiscan
            </span>
            <span className={`text-[10px] font-bold transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] absolute ${viewIndex === 2 ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
              A
            </span>
          </button>
        </div>

        <React.Suspense fallback={null}>
          <MyPageModal
            isOpen={isMyPageOpen}
            onClose={handleCloseMyPage}
            user={user}
            profile={profile}
          />

          <ZeroGDrift
            isOpen={isZeroGOpen}
            onClose={handleCloseZeroG}
            user={user}
          />

          <PulseDash
            isOpen={isPulseDashOpen}
            onClose={handleClosePulseDash}
            user={user}
          />

          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onGoogleLogin={handleGoogleLogin}
            onEmailLogin={loginWithEmail}
            onEmailRegister={registerWithEmail}
            initialMode={authInitialMode}
          />
        </React.Suspense>
      </div>
    </>
  );
};

export default App;