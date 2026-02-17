import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Header from './components/layout/Header';
import SectionNav from './components/layout/SectionNav';
import MainPage from './components/official/MainPage';
import GamePage from './components/official/GamePage';
import GuestbookModal from './components/modals/GuestbookModal';
import MyPageModal from './components/modals/MyPageModal';
import ZeroGDrift from './components/games/ZeroGDrift';
import PulseDash from './components/games/PulseDash';
import DetailModal from './components/modals/DetailModal';
import NurseExam from './components/nurse-exam/NurseExam';

import { useFirebase } from './hooks/useFirebase';
import { compressImage } from './utils/image';

const App = () => {
  const { user, loginWithGoogle, appId, db } = useFirebase();

  // Navigation State
  const [viewIndex, setViewIndex] = useState(0); // 0: Playground (Game), 1: Community (Main/Guestbook)
  const [direction, setDirection] = useState(0);

  // Modal State (Global)
  const [isGuestbookOpen, setIsGuestbookOpen] = useState(false);
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [isZeroGOpen, setIsZeroGOpen] = useState(false);
  const [isPulseDashOpen, setIsPulseDashOpen] = useState(false);
  const [isNurseExamOpen, setIsNurseExamOpen] = useState(false);

  const [newMessage, setNewMessage] = useState({ name: '', text: '', image: null });
  const [isUploading, setIsUploading] = useState(false);

  // Edit Mode State
  const [editMode, setEditMode] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);

  // Detail Modal
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);

  const handleOpenDetail = useCallback((item) => {
    setTimeout(() => setSelectedDetailItem(item), 0);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedDetailItem(null);
  }, []);


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
    if (isGuestbookOpen || isMyPageOpen || isZeroGOpen || isPulseDashOpen || selectedDetailItem) return;

    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && viewIndex === 0) {
      paginate(1);
    }
    if (isRightSwipe && viewIndex === 1) {
      paginate(0);
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

  const handleOpenNurseExam = useCallback(() => {
    setIsNurseExamOpen(true);
  }, []);

  const handleCloseNurseExam = useCallback(() => {
    setIsNurseExamOpen(false);
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
      {(isGuestbookOpen || selectedDetailItem) ? null : <Header onOpenMyPage={handleOpenMyPage} />}

      <main className="relative w-full h-full pt-0">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          {viewIndex === 0 ? (
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
                onOpenNurseExam={handleOpenNurseExam}
              />
            </motion.div>
          ) : (
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

      {(!isGuestbookOpen && !selectedDetailItem) && (
        <SectionNav
          currentIndex={viewIndex}
          onNavigate={paginate}
        />
      )}

      <GuestbookModal
        isOpen={isGuestbookOpen}
        onClose={handleCloseModal}
        user={user}
        loginWithGoogle={loginWithGoogle}
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
      </AnimatePresence>

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

      <NurseExam
        isOpen={isNurseExamOpen}
        onClose={handleCloseNurseExam}
      />
    </div>
  );
};

export default App;