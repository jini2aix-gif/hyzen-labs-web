import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  AlertCircle,
  Eye,
  Box,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  Mail,
  Sparkles,
  User
} from 'lucide-react';

/**
 * [Hyzen Labs. CTO Optimized - R2.3.7 | Circular Data Edition]
 * 1. 버블 디자인 개편: 타원형 캡슐에서 정원형(Circular)으로 변경 및 사진 풀-필(Full-fill) 적용
 * 2. 정보 간소화: 메세지 미리보기를 제거하고 작성자 이름(Identity)만 명확하게 표기
 * 3. 지능형 자율주행: 터치 시 정지 및 마지막 상호작용 3초 후 자동 재개 시스템 유지
 * 4. 리사이징 무결성: fixed inset-0 레이아웃 및 동적 vh 변수 기반 핏(Fit) 보장
 */

const ADMIN_PASS = "5733906";
const FALLBACK_APP_ID = 'hyzen-labs-production';

const getFirebaseConfig = () => {
  let envConfig = null;
  try {
    // @ts-ignore
    const viteEnv = import.meta.env.VITE_FIREBASE_CONFIG;
    if (viteEnv) envConfig = viteEnv;
  } catch (e) {}
  if (!envConfig && typeof process !== 'undefined' && process.env) {
    envConfig = process.env.VITE_FIREBASE_CONFIG || process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  }
  if (!envConfig && typeof __firebase_config !== 'undefined' && __firebase_config) {
    envConfig = __firebase_config;
  }
  if (!envConfig) return null;
  try {
    const sanitized = typeof envConfig === 'string' ? envConfig.trim().replace(/^`+|`+$/g, '') : envConfig;
    const parsed = typeof sanitized === 'string' ? JSON.parse(sanitized) : sanitized;
    return (parsed && parsed.apiKey) ? parsed : null;
  } catch (e) { return null; }
};

const fConfig = getFirebaseConfig();
const firebaseApp = (fConfig && fConfig.apiKey) ? (getApps().length === 0 ? initializeApp(fConfig) : getApps()[0]) : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;

const getAppId = () => {
  if (typeof __app_id !== 'undefined' && __app_id) return __app_id;
  try {
    // @ts-ignore
    return import.meta.env.VITE_APP_ID || (typeof process !== 'undefined' && process.env.VITE_APP_ID) || FALLBACK_APP_ID;
  } catch(e) { return FALLBACK_APP_ID; }
};
const appId = getAppId();

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

const FloatingBubble = ({ msg }) => {
  const [coords] = useState(() => ({
    top: `${Math.random() * 80 + 10}%`, 
    left: `${Math.random() * 80 + 10}%`,
    duration: `${Math.random() * 15 + 20}s`, 
    delay: `${Math.random() * 10}s`,
    twinkleDuration: `${Math.random() * 2 + 1}s`
  }));
  
  return (
    <div className="absolute pointer-events-none select-none animate-bubble-float z-[2]" style={{ top: coords.top, left: coords.left, animationDuration: coords.duration, animationDelay: coords.delay }}>
      <div className="flex flex-col items-center gap-1.5">
        {/* --- Circular Frame with Full Image --- */}
        <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full glass-panel border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.15)] overflow-hidden transition-transform active:scale-110">
          <Mail size={8} className="text-cyan-400 absolute top-1.5 right-1.5 z-20 animate-pulse drop-shadow-lg" style={{ animationDuration: coords.twinkleDuration }} />
          {msg.image ? (
            <img src={msg.image} className="absolute inset-0 w-full h-full object-cover grayscale brightness-110" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5 opacity-30">
              <User size={20} className="text-white" />
            </div>
          )}
          {/* Overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent pointer-events-none" />
        </div>
        
        {/* --- Style-Consistent Identity Name --- */}
        <span className="text-[7px] sm:text-[8px] font-brand text-white/90 font-black uppercase tracking-tighter bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-md border border-white/5">
          {msg?.name || 'ANON'}
        </span>
      </div>
    </div>
  );
};

