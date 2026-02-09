import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { 
  X, 
  MessageSquare, 
  Camera, 
  Trash2, 
  Lock, 
  ShieldCheck,
  Cloud,
  Loader2,
  Fingerprint,
  Mail,
  Youtube,
  Plus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon
} from 'lucide-react';

/**
 * [Hyzen Labs. CTO Optimized - R3.4.1 | HMG Compact Snap]
 * 1. 레이아웃 최적화: 메인 카드의 기본 크기를 줄여(Compact) 정보 밀도 향상
 * 2. 인터렉션: 스크롤 중앙 정렬 시에만 확장되는 HMG 특유의 포커스 모션 적용
 * 3. 상세 뷰: 클릭 시에만 풀스크린 팝업으로 전환하여 정밀 감상 지원
 */

const ADMIN_PASS = "5733906";
const FALLBACK_APP_ID = 'hyzen-labs-production';
const YOUTUBE_URL = "Https://youtube.com/@hyzen-labs-ai";
const EMAIL_ADDRESS = "jini2gene@gmail.com";

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
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'popup') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start(); osc.stop(audioCtx.currentTime + 0.1);
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
  <div className="inline-flex items-center gap-1 h-full px-2">
    <div className="flex items-end gap-[1.5px] h-3.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="w-[2.5px] bg-cyan-400/80 rounded-full" style={{ height: '100%', animation: `syncPulse ${1 + i * 0.2}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
  </div>
);

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [showMainTitle, setShowMainTitle] = useState(false);
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
  const [activeIndex, setActiveIndex] = useState(0);
  
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

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
      setTimeout(() => { setShowMainTitle(true); playSystemSound('popup'); }, 500);
    }, 3500);

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

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollLeft = container.scrollLeft;
    // 카드 너비와 마진을 고려한 인덱스 계산
    const cardWidth = container.offsetWidth * 0.7; 
    const newIndex = Math.round(scrollLeft / (cardWidth + 20));
    if (newIndex !== activeIndex) setActiveIndex(newIndex);
  }, [activeIndex]);

  const closeModal = () => { 
    setIsModalOpen(false); setIsGuestbookOpen(false); setIsDeleteModalOpen(false); 
    setSelectedItem(null); setDeletePass("");
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

  return (
    <div className="fixed inset-0 bg-[#030303] text-white selection:bg-cyan-500/30 overflow-hidden font-sans flex flex-col max-w-full touch-none" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] pointer-events-none z-[1] mix-blend-overlay" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Michroma&family=Orbitron:wght@400;700;900&family=JetBrains+Mono&display=swap');
        .font-brand { font-family: 'Orbitron', sans-serif; }
        .font-title { font-family: 'Michroma', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(30px); border: 1px solid rgba(255, 255, 255, 0.08); }
        
        /* HMG Compact Snap Scroll */
        .snap-x-container {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-left: 15vw; /* 첫 카드가 중앙에 오도록 조정 */
          padding-right: 40vw; /* 마지막 카드가 중앙에 오도록 조정 */
        }
        .snap-x-container::-webkit-scrollbar { display: none; }
        .snap-item {
          scroll-snap-align: center;
          flex: 0 0 70vw; /* 기본 너비를 줄임 */
          max-width: 480px;
          margin-right: 20px;
          perspective: 1500px;
        }
        @media (min-width: 1024px) {
          .snap-item { flex: 0 0 450px; }
        }

        .card-inner {
          transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
          transform: scale(0.85); /* 대기 상태는 작게 */
          opacity: 0.3;
          filter: grayscale(100%);
        }
        .snap-item.active .card-inner {
          transform: scale(1); /* 중앙 카드는 원래 크기로 포커스 */
          opacity: 1;
          filter: grayscale(0%);
          box-shadow: 0 30px 60px -10px rgba(0, 0, 0, 0.8), 0 0 30px rgba(34, 211, 238, 0.1);
          border-color: rgba(34, 211, 238, 0.3);
        }
        .snap-item .card-image {
          transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .snap-item.active .card-image {
          transform: scale(1.1);
        }

        @keyframes syncPulse { 0%, 100% { height: 35%; opacity: 0.4; } 50% { height: 100%; opacity: 1; } }
        @keyframes heroPop { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-hero-pop { animation: heroPop 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .fused-highlight { background: linear-gradient(90deg, #22d3ee 0%, #ffffff 50%, #22d3ee 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: fusedShimmer 4s linear infinite; }
        @keyframes fusedShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        .progress-track { height: 2px; background: rgba(255,255,255,0.05); width: 100%; position: relative; border-radius: 2px; overflow: hidden; }
        .progress-fill { height: 100%; background: #22d3ee; transition: width 0.6s ease; box-shadow: 0 0 8px #22d3ee; }

        @keyframes coreBreathe { 0%, 100% { transform: scale(1); filter: blur(4px); opacity: 0.5; } 50% { transform: scale(1.2); filter: blur(1px); opacity: 0.9; } }
        .animate-core-breathe { animation: coreBreathe 4s ease-in-out infinite; }
      `}</style>

      {/* --- Boot Sequence --- */}
      {isInitializing && (
        <div className="fixed inset-0 z-[10000] bg-[#030303] flex flex-col items-center justify-center p-8 overflow-hidden">
          <div className="absolute w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full animate-core-breathe pointer-events-none" />
          <div className="relative flex items-center justify-center w-64 h-64">
             <div className="relative w-20 h-20 bg-gradient-to-tr from-cyan-400 to-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.2)] animate-pulse" />
          </div>
          <div className="mt-12 flex flex-col items-center gap-4 animate-hero-pop">
            <span className="font-brand text-[10px] tracking-[0.6em] text-cyan-400 font-black uppercase">Initiating System</span>
            <span className="text-[7px] font-mono opacity-20 uppercase tracking-[0.3em]">Hyzen Labs R3.4.1 | GENE OS</span>
          </div>
        </div>
      )}

      {/* --- Nav --- */}
      <nav className="z-[100] px-8 pt-10 pb-4 flex justify-between items-center shrink-0">
        <div className="flex flex-col">
          <span className="font-brand text-[10px] tracking-[0.5em] text-cyan-400 font-black uppercase">Hyzen Labs.</span>
          <span className="text-[7px] opacity-20 uppercase tracking-[0.3em] font-brand mt-1">R3.4.1 | Fused Pulse</span>
        </div>
        <div className="flex gap-5">
           <a href={`mailto:${EMAIL_ADDRESS}`} className="text-white/30 hover:text-cyan-400 transition-all"><Mail size={16} /></a>
           <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-red-500 transition-all"><Youtube size={16} /></a>
           <Cloud size={16} className={cloudStatus === 'connected' ? 'text-cyan-400' : 'text-amber-500'} />
        </div>
      </nav>

      {/* --- Hero --- */}
      <section className="px-8 mt-4 mb-8 shrink-0 relative overflow-hidden">
        <div className={`transition-all duration-1200 ${showMainTitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-[9vw] sm:text-7xl font-title tracking-[-0.08em] leading-[0.9] uppercase">
            <span className="block fused-highlight">FUSED</span>
            <span className="block" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.12)', color: 'transparent' }}>REALITY</span>
            <span className="flex items-center gap-3">
              <span className="text-[0.35em] text-white font-black tracking-widest">SYNC</span>
              <NeuralPulse />
            </span>
          </h1>
        </div>
      </section>

      {/* --- Immersive Trace Canvas --- */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
        <div className="px-8 flex items-center justify-between mb-6 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-[12px] font-brand font-black text-white uppercase tracking-[0.2em]">Traces</h2>
            <span className="text-[8px] font-mono text-white/30 uppercase mt-1">Digital Identity Log</span>
          </div>
          <button onClick={() => setIsGuestbookOpen(true)} className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-full active:scale-95 transition-all shadow-lg group">
            <Plus size={16} className="group-hover:rotate-90 transition-transform" />
            <span className="text-[10px] font-brand font-black uppercase">Add Trace</span>
          </button>
        </div>

        <div className="snap-x-container flex-1 pb-16" ref={scrollRef} onScroll={handleScroll}>
          {messages.length > 0 ? messages.map((item, idx) => {
            const isActive = activeIndex === idx;
            return (
              <div key={item.id || idx} className={`snap-item ${isActive ? 'active' : ''}`} onClick={() => { setSelectedItem(item); setIsModalOpen(true); }}>
                <div className="card-inner w-full h-full glass-panel rounded-[3rem] overflow-hidden border border-white/5 flex flex-col relative group cursor-pointer">
                  
                  {/* Background Canvas */}
                  <div className="h-1/2 relative bg-zinc-950 overflow-hidden">
                    <div className="card-image w-full h-full">
                      {item.image ? (
                        <img src={item.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-700" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/5 bg-gradient-to-br from-zinc-900 to-black">
                          <Fingerprint size={100} />
                        </div>
                      )}
                    </div>
                    <div className="absolute top-8 left-8 bg-black/40 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full">
                      <span className="text-[8px] font-brand text-cyan-400 uppercase tracking-[0.2em] font-black">LOG_{idx + 1}</span>
                    </div>
                  </div>

                  {/* Narrative Section */}
                  <div className={`p-8 sm:p-10 flex-1 flex flex-col justify-between transition-all duration-700 ${isActive ? 'bg-zinc-900/30' : 'bg-transparent'}`}>
                    <div>
                      <h3 className={`text-2xl sm:text-3xl font-title uppercase leading-tight mb-4 transition-all duration-700 ${isActive ? 'text-white' : 'text-white/20'}`}>
                        {item.name}
                      </h3>
                      <p className={`text-sm sm:text-base font-light leading-relaxed line-clamp-2 transition-all duration-700 italic ${isActive ? 'text-white/70' : 'text-white/10'}`}>
                        "{item.text}"
                      </p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono opacity-20 uppercase tracking-[0.3em]">Temporal Log</span>
                        <span className="text-[9px] font-mono text-cyan-400/50 uppercase mt-0.5">{item.date}</span>
                      </div>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-700 ${isActive ? 'bg-cyan-400 text-black translate-x-0' : 'bg-white/5 text-white/10'}`}>
                        <ArrowRight size={18} />
                      </div>
                    </div>
                  </div>

                  <button onClick={(e) => { e.stopPropagation(); setTargetDeleteId(item.id); setIsDeleteModalOpen(true); }} className="absolute bottom-10 right-24 p-2 text-white/10 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="flex flex-col items-center justify-center w-full opacity-10">
               <Fingerprint size={60} />
               <span className="mt-6 font-brand text-[12px] uppercase tracking-[0.4em]">Empty Stack</span>
            </div>
          )}
        </div>
      </main>

      {/* --- Premium Navigation --- */}
      <footer className="z-[100] py-10 px-8 flex flex-col gap-6 shrink-0 border-t border-white/5 bg-gradient-to-t from-black to-transparent">
        <div className="flex items-center gap-6 max-w-sm w-full mx-auto">
          <span className="text-[10px] font-mono text-white/30 tracking-widest">{String(activeIndex + 1).padStart(2, '0')}</span>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${((activeIndex + 1) / Math.max(1, messages.length)) * 100}%` }} />
          </div>
          <span className="text-[10px] font-mono text-white/30 tracking-widest">{String(messages.length).padStart(2, '0')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-brand text-[9px] tracking-[0.8em] font-black uppercase text-cyan-400/80">HYZEN LABS. 2026</span>
          <div className="flex gap-4">
             <button onClick={() => scrollRef.current?.scrollBy({left: -300, behavior: 'smooth'})} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all text-white/30 hover:text-white"><ChevronLeft size={16} /></button>
             <button onClick={() => scrollRef.current?.scrollBy({left: 300, behavior: 'smooth'})} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all text-white/30 hover:text-white"><ChevronRight size={16} /></button>
          </div>
        </div>
      </footer>

      {/* --- Detail Modal (Full Zoom) --- */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-0 sm:p-6 bg-black/98 backdrop-blur-3xl animate-hero-pop" onClick={closeModal}>
          <div className="w-full h-full glass-panel sm:rounded-[4rem] overflow-hidden flex flex-col md:flex-row relative" onClick={e => e.stopPropagation()}>
            {/* Close Button Inside Modal */}
            <button onClick={closeModal} className="absolute top-10 right-10 z-[100] p-4 bg-white/5 hover:bg-white text-white hover:text-black rounded-full transition-all flex items-center gap-3 group">
              <span className="text-[10px] font-brand font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Close</span>
              <X size={28} />
            </button>
            
            <div className="md:w-3/5 h-1/2 md:h-auto relative bg-black overflow-hidden border-b md:border-b-0 md:border-r border-white/5">
               {selectedItem.image ? (
                 <img src={selectedItem.image} className="w-full h-full object-cover animate-pulse" style={{ animationDuration: '6s' }} alt="" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-white/5 bg-zinc-900">
                    <Fingerprint size={180} />
                 </div>
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
            </div>

            <div className="md:w-2/5 p-12 sm:p-20 flex flex-col justify-between overflow-y-auto bg-zinc-950/20">
              <div className="space-y-10">
                <div className="animate-hero-pop">
                  <span className="text-cyan-400 font-brand text-[10px] font-black uppercase tracking-[0.5em] inline-block mb-6 border-b border-cyan-400/30 pb-2">
                    Identity Synchronized
                  </span>
                  <h2 className="text-4xl sm:text-5xl font-black uppercase font-title leading-tight text-white">
                    {selectedItem.name}
                  </h2>
                </div>
                
                <div className="relative animate-hero-pop" style={{ animationDelay: '0.2s' }}>
                  <div className="absolute -left-8 top-0 bottom-0 w-[3px] bg-cyan-500/40" />
                  <p className="text-xl sm:text-2xl font-light italic text-white/90 leading-relaxed">
                    "{selectedItem.text}"
                  </p>
                </div>
              </div>

              <div className="mt-16 pt-10 border-t border-white/5 flex items-center justify-between animate-hero-pop" style={{ animationDelay: '0.4s' }}>
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-white/20 uppercase tracking-[0.3em]">Temporal Stamp</span>
                  <span className="text-[11px] font-mono text-cyan-400 uppercase mt-1">{selectedItem.date}</span>
                </div>
                <button onClick={closeModal} className="bg-white text-black px-12 py-4 rounded-full font-brand text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-xl active:scale-95">
                  Confirm Trace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Sync (Input) Modal --- */}
      {isGuestbookOpen && (
        <div className="fixed inset-0 z-[7000] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/95 backdrop-blur-2xl" onClick={closeModal}>
          <div className="w-full sm:max-w-xl glass-panel rounded-t-[4rem] sm:rounded-[4rem] p-12 sm:p-16 animate-hero-pop" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-12">
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-black font-brand uppercase tracking-tighter">New Trace</h2>
                <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-[0.4em]">Neuro-Capture Sequence</span>
              </div>
              <button onClick={closeModal} className="p-3 bg-white/5 rounded-full hover:bg-white hover:text-black transition-all"><X size={24} /></button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault(); if (!newMessage.name || !newMessage.text || isUploading) return;
              setIsUploading(true);
              try {
                const q = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
                await addDoc(q, { ...newMessage, createdAt: serverTimestamp(), date: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) });
                setNewMessage({ name: '', text: '', image: null }); closeModal(); playSystemSound('popup');
              } catch (err) { console.error(err); } finally { setIsUploading(false); }
            }} className="space-y-10">
              <input type="text" style={{fontSize: '18px'}} placeholder="IDENTITY NAME" className="w-full bg-transparent border-b border-white/10 px-0 py-5 text-sm font-brand outline-none focus:border-cyan-500 transition-all uppercase tracking-widest" value={newMessage.name} onChange={e => setNewMessage({...newMessage, name: e.target.value.toUpperCase()})} required />
              
              <textarea style={{fontSize: '18px'}} placeholder="ENTER DATA TRACE..." className="w-full h-28 bg-transparent border-b border-white/10 px-0 py-5 text-lg outline-none focus:border-cyan-500 resize-none transition-all font-light tracking-tight" value={newMessage.text} onChange={e => setNewMessage({...newMessage, text: e.target.value})} required />

              <div className="flex gap-5">
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex-1 h-20 flex items-center justify-center gap-4 rounded-3xl border transition-all ${newMessage.image ? 'border-cyan-500 bg-cyan-500/5 text-cyan-400 shadow-md' : 'border-white/10 text-white/30 hover:border-white/60'}`}>
                  {isUploading ? <Loader2 size={22} className="animate-spin" /> : newMessage.image ? <ShieldCheck size={22} /> : <Camera size={22} />}
                  <span className="text-[11px] font-brand font-black uppercase tracking-widest">{newMessage.image ? "Visual Attached" : "Capture Visual"}</span>
                </button>
                {newMessage.image && (
                  <button type="button" onClick={() => setNewMessage({...newMessage, image: null})} className="w-20 h-20 flex items-center justify-center rounded-3xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={22} /></button>
                )}
              </div>

              {newMessage.image && (
                <div className="w-full h-44 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl animate-hero-pop">
                  <img src={newMessage.image} className="w-full h-full object-cover" alt="Preview" />
                </div>
              )}

              <button type="submit" className="w-full h-20 bg-white text-black rounded-3xl font-brand font-black uppercase tracking-[0.3em] transition-all hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-50 shadow-xl" disabled={isUploading}>
                {isUploading ? "Syncing..." : "Complete Neural Sync"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Delete Protocol --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[8000] flex items-center justify-center p-6 bg-black/98 backdrop-blur-3xl animate-hero-pop" onClick={closeModal}>
          <div className="w-full max-w-sm glass-panel p-12 rounded-[4rem] border border-red-500/30 text-center" onClick={e => e.stopPropagation()}>
            <Lock size={48} className="text-red-500 mx-auto mb-8" />
            <h2 className="text-xl font-black uppercase font-brand mb-10 tracking-tighter">Erase Trace</h2>
            <input type="password" style={{fontSize: '18px'}} placeholder="PASSCODE" className="w-full bg-white/5 border border-white/10 rounded-3xl px-6 py-5 text-center mb-10 outline-none focus:border-red-500 font-brand tracking-widest" value={deletePass} onChange={(e) => setDeletePass(e.target.value)} />
            <div className="flex gap-4">
              <button onClick={closeModal} className="flex-1 py-5 rounded-2xl bg-white/5 text-[10px] font-brand font-black uppercase tracking-widest">Abort</button>
              <button onClick={async () => {
                if (deletePass === ADMIN_PASS && targetDeleteId && db) { 
                  await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', targetDeleteId)); 
                  closeModal(); 
                }
              }} className="flex-1 py-5 rounded-2xl bg-red-500 text-black font-brand font-black text-[10px] uppercase tracking-widest">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;