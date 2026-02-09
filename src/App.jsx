import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { 
  X, 
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
  User,
  Sparkles,
  Video,
  Play,
  Image as ImageIcon
} from 'lucide-react';

/**
 * [Hyzen Labs. CTO Optimized - R3.8.0 | Multimedia Intelligence Matrix]
 * 1. 팝업 최적화: 폰트 조정 및 레이아웃 비율 개선을 통해 스크롤 없는 닫기 버튼 확보
 * 2. 히어로 정제: 메인 타이틀 크기 축소로 시각적 안정감 부여
 * 3. 동영상 엔진: 매트릭스 내 무음 프리뷰 및 팝업 내 고해상도 재생 기능 추가
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
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'popup') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    }
  } catch (e) {}
};

const compressFile = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIDE = 800;
          let width = img.width; let height = img.height;
          if (width > height) { if (width > MAX_SIDE) { height *= MAX_SIDE / width; width = MAX_SIDE; } }
          else { if (height > MAX_SIDE) { width *= MAX_SIDE / height; height = MAX_SIDE; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
          resolve({ data: canvas.toDataURL('image/jpeg', 0.6), type: 'image' });
        };
      } else {
        // Video is passed as Base64 (Size limit aware: Firestore has 1MB limit)
        resolve({ data: event.target.result, type: 'video' });
      }
    };
  });
};

const NeuralPulse = () => (
  <div className="inline-flex items-center gap-1 h-full px-1">
    <div className="flex items-end gap-[1.2px] h-3.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="w-[2px] bg-cyan-400/80 rounded-full" style={{ height: '100%', animation: `syncPulse ${1 + i * 0.2}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
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
  const [newMessage, setNewMessage] = useState({ name: '', text: '', mediaData: null, mediaType: 'image' });
  
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
      setTimeout(() => { setShowMainTitle(true); }, 500);
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
    setIsModalOpen(false); setIsGuestbookOpen(false); setIsDeleteModalOpen(false); 
    setSelectedItem(null); setDeletePass("");
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        // Firestore has a 1MB limit for the whole document
        return; 
      }
      setIsUploading(true);
      const result = await compressFile(file);
      setNewMessage(prev => ({ ...prev, mediaData: result.data, mediaType: result.type }));
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#020202] text-white selection:bg-cyan-500/30 overflow-hidden font-sans flex flex-col max-w-full touch-none" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
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
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: inset 0 0 20px rgba(0,0,0,0.6);
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
          padding: 12px;
        }
        .matrix-grid::-webkit-scrollbar { display: none; }
        
        @media (min-width: 1024px) {
          .matrix-grid { grid-template-columns: repeat(10, 1fr); gap: 12px; padding: 24px; }
        }

        .data-packet {
          position: relative;
          aspect-ratio: 0.85 / 1;
          overflow: hidden;
          background: #0a0a0a;
          border: 0.5px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes driftA { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-4px, -10px) rotate(1.5deg); } }
        @keyframes driftB { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(6px, -8px) rotate(-1.5deg); } }
        @keyframes driftC { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-2px, -12px); } }

        .packet-drift-0 { animation: driftA 3.5s ease-in-out infinite; }
        .packet-drift-1 { animation: driftB 4s ease-in-out infinite; }
        .packet-drift-2 { animation: driftC 4.5s ease-in-out infinite; }
        .packet-drift-3 { animation: driftA 5s ease-in-out infinite; animation-direction: reverse; }

        .data-packet:active { transform: scale(0.9) !important; border-color: #22d3ee; }

        @keyframes kenBurns {
          0% { transform: scale(1); }
          50% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        .animate-ken-burns { animation: kenBurns 15s ease-in-out infinite; }

        @keyframes syncPulse { 0%, 100% { height: 30%; opacity: 0.3; } 50% { height: 100%; opacity: 1; } }
        @keyframes heroPop { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-hero-pop { animation: heroPop 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .fused-highlight { background: linear-gradient(90deg, #22d3ee 0%, #ffffff 50%, #22d3ee 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: fusedShimmer 4s linear infinite; }
        @keyframes fusedShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        @keyframes coreBreatheEnhanced { 
          0%, 100% { transform: scale(1); opacity: 0.4; filter: blur(4px); box-shadow: 0 0 20px rgba(34, 211, 238, 0.2); } 
          50% { transform: scale(1.3); opacity: 1; filter: blur(0px); box-shadow: 0 0 60px rgba(34, 211, 238, 0.6); } 
        }
        .animate-core-breathe-enhanced { animation: coreBreatheEnhanced 3s ease-in-out infinite; }

        @keyframes borderFlow {
          0% { border-color: rgba(34, 211, 238, 0.2); box-shadow: 0 0 0px transparent; }
          50% { border-color: rgba(34, 211, 238, 0.6); box-shadow: 0 0 15px rgba(34, 211, 238, 0.2); }
          100% { border-color: rgba(34, 211, 238, 0.2); box-shadow: 0 0 0px transparent; }
        }
        .trace-button-flow { animation: borderFlow 3s ease-in-out infinite; }

        .floating-modal-container {
          width: 92%;
          max-width: 500px;
          height: 85vh;
          border-radius: 40px;
          box-shadow: 0 50px 100px -20px rgba(0,0,0,0.9), 0 0 50px rgba(34, 211, 238, 0.05);
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        @media (min-width: 1024px) {
          .floating-modal-container { width: 55%; max-width: 1000px; flex-direction: row; height: 70vh; }
        }
      `}</style>

      {/* --- Boot Sequence --- */}
      {isInitializing && (
        <div className="fixed inset-0 z-[10000] bg-[#010101] flex flex-col items-center justify-center p-8 overflow-hidden">
          <div className="absolute w-[600px] h-[600px] bg-cyan-500/10 blur-[150px] rounded-full animate-pulse pointer-events-none" />
          
          <div className="relative flex items-center justify-center w-24 h-24 mb-16">
            <div className="absolute inset-[-40px] border border-cyan-400/20 rounded-full animate-ping opacity-20" />
            <div className="relative w-16 h-16 bg-gradient-to-tr from-cyan-400 to-white rounded-full flex items-center justify-center animate-core-breathe-enhanced" />
          </div>

          <div className="flex flex-col items-center gap-4 text-center">
            <span className="font-brand text-[12px] sm:text-[14px] tracking-[0.8em] text-cyan-400 font-black uppercase animate-hero-pop">
              Entering the world of Hyzen Labs
            </span>
            <div className="flex gap-2">
               {[0,1,2].map(i => (
                 <div key={i} className="w-1.5 h-1.5 bg-cyan-400/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
               ))}
            </div>
          </div>
        </div>
      )}

      {/* --- Global Header --- */}
      <nav className="z-[100] px-6 pt-12 pb-4 flex justify-between items-start shrink-0">
        <div className="flex flex-col">
          <span className="font-brand text-[10px] tracking-[0.5em] text-cyan-400 font-black uppercase">Hyzen Labs.</span>
          <span className="text-[7px] opacity-20 uppercase tracking-[0.3em] font-brand mt-1">Living Matrix Ecosystem</span>
        </div>
        <div className="flex gap-4">
           <a href={`mailto:${EMAIL_ADDRESS}`} className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center text-white/30 hover:text-cyan-400 transition-all"><Mail size={14} /></a>
           <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center text-white/30 hover:text-red-500 transition-all"><Youtube size={14} /></a>
           <div className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center"><Cloud size={14} className={cloudStatus === 'connected' ? 'text-cyan-400' : 'text-amber-500'} /></div>
        </div>
      </nav>

      {/* --- Hero Section (Resized) --- */}
      <section className="px-8 pt-8 mb-10 shrink-0 relative overflow-hidden">
        <div className={`transition-all duration-1000 ${showMainTitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h1 className="text-[7vw] sm:text-5xl font-title tracking-[-0.06em] leading-[0.9] uppercase">
            <span className="block fused-highlight">FUSED</span>
            <span className="block" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.06)', textShadow: '0 0 10px rgba(255,255,255,0.1)' }}>REALITY</span>
            <span className="flex items-center gap-3">
              <span className="text-[0.35em] text-white font-black tracking-widest">SYNC</span>
              <NeuralPulse />
            </span>
          </h1>
        </div>
      </section>

      {/* --- High-Density Neural Matrix --- */}
      <main className="flex-1 overflow-hidden flex flex-col relative z-10">
        <div className="px-10 flex items-center justify-between mb-5 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-[11px] font-brand font-black text-white uppercase tracking-[0.2em]">Digital Stack</h2>
            <span className="text-[7px] font-mono text-white/20 uppercase tracking-widest">Nodes: {messages.length} Units</span>
          </div>
          
          <button 
            onClick={() => setIsGuestbookOpen(true)} 
            className="group flex items-center gap-3 glass-panel px-5 py-2 rounded-full border border-white/10 hover:bg-white active:scale-95 transition-all duration-500 trace-button-flow"
          >
            <div className="relative w-4 h-4 flex items-center justify-center">
              <Fingerprint size={16} className="text-cyan-400 group-hover:text-black transition-colors" />
            </div>
            <span className="text-[9px] font-brand font-black text-white group-hover:text-black uppercase tracking-tighter">Sync Trace</span>
          </button>
        </div>

        <div className="matrix-container">
          <div className="matrix-grid">
            {messages.length > 0 ? messages.map((item, idx) => (
              <div 
                key={item.id || idx} 
                className={`data-packet group packet-drift-${idx % 4}`}
                onClick={() => { setSelectedItem(item); setIsModalOpen(true); playSystemSound('popup'); }}
              >
                <div className="absolute inset-0 overflow-hidden">
                  {item.mediaType === 'video' ? (
                    <video 
                      src={item.mediaData || item.image} 
                      className="absolute inset-0 w-full h-full object-cover opacity-40 brightness-75 grayscale group-hover:grayscale-0 group-hover:opacity-70 transition-all"
                      autoPlay muted loop playsInline
                    />
                  ) : item.image || item.mediaData ? (
                    <img src={item.mediaData || item.image} className="absolute inset-0 w-full h-full object-cover opacity-40 brightness-75 animate-micro-pan" alt="" />
                  ) : (
                    <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center">
                      <User size={20} className="text-white/10" />
                    </div>
                  )}
                  {item.mediaType === 'video' && <div className="absolute top-1.5 right-1.5 text-white/40"><Video size={10} /></div>}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                  <span className="block text-[7px] font-brand font-black text-cyan-400/80 truncate uppercase tracking-tight">
                    {item.name || 'ANON'}
                  </span>
                </div>
              </div>
            )) : (
              Array.from({length: 30}).map((_, i) => (
                <div key={i} className="data-packet bg-zinc-900/5 flex items-center justify-center border border-white/5 rounded-2xl">
                  <Fingerprint size={16} className="text-white/5" />
                </div>
              ))
            )}
          </div>
          <div className="absolute inset-0 pointer-events-none border border-cyan-500/5 rounded-2xl shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]" />
        </div>
      </main>

      {/* --- Footer --- */}
      <footer className="z-[100] px-10 py-6 flex justify-between items-end border-t border-white/5 bg-black/60 backdrop-blur-md shrink-0">
        <div className="flex flex-col gap-2">
          <span className="font-brand text-[9px] tracking-[0.8em] font-black uppercase text-cyan-400/70">HYZEN LABS. 2026</span>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-white/40" />
            <span className="text-[9px] font-brand tracking-[0.5em] text-white/40 uppercase">
              Founder Gene
            </span>
          </div>
        </div>
        <div className="flex gap-2 mb-2">
           <Sparkles size={12} className="text-cyan-400/40 animate-pulse" />
           <div className="w-1 h-1 rounded-full bg-white/20" />
        </div>
      </footer>

      {/* --- Floating Detail Modal (Compact UX) --- */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/85 backdrop-blur-2xl animate-hero-pop" onClick={closeModal}>
          <div className="floating-modal-container glass-panel relative" onClick={e => e.stopPropagation()}>
            
            {/* Top-Right 'X' Close Button */}
            <button onClick={closeModal} className="absolute top-5 right-5 z-[110] p-2.5 bg-black/40 hover:bg-white text-white hover:text-black rounded-full transition-all border border-white/10 backdrop-blur-md">
              <X size={20} />
            </button>

            {/* Media Canvas Section (Reduced height for mobile) */}
            <div className="h-[35vh] lg:h-auto lg:w-1/2 relative bg-black overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
              {selectedItem.mediaType === 'video' ? (
                <video 
                  src={selectedItem.mediaData || selectedItem.image} 
                  className="w-full h-full object-cover"
                  autoPlay controls playsInline
                />
              ) : (selectedItem.image || selectedItem.mediaData) ? (
                <img src={selectedItem.mediaData || selectedItem.image} className="w-full h-full object-cover animate-ken-burns" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/5 bg-zinc-900">
                   <Fingerprint size={120} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
            </div>

            {/* Content Section (Optimized for visibility) */}
            <div className="flex-1 p-6 lg:p-12 flex flex-col justify-between bg-zinc-950/40">
              <div className="space-y-4 lg:space-y-6">
                <div>
                  <span className="text-cyan-400 font-brand text-[9px] font-black uppercase tracking-[0.3em] inline-block mb-1">Neural Identity</span>
                  <h2 className="text-3xl lg:text-5xl font-black uppercase font-title leading-none text-white tracking-tighter">
                    {selectedItem.name}
                  </h2>
                </div>
                
                <div className="relative">
                  <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-cyan-500/40" />
                  <p className="text-sm lg:text-lg font-light italic text-white/90 leading-relaxed font-sans line-clamp-6">
                    "{selectedItem.text}"
                  </p>
                </div>
              </div>

              {/* Bottom Actions (Always visible) */}
              <div className="mt-6 pt-5 border-t border-white/5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.3em]">Temporal Stamp</span>
                    <span className="text-[9px] font-mono text-cyan-400 uppercase mt-0.5 tracking-tight">{selectedItem.date}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setTargetDeleteId(selectedItem.id); setIsDeleteModalOpen(true); }} className="p-3 text-white/10 hover:text-red-500 transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <button onClick={closeModal} className="w-full bg-white text-black py-4 rounded-xl font-brand text-[10px] font-black uppercase tracking-[0.2em] active:scale-[0.98] transition-all shadow-lg hover:bg-cyan-400">
                  Secure Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Sync (Input) Modal --- */}
      {isGuestbookOpen && (
        <div className="fixed inset-0 z-[7000] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/95 backdrop-blur-3xl animate-hero-pop" onClick={closeModal}>
          <div className="w-full sm:max-w-md glass-panel rounded-t-[3.5rem] sm:rounded-[3rem] p-10 sm:p-12" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-xl font-black font-brand uppercase tracking-tight text-white">New Trace</h2>
                <span className="text-[7px] font-mono text-cyan-400/60 uppercase tracking-[0.4em]">Neurological Capture Sequence</span>
              </div>
              <button onClick={closeModal} className="p-2.5 bg-white/5 rounded-full hover:bg-white/10 transition-all text-white/40"><X size={18} /></button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault(); if (!newMessage.name || !newMessage.text || isUploading) return;
              setIsUploading(true);
              try {
                const q = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
                await addDoc(q, { 
                  name: newMessage.name, 
                  text: newMessage.text, 
                  mediaData: newMessage.mediaData, 
                  mediaType: newMessage.mediaType,
                  createdAt: serverTimestamp(), 
                  date: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) 
                });
                setNewMessage({ name: '', text: '', mediaData: null, mediaType: 'image' }); closeModal(); playSystemSound('popup');
              } catch (err) { console.error(err); } finally { setIsUploading(false); }
            }} className="space-y-8">
              <div className="space-y-1">
                <label className="text-[8px] font-brand text-cyan-400/50 uppercase tracking-[0.3em] ml-1">Identity Name</label>
                <input 
                  type="text" 
                  style={{fontSize: '15px'}} 
                  placeholder="AUTHOR_ID" 
                  className="w-full bg-white/5 border-b border-white/10 px-1 py-4 text-sm font-brand outline-none focus:border-cyan-500 transition-all uppercase tracking-widest text-white placeholder:text-white/10" 
                  value={newMessage.name} 
                  onChange={e => setNewMessage({...newMessage, name: e.target.value.toUpperCase()})} 
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-brand text-cyan-400/50 uppercase tracking-[0.3em] ml-1">Your Narrative Data</label>
                <textarea 
                  style={{fontSize: '16px'}} 
                  placeholder="ENTER FRAGMENTED THOUGHTS..." 
                  className="w-full h-24 bg-white/5 border-b border-white/10 px-1 py-4 text-base font-title outline-none focus:border-cyan-500 resize-none transition-all font-light tracking-tight text-white/90 placeholder:text-white/10" 
                  value={newMessage.text} 
                  onChange={e => setNewMessage({...newMessage, text: e.target.value})} 
                  required 
                />
              </div>

              <div className="flex gap-4">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex-1 h-16 flex items-center justify-center gap-4 rounded-2xl border transition-all ${newMessage.mediaData ? 'border-cyan-500 text-cyan-400 bg-cyan-400/5 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'border-white/10 text-white/30 hover:border-white/20'}`}>
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : newMessage.mediaType === 'video' ? <Video size={18} /> : <Camera size={18} />}
                  <span className="text-[9px] font-brand font-black uppercase tracking-widest">{newMessage.mediaData ? "Visual Ready" : "Attach Media"}</span>
                </button>
              </div>

              {newMessage.mediaData && (
                <div className="w-full h-36 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl animate-hero-pop">
                  {newMessage.mediaType === 'video' ? (
                    <video src={newMessage.mediaData} className="w-full h-full object-cover" muted autoPlay loop />
                  ) : (
                    <img src={newMessage.mediaData} className="w-full h-full object-cover" alt="Preview" />
                  )}
                </div>
              )}

              <button 
                type="submit" 
                className="w-full h-14 bg-white text-black rounded-2xl font-brand font-black uppercase tracking-[0.5em] text-[12px] active:scale-[0.98] disabled:opacity-50 shadow-xl transition-all hover:bg-cyan-400" 
                disabled={isUploading}
              >
                {isUploading ? "Syncing..." : "SYNC"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Delete Security Protocol --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[8000] flex items-center justify-center p-6 bg-black/98 backdrop-blur-3xl animate-hero-pop" onClick={closeModal}>
          <div className="w-full max-w-xs glass-panel p-12 rounded-[4rem] border border-red-500/30 text-center" onClick={e => e.stopPropagation()}>
            <Lock size={48} className="text-red-500 mx-auto mb-8" />
            <h2 className="text-xl font-black uppercase font-brand mb-10 tracking-tighter text-white">Security Pass</h2>
            <input type="password" style={{fontSize: '18px'}} placeholder="PASSCODE" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-5 text-center mb-10 outline-none focus:border-red-500 font-brand tracking-widest text-white" value={deletePass} onChange={(e) => setDeletePass(e.target.value)} />
            <div className="flex gap-4">
              <button onClick={closeModal} className="flex-1 py-5 rounded-2xl bg-white/5 text-[10px] font-brand font-black uppercase tracking-widest">Abort</button>
              <button onClick={async () => {
                if (deletePass === ADMIN_PASS && targetDeleteId && db) { 
                  await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', targetDeleteId)); 
                  closeModal(); 
                }
              }} className="flex-1 py-5 rounded-2xl bg-red-500 text-black font-brand font-black text-[10px] uppercase tracking-widest">Erase</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;