import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { 
  X, 
  Camera, 
  Trash2, 
  Lock, 
  Cloud,
  Loader2,
  Fingerprint,
  Mail,
  Youtube,
  User,
  Sparkles
} from 'lucide-react';

/**
 * [Hyzen Labs. CTO Optimized - R4.4.0 | Swipe-to-Dismiss Edition]
 * 1. 제스처 인터페이스: 방명록 모달 상/하 스와이프 폐쇄 로직 구현
 * 2. 동적 애니메이션: 스냅 방향에 따른 물리적 가속 이탈 효과
 * 3. 시계열 데이터 유지: YYYY.MM.DD HH:mm 정밀 기록
 * 4. 아키텍처: Founder GENE 전용 정밀 인터랙션 시스템
 */

const ADMIN_PASS = "5733906";
const FALLBACK_APP_ID = 'hyzen-labs-production';
const YOUTUBE_URL = "Https://youtube.com/@hyzen-labs-ai";
const EMAIL_ADDRESS = "jini2aix@gmail.com";

const getFirebaseConfig = () => {
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
    }
    const viteEnv = import.meta.env?.VITE_FIREBASE_CONFIG;
    if (viteEnv) return typeof viteEnv === 'string' ? JSON.parse(viteEnv) : viteEnv;
  } catch (e) {}
  return null;
};

const firebaseConfig = getFirebaseConfig();
const appId = typeof __app_id !== 'undefined' ? __app_id : FALLBACK_APP_ID;
const firebaseApp = firebaseConfig ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]) : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;

