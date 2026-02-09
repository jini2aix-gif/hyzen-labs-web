import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { 
  Cpu, 
  Layers, 
  X, 
  BrainCircuit, 
  MessageSquare, 
  Activity, 
  Camera, 
  Trash2, 
  Lock, 
  ShieldCheck,
  Cloud,
  Eye, 
  Box,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  Mail,
  User,
  Youtube,
  Plus,
  ArrowRight,
  Image as ImageIcon
} from 'lucide-react';

/**
 * [Hyzen Labs. CTO Optimized - R3.3.0 | HMG Immersive Layout]
 * 1. UI 개편: 현대자동차그룹(HMG) 메인 레코멘드 스타일의 와이드 스냅 슬라이더 적용
 * 2. 인터렉션: CSS Scroll Snap 및 터치 스와이프 최적화 (Snap Feeling)
 * 3. 콘텐츠 융합: 방문자 기록(Traces)을 로드맵/프로젝트와 동일한 임베디드 카드로 시각화
 */

const ADMIN_PASS = "5733906";
const FALLBACK_APP_ID = 'hyzen-labs-production';
const YOUTUBE_URL = "Https://youtube.com/@hyzen-labs-ai";
const EMAIL_ADDRESS = "jini2gene@gmail.com";

// --- [Firebase Core] ---
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

// --- [Utility Functions] ---
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
        const MAX_SIDE = 800;
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

