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
  User,
  Youtube,
  Zap,
  Image as ImageIcon
} from 'lucide-react';

/**
 * [Hyzen Labs. CTO Optimized - R3.1.0 | Visual Memory Update]
 * 1. 방명록 이미지 첨부: compressImage 유틸을 통한 데이터 최적화 업로드
 * 2. 상세 팝업 레이아웃: 이미지-텍스트 최적화 배치 및 Close 인터페이스
 * 3. 기존 Pure Data Drift 컨셉 유지
 */

const ADMIN_PASS = "5733906";
const FALLBACK_APP_ID = 'hyzen-labs-production';
const YOUTUBE_URL = "https://www.youtube.com/@HyzenLabs";
const EMAIL_ADDRESS = "jini2aix@gmail.com";

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
    return messages.slice(0, 15).map((msg) => ({
      id: msg.id,
      top: 15 + (Math.random() * 50),
      left: 10 + (Math.random() * 80),
      duration: `${20 + Math.random() * 15}s`,
      delay: `${Math.random() * 5}s`,
      msg
    }));
  }, [messages]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {nodes.map((node) => (
        <div key={`data-node-${node.id}`} className="absolute" style={{ top: `${node.top}%`, left: `${node.left}%` }}>
          <div className="relative group animate-bubble-float" style={{ animationDuration: node.duration, animationDelay: node.delay }}>
            <span className="absolute -top-1 -left-2 z-30 text-[7px] sm:text-[8px] font-brand text-white font-black uppercase bg-black/70 px-2 py-0.5 rounded-sm border border-white/10 shadow-xl whitespace-nowrap opacity-90 transition-transform group-hover:scale-110">
              {node.msg?.name || 'ANON'}
            </span>
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full glass-panel border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.1)] overflow-hidden transition-transform active:scale-110 flex items-center justify-center pointer-events-auto">
              {node.msg.image ? (
                <img src={node.msg.image} className="absolute inset-0 w-full h-full object-cover grayscale brightness-110" alt="" />
              ) : (
                <User size={20} className="text-white opacity-20" />
              )}
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/15 to-transparent" />
            </div>
          </div>
        </div>
      ))}
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
          const transform = isCenter ? `translateZ(180px) scale(1.1)` : `translateX(${offset * 85}%) translateZ(${Math.abs(offset) * -400}px) rotateY(${offset * -65}deg)`;
          return (
            <div key={item.id || idx} className="absolute w-[220px] sm:w-[320px] h-[140px] sm:h-[160px] preserve-3d transition-all duration-[800ms]" style={{ transform, zIndex: 20 - Math.abs(offset), opacity: isCenter ? 1 : Math.max(0.1, 0.3 - Math.abs(offset) * 0.1), pointerEvents: isCenter ? 'auto' : 'none' }}>
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
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuestbookOpen, setIsGuestbookOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState(null);
  const [deletePass, setDeletePass] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [cloudStatus, setCloudStatus] = useState('disconnected');
  const [diagInfo, setDiagInfo] = useState("System Offline");
  const [isAutoPlayPaused, setIsAutoPlayPaused] = useState(false);
  
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState({ name: '', text: '', image: null });
  const fileInputRef = useRef(null);
  const autoPlayResumeTimerRef = useRef(null);

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
      if (!auth) { setCloudStatus('error'); setDiagInfo("Auth System Missing"); return; }
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { setCloudStatus('error'); setDiagInfo("Auth Engine Error"); }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) { setCloudStatus('connected'); setDiagInfo("Cloud Link Active"); }
    });

    const timer = setTimeout(() => {
      setIsInitializing(false);
      playSystemSound('start');
      setTimeout(() => { setShowMainTitle(true); playSystemSound('popup'); }, 500);
    }, 3000);

    return () => { unsubscribe(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setMessages(msgs.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
      }, 
      (error) => { setCloudStatus('error'); setDiagInfo(`Sync Link Error`); }
    );
    return () => unsubscribe();
  }, [user, appId]);

  useEffect(() => {
    if (isModalOpen || isGuestbookOpen || isDeleteModalOpen || selectedTrace || isInitializing || isAutoPlayPaused) return;
    const timer = setInterval(() => {
      setActiveIndices(prev => {
        const currentItems = activeView === 'roadmap' ? roadmapSteps : activeView === 'works' ? projects : messages.slice(0, 15);
        if (currentItems.length === 0) return prev;
        return { ...prev, [activeView]: (prev[activeView] + 1) % currentItems.length };
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [activeView, isModalOpen, isGuestbookOpen, isDeleteModalOpen, selectedTrace, messages, isInitializing, isAutoPlayPaused]);

  const handleUserInteraction = useCallback(() => {
    setIsAutoPlayPaused(true);
    if (autoPlayResumeTimerRef.current) clearTimeout(autoPlayResumeTimerRef.current);
    autoPlayResumeTimerRef.current = setTimeout(() => {
      if (!isModalOpen && !isGuestbookOpen && !isDeleteModalOpen && !selectedTrace) {
        setIsAutoPlayPaused(false);
      }
    }, 3000);
  }, [isModalOpen, isGuestbookOpen, isDeleteModalOpen, selectedTrace]);

  const closeModal = () => { 
    setIsModalOpen(false); setIsGuestbookOpen(false); setIsDeleteModalOpen(false); 
    setSelectedItem(null); setSelectedTrace(null); setIsAutoPlayPaused(false);
    setDeletePass("");
    if (autoPlayResumeTimerRef.current) clearTimeout(autoPlayResumeTimerRef.current);
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
        @keyframes fBreath { 0%, 100% { opacity: 0.2; transform: scale(0.95); border-color: rgba(34, 211, 238, 0.2); } 50% { opacity: 0.8; transform: scale(1.05); border-color: rgba(34, 211, 238, 0.8); } }
        .animate-f-breath { animation: fBreath 3s ease-in-out infinite; }
        @keyframes subtleGlow { 0%, 100% { text-shadow: 0 0 10px rgba(255,255,255,0.4); } 50% { text-shadow: 0 0 20px rgba(255,255,255,0.7); } }
        .animate-text-glow { animation: subtleGlow 3s ease-in-out infinite; }
        @keyframes bootProgress { 0% { width: 0%; } 100% { width: 100%; } }
        .animate-boot-load { animation: bootProgress 3s cubic-bezier(0.65, 0, 0.35, 1) forwards; }
        .fused-highlight { background: linear-gradient(90deg, #22d3ee 0%, #ffffff 50%, #22d3ee 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: fusedShimmer 4s linear infinite; position: relative; }
        @keyframes fusedShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

      {isInitializing && (
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center p-8">
          <ShieldCheck size={50} className="text-cyan-400 animate-pulse mb-8" />
          <div className="w-64 h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 p-[2px]">
            <div className="h-full bg-cyan-400 rounded-full animate-boot-load" />
          </div>
        </div>
      )}

      {/* --- Nav --- */}
      <nav className="z-[100] px-6 pt-10 sm:pt-6 pb-4 flex justify-between items-start shrink-0">
        <div className="flex flex-col">
          <span className="font-brand text-[10px] tracking-[0.5em] text-cyan-400 font-black uppercase">Hyzen Labs.</span>
          <span className="text-[7px] opacity-20 uppercase tracking-[0.3em] font-brand mt-1">R3.1.0 | Memory Sync</span>
        </div>
        <div className="flex gap-3">
           <a href={`mailto:${EMAIL_ADDRESS}`} className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center text-white/40 hover:text-cyan-400 transition-all"><Mail size={14} /></a>
           <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center text-white/40 hover:text-red-500 transition-all"><Youtube size={14} /></a>
           <div className={`w-8 h-8 rounded-lg glass-panel flex items-center justify-center ${cloudStatus === 'connected' ? 'text-cyan-400' : 'text-amber-500'}`}><Cloud size={14} /></div>
        </div>
      </nav>

      {/* --- Hero --- */}
      <section className="flex-1 z-10 flex flex-col items-center justify-center text-center px-8 relative overflow-hidden">
        {messages.length > 0 && <NeuralNetwork messages={messages} />}
        <div className={`relative inline-block mb-4 pt-2 z-10 ${showMainTitle ? 'animate-hero-pop' : 'opacity-0'}`}>
          <h1 className="text-[8vw] sm:text-7xl font-title tracking-[-0.07em] leading-none uppercase">
            <span className="block fused-highlight">FUSED</span>
            <span className="block my-1" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent' }}>REALITY</span>
            <span className="block mt-1">
              <span className="text-[0.35em] text-white animate-text-glow font-black tracking-widest mr-2 inline-block">SYNC</span>
              <span className="bg-gradient-to-b from-cyan-400 to-cyan-700 bg-clip-text text-transparent inline-block">AI</span>
            </span>
          </h1>
        </div>

        <div className={`mt-2 flex flex-col items-center gap-6 z-10 transition-all duration-1000 delay-700 ${showMainTitle ? 'opacity-100' : 'opacity-0'}`}>
          <div onClick={() => setIsGuestbookOpen(true)} className="group relative cursor-pointer active:scale-95 transition-all">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-900/90 flex items-center justify-center border border-white/15 relative overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.25)]">
              <Fingerprint size={42} className="text-cyan-400/80 group-hover:text-cyan-400 group-hover:scale-110 transition-all duration-500" />
              <div className="absolute w-full h-[2px] bg-cyan-400/40 blur-[2px] animate-f-scan opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 glass-panel animate-f-breath rounded-full flex items-center gap-2">
              <MessageSquare size={10} className="text-cyan-400" />
              <span className="text-[8px] font-brand font-black uppercase tracking-widest">Trace Sync</span>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-title font-bold">Gene</h3>
            <span className="text-[8px] font-brand text-white/40 uppercase tracking-[0.4em] block mt-1">Founder</span>
          </div>
        </div>
      </section>

      {/* --- Content Area --- */}
      <div className="z-10 pb-4 px-6 mx-auto w-full shrink-0 transition-all duration-1000 delay-[1.2s] relative" style={{ opacity: showMainTitle ? 1 : 0 }}>
        <div className="glass-panel p-1 rounded-2xl flex gap-1 mb-4 border border-white/10 max-w-lg mx-auto relative z-20">
          {['roadmap', 'works', 'traces'].map((view) => (
            <button key={view} onClick={() => { setActiveView(view); setIsAutoPlayPaused(false); }} 
              className={`flex-1 py-3 rounded-xl text-[8px] font-brand tracking-widest uppercase transition-all ${activeView === view ? 'bg-white text-black font-black' : 'text-white/30 hover:text-white/60'}`}>
              {view}
            </button>
          ))}
        </div>

        <div className="h-[150px] sm:h-[180px] relative max-w-lg mx-auto">
          <CoverFlow 
            items={activeView === 'roadmap' ? roadmapSteps : activeView === 'works' ? projects : messages.slice(0, 15)} 
            activeIndex={activeIndices[activeView]} 
            setActiveIndex={(i) => setActiveIndices({...activeIndices, [activeView]: i})} 
            onUserInteraction={handleUserInteraction} 
            renderItem={(item) => (
              <div onClick={() => { if(activeView === 'traces') { setSelectedTrace(item); } else { setSelectedItem(item); setIsModalOpen(true); } }} className="group w-full h-full glass-panel rounded-[2rem] relative overflow-hidden border border-white/15 p-5 flex flex-col justify-between cursor-pointer transition-all hover:border-cyan-500/50">
                {activeView === 'traces' ? (
                  <>
                    {item.image && <img src={item.image} className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" alt="" />}
                    <div className="relative z-10 text-left">
                      <span className="text-[10px] font-brand text-cyan-400 font-black uppercase italic">{item.name}</span>
                      <p className="text-[9px] font-light mt-1 line-clamp-2 opacity-80">"{item.text}"</p>
                    </div>
                    <div className="relative z-10 flex justify-between items-end">
                      <span className="text-[6px] font-mono opacity-30">{item.date}</span>
                      <button onClick={(e) => { e.stopPropagation(); setTargetDeleteId(item.id); setIsDeleteModalOpen(true); }} className="p-1 text-white/10 hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-xl text-cyan-400">
                      {React.cloneElement(item.icon, { size: 16 })}
                    </div>
                    <div>
                      <span className="text-[6px] font-brand text-white/30 uppercase tracking-widest">{item.phase || item.tag}</span>
                      <h3 className="text-[10px] sm:text-xs font-bold mt-0.5 uppercase">{item.title}</h3>
                    </div>
                  </>
                )}
              </div>
            )} 
          />
        </div>
      </div>

      <footer className="z-10 py-6 sm:py-8 flex flex-col items-center shrink-0">
        <span className="font-brand text-[8px] sm:text-[10px] tracking-[0.8em] font-black uppercase animate-breathe text-cyan-400/80">HYZEN LABS. 2026</span>
      </footer>

      {/* --- Trace Detail Modal (NEW) --- */}
      {selectedTrace && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-xl" onClick={closeModal}>
          <div className="w-full max-w-2xl glass-panel rounded-[3rem] overflow-hidden flex flex-col md:flex-row max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="md:w-1/2 h-64 md:h-auto relative bg-zinc-900 flex items-center justify-center border-b md:border-b-0 md:border-r border-white/10 overflow-hidden">
              {selectedTrace.image ? (
                <img src={selectedTrace.image} className="w-full h-full object-cover" alt="Trace Visual" />
              ) : (
                <div className="flex flex-col items-center opacity-10 gap-2">
                  <User size={60} />
                  <span className="font-brand text-[10px] uppercase">No Visual Data</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:hidden" />
            </div>
            <div className="md:w-1/2 p-8 sm:p-12 flex flex-col justify-between relative">
              <button onClick={closeModal} className="absolute top-6 right-6 p-2 text-white/20 hover:text-white hover:bg-white/5 rounded-full transition-all"><X size={20} /></button>
              
              <div className="space-y-6">
                <div>
                  <span className="text-cyan-400 font-brand text-[10px] font-black uppercase tracking-[0.3em]">Identity Link Established</span>
                  <h2 className="text-2xl font-black mt-2 uppercase font-title text-white">{selectedTrace.name}</h2>
                  <span className="text-[9px] font-mono text-white/30 block mt-1">{selectedTrace.date} / SYNC_SUCCESS</span>
                </div>
                
                <div className="relative">
                  <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-cyan-500/30" />
                  <p className="text-sm sm:text-base font-light opacity-90 leading-relaxed italic">"{selectedTrace.text}"</p>
                </div>
              </div>

              <div className="mt-12 pt-6 border-t border-white/5 flex gap-3">
                <button onClick={closeModal} className="flex-1 bg-white text-black py-4 rounded-2xl font-brand text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Close Trace</button>
                <button onClick={() => { setTargetDeleteId(selectedTrace.id); setIsDeleteModalOpen(true); }} className="w-14 h-14 rounded-2xl border border-red-500/20 flex items-center justify-center text-red-500/50 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Guestbook Modal --- */}
      {isGuestbookOpen && (
        <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md" onClick={closeModal}>
          <div className="w-full sm:max-w-md glass-panel rounded-t-[3rem] sm:rounded-[3rem] p-8 pb-10 sm:pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black font-brand uppercase">Initiate Sync</h2>
              <button onClick={closeModal}><X size={20} className="opacity-40" /></button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault(); if (!newMessage.name || !newMessage.text || isUploading) return;
              setIsUploading(true);
              try {
                const q = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
                await addDoc(q, { ...newMessage, createdAt: serverTimestamp(), date: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) });
                setNewMessage({ name: '', text: '', image: null }); closeModal(); playSystemSound('popup');
              } catch (err) { console.error(err); } finally { setIsUploading(false); }
            }} className="space-y-4">
              <div className="relative group">
                <input type="text" style={{fontSize: '16px'}} placeholder="IDENTITY ID" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-brand outline-none focus:border-cyan-500/50 transition-all" value={newMessage.name} onChange={e => setNewMessage({...newMessage, name: e.target.value.toUpperCase()})} required />
              </div>
              
              <div className="relative">
                <textarea style={{fontSize: '16px'}} placeholder="LOG DATA..." className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-cyan-500/50 resize-none transition-all" value={newMessage.text} onChange={e => setNewMessage({...newMessage, text: e.target.value})} required />
              </div>

              {/* Photo Upload Integration */}
              <div className="flex items-center gap-3">
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed transition-all ${newMessage.image ? 'border-cyan-500/50 text-cyan-400 bg-cyan-500/5' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : newMessage.image ? <ImageIcon size={16} /> : <Camera size={16} />}
                  <span className="text-[10px] font-brand uppercase tracking-tighter">{newMessage.image ? "Image Linked" : "Attach Visual"}</span>
                </button>
                {newMessage.image && (
                  <button type="button" onClick={() => setNewMessage({...newMessage, image: null})} className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20"><X size={16} /></button>
                )}
              </div>

              {newMessage.image && (
                <div className="w-full h-32 rounded-2xl overflow-hidden border border-white/10 relative">
                  <img src={newMessage.image} className="w-full h-full object-cover" alt="Preview" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                    <span className="text-[8px] font-mono text-cyan-400 opacity-80 uppercase tracking-widest">Buffer_ready</span>
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-cyan-500 py-4 rounded-2xl text-black font-brand font-black uppercase tracking-widest transition-all hover:bg-white active:scale-[0.98] disabled:opacity-50" disabled={isUploading}>
                {isUploading ? "PROCESS..." : "INITIATE Neural SYNC"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Delete Modal --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[7000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm" onClick={closeModal}>
          <div className="w-full max-w-xs glass-panel p-8 rounded-[2.5rem] border border-red-500/30 text-center" onClick={e => e.stopPropagation()}>
            <Lock size={32} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-black uppercase mb-6">Erase Trace?</h2>
            <input type="password" style={{fontSize: '16px'}} placeholder="PASSCODE" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center mb-6 outline-none focus:border-red-500" value={deletePass} onChange={(e) => setDeletePass(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-white/5 text-[10px] font-brand uppercase">Abort</button>
              <button onClick={async () => {
                if (deletePass === ADMIN_PASS && targetDeleteId && db) { 
                  await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', targetDeleteId)); 
                  closeModal(); 
                }
              }} className="flex-1 py-3 rounded-xl bg-red-500 text-black font-brand font-black text-[10px] uppercase">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Roadmap/Work Modal --- */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[4000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md" onClick={closeModal}>
          <div className="w-full h-[75vh] sm:h-auto sm:max-w-xl glass-panel rounded-t-[3rem] sm:rounded-[3rem] p-10 relative overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={closeModal} className="absolute top-8 right-8 text-white/20 hover:text-white"><X size={24} /></button>
            <span className="text-cyan-400 font-brand text-[10px] font-bold uppercase tracking-[0.4em]">{selectedItem.phase || selectedItem.tag}</span>
            <h2 className="text-2xl font-black mt-2 mb-8 uppercase font-title leading-tight">{selectedItem.title}</h2>
            <div className="space-y-6 mb-10 text-left">
              <div><h4 className="text-[10px] font-brand text-white/30 uppercase mb-1 border-l-2 border-cyan-500 pl-3">Goal</h4><p className="text-sm font-light opacity-80 leading-relaxed">{selectedItem.goal}</p></div>
              <div><h4 className="text-[10px] font-brand text-white/30 uppercase mb-1 border-l-2 border-cyan-500 pl-3">Process</h4><p className="text-sm font-light opacity-80 leading-relaxed">{selectedItem.process}</p></div>
              <div><h4 className="text-[10px] font-brand text-white/30 uppercase mb-1 border-l-2 border-cyan-500 pl-3">Result</h4><p className="text-sm font-light opacity-80 leading-relaxed">{selectedItem.result}</p></div>
            </div>
            <button onClick={closeModal} className="w-full bg-white text-black py-4 rounded-2xl font-brand text-[11px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Close Link</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;