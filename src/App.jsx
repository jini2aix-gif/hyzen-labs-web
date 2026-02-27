import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Header from './components/layout/Header';
import GamePage from './components/official/GamePage';
const MyPageModal = React.lazy(() => import('./components/modals/MyPageModal'));
const ZeroGDrift = React.lazy(() => import('./components/games/ZeroGDrift'));
const PulseDash = React.lazy(() => import('./components/games/PulseDash'));
const AuthModal = React.lazy(() => import('./components/modals/AuthModal'));

import { useFirebase } from './hooks/useFirebase';
import { compressImage } from './utils/image';

const App = () => {
  const { user, loginWithGoogle, registerWithEmail, loginWithEmail, appId, db } = useFirebase();

  // Navigation State - Only Playground remains
  const [viewIndex, setViewIndex] = useState(0);

  // Modal State (Global)
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [isZeroGOpen, setIsZeroGOpen] = useState(false);
  const [isPulseDashOpen, setIsPulseDashOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleOpenAuthModal = useCallback(() => {
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

  return (
    <div className="h-screen w-full bg-white text-black font-sans selection:bg-black selection:text-white overflow-hidden">
      {/* SEO Hidden Header for Search Engines */}
      <h1 style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: '0' }}>
        하이젠 랩스 - Hyzen Labs AI & 게이밍 연구소
      </h1>

      <Header
        onOpenMyPage={handleOpenMyPage}
        currentIndex={viewIndex}
        onNavigate={() => { }}
        onOpenLoginModal={handleOpenAuthModal}
      />

      <main className="relative w-full h-full pt-0">
        <GamePage
          user={user}
          onOpenZeroG={handleOpenZeroG}
          onOpenPulseDash={handleOpenPulseDash}
        />
      </main>

      <React.Suspense fallback={null}>
        <MyPageModal
          isOpen={isMyPageOpen}
          onClose={handleCloseMyPage}
          user={user}
          onEditPost={() => { }}
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
        />
      </React.Suspense>
    </div>
  );
};


export default App;