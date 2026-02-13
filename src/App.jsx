import React, { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Fingerprint, Sparkles } from 'lucide-react';

import Header from './components/layout/Header';
import HyzenMatrix from './components/matrix/HyzenMatrix';
import GuestbookModal from './components/modals/GuestbookModal';
import DetailModal from './components/modals/DetailModal';
import AdminAuthModal from './components/modals/AdminAuthModal';
import NeuralPulse from './components/ui/NeuralPulse';

import { useSystemSound } from './hooks/useSystemSound';
import { useFirebase } from './hooks/useFirebase';
import { useVisitorCount } from './hooks/useVisitorCount';
import { useYouTube } from './hooks/useYouTube';
import { compressImage } from './utils/image';

const App = () => {
  const { playSystemSound } = useSystemSound();
  const visitorCount = useVisitorCount();
  const { user, cloudStatus, db, appId } = useFirebase();
  const { videos } = useYouTube();
  const [currentSection, setCurrentSection] = useState('guestbook');



  // App State
  const [isInitializing, setIsInitializing] = useState(true);
  const [showMainTitle, setShowMainTitle] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Data State
  const [messages, setMessages] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuestbookOpen, setIsGuestbookOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState(null);


  // Guestbook Form State
  const [newMessage, setNewMessage] = useState({ name: '', text: '', image: null });
  const [isUploading, setIsUploading] = useState(false);

  // Elastic Spring State
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef(null);
  const scrollRef = useRef(null);

  // Modal Swipe State
  const [modalDragY, setModalDragY] = useState(0);
  const [modalExitDir, setModalExitDir] = useState(null);
  const modalTouchStartRef = useRef(null);

  // ... (existing effects) ...

  // --- Background Spring Logic ---
  const handleBgTouchStart = (e) => {
    if (isModalOpen || isGuestbookOpen) return;
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      touchStartRef.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  const handleBgTouchMove = (e) => {
    if (!touchStartRef.current || !isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartRef.current;
    if (diff > 0) {
      const easedOffset = Math.pow(diff, 0.8) * 1.2;
      setDragOffset(easedOffset);
    } else {
      setDragOffset(0);
      setIsDragging(false);
    }
  };

  const handleBgTouchEnd = () => {
    touchStartRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  // --- Modal Swipe Logic ---
  const handleModalTouchStart = (e) => {
    modalTouchStartRef.current = e.touches[0].clientY;
  };

  const handleModalTouchMove = (e) => {
    if (modalTouchStartRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - modalTouchStartRef.current;
    setModalDragY(diff);
  };

  const handleModalTouchEnd = () => {
    const threshold = 120;
    if (modalDragY > threshold) {
      setModalExitDir('down');
      playSystemSound('dismiss');
      setTimeout(closeModal, 400);
    } else if (modalDragY < -threshold) {
      setModalExitDir('up');
      playSystemSound('dismiss');
      setTimeout(closeModal, 400);
    } else {
      setModalDragY(0);
    }
    modalTouchStartRef.current = null;
  };

  return (
    <div
      className="fixed inset-0 h-[100dvh] bg-[#020202] text-white selection:bg-cyan-500/30 overflow-hidden font-sans flex flex-col max-w-full"
      onTouchStart={handleBgTouchStart}
      onTouchMove={handleBgTouchMove}
      onTouchEnd={handleBgTouchEnd}
    >
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none z-[1] mix-blend-overlay" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Michroma&family=Orbitron:wght@400;700;900&family=JetBrains+Mono&display=swap');
        .font-brand { font-family: 'Orbitron', sans-serif; }
        .font-title { font-family: 'Michroma', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .glass-panel { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(40px); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3); }
        
        .matrix-container {
          position: relative;
          margin: 10px; 
          border-radius: 32px;
          background: transparent;
          overflow: hidden;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .matrix-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          grid-auto-rows: minmax(min(14vh, 90px), 1fr);
          gap: 10px;
          overflow-y: auto;
          scrollbar-width: none;
          padding: 10px;
          z-index: 2;
          position: relative;
          mask-image: linear-gradient(to bottom, transparent, black 5%, black 95%, transparent);
        }
        .matrix-grid::-webkit-scrollbar { display: none; }
        
        @media (min-width: 1024px) {
          .matrix-grid { grid-template-columns: repeat(12, 1fr); gap: 10px; padding: 24px; }
        }

        @keyframes energySweep {
          0% { transform: translateX(-150%) skewX(-15deg); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(200%) skewX(-15deg); opacity: 0; }
        }
        .energy-sweep-layer {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.05), rgba(255, 255, 255, 0.2), rgba(34, 211, 238, 0.05), transparent);
          width: 80%;
          pointer-events: none;
          z-index: 1;
          filter: blur(80px);
          opacity: 0;
          animation: energySweep 1.2s ease-in-out 1 forwards;
        }

        @keyframes syncPulse { 0%, 100% { height: 30%; opacity: 0.3; } 50% { height: 100%; opacity: 1; } }

        @keyframes driftA { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-3px, -10px) rotate(1.5deg); } }
        @keyframes driftB { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(6px, -8px) rotate(-1.5deg); } }
        @keyframes driftC { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-2px, -12px); } }
        @keyframes driftD { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(2px, -5px); } }

        .packet-drift-0 { animation: driftA 3s ease-in-out infinite; }
        .packet-drift-1 { animation: driftB 3.5s ease-in-out infinite; }
        .packet-drift-2 { animation: driftC 4s ease-in-out infinite; }
        .packet-drift-3 { animation: driftA 4.5s ease-in-out infinite; animation-direction: reverse; }

        .data-packet {
          position: relative;
          aspect-ratio: 0.85 / 1;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
          border-radius: 18px;

          transition: all 0.9s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 10;
          will-change: transform;
        }

        @keyframes quantumSynthesis {
          0% { transform: translateZ(-800px) translateY(100px) skewX(20deg) scale(1.5); opacity: 0; filter: blur(30px) brightness(3) contrast(2); }
          100% { transform: translateZ(0) translateY(0) skewX(0) scale(1); opacity: 0.7; filter: blur(0px) brightness(1); }
        }
        .animate-quantum-synthesis { animation: quantumSynthesis 1.5s cubic-bezier(0.19, 1, 0.22, 1) forwards; }

        @keyframes imageFullScan {
          0% { object-position: 0% 0%; transform: scale(1.3); filter: blur(4px) brightness(0.5); }
          15% { filter: blur(0px) brightness(1); }
          30% { object-position: 100% 0%; }
          60% { object-position: 100% 100%; }
          85% { object-position: 0% 100%; }
          100% { object-position: 50% 50%; transform: scale(1); }
        }
        .animate-image-scan { animation: imageFullScan 3.5s cubic-bezier(0.65, 0, 0.35, 1) forwards; }

        @keyframes heroPop { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-hero-pop { animation: heroPop 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .fused-highlight { background: linear-gradient(90deg, #22d3ee 0%, #ffffff 50%, #22d3ee 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: fusedShimmer 4s linear infinite; will-change: background-position; transform: translateZ(0); backface-visibility: hidden; }
        @keyframes fusedShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        @keyframes coreBreatheEnhanced { 
          0%, 100% { transform: scale(1); opacity: 0.4; filter: blur(6px); box-shadow: 0 0 30px rgba(34, 211, 238, 0.2); } 
          50% { transform: scale(1.3); opacity: 1; filter: blur(0px); box-shadow: 0 0 80px rgba(34, 211, 238, 0.5); } 
        }
        .animate-core-breathe-enhanced { animation: coreBreatheEnhanced 3s ease-in-out infinite; }

        .modal-exit-up { transform: translateY(-120vh) rotate(-10deg) scale(0.8) !important; opacity: 0 !important; transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important; }
        .modal-exit-down { transform: translateY(120vh) rotate(10deg) scale(0.8) !important; opacity: 0 !important; transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important; }
      `}</style>

      {isInitializing && (
        <div className="fixed inset-0 z-[10000] bg-[#010101] flex flex-col items-center justify-center p-8 overflow-hidden">
          <div className="absolute w-[600px] h-[600px] bg-cyan-500/10 blur-[180px] rounded-full animate-pulse pointer-events-none" />
          <div className="relative flex items-center justify-center w-32 h-32 mb-12">
            <div className="absolute inset-[-60px] border-[0.5px] border-cyan-400/10 rounded-full animate-ping opacity-10" />
            <div className="relative w-16 h-16 bg-gradient-to-tr from-cyan-400 to-white rounded-full flex items-center justify-center animate-core-breathe-enhanced shadow-[0_0_100px_rgba(34,211,238,0.4)]" />
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="font-brand text-[10px] sm:text-[12px] tracking-[0.7em] text-cyan-400/80 font-black uppercase animate-hero-pop">Entering Hyzen Labs</span>
            <span className="text-[7px] font-mono opacity-20 uppercase tracking-[0.4em] mt-1">v4.8.6 | ELASTIC MATRIX</span>
          </div>
        </div>
      )}

      {/* --- Main Content Wrap with Spring Transform --- */}
      <div
        className="flex-1 flex flex-col relative pb-28"
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <Header cloudStatus={cloudStatus} />

        <section className="px-8 pt-4 mb-6 shrink-0 relative overflow-hidden">
          <div className={`transition-all duration-1200 ${showMainTitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h1 className="text-[6.5vw] sm:text-[2.2rem] font-title tracking-[-0.04em] leading-[0.9] uppercase">
              <span className="block fused-highlight">FUSED</span>
              <span className="block" style={{ WebkitTextStroke: '0.8px rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.04)' }}>REALITY</span>
              <span className="flex items-center gap-2">
                <span className="text-[0.35em] text-white font-black tracking-widest">SYNC</span>
                <NeuralPulse />
              </span>
            </h1>
          </div>
        </section>

        <main className="flex-1 overflow-hidden flex flex-col relative z-10">
          <div className="px-4 mx-[10px] flex items-center justify-between mt-2 mb-1 shrink-0">
            <div className="flex flex-col">
              <h2 className="text-[11px] font-brand font-black text-white uppercase tracking-[0.2em]">Digital Stack</h2>
              <span className="text-[7px] font-mono text-white/20 uppercase tracking-widest">Nodes: {messages.length} Units</span>
            </div>
            <button onClick={() => setIsGuestbookOpen(true)} className="group flex items-center gap-3 glass-panel px-4 py-2 rounded-full border border-white/10 hover:bg-white active:scale-95 transition-all duration-500 shadow-xl">
              <Fingerprint size={14} className="text-cyan-400 group-hover:text-black transition-colors" />
              <span className="text-[9px] font-brand font-black text-white group-hover:text-black uppercase tracking-tighter">Sync Trace</span>
            </button>
          </div>

          <HyzenMatrix
            ref={scrollRef}
            messages={currentSection === 'guestbook' ? messages : videos}
            currentSection={currentSection}
            onSwitchSection={handleSectionChange}
            isSynthesizing={isSynthesizing}
            onItemClick={handleItemClick}
          />
        </main>
      </div>
      <footer className="fixed bottom-0 left-0 right-0 z-[200] px-6 py-4 md:px-10 md:py-6 flex justify-between items-start border-t border-white/5 bg-black/90 backdrop-blur-md">
        <div className="flex flex-col gap-1">
          <span className="font-brand text-[9px] tracking-[0.8em] font-black uppercase text-white/40">HYZEN LABS. 2026</span>
          <span className="text-[9px] font-brand tracking-[0.4em] text-white/40 uppercase">Founder Gene</span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[8px] font-brand tracking-[0.2em] text-white/20 uppercase">VISITORS</span>
          <span className="text-[10px] font-mono text-cyan-500/80 tracking-widest pr-0.5">
            {visitorCount.toLocaleString()}
          </span>
        </div>
      </footer>

      {/* --- Modals --- */}
      <GuestbookModal
        isOpen={isGuestbookOpen}
        onClose={closeModal}
        modalExitDir={modalExitDir}
        modalDragY={modalDragY}
        handleModalTouchStart={handleModalTouchStart}
        handleModalTouchMove={handleModalTouchMove}
        handleModalTouchEnd={handleModalTouchEnd}
        playSystemSound={playSystemSound}
        setModalExitDir={setModalExitDir}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
        compressImage={compressImage}
      />

      <DetailModal
        isOpen={isModalOpen}
        selectedItem={selectedItem}
        onClose={closeModal}
        onDeleteRequest={() => { setTargetDeleteId(selectedItem.id); setIsDeleteModalOpen(true); }}
        modalExitDir={modalExitDir}
        modalDragY={modalDragY}
        handleModalTouchStart={handleModalTouchStart}
        handleModalTouchMove={handleModalTouchMove}
        handleModalTouchEnd={handleModalTouchEnd}
      />

      <AdminAuthModal
        isOpen={isDeleteModalOpen}
        onClose={closeModal}
        targetDeleteId={targetDeleteId}
      />
    </div>
  );
};

export default App;