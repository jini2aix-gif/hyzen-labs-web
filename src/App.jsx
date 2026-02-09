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
  Image as ImageIcon
} from 'lucide-react';

/**
 * [Hyzen Labs. CTO Optimized - R3.7.1 | Minimalist Sync Interface]
 * 1. 입력창 고도화: Identity Name 및 Narrative Data 폰트/크기 심미적 개선
 * 2. 버튼 최적화: "INITIATE NEURAL SYNC" -> "SYNC" 로 단축 및 컴팩트 사이즈 적용
 * 3. 기존 R3.7.0 의 Digital Stack 및 퀀텀 바운더리 로직 유지
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
  const [newMessage, setNewMessage] = useState({ name: '', text: '', image: null });
  
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
    <div className="fixed inset-0 bg-[#020202] text-white selection:bg-cyan-500/30 overflow-hidden font-sans flex flex-col max-w-full touch-none" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none z-[1] mix-blend-overlay" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Michroma&family=Orbitron:wght@400;700;900&family=JetBrains+Mono&display=swap');
        .font-brand { font-family: 'Orbitron', sans-serif; }
        .font-title { font-family: 'Michroma', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.08); }
        
        /* High-Density Matrix Grid */
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
          height: 82vh;
          border-radius: 40px;
          box-shadow: 0 50px 100px -20px rgba(0,0,0,0.9), 0 0 50px rgba(34, 211, 238, 0.05);
          overflow: hidden;
          position: relative;
        }
        @media (min-width: 1024px) {
          .floating-modal-container { width: 45%; max-width: 950px; flex-direction: row; display: flex; height: 65vh; }
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

      {/* --- Hero Section --- */}
      <section className="px-8 pt-12 mb-14 shrink-0 relative overflow-hidden">
        <div className={`transition-all duration-1000 ${showMainTitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h1 className="text-[9vw] sm:text-7xl font-title tracking-[-0.08em] leading-[0.9] uppercase">
            <span className="block fused-highlight">FUSED</span>
            <span className="block" style={{ WebkitTextStroke: '1.2px rgba(255,255,255,0.5)', color: 'rgba(255,255,255,0.08)', textShadow: '0 0 20px rgba(255,255,255,0.15)' }}>REALITY</span>
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
            <h2 className="text-[12px] font-brand font-black text-white uppercase tracking-[0.3em]">Digital Stack</h2>
            <span className="text-[7px] font-mono text-white/20 uppercase tracking-widest">Nodes: {messages.length} Units</span>
          </div>
          
          <button 
            onClick={() => setIsGuestbookOpen(true)} 
            className="group flex items-center gap-3 glass-panel px-5 py-2.5 rounded-full border border-white/10 hover:bg-white active:scale-95 transition-all duration-500 trace-button-flow"
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              <Fingerprint size={18} className="text-cyan-400 group-hover:text-black transition-colors" />
              <div className="absolute inset-0 bg-cyan-400/20 rounded-full animate-ping group-hover:hidden" />
            </div>
            <span className="text-[10px] font-brand font-black text-white group-hover:text-black uppercase tracking-tighter">Sync Trace</span>
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
                  {item.image ? (
                    <img src={item.image} className="absolute inset-0 w-full h-full object-cover opacity-40 brightness-75 animate-micro-pan" style={{ animationDelay: `${idx * 0.3}s` }} alt="" />
                  ) : (
                    <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center">
                      <User size={20} className="text-white/10" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                  <span className="block text-[7px] font-brand font-black text-cyan-400/80 truncate uppercase tracking-tight">
                    {item.name || 'ANON'}
                  </span>
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(34,211,238,0.03)_50%,transparent_100%)] bg-[length:100%_3px] animate-scan pointer-events-none" />
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

      {/* --- Enhanced Footer --- */}
      <footer className="z-[100] px-10 py-8 flex justify-between items-end border-t border-white/5 bg-black/60 backdrop-blur-md shrink-0">
        <div className="flex flex-col gap-2">
          <span className="font-brand text-[9px] tracking-[0.8em] font-black uppercase text-cyan-400/70">HYZEN LABS. 2026</span>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
            <span className="text-[10px] font-brand tracking-[0.5em] text-white font-black uppercase bg-cyan-900/10 px-4 py-1.5 rounded-md border border-cyan-400/30">
              Founder Gene
            </span>
          </div>
        </div>
        <div className="flex gap-2 mb-2">
           <Sparkles size={12} className="text-cyan-400/40 animate-pulse" />
           <div className="w-1 h-1 rounded-full bg-white/20" />
        </div>
      </footer>

      {/* --- Floating Detail Modal --- */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/85 backdrop-blur-2xl animate-hero-pop" onClick={closeModal}>
          <div className="floating-modal-container glass-panel flex flex-col" onClick={e => e.stopPropagation()}>
            
            <div className="h-1/2 lg:h-auto lg:w-3/5 relative bg-black overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
              {selectedItem.image ? (
                <img src={selectedItem.image} className="w-full h-full object-cover animate-ken-burns" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/5 bg-zinc-900">
                   <Fingerprint size={140} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
              <div className="absolute bottom-6 left-8">
                <span className="text-cyan-400 font-brand text-[9px] font-black uppercase tracking-[0.4em] border-b border-cyan-400/30 pb-1">Digital Core Synchronized</span>
              </div>
            </div>

            <div className="flex-1 p-8 lg:p-14 flex flex-col justify-between overflow-y-auto bg-zinc-950/40">
              <div className="space-y-8">
                <div>
                  <span className="text-cyan-400 font-brand text-[10px] font-black uppercase tracking-[0.3em] inline-block mb-2">Neural Identity</span>
                  <h2 className="text-4xl lg:text-6xl font-black uppercase font-title leading-none text-white tracking-tighter">
                    {selectedItem.name}
                  </h2>
                </div>
                
                <div className="relative">
                  <div className="absolute -left-6 top-0 bottom-0 w-[2.5px] bg-cyan-500/40" />
                  <p className="text-lg lg:text-2xl font-light italic text-white/95 leading-relaxed font-sans">
                    "{selectedItem.text}"
                  </p>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-white/30 uppercase tracking-[0.3em]">Temporal Stamp</span>
                    <span className="text-[11px] font-mono text-cyan-400 uppercase mt-1 tracking-tight">{selectedItem.date}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setTargetDeleteId(selectedItem.id); setIsDeleteModalOpen(true); }} className="p-4 text-white/10 hover:text-red-500 transition-all hover:bg-white/5 rounded-2xl">
                    <Trash2 size={20} />
                  </button>
                </div>
                
                <button onClick={closeModal} className="w-full bg-white text-black py-5 rounded-2xl font-brand text-[11px] font-black uppercase tracking-[0.3em] active:scale-[0.98] transition-all shadow-2xl hover:bg-cyan-400">
                  Secure Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Refined Sync Modal --- */}
      {isGuestbookOpen && (
        <div className="fixed inset-0 z-[7000] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/95 backdrop-blur-3xl animate-hero-pop" onClick={closeModal}>
          <div className="w-full sm:max-w-xl glass-panel rounded-t-[3.5rem] sm:rounded-[3.5rem] p-10 sm:p-14 shadow-[0_0_100px_rgba(34,211,238,0.1)]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-2xl font-black font-brand uppercase tracking-tight text-white">New Trace</h2>
                <span className="text-[8px] font-mono text-cyan-400/60 uppercase tracking-[0.4em]">Neurological Capture Sequence</span>
              </div>
              <button onClick={closeModal} className="p-2.5 bg-white/5 rounded-full hover:bg-white/10 transition-all text-white/40"><X size={20} /></button>
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
              {/* Identity Name Field */}
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

              {/* Narrative Data Field */}
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
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex-1 h-16 flex items-center justify-center gap-4 rounded-2xl border transition-all ${newMessage.image ? 'border-cyan-500 text-cyan-400 bg-cyan-400/5 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'border-white/10 text-white/30 hover:border-white/20'}`}>
                  {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                  <span className="text-[9px] font-brand font-black uppercase tracking-widest">{newMessage.image ? "Visual Ready" : "Attach Image"}</span>
                </button>
              </div>

              {newMessage.image && (
                <div className="w-full h-36 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl animate-hero-pop">
                  <img src={newMessage.image} className="w-full h-full object-cover" alt="Preview" />
                </div>
              )}

              {/* Compact SYNC Button */}
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