const CoverFlow = ({ items, renderItem, activeIndex, setActiveIndex, onUserInteraction }) => {
  const touchStartRef = useRef(null);
  const handlePrev = () => { setActiveIndex(activeIndex === 0 ? items.length - 1 : activeIndex - 1); onUserInteraction(); };
  const handleNext = () => { setActiveIndex((activeIndex + 1) % items.length); onUserInteraction(); };
  return (
    <div className="relative w-full h-full flex items-center justify-center perspective-[1500px] overflow-visible touch-pan-y" 
      onMouseDown={onUserInteraction}
      onTouchStart={(e) => { touchStartRef.current = e.touches[0].clientX; onUserInteraction(); }}
      onTouchEnd={(e) => {
        if (!touchStartRef.current) return;
        const diff = touchStartRef.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) diff > 0 ? handleNext() : handlePrev();
        touchStartRef.current = null;
      }}>
      <button onClick={handlePrev} className="absolute left-[-20px] sm:left-0 z-[100] p-2 text-white/20 hover:text-white transition-all"><ChevronLeft size={24} /></button>
      <button onClick={handleNext} className="absolute right-[-20px] sm:right-0 z-[100] p-2 text-white/20 hover:text-white transition-all"><ChevronRight size={24} /></button>
      <div className="relative w-full h-full flex items-center justify-center preserve-3d">
        {items.map((item, idx) => {
          const offset = idx - activeIndex;
          const isCenter = offset === 0;
          const transform = isCenter ? `translateZ(200px) scale(1.15)` : `translateX(${offset * 90}%) translateZ(${Math.abs(offset) * -450}px) rotateY(${offset * -70}deg)`;
          return (
            <div key={item.id || idx} className="absolute w-[240px] sm:w-[320px] h-[160px] preserve-3d transition-all duration-[800ms]" style={{ transform, zIndex: 20 - Math.abs(offset), opacity: isCenter ? 1 : Math.max(0.1, 0.3 - Math.abs(offset) * 0.1), pointerEvents: isCenter ? 'auto' : 'none' }}>
              <div className="relative w-full h-full preserve-3d shadow-2xl">{renderItem(item, isCenter)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [showMainTitle, setShowMainTitle] = useState(false);
  const [activeView, setActiveView] = useState('traces');
  const [activeIndices, setActiveIndices] = useState({ roadmap: 0, works: 0, traces: 0 });
  const [selectedItem, setSelectedItem] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuestbookOpen, setIsGuestbookOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState(null);
  const [deletePass, setDeletePass] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [cloudStatus, setCloudStatus] = useState('disconnected');
  const [diagInfo, setDiagInfo] = useState("");
  const [isAutoPlayPaused, setIsAutoPlayPaused] = useState(false);
  
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState({ name: '', text: '', image: null });
  const fileInputRef = useRef(null);
  const autoPlayResumeTimerRef = useRef(null);

  // --- [Dynamic Viewport Correction] ---
  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      if (!isModalOpen && !isGuestbookOpen && !isDeleteModalOpen) { window.scrollTo(0, 0); }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isModalOpen, isGuestbookOpen, isDeleteModalOpen]);

  // --- [Autonomous Auto-Play Logic] ---
  useEffect(() => {
    if (isModalOpen || isGuestbookOpen || isDeleteModalOpen || isInitializing || isAutoPlayPaused) return;
    const timer = setInterval(() => {
      setActiveIndices(prev => {
        const currentItems = activeView === 'roadmap' ? roadmapSteps : activeView === 'works' ? projects : messages.slice(0, 15);
        if (currentItems.length === 0) return prev;
        return { ...prev, [activeView]: (prev[activeView] + 1) % currentItems.length };
      });
    }, 1200);
    return () => clearInterval(timer);
  }, [activeView, isModalOpen, isGuestbookOpen, isDeleteModalOpen, messages, isInitializing, isAutoPlayPaused]);

  const handleUserInteraction = useCallback(() => {
    setIsAutoPlayPaused(true);
    if (autoPlayResumeTimerRef.current) clearTimeout(autoPlayResumeTimerRef.current);
    autoPlayResumeTimerRef.current = setTimeout(() => {
      if (!isModalOpen && !isGuestbookOpen && !isDeleteModalOpen) {
        setIsAutoPlayPaused(false);
      }
    }, 3000);
  }, [isModalOpen, isGuestbookOpen, isDeleteModalOpen]);

  useEffect(() => {
    const initAuth = async () => {
      if (!auth) { setCloudStatus('error'); return; }
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (err) { setCloudStatus('error'); }
    };
    initAuth();
    const unsubscribe = auth ? onAuthStateChanged(auth, u => {
      setUser(u); if (u) { setCloudStatus('connected'); setDiagInfo("Cloud Link Secure"); }
    }) : () => {};
    const timer = setTimeout(() => {
      setIsInitializing(false); playSystemSound('start');
      setTimeout(() => { setShowMainTitle(true); playSystemSound('popup'); }, 500);
    }, 3000);
    return () => { unsubscribe(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    return onSnapshot(q, s => {
      setMessages(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
    }, (err) => { setCloudStatus('error'); });
  }, [user]);

  const closeModal = () => { 
    setIsModalOpen(false); setIsGuestbookOpen(false); setIsDeleteModalOpen(false); 
    setSelectedItem(null); setIsAutoPlayPaused(false);
    if (autoPlayResumeTimerRef.current) clearTimeout(autoPlayResumeTimerRef.current);
    setTimeout(() => { 
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      window.dispatchEvent(new Event('resize'));
    }, 60);
  };

  const roadmapSteps = [
    { id: "R1", phase: "PHASE 01", title: "Reality Grounding", tag: "감각의 디지털화", icon: <Cpu />, goal: "물리적 질감 정보를 디지털 지능으로 전이시키는 토대 구축.", process: "정밀 샘플링 체계 설계.", result: "하이퍼-리얼리티 데이터 확보." },
    { id: "R2", phase: "PHASE 02", title: "Intelligence Augment", tag: "인지의 공생", icon: <BrainCircuit />, goal: "인간 직관과 AI 추론의 유기적 결합.", process: "개인화 인지 보조 엔진 개발.", result: "영감 증폭 인터페이스 완성." },
    { id: "R3", phase: "PHASE 03", title: "Seamless Convergence", tag: "완전한 융합", icon: <Layers />, goal: "물리 공간과 가상 지능의 경계 소멸.", process: "공간 컴퓨팅의 투명성 확보.", result: "인간 중심 기술 생태계 완성." }
  ];

  const projects = [
    { id: "P1", tag: "Visual Synthesis", title: "잠재적 공간의 초상", icon: <Eye />, goal: "무의식과 AI 잠재 공간의 연결.", process: "SDXL 커스텀 LoRA 적용.", result: "인간적 미학의 공간 확보." },
    { id: "P2", tag: "Spatial Computing", title: "물리적 공간의 증강", icon: <Box />, goal: "현실 사물에 지능형 인터페이스 부여.", process: "온디바이스 비전 모델링.", result: "증강 인터페이스 완성." },
    { id: "P3", tag: "Energy Resonance", title: "생명 에너지 가시화", icon: <Activity />, goal: "비가시적 데이터 흐름의 시각화.", process: "시계열 물리 모델링.", result: "안정성 인지 솔루션." }
  ];

  return (
    <div className="fixed inset-0 bg-[#010101] text-white selection:bg-cyan-500/30 overflow-hidden font-sans flex flex-col max-w-full touch-none" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none z-[1] mix-blend-overlay" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Michroma&family=Orbitron:wght@400;700;900&family=JetBrains+Mono&display=swap');
        .font-brand { font-family: 'Orbitron', sans-serif; }
        .font-title { font-family: 'Michroma', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.12); }
        .preserve-3d { transform-style: preserve-3d; }
        @keyframes scanline { 0% { top: -10%; opacity: 0; } 50% { opacity: 1; } 100% { top: 110%; opacity: 0; } }
        .animate-scan { animation: scanline 4s linear infinite; }
        @keyframes breathe { 0%, 100% { opacity: 0.25; filter: blur(1px); } 50% { opacity: 1; filter: blur(0px); } }
        .animate-breathe { animation: breathe 4s ease-in-out infinite; }
        @keyframes bubbleFloat { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; } 50% { transform: translate(10px, -10px) scale(1.1); opacity: 0.7; } }
        .animate-bubble-float { animation: bubbleFloat 20s ease-in-out infinite; }
        @keyframes heroPop { 0% { opacity: 0; transform: translateY(40px) scale(0.9); filter: blur(10px); } 100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); } }
        .animate-hero-pop { animation: heroPop 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fScan { 0% { transform: translateY(-100%); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(100%); opacity: 0; } }
        .animate-f-scan { animation: fScan 2s linear infinite; }
        @keyframes fBreath { 
          0%, 100% { opacity: 0.2; transform: scale(0.95); border-color: rgba(34, 211, 238, 0.2); box-shadow: 0 0 5px rgba(34, 211, 238, 0.1); } 
          50% { opacity: 0.8; transform: scale(1.05); border-color: rgba(34, 211, 238, 0.8); box-shadow: 0 0 20px rgba(34, 211, 238, 0.4); } 
        }
        .animate-f-breath { animation: fBreath 3s ease-in-out infinite; }
        @keyframes subtleGlow { 0%, 100% { text-shadow: 0 0 10px rgba(255,255,255,0.4); } 50% { text-shadow: 0 0 20px rgba(255,255,255,0.7); } }
        .animate-text-glow { animation: subtleGlow 3s ease-in-out infinite; }
        @keyframes bootProgress {
          0% { width: 0%; filter: brightness(1); }
          20% { width: 10%; }
          40% { width: 45%; }
          60% { width: 70%; }
          80% { width: 95%; filter: brightness(1.5); }
          100% { width: 100%; filter: brightness(2); }
        }
        .animate-boot-load { animation: bootProgress 3s cubic-bezier(0.65, 0, 0.35, 1) forwards; }
      `}</style>

      {isInitializing && (
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center p-8">
          <div className="relative mb-12">
            <ShieldCheck size={50} className="text-cyan-400 animate-pulse" />
            <div className="absolute inset-0 bg-cyan-400/20 blur-xl animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-4 w-64 sm:w-80">
             <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 relative p-[2px]">
                <div className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-white rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-boot-load relative" />
             </div>
             <div className="flex justify-between w-full">
                <span className="font-brand text-[8px] tracking-[0.5em] text-cyan-400 uppercase animate-pulse">Initializing...</span>
                <span className="font-mono text-[8px] text-white/40 uppercase">R2.3.7</span>
             </div>
          </div>
        </div>
      )}

      <nav className="z-[100] px-6 py-4 flex justify-between items-start shrink-0">
        <div className="flex flex-col text-left">
          <span className="font-brand text-[10px] tracking-[0.5em] text-cyan-400 font-black uppercase">Hyzen Labs.</span>
          <span className="text-[7px] opacity-20 uppercase tracking-[0.3em] font-brand mt-1">R2.3.7 | Circular Data</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex flex-col items-end mr-1">
              <span className={`text-[8px] font-brand uppercase tracking-widest ${cloudStatus === 'connected' ? 'text-cyan-400' : 'text-amber-500'}`}>{cloudStatus.toUpperCase()}</span>
              <span className="text-[6px] font-mono opacity-30 uppercase">{diagInfo}</span>
           </div>
           <div className={`w-8 h-8 rounded-lg glass-panel flex items-center justify-center transition-all ${cloudStatus === 'connected' ? 'text-cyan-400 border-cyan-500/30' : 'text-amber-500 border-amber-500/30 animate-pulse'}`}><Cloud size={14} /></div>
        </div>
      </nav>

      <section className="flex-1 z-10 flex flex-col items-center justify-center text-center px-8 relative overflow-hidden">
        {/* --- Floating Circular Bubbles with Identity Tag --- */}
        <div className="absolute inset-0 pointer-events-none z-[1]">
          {messages.slice(0, 12).map((msg) => <FloatingBubble key={`hb-${msg.id}`} msg={msg} />)}
        </div>
        
        <div className={`relative inline-block mb-4 pt-2 z-10 ${showMainTitle ? 'animate-hero-pop' : 'opacity-0'}`}>
          <div className="absolute left-0 w-full h-[1px] bg-cyan-500/40 blur-[1.5px] animate-scan z-10" />
          <h1 className="text-[10vw] sm:text-8xl font-title tracking-[-0.07em] leading-none uppercase">
            <span className="bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent block">ME,</span>
            <span className="block my-1" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent' }}>REALITY</span>
            <span className="block mt-1">
              <span className="text-[0.35em] sm:text-[0.45em] text-white animate-text-glow align-middle mr-2 sm:mr-4 inline-block transform -translate-y-[0.15em] font-black tracking-widest opacity-90">AND</span>
              <span className="bg-gradient-to-b from-cyan-400 to-cyan-700 bg-clip-text text-transparent inline-block">AI</span>
            </span>
          </h1>
        </div>

        <div className={`mt-4 sm:mt-6 mb-2 flex flex-col items-center gap-6 z-10 transition-all duration-1000 delay-700 ${showMainTitle ? 'opacity-100' : 'opacity-0'}`}>
          <div onClick={() => setIsGuestbookOpen(true)} className="group relative cursor-pointer active:scale-95 transition-all">
            <div className="absolute -inset-8 border border-white/5 rounded-full animate-[spin_25s_linear_infinite]" />
            <div className="absolute inset-0 z-20 rounded-full flex items-center justify-center pointer-events-none overflow-hidden">
               <div className="absolute inset-0 flex items-center justify-center animate-f-breath">
                  <Fingerprint className="text-cyan-400/40" size={50} />
               </div>
               <div className="w-full h-full bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="w-full h-1 bg-cyan-400 blur-sm absolute animate-f-scan" />
                  <div className="flex items-center justify-center h-full"><Fingerprint className="text-cyan-400" size={40} /></div>
               </div>
            </div>
            <div className="w-24 h-24 rounded-full p-[1px] bg-gradient-to-br from-white/30 to-transparent relative z-10 overflow-hidden">
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden border border-white/10">
                <img src="YJ.PNG" className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700" alt="Founder" onError={(e) => { e.target.src = "https://via.placeholder.com/150/000000/FFFFFF?text=YJ"; }} />
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 glass-panel border animate-f-breath rounded-full flex items-center gap-2 z-30 transition-all">
              <MessageSquare size={10} className="text-cyan-400" />
              <span className="text-[8px] font-brand font-black uppercase tracking-widest text-white/90">Sync Trace</span>
            </div>
          </div>
          <div className="text-center pb-4">
            <h3 className="text-sm font-title font-bold tracking-tight">Youngji.Park</h3>
            <span className="text-[8px] font-brand text-white/40 uppercase tracking-[0.4em] block mt-1.5">Founder</span>
          </div>
        </div>
      </section>

      <div className="z-10 pb-4 px-6 max-w-lg mx-auto w-full shrink-0 transition-all duration-1000 delay-[1.2s]" style={{ opacity: showMainTitle ? 1 : 0 }}>
        <div className="glass-panel p-1 rounded-2xl flex gap-1 mb-6 border border-white/10">
          {['roadmap', 'works', 'traces'].map((view) => (
            <button key={view} onClick={() => { setActiveView(view); setIsAutoPlayPaused(false); }} 
              className={`flex-1 py-3 rounded-xl text-[8px] font-brand tracking-widest uppercase transition-all ${activeView === view ? 'bg-white text-black font-black shadow-xl scale-105' : 'text-white/30 hover:text-white/60'}`}>
              {view}
            </button>
          ))}
        </div>

        <div className="h-[180px] relative">
          {activeView === 'traces' ? (
            <div className="h-full flex flex-col">
              {messages.length > 0 ? (
                <CoverFlow items={messages.slice(0, 15)} activeIndex={activeIndices.traces} setActiveIndex={(i) => setActiveIndices({...activeIndices, traces: i})} onUserInteraction={handleUserInteraction} renderItem={(msg) => (
                  <div className="group w-full h-full glass-panel rounded-[2.5rem] relative overflow-hidden border border-violet-500/30 p-6 flex flex-col justify-between cursor-pointer active:scale-[0.98] transition-all">
                    {msg.image && (
                      <div className="absolute inset-0 overflow-hidden z-0">
                        <img src={msg.image} className="w-full h-full object-cover opacity-20 grayscale transition-all duration-[1500ms] ease-out group-hover:scale-125 group-hover:rotate-2 group-active:scale-150 group-active:-translate-y-4" alt="" />
                      </div>
                    )}
                    <div className="relative z-10 text-left">
                      <span className="text-[12px] sm:text-[14px] font-brand text-violet-400 font-black uppercase tracking-[0.25em] italic drop-shadow-[0_0_8px_rgba(167,139,250,0.4)]">
                        {msg.name}
                      </span>
                      <p className="text-[11px] font-light mt-2 line-clamp-2 italic opacity-80 leading-relaxed">"{msg.text}"</p>
                    </div>
                    <div className="relative z-10 flex justify-between items-end">
                      <span className="text-[7px] font-mono opacity-30">{msg.date}</span>
                      <button onClick={(e) => { e.stopPropagation(); setTargetDeleteId(msg.id); setIsDeleteModalOpen(true); }} className="p-2 text-white/10 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                    </div>
                  </div>
                )} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-20 gap-2 border border-dashed border-white/10 rounded-[2rem]">
                  <Activity size={24} /><span className="text-[9px] font-brand uppercase tracking-widest">Awaiting Data</span>
                </div>
              )}
            </div>
          ) : (
            <CoverFlow items={activeView === 'roadmap' ? roadmapSteps : projects} activeIndex={activeView === 'roadmap' ? activeIndices.roadmap : activeIndices.works} setActiveIndex={(i) => setActiveIndices({...activeIndices, [activeView]: i})} onUserInteraction={handleUserInteraction} renderItem={(item) => (
              <div onClick={() => { setSelectedItem(item); setIsModalOpen(true); }} className={`w-full h-full glass-panel p-6 rounded-[2.5rem] border ${activeView === 'roadmap' ? 'border-cyan-500/30 shadow-[0_0_30px_-10px_rgba(34,211,238,0.3)]' : 'border-emerald-500/30 shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]'} flex flex-col justify-between text-left cursor-pointer hover:bg-white/5 transition-colors`}>
                <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-cyan-400">{item.icon}</div>
                <div><span className="text-[7px] font-brand text-white/30 uppercase tracking-widest">{item.phase || item.tag}</span><h3 className="text-xs font-bold mt-1 uppercase">{item.title}</h3></div>
              </div>
            )} />
          )}
        </div>
      </div>

      <footer className="z-10 py-8 flex flex-col items-center gap-2 shrink-0">
        <div className="flex flex-col items-center">
          <span className="font-brand text-[10px] tracking-[0.8em] font-black uppercase animate-breathe text-cyan-400/80">HYZEN LABS. 2026</span>
          <span className="text-[7px] font-mono opacity-20 uppercase tracking-[0.2em] mt-1">All right reserved by Hyzen Labs.</span>
        </div>
      </footer>

      {/* --- Modals --- */}
      {isGuestbookOpen && (
        <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md overflow-hidden touch-auto" onClick={closeModal}>
          <div className="w-full sm:max-w-md glass-panel rounded-t-[3rem] sm:rounded-[3rem] p-8 max-w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black font-brand uppercase tracking-tight">Sync Trace</h2>
              <button onClick={closeModal}><X size={20} className="opacity-40 hover:opacity-100" /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault(); if (!newMessage.name || !newMessage.text || isUploading) return;
              setIsUploading(true);
              try {
                const q = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
                await addDoc(q, { ...newMessage, createdAt: serverTimestamp(), date: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) });
                setNewMessage({ name: '', text: '', image: null }); closeModal(); playSystemSound('popup');
              } catch (err) { setErrorMsg("Sync Error"); } finally { setIsUploading(false); }
            }} className="space-y-4">
              <div className="flex gap-2">
                <input type="text" style={{fontSize: '16px'}} placeholder="IDENTITY ID" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-brand outline-none focus:border-cyan-500/50" value={newMessage.name} onChange={e => setNewMessage({...newMessage, name: e.target.value.toUpperCase()})} required />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`px-4 rounded-xl border transition-all ${newMessage.image ? 'bg-cyan-500 border-cyan-500 text-black' : 'bg-white/5 border-white/10 text-white/30'}`} disabled={isUploading}>{isUploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}</button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) { setIsUploading(true); try { const compressed = await compressImage(file); setNewMessage(prev => ({ ...prev, image: compressed })); } catch (e) { } finally { setIsUploading(false); } }
                }} />
              </div>
              <textarea style={{fontSize: '16px'}} placeholder="LOG DATA..." className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-cyan-500/50 resize-none" value={newMessage.text} onChange={e => setNewMessage({...newMessage, text: e.target.value})} required />
              <button type="submit" className="w-full bg-cyan-500 py-4 rounded-2xl text-black font-brand font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50" disabled={isUploading}>{isUploading ? "PROCESS..." : "INITIATE SYNC"}</button>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm overflow-hidden touch-auto" onClick={closeModal}>
          <div className="w-full max-w-xs glass-panel p-8 rounded-[2.5rem] border border-red-500/30 text-center" onClick={e => e.stopPropagation()}>
            <Lock size={32} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-black uppercase mb-6">Erase Trace?</h2>
            <input type="password" style={{fontSize: '16px'}} placeholder="PASSCODE" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center mb-6 outline-none focus:border-red-500" value={deletePass} onChange={e => setDeletePass(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-white/5 text-[10px] font-brand uppercase">Abort</button>
              <button onClick={async () => {
                if (deletePass === ADMIN_PASS && targetDeleteId && db) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', targetDeleteId)); closeModal(); setDeletePass(""); }
              }} className="flex-1 py-3 rounded-xl bg-red-500 text-black font-brand font-black text-[10px] uppercase">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[4000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md overflow-hidden touch-auto" onClick={closeModal}>
          <div className="w-full h-[70vh] sm:h-auto sm:max-w-xl glass-panel rounded-t-[3rem] sm:rounded-[3rem] p-10 relative overflow-y-auto shadow-2xl max-w-full" onClick={e => e.stopPropagation()}>
            <button onClick={closeModal} className="absolute top-8 right-8 text-white/20 hover:text-white"><X size={24} /></button>
            <span className="text-cyan-400 font-brand text-[10px] font-bold uppercase tracking-[0.4em]">{selectedItem.phase || selectedItem.tag}</span>
            <h2 className="text-3xl font-black mt-2 mb-8 uppercase tracking-tighter leading-tight font-title">{selectedItem.title}</h2>
            <div className="space-y-6 mb-10 text-left">
              <div><h4 className="text-[10px] font-brand text-white/30 uppercase mb-2 border-l-2 border-cyan-500 pl-3">Goal</h4><p className="text-sm font-light opacity-80 leading-relaxed">{selectedItem.goal}</p></div>
              <div><h4 className="text-[10px] font-brand text-white/30 uppercase mb-2 border-l-2 border-cyan-500 pl-3">Process</h4><p className="text-sm font-light opacity-80 leading-relaxed">{selectedItem.process}</p></div>
              <div><h4 className="text-[10px] font-brand text-white/30 uppercase mb-2 border-l-2 border-cyan-500 pl-3">Result</h4><p className="text-sm font-light opacity-80 leading-relaxed">{selectedItem.result}</p></div>
            </div>
            <button onClick={closeModal} className="w-full bg-white text-black py-4 rounded-2xl font-brand text-[11px] font-black uppercase tracking-widest shadow-xl">Close Link</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;