import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Header from './components/layout/Header';
import SectionNav from './components/layout/SectionNav';
import MainPage from './components/official/MainPage';
import GamePage from './components/official/GamePage';
import BlogPage from './components/official/BlogPage';
const GuestbookModal = React.lazy(() => import('./components/modals/GuestbookModal'));
const MyPageModal = React.lazy(() => import('./components/modals/MyPageModal'));
const ZeroGDrift = React.lazy(() => import('./components/games/ZeroGDrift'));
const PulseDash = React.lazy(() => import('./components/games/PulseDash'));
const DetailModal = React.lazy(() => import('./components/modals/DetailModal'));
const AuthModal = React.lazy(() => import('./components/modals/AuthModal'));
const BlogWriteModal = React.lazy(() => import('./components/modals/BlogWriteModal'));
const BlogDetailModal = React.lazy(() => import('./components/modals/BlogDetailModal'));

import { useFirebase } from './hooks/useFirebase';
import { compressImage } from './utils/image';

const App = () => {
  const { user, loginWithGoogle, registerWithEmail, loginWithEmail, appId, db } = useFirebase();

  // Navigation State
  const [viewIndex, setViewIndex] = useState(0); // 0: Playground (Game), 1: Blog, 2: Community (Main/Guestbook)
  const [direction, setDirection] = useState(0);

  // Modal State (Global)
  const [isGuestbookOpen, setIsGuestbookOpen] = useState(false);
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [isZeroGOpen, setIsZeroGOpen] = useState(false);
  const [isPulseDashOpen, setIsPulseDashOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [newMessage, setNewMessage] = useState({ name: '', text: '', image: null });
  const [isUploading, setIsUploading] = useState(false);

  // Edit Mode State
  const [editMode, setEditMode] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);

  // Detail Modal
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);

  // Blog Modal State
  const [isBlogWriteOpen, setIsBlogWriteOpen] = useState(false);
  const [newBlogData, setNewBlogData] = useState({ title: '', blocks: [{ id: 'init', type: 'text', content: '' }] });
  const [editBlogMode, setEditBlogMode] = useState(false);
  const [editingBlogId, setEditingBlogId] = useState(null);

  // Blog Detail Modal
  const [selectedBlogDetailItem, setSelectedBlogDetailItem] = useState(null);

  const handleOpenBlogDetail = useCallback((item) => {
    setTimeout(() => setSelectedBlogDetailItem(item), 0);
  }, []);

  const handleCloseBlogDetail = useCallback(() => {
    setSelectedBlogDetailItem(null);
  }, []);

  const handleEditBlog = useCallback((item) => {
    let blocks = item.blocks;
    if (!blocks || blocks.length === 0) {
      blocks = [];
      if (item.image) blocks.push({ id: 'legacy-img', type: 'image', url: item.image });
      blocks.push({ id: 'legacy-txt', type: 'text', content: item.text || '' });
    }
    if (blocks.length === 0) blocks = [{ id: 'init', type: 'text', content: '' }];

    setNewBlogData({ title: item.title, blocks });
    setEditingBlogId(item.id);
    setEditBlogMode(true);
    setIsBlogWriteOpen(true);
  }, []);

  const handleOpenNewBlogWrite = useCallback(() => {
    setEditBlogMode(false);
    setEditingBlogId(null);
    setNewBlogData({ title: '', blocks: [{ id: Date.now().toString(), type: 'text', content: '' }] });
    setIsBlogWriteOpen(true);
  }, []);

  const handleCloseBlogWriteModal = useCallback(() => {
    setIsBlogWriteOpen(false);
    setTimeout(() => {
      setEditBlogMode(false);
      setEditingBlogId(null);
      setNewBlogData({ title: '', blocks: [{ id: 'init', type: 'text', content: '' }] });
    }, 300);
  }, []);

  const handleOpenDetail = useCallback((item) => {
    setTimeout(() => setSelectedDetailItem(item), 0);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedDetailItem(null);
  }, []);

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



  // Navigation Handlers
  const paginate = (newIndex) => {
    setDirection(newIndex > viewIndex ? 1 : -1);
    setViewIndex(newIndex);
  };

  // Swipe Handling
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    // DISABLE SWIPE IF MODALS ARE OPEN
    if (isGuestbookOpen || isMyPageOpen || isZeroGOpen || isPulseDashOpen || selectedDetailItem || isBlogWriteOpen || selectedBlogDetailItem) return;

    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && viewIndex < 2) {
      paginate(viewIndex + 1);
    }
    if (isRightSwipe && viewIndex > 0) {
      paginate(viewIndex - 1);
    }
  };

  // Modal Handlers
  const handleEdit = useCallback((item) => {
    setNewMessage({ name: item.name, text: item.text, image: item.image });
    setEditingMessageId(item.id);
    setEditMode(true);
    setIsGuestbookOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsGuestbookOpen(false);
    setTimeout(() => {
      setEditMode(false);
      setEditingMessageId(null);
      setNewMessage({ name: '', text: '', image: null });
    }, 300);
  }, []);

  const handleOpenNewModal = useCallback(() => {
    setEditMode(false);
    setEditingMessageId(null);
    setNewMessage({ name: '', text: '', image: null });
    setIsGuestbookOpen(true);
  }, []);

  const handleOpenMyPage = useCallback(() => {
    setIsMyPageOpen(true);
  }, []);

  const handleCloseMyPage = useCallback(() => {
    setIsMyPageOpen(false);
  }, []);

  const handleEditFromMyPage = useCallback((item) => {
    handleCloseMyPage();
    setTimeout(() => {
      handleEdit(item);
    }, 200);
  }, [handleCloseMyPage, handleEdit]);

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

  // Animation Variants
  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.9
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      filter: "blur(0px)"
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.9,
      filter: "blur(10px)"
    })
  };

  return (
    <div
      className="h-screen w-full bg-white text-black font-sans selection:bg-black selection:text-white overflow-hidden touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* SEO Hidden Header for Search Engines */}
      <h1 style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: '0' }}>
        하이젠 랩스 - Hyzen Labs AI & 게이밍 연구소
      </h1>

      {(isGuestbookOpen || selectedDetailItem || isBlogWriteOpen || selectedBlogDetailItem) ? null : (
        <Header
          onOpenMyPage={handleOpenMyPage}
          currentIndex={viewIndex}
          onNavigate={paginate}
          onOpenLoginModal={handleOpenAuthModal}
        />
      )}

      <main className="relative w-full h-full pt-0">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          {viewIndex === 0 && (
            <motion.div
              key="playground"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="w-full absolute top-0 left-0 h-full"
            >
              <GamePage
                user={user}
                onOpenZeroG={handleOpenZeroG}
                onOpenPulseDash={handleOpenPulseDash}
              />
            </motion.div>
          )}

          {viewIndex === 1 && (
            <motion.div
              key="blog"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="w-full absolute top-0 left-0 h-full"
            >
              <BlogPage
                onOpenWriteModal={handleOpenNewBlogWrite}
                onEditPost={handleEditBlog}
                user={user}
                onOpenDetail={handleOpenBlogDetail}
              />
            </motion.div>
          )}

          {viewIndex === 2 && (
            <motion.div
              key="community"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="w-full absolute top-0 left-0 h-full"
            >
              <MainPage
                onOpenWriteModal={handleOpenNewModal}
                onEditPost={handleEdit}
                user={user}
                onOpenDetail={handleOpenDetail}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {(!isGuestbookOpen && !selectedDetailItem && !isBlogWriteOpen && !selectedBlogDetailItem) && (
        <SectionNav
          currentIndex={viewIndex}
          onNavigate={paginate}
        />
      )}

      <React.Suspense fallback={null}>
        <GuestbookModal
          isOpen={isGuestbookOpen}
          onClose={handleCloseModal}
          user={user}
          loginWithGoogle={handleOpenAuthModal}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
          compressImage={compressImage}
          editMode={editMode}
          messageId={editingMessageId}
        />

        <MyPageModal
          isOpen={isMyPageOpen}
          onClose={handleCloseMyPage}
          user={user}
          onEditPost={handleEditFromMyPage}
        />

        <AnimatePresence mode="wait">
          {selectedDetailItem && (
            <DetailModal
              key={selectedDetailItem.id || 'detail-modal'}
              item={selectedDetailItem}
              onClose={handleCloseDetail}
            />
          )}

          {selectedBlogDetailItem && (
            <BlogDetailModal
              key={selectedBlogDetailItem.id || 'blog-detail-modal'}
              item={selectedBlogDetailItem}
              onClose={handleCloseBlogDetail}
            />
          )}
        </AnimatePresence>

        <BlogWriteModal
          isOpen={isBlogWriteOpen}
          onClose={handleCloseBlogWriteModal}
          user={user}
          loginWithGoogle={handleOpenAuthModal}
          newPost={newBlogData}
          setNewPost={setNewBlogData}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
          compressImage={compressImage}
          editMode={editBlogMode}
          postId={editingBlogId}
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