const playSystemSound = (type) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    if (type === 'start') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'popup') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'dismiss') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    }
  } catch (e) {}
};

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIDE = 1000;
        let width = img.width; let height = img.height;
        if (width > height) { if (width > MAX_SIDE) { height *= MAX_SIDE / width; width = MAX_SIDE; } }
        else { if (height > MAX_SIDE) { width *= MAX_SIDE / height; height = MAX_SIDE; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
  });
};

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

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [showMainTitle, setShowMainTitle] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuestbookOpen, setIsGuestbookOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [targetDeleteId, setTargetDeleteId] = useState(null);
  const [deletePass, setDeletePass] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [cloudStatus, setCloudStatus] = useState('disconnected');
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState({ name: '', text: '', image: null });

  // Swipe State
  const [modalDragY, setModalDragY] = useState(0);
  const [modalExitDir, setModalExitDir] = useState(null); // 'up' | 'down' | null
  const modalTouchStartRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (!auth) return;
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { setCloudStatus('error'); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) setCloudStatus('connected');
    });

    const timer = setTimeout(() => {
      setIsInitializing(false);
      playSystemSound('start');
      setTimeout(() => { 
        setShowMainTitle(true); 
        setIsSynthesizing(true);
        setTimeout(() => { setIsSynthesizing(false); }, 5000); 
      }, 500);
    }, 4000);

    return () => { unsubscribe(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data(), type: 'trace' }));
      setMessages(msgs.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
    });
    return () => unsubscribe();
  }, [user, appId]);

  const closeModal = () => { 
    setModalExitDir(null);
    setModalDragY(0);
    setIsModalOpen(false); 
    setIsGuestbookOpen(false); 
    setIsDeleteModalOpen(false); 
    setSelectedItem(null); 
    setDeletePass("");
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
      // Dismiss Down
      setModalExitDir('down');
      playSystemSound('dismiss');
      setTimeout(closeModal, 400);
    } else if (modalDragY < -threshold) {
      // Dismiss Up
      setModalExitDir('up');
      playSystemSound('dismiss');
      setTimeout(closeModal, 400);
    } else {
      // Snap Back
      setModalDragY(0);
    }
    modalTouchStartRef.current = null;
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      const compressed = await compressImage(file);
      setNewMessage(prev => ({ ...prev, image: compressed }));
      setIsUploading(false);
    }
  };

  const fileInputRef = useRef(null);

  return (
    <div 
      className="fixed inset-0 bg-[#020202] text-white selection:bg-cyan-500/30 overflow-hidden font-sans flex flex-col max-w-full" 
      style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
    >
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none z-[1] mix-blend-overlay" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Michroma&family=Orbitron:wght@400;700;900&family=JetBrains+Mono&display=swap');
        .font-brand { font-family: 'Orbitron', sans-serif; }
        .font-title { font-family: 'Michroma', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.08); }
        
        .matrix-container {
          position: relative;
          margin: 0 10px 10px;
          border-radius: 24px;
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: inset 0 0 50px rgba(0,0,0,1);
          overflow: hidden;
          flex: 1;
        }

        .matrix-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          grid-auto-rows: minmax(min(14vh, 90px), 1fr);
          gap: 8px;
          overflow-y: auto;
          scrollbar-width: none;
          padding: 10px;
        }
        .matrix-grid::-webkit-scrollbar { display: none; }
        
        @media (min-width: 1024px) {
          .matrix-grid { grid-template-columns: repeat(12, 1fr); gap: 10px; padding: 24px; }
        }

        .data-packet {
          position: relative;
          aspect-ratio: 0.85 / 1;
          overflow: hidden;
          background: #0a0a0a;
          border: 0.5px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          transition: all 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes quantumSynthesis {
          0% { transform: translateZ(-800px) translateY(100px) skewX(20deg) scale(1.5); opacity: 0; filter: blur(30px) brightness(3) contrast(2); }
          100% { transform: translateZ(0) translateY(0) skewX(0) scale(1); opacity: 0.7; filter: blur(0px) brightness(1); }
        }
        .animate-quantum-synthesis { animation: quantumSynthesis 5s cubic-bezier(0.19, 1, 0.22, 1) forwards; }

        @keyframes energySweep {
          0% { transform: translateX(-150%) translateY(-150%) rotate(45deg); opacity: 0; }
          100% { transform: translateX(150%) translateY(150%) rotate(45deg); opacity: 0; }
        }
        .energy-sweep-bar {
          position: absolute;
          inset: -100%;
          background: linear-gradient(to right, transparent, rgba(34, 211, 238, 0.2), white, rgba(34, 211, 238, 0.2), transparent);
          width: 50%;
          pointer-events: none;
          z-index: 50;
          filter: blur(40px);
          animation: energySweep 5s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }

        .data-packet:active { transform: scale(0.92) !important; border-color: #22d3ee; }

        @keyframes heroPop { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-hero-pop { animation: heroPop 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .fused-highlight { background: linear-gradient(90deg, #22d3ee 0%, #ffffff 50%, #22d3ee 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: fusedShimmer 4s linear infinite; }
        @keyframes fusedShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        /* Swipe Animations */
        .modal-exit-up { transform: translateY(-120vh) rotate(-10deg) scale(0.8) !important; opacity: 0 !important; transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important; }
        .modal-exit-down { transform: translateY(120vh) rotate(10deg) scale(0.8) !important; opacity: 0 !important; transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important; }
      `}</style>

      {/* --- Boot Sequence --- */}
      {isInitializing && (
        <div className="fixed inset-0 z-[10000] bg-[#010101] flex flex-col items-center justify-center p-8 overflow-hidden">
          <div className="absolute w-[600px] h-[600px] bg-cyan-500/10 blur-[180px] rounded-full animate-pulse pointer-events-none" />
          <div className="relative flex items-center justify-center w-32 h-32 mb-12">
            <div className="relative w-16 h-16 bg-gradient-to-tr from-cyan-400 to-white rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(34,211,238,0.4)]" />
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="font-brand text-[10px] sm:text-[12px] tracking-[0.7em] text-cyan-400/80 font-black uppercase animate-hero-pop">Entering Hyzen Labs</span>
            <span className="text-[7px] font-mono opacity-20 uppercase tracking-[0.4em] mt-1">v4.4.0 | SWIPE INTERFACE</span>
          </div>
        </div>
      )}

      {/* --- Main Content --- */}
      <div className="flex-1 flex flex-col relative">
        <nav className="z-[100] px-8 pt-12 pb-2 flex justify-between items-start shrink-0">
          <div className="flex flex-col">
            <span className="font-brand text-[10px] tracking-[0.4em] text-cyan-400 font-black uppercase">Hyzen Labs.</span>
            <span className="text-[7px] opacity-20 uppercase tracking-[0.2em] font-brand mt-1">Digital Matrix Ecosystem</span>
          </div>
          <div className="flex items-center gap-4">
             <a href={`mailto:${EMAIL_ADDRESS}`} className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center text-white/30 hover:text-cyan-400 transition-all"><Mail size={14} /></a>
             <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center text-white/30 hover:text-red-500 transition-all"><Youtube size={14} /></a>
             <div className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center"><Cloud size={14} className={cloudStatus === 'connected' ? 'text-cyan-400' : 'text-amber-500'} /></div>
          </div>
        </nav>

        <section className="px-8 pt-4 mb-6 shrink-0">
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
          <div className="px-10 flex items-center justify-between mb-4 shrink-0">
            <div className="flex flex-col">
              <h2 className="text-[11px] font-brand font-black text-white uppercase tracking-[0.2em]">Digital Stack</h2>
              <span className="text-[7px] font-mono text-white/20 uppercase tracking-widest">Nodes: {messages.length} Units</span>
            </div>
            <button onClick={() => setIsGuestbookOpen(true)} className="group flex items-center gap-3 glass-panel px-4 py-2 rounded-full border border-white/10 hover:bg-white active:scale-95 transition-all duration-500 shadow-xl">
              <Fingerprint size={14} className="text-cyan-400 group-hover:text-black transition-colors" />
              <span className="text-[9px] font-brand font-black text-white group-hover:text-black uppercase tracking-tighter">Sync Trace</span>
            </button>
          </div>

          <div className="matrix-container">
            {isSynthesizing && <div className="energy-sweep-bar" />}
            <div className="matrix-grid">
              {messages.map((item, idx) => (
                <div key={item.id || idx} className={`data-packet group ${isSynthesizing ? 'animate-quantum-synthesis' : ''}`} style={{ animationDelay: `${idx * 0.02}s`, opacity: isSynthesizing ? 0 : 0.7 }} onClick={() => { setSelectedItem(item); setIsModalOpen(true); playSystemSound('popup'); }}>
                  <div className="absolute inset-0 overflow-hidden">
                    {item.image ? <img src={item.image} className="absolute inset-0 w-full h-full object-cover opacity-50 brightness-75 group-hover:opacity-100 transition-all" alt="" /> : <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center"><User size={18} className="text-white/10" /></div>}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/90 to-transparent">
                    <span className="block text-[6.5px] font-brand font-black text-cyan-400/80 truncate uppercase tracking-tight">{item.name || 'ANON'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <footer className="z-[100] px-10 py-6 flex justify-between items-end border-t border-white/5 bg-black/60 backdrop-blur-md shrink-0">
        <div className="flex flex-col gap-1.5">
          <span className="font-brand text-[9px] tracking-[0.8em] font-black uppercase text-white/40">HYZEN LABS. 2026</span>
          <span className="text-[9px] font-brand tracking-[0.4em] text-white/40 uppercase">Founder Gene</span>
        </div>
        <Sparkles size={10} className="text-white/10 animate-pulse mb-1" />
      </footer>

      {/* --- Sync (Input) Modal with Swipe Logic --- */}
      {isGuestbookOpen && (
        <div className="fixed inset-0 z-[7000] flex items-end sm:items-center justify-center bg-black/95 backdrop-blur-3xl" onClick={closeModal}>
          <div 
            className={`w-full sm:max-w-md glass-panel rounded-t-[3.5rem] sm:rounded-[2.5rem] p-10 sm:p-12 shadow-[0_0_100px_rgba(34,211,238,0.1)] relative cursor-grab active:cursor-grabbing transition-transform duration-200
              ${modalExitDir === 'up' ? 'modal-exit-up' : ''} 
              ${modalExitDir === 'down' ? 'modal-exit-down' : ''}
            `}
            style={{ 
              transform: modalExitDir ? undefined : `translateY(${modalDragY}px) scale(${1 - Math.abs(modalDragY) / 2000})`,
              opacity: modalExitDir ? undefined : 1 - Math.abs(modalDragY) / 800
            }}
            onClick={e => e.stopPropagation()}
            onTouchStart={handleModalTouchStart}
            onTouchMove={handleModalTouchMove}
            onTouchEnd={handleModalTouchEnd}
          >
            {/* Gesture Hint */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/10 rounded-full" />
            
            <div className="flex justify-between items-center mb-10 pointer-events-none">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-xl font-black font-brand uppercase tracking-tight text-white">New Trace</h2>
                <span className="text-[7px] font-mono text-cyan-400/60 uppercase tracking-[0.4em]">Swipe Up/Down to Dismiss</span>
              </div>
              <button onClick={closeModal} className="p-2.5 bg-white/5 rounded-full hover:bg-white/10 transition-all text-white/40 pointer-events-auto"><X size={18} /></button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault(); if (!newMessage.name || !newMessage.text || isUploading) return;
              setIsUploading(true);
              try {
                const q = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
                const now = new Date();
                const dateString = now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');
                const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                const fullDateTime = `${dateString} ${timeString}`;

                await addDoc(q, { name: newMessage.name, text: newMessage.text, image: newMessage.image, createdAt: serverTimestamp(), date: fullDateTime });
                setNewMessage({ name: '', text: '', image: null }); 
                setModalExitDir('up');
                setTimeout(closeModal, 400);
                playSystemSound('popup');
              } catch (err) { console.error(err); } finally { setIsUploading(false); }
            }} className="space-y-10">
              <div className="space-y-1.5">
                <label className="text-[8px] font-brand text-cyan-400/60 uppercase tracking-[0.3em] ml-1">Identity Name</label>
                <input type="text" placeholder="AUTHOR_ID" className="w-full bg-white/5 border-b border-white/10 px-1 py-4 text-sm font-brand outline-none focus:border-cyan-500 transition-all uppercase tracking-widest text-white placeholder:text-white/10" value={newMessage.name} onChange={e => setNewMessage({...newMessage, name: e.target.value.toUpperCase()})} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-brand text-cyan-400/60 uppercase tracking-[0.3em] ml-1">Narrative Data</label>
                <textarea placeholder="ENTER FRAGMENTED THOUGHTS..." className="w-full h-24 bg-white/5 border-b border-white/10 px-1 py-4 text-sm font-title outline-none focus:border-cyan-500 resize-none transition-all text-white/90 placeholder:text-white/10" value={newMessage.text} onChange={e => setNewMessage({...newMessage, text: e.target.value})} required />
              </div>
              <div className="flex flex-col gap-3">
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`h-16 flex items-center justify-center gap-4 rounded-3xl border transition-all ${newMessage.image ? 'border-cyan-500 text-cyan-400 bg-cyan-400/5' : 'border-white/10 text-white/30 hover:border-white/20'}`}>
                  {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                  <span className="text-[9px] font-brand font-black uppercase tracking-widest">{newMessage.image ? "Visual Ready" : "Attach Image"}</span>
                </button>
              </div>
              {newMessage.image && <div className="w-full h-32 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl"><img src={newMessage.image} className="w-full h-full object-cover" alt="Preview" /></div>}
              <button type="submit" className="w-full h-14 bg-white text-black rounded-2xl font-brand font-black uppercase tracking-[0.5em] text-[13px] active:scale-[0.98] disabled:opacity-50 shadow-xl transition-all hover:bg-cyan-400" disabled={isUploading}>{isUploading ? "Syncing..." : "SYNC"}</button>
            </form>
          </div>
        </div>
      )}

      {/* --- Detail Modal (Same Swipe Logic) --- */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-4" onClick={closeModal}>
          <div 
            className={`w-full max-w-4xl glass-panel relative rounded-[2rem] overflow-hidden flex flex-col lg:flex-row transition-transform duration-200
              ${modalExitDir === 'up' ? 'modal-exit-up' : ''} 
              ${modalExitDir === 'down' ? 'modal-exit-down' : ''}
            `}
            style={{ 
              transform: modalExitDir ? undefined : `translateY(${modalDragY}px) scale(${1 - Math.abs(modalDragY) / 3000})`,
              opacity: modalExitDir ? undefined : 1 - Math.abs(modalDragY) / 1000
            }}
            onClick={e => e.stopPropagation()}
            onTouchStart={handleModalTouchStart}
            onTouchMove={handleModalTouchMove}
            onTouchEnd={handleModalTouchEnd}
          >
            <div className="h-[40vh] lg:h-[60vh] lg:w-1/2 bg-black relative">
              {selectedItem.image ? <img src={selectedItem.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-white/5"><Fingerprint size={100} /></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
            <div className="flex-1 p-8 lg:p-12 flex flex-col justify-between">
              <div className="space-y-6">
                <h2 className="text-3xl lg:text-5xl font-black font-title text-white uppercase tracking-tighter">{selectedItem.name}</h2>
                <p className="text-sm lg:text-lg italic text-white/70 leading-relaxed">"{selectedItem.text}"</p>
              </div>
              <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[7px] font-mono text-white/30 uppercase tracking-[0.3em]">Temporal Stamp</span>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase">{selectedItem.date}</span>
                </div>
                <button onClick={() => { setTargetDeleteId(selectedItem.id); setIsDeleteModalOpen(true); }} className="p-3 text-white/20 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
              </div>
            </div>
            <button onClick={closeModal} className="absolute top-6 right-6 p-2 bg-black/40 rounded-full border border-white/10 text-white/60 hover:text-white transition-all"><X size={20} /></button>
          </div>
        </div>
      )}

      {/* --- Delete Security --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[8000] flex items-center justify-center p-6 bg-black/98" onClick={closeModal}>
          <div className="w-full max-w-xs glass-panel p-10 rounded-[3rem] text-center border border-red-500/20" onClick={e => e.stopPropagation()}>
            <Lock size={40} className="text-red-500 mx-auto mb-6" />
            <input type="password" placeholder="PASSCODE" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center mb-8 outline-none focus:border-red-500 text-white font-brand tracking-widest" value={deletePass} onChange={(e) => setDeletePass(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-4 rounded-xl bg-white/5 text-[9px] font-brand font-black uppercase">Abort</button>
              <button onClick={async () => { if (deletePass === ADMIN_PASS && targetDeleteId && db) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', targetDeleteId)); closeModal(); } }} className="flex-1 py-4 rounded-xl bg-red-500 text-black font-brand font-black text-[9px] uppercase">Erase</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;