const NeuralNetwork = ({ messages }) => {
  const nodes = useMemo(() => {
    return messages.slice(0, 10).map((msg) => ({
      id: msg.id,
      top: 10 + (Math.random() * 40),
      left: 5 + (Math.random() * 90),
      duration: `${30 + Math.random() * 20}s`,
      delay: `${Math.random() * 5}s`,
      msg
    }));
  }, [messages]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
      {nodes.map((node) => (
        <div key={`data-node-${node.id}`} className="absolute" style={{ top: `${node.top}%`, left: `${node.left}%` }}>
          <div className="relative animate-bubble-float" style={{ animationDuration: node.duration, animationDelay: node.delay }}>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
};

// --- [UI Component: Neural Pulse] ---
const NeuralPulse = () => (
  <div className="inline-flex items-center gap-1.5 h-full px-2">
    <div className="flex items-end gap-[2px] h-4">
      {[0, 1, 2, 3].map((i) => (
        <div 
          key={i} 
          className="w-[3px] bg-cyan-400/80 rounded-full"
          style={{ 
            height: '100%',
            animation: `syncPulse ${1 + i * 0.2}s ease-in-out infinite`,
            animationDelay: `${i * 0.15}s`
          }} 
        />
      ))}
    </div>
    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
  </div>
);

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [showMainTitle, setShowMainTitle] = useState(false);
  const [activeView, setActiveView] = useState('traces');
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

  const roadmapSteps = [
    { id: "R1", type: "roadmap", phase: "PHASE 01", title: "Reality Grounding", tag: "디지털 질감 전이", icon: <Cpu />, goal: "물리적 질감 정보를 디지털 지능으로 전이시키는 토대 구축.", process: "정밀 샘플링 체계 설계.", result: "하이퍼-리얼리티 데이터 확보." },
    { id: "R2", type: "roadmap", phase: "PHASE 02", title: "Intelligence Augment", tag: "인지의 공생", icon: <BrainCircuit />, goal: "인간 직관과 AI 추론의 유기적 결합.", process: "개인화 인지 보조 엔진 개발.", result: "영감 증폭 인터페이스 완성." },
    { id: "R3", type: "roadmap", phase: "PHASE 03", title: "Seamless Convergence", tag: "완전한 융합", icon: <Layers />, goal: "물리 공간과 가상 지능의 경계 소멸.", process: "공간 컴퓨팅의 투명성 확보.", result: "인간 중심 기술 생태계 완성." }
  ];

  const projects = [
    { id: "P1", type: "work", tag: "Visual Synthesis", title: "잠재적 공간의 초상", icon: <Eye />, goal: "무의식과 AI 잠재 공간의 연결.", process: "SDXL 커스텀 LoRA 적용.", result: "인간적 미학의 공간 확보." },
    { id: "P2", type: "work", tag: "Spatial Computing", title: "물리적 공간의 증강", icon: <Box />, goal: "현실 사물에 지능형 인터페이스 부여.", process: "온디바이스 비전 모델링.", result: "증강 인터페이스 완성." },
    { id: "P3", type: "work", tag: "Energy Resonance", title: "생명 에너지 가시화", icon: <Activity />, goal: "비가시적 데이터 흐름의 시각화.", process: "시계열 물리 모델링.", result: "안정성 인지 솔루션." }
  ];

  // HMG Style unified list
  const currentItems = activeView === 'roadmap' ? roadmapSteps : activeView === 'works' ? projects : messages;

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
    <div className="fixed inset-0 bg-[#010101] text-white selection:bg-cyan-500/30 overflow-hidden font-sans flex flex-col max-w-full touch-none" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none z-[1] mix-blend-overlay" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Michroma&family=Orbitron:wght@400;700;900&family=JetBrains+Mono&display=swap');
        .font-brand { font-family: 'Orbitron', sans-serif; }
        .font-title { font-family: 'Michroma', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.12); }
        
        /* HMG Snap Scroll */
        .snap-x-container {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-left: 24px;
          padding-right: 24px;
        }
        .snap-x-container::-webkit-scrollbar { display: none; }
        .snap-item {
          scroll-snap-align: center;
          flex: 0 0 calc(100% - 24px);
          max-width: 600px;
          margin-right: 16px;
        }
        @media (min-width: 640px) {
          .snap-item { flex: 0 0 500px; }
        }

        @keyframes syncPulse { 0%, 100% { height: 30%; opacity: 0.3; } 50% { height: 100%; opacity: 1; } }
        @keyframes bubbleFloat { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.1; } 50% { transform: translate(10px, -10px) scale(1.1); opacity: 0.2; } }
        .animate-bubble-float { animation: bubbleFloat 20s ease-in-out infinite; }
        @keyframes heroPop { 0% { opacity: 0; transform: translateY(40px) scale(0.9); filter: blur(10px); } 100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); } }
        .animate-hero-pop { animation: heroPop 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fBreath { 0%, 100% { opacity: 0.2; transform: scale(0.95); } 50% { opacity: 0.8; transform: scale(1.05); } }
        .animate-f-breath { animation: fBreath 3s ease-in-out infinite; }
        
        /* Neural Core Loading */
        @keyframes coreBreathe { 0%, 100% { transform: scale(1); filter: blur(4px); opacity: 0.6; } 50% { transform: scale(1.25); filter: blur(1px); opacity: 1; } }
        @keyframes outerBreathe { 0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.2; } 50% { transform: scale(1.5) rotate(180deg); opacity: 0.4; } }
        .animate-core-breathe { animation: coreBreathe 3s ease-in-out infinite; }
        .animate-outer-breathe { animation: outerBreathe 5s ease-in-out infinite; }
        
        .fused-highlight { background: linear-gradient(90deg, #22d3ee 0%, #ffffff 50%, #22d3ee 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: fusedShimmer 4s linear infinite; }
        @keyframes fusedShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        /* Kinetic Scanning */
        @keyframes kineticScan {
          0% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.1) translate(1%, 1%); }
          100% { transform: scale(1) translate(0, 0); }
        }
        .animate-kinetic-scan { animation: kineticScan 20s ease-in-out infinite; }
      `}</style>

      {/* --- Boot Sequence --- */}
      {isInitializing && (
        <div className="fixed inset-0 z-[10000] bg-[#010101] flex flex-col items-center justify-center p-8 overflow-hidden">
          <div className="absolute w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full animate-core-breathe pointer-events-none" />
          <div className="relative flex items-center justify-center w-64 h-64">
            <div className="absolute inset-0 border-[0.5px] border-cyan-400/20 rounded-full animate-outer-breathe" />
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-cyan-400 to-white rounded-full animate-core-breathe flex items-center justify-center shadow-[0_0_50px_rgba(34,211,238,0.4)]" />
          </div>
          <div className="mt-12 flex flex-col items-center gap-4 animate-hero-pop">
            <span className="font-brand text-[10px] tracking-[0.6em] text-cyan-400 font-black uppercase">Initializing Neural Link</span>
            <span className="text-[7px] font-mono opacity-30 uppercase tracking-[0.3em]">Hyzen Labs R3.3.0 | HMG Immersive v5.0</span>
          </div>
        </div>
      )}

      {/* --- Nav --- */}
      <nav className="z-[100] px-8 pt-12 sm:pt-8 pb-4 flex justify-between items-center shrink-0">
        <div className="flex flex-col">
          <span className="font-brand text-[10px] tracking-[0.5em] text-cyan-400 font-black uppercase">Hyzen Labs.</span>
          <span className="text-[7px] opacity-20 uppercase tracking-[0.3em] font-brand mt-1">R3.3.0 | Fused Reality Sync</span>
        </div>
        <div className="flex gap-4">
           <a href={`mailto:${EMAIL_ADDRESS}`} className="text-white/40 hover:text-cyan-400 transition-all"><Mail size={16} /></a>
           <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-red-500 transition-all"><Youtube size={16} /></a>
           <Cloud size={16} className={cloudStatus === 'connected' ? 'text-cyan-400' : 'text-amber-500'} />
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="px-8 mt-4 mb-8 shrink-0 relative">
        <NeuralNetwork messages={messages} />
        <div className={`transition-all duration-1000 ${showMainTitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-[10vw] sm:text-7xl font-title tracking-[-0.07em] leading-[0.9] uppercase">
            <span className="block fused-highlight">FUSED</span>
            <span className="block" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent' }}>REALITY</span>
            <span className="flex items-center gap-3">
              <span className="text-[0.35em] text-white font-black tracking-widest">SYNC</span>
              <NeuralPulse />
            </span>
          </h1>
          <p className="mt-4 text-[10px] sm:text-xs font-light text-white/40 max-w-xs uppercase tracking-widest leading-relaxed">
            Exploring the seamless boundary between human intuition and synthetic intelligence.
          </p>
        </div>
      </section>

      {/* --- HMG Style Slider --- */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
        <div className="px-8 flex items-center justify-between mb-6 shrink-0">
          <div className="flex gap-6 overflow-x-auto no-scrollbar">
            {['roadmap', 'works', 'traces'].map((view) => (
              <button key={view} onClick={() => setActiveView(view)} 
                className={`text-[11px] font-brand font-black uppercase tracking-widest transition-all shrink-0 ${activeView === view ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1' : 'text-white/20'}`}>
                {view}
              </button>
            ))}
          </div>
          <button onClick={() => setIsGuestbookOpen(true)} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full active:scale-95 transition-all">
            <Plus size={14} />
            <span className="text-[9px] font-brand font-black uppercase">Sync Trace</span>
          </button>
        </div>

        <div className="snap-x-container flex-1 pb-10" ref={scrollRef}>
          {currentItems.length > 0 ? currentItems.map((item, idx) => (
            <div key={item.id || idx} className="snap-item relative group" onClick={() => { setSelectedItem(item); setIsModalOpen(true); }}>
              <div className="w-full h-full glass-panel rounded-[3rem] overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all flex flex-col relative group">
                
                {/* Background (Trace Image or Default Icon) */}
                <div className="h-2/3 relative bg-zinc-950 overflow-hidden">
                  {item.image ? (
                    <img src={item.image} className="w-full h-full object-cover animate-kinetic-scan opacity-60 group-hover:opacity-100 transition-opacity duration-1000" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/5 group-hover:text-cyan-400/20 transition-all">
                      {item.icon ? React.cloneElement(item.icon, { size: 120 }) : <Activity size={120} />}
                    </div>
                  )}
                  {/* Category Tag */}
                  <div className="absolute top-8 left-8 bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
                    <span className="text-[8px] font-brand text-cyan-400 uppercase tracking-widest font-black">{item.phase || item.tag || 'SYSTEM_TRACE'}</span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-8 sm:p-10 flex-1 flex flex-col justify-between bg-zinc-900/40 backdrop-blur-sm">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-title uppercase leading-none mb-4 group-hover:text-cyan-400 transition-colors">
                      {item.type === 'trace' ? item.name : item.title}
                    </h3>
                    <p className="text-xs font-light text-white/60 line-clamp-2 leading-relaxed">
                      {item.type === 'trace' ? `"${item.text}"` : item.goal}
                    </p>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest">{item.date || 'LOG_ACTIVE'}</span>
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-400 group-hover:text-black transition-all">
                      <ArrowRight size={18} />
                    </div>
                  </div>
                </div>

                {item.type === 'trace' && (
                  <button onClick={(e) => { e.stopPropagation(); setTargetDeleteId(item.id); setIsDeleteModalOpen(true); }} className="absolute bottom-8 right-20 p-2 text-white/20 hover:text-red-500 transition-all">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center w-full opacity-20">
               <Fingerprint size={48} />
               <span className="mt-4 font-brand text-[10px] uppercase tracking-widest">No Trace Synchronized</span>
            </div>
          )}
        </div>
      </main>

      <footer className="z-10 py-8 px-8 flex justify-between items-center shrink-0 border-t border-white/5">
        <span className="font-brand text-[8px] tracking-[0.8em] font-black uppercase text-cyan-400/80">HYZEN LABS. 2026</span>
        <div className="flex gap-4">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
        </div>
      </footer>

      {/* --- Detail View Modal (Trace & Roadmap/Works) --- */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-0 sm:p-6 bg-black/90 backdrop-blur-2xl" onClick={closeModal}>
          <div className="w-full h-full sm:h-auto sm:max-w-4xl glass-panel sm:rounded-[4rem] overflow-hidden flex flex-col md:flex-row relative" onClick={e => e.stopPropagation()}>
            <button onClick={closeModal} className="absolute top-8 right-8 z-[70] p-3 text-white/30 hover:text-white hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
            
            <div className="md:w-1/2 h-1/2 md:h-auto relative bg-black overflow-hidden">
               {selectedItem.image ? (
                 <img src={selectedItem.image} className="w-full h-full object-cover animate-kinetic-scan" alt="" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-white/5">
                    {selectedItem.icon ? React.cloneElement(selectedItem.icon, { size: 160 }) : <Fingerprint size={160} />}
                 </div>
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
            </div>

            <div className="md:w-1/2 p-10 sm:p-16 flex flex-col justify-between overflow-y-auto">
              <div>
                <span className="text-cyan-400 font-brand text-[10px] font-black uppercase tracking-[0.4em] inline-block mb-4 border-b border-cyan-400/30 pb-1">
                  {selectedItem.phase || selectedItem.tag || 'Trace Synchronized'}
                </span>
                <h2 className="text-3xl sm:text-4xl font-black uppercase font-title leading-tight mb-8">
                  {selectedItem.type === 'trace' ? selectedItem.name : selectedItem.title}
                </h2>
                
                <div className="space-y-8 animate-hero-pop">
                  {selectedItem.type === 'trace' ? (
                    <div className="relative">
                      <div className="absolute -left-6 top-0 bottom-0 w-[2px] bg-cyan-500/30" />
                      <p className="text-lg sm:text-xl font-light italic text-white/80 leading-relaxed">"{selectedItem.text}"</p>
                    </div>
                  ) : (
                    <>
                      <div><h4 className="text-[10px] font-brand text-white/30 uppercase mb-2">Target Goal</h4><p className="text-sm font-light leading-relaxed">{selectedItem.goal}</p></div>
                      <div><h4 className="text-[10px] font-brand text-white/30 uppercase mb-2">Process Engine</h4><p className="text-sm font-light leading-relaxed">{selectedItem.process}</p></div>
                      <div><h4 className="text-[10px] font-brand text-white/30 uppercase mb-2">Expected Outcome</h4><p className="text-sm font-light leading-relaxed">{selectedItem.result}</p></div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Temporal Stamp</span>
                  <span className="text-[10px] font-mono text-cyan-400/60 uppercase">{selectedItem.date || 'ACTIVE_LINK'}</span>
                </div>
                <button onClick={closeModal} className="bg-white text-black px-10 py-4 rounded-full font-brand text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-colors">Close Link</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Sync (Guestbook) Modal --- */}
      {isGuestbookOpen && (
        <div className="fixed inset-0 z-[7000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl" onClick={closeModal}>
          <div className="w-full sm:max-w-lg glass-panel rounded-t-[4rem] sm:rounded-[4rem] p-10 sm:p-12" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black font-brand uppercase tracking-tighter">Initiate Sync</h2>
                <span className="text-[8px] font-mono text-cyan-400 uppercase tracking-[0.3em]">Temporal Trace Capture Protocol</span>
              </div>
              <button onClick={closeModal} className="p-2 bg-white/5 rounded-full hover:text-cyan-400"><X size={20} /></button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault(); if (!newMessage.name || !newMessage.text || isUploading) return;
              setIsUploading(true);
              try {
                const q = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
                await addDoc(q, { ...newMessage, createdAt: serverTimestamp(), date: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) });
                setNewMessage({ name: '', text: '', image: null }); closeModal(); playSystemSound('popup');
              } catch (err) { console.error(err); } finally { setIsUploading(false); }
            }} className="space-y-6">
              <input type="text" style={{fontSize: '16px'}} placeholder="IDENTITY ID" className="w-full bg-white/5 border-b border-white/10 px-0 py-4 text-xs font-brand outline-none focus:border-cyan-500 transition-all uppercase" value={newMessage.name} onChange={e => setNewMessage({...newMessage, name: e.target.value.toUpperCase()})} required />
              
              <textarea style={{fontSize: '16px'}} placeholder="ENTER DATA TRACE..." className="w-full h-32 bg-white/5 border-b border-white/10 px-0 py-4 text-sm outline-none focus:border-cyan-500 resize-none transition-all font-light" value={newMessage.text} onChange={e => setNewMessage({...newMessage, text: e.target.value})} required />

              <div className="flex gap-4">
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex-1 h-16 flex items-center justify-center gap-3 rounded-2xl border transition-all ${newMessage.image ? 'border-cyan-500 bg-cyan-500/5 text-cyan-400' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : newMessage.image ? <ShieldCheck size={18} /> : <Camera size={18} />}
                  <span className="text-[10px] font-brand uppercase font-black">{newMessage.image ? "Visual Linked" : "Attach Visual"}</span>
                </button>
                {newMessage.image && (
                  <button type="button" onClick={() => setNewMessage({...newMessage, image: null})} className="w-16 h-16 flex items-center justify-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20"><Trash2 size={18} /></button>
                )}
              </div>

              {newMessage.image && (
                <div className="w-full h-40 rounded-3xl overflow-hidden border border-white/10 animate-hero-pop">
                  <img src={newMessage.image} className="w-full h-full object-cover opacity-80" alt="Preview" />
                </div>
              )}

              <button type="submit" className="w-full h-16 bg-white text-black rounded-2xl font-brand font-black uppercase tracking-widest transition-all hover:bg-cyan-400 active:scale-95 disabled:opacity-50" disabled={isUploading}>
                {isUploading ? "Syncing..." : "Initiate Neural Sync"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Admin Delete --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[8000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md" onClick={closeModal}>
          <div className="w-full max-w-xs glass-panel p-10 rounded-[3rem] border border-red-500/30 text-center" onClick={e => e.stopPropagation()}>
            <Lock size={40} className="text-red-500 mx-auto mb-6" />
            <h2 className="text-xl font-black uppercase font-brand mb-8">Erase Trace</h2>
            <input type="password" style={{fontSize: '16px'}} placeholder="PASSCODE" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-center mb-8 outline-none focus:border-red-500 font-brand" value={deletePass} onChange={(e) => setDeletePass(e.target.value)} />
            <div className="flex gap-4">
              <button onClick={closeModal} className="flex-1 py-4 rounded-xl bg-white/5 text-[9px] font-brand font-black uppercase">Abort</button>
              <button onClick={async () => {
                if (deletePass === ADMIN_PASS && targetDeleteId && db) { 
                  await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', targetDeleteId)); 
                  closeModal(); 
                }
              }} className="flex-1 py-4 rounded-xl bg-red-500 text-black font-brand font-black text-[9px] uppercase">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;