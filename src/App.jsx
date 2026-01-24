import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { 
  Github, 
  Linkedin, 
  Mail, 
  ChevronRight, 
  ChevronLeft,
  Cpu, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  X, 
  Share2, 
  Box,
  BrainCircuit,
  User,
  MessageSquare,
  Send,
  Activity,
  Zap,
  Fingerprint,
  Maximize2,
  Camera,
  Image as ImageIcon,
  Trash2,
  Lock,
  Clock,
  Quote,
  ShieldCheck
} from 'lucide-react';

/**
 * [Hyzen Labs. CTO Optimized - R1.6.7 | Absolute Fit & Persistence Edition]
 * 1. 줌 제어: 전송 버튼 클릭 시 강제 Blur 처리로 모바일 줌인 현상 해결 및 100% 핏 복구
 * 2. 영구 보존: Firestore 실시간 연동 로직 정상화로 방명록 카드 및 버블 유실 문제 해결
 * 3. 3D 복구: 독립 오버레이 레이어 방식으로 3D Context(기울기) 영구 보호
 * 4. 시각화: 중앙 보호 여백 집중형 버블 시스템 고도화
 */

const ADMIN_PASS = "5733906";

// --- [Firebase Initialization Safety Check] ---
const getFirebaseConfig = () => {
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return JSON.parse(__firebase_config);
    }
  } catch (e) { console.warn("Firebase configuration not found. Running in local mode."); }
  return null;
};

const fConfig = getFirebaseConfig();
let firebaseApp, auth, db, appId;

if (fConfig && fConfig.apiKey) {
  firebaseApp = initializeApp(fConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  appId = typeof __app_id !== 'undefined' ? __app_id : 'hyzen-labs-v1';
}

// --- [시각화 컴포넌트: 여백 집중형 버블] ---
const FloatingBubble = ({ msg }) => {
  const [coords] = useState(() => {
    // 중앙 텍스트 영역(20% ~ 80%)을 절대 침범하지 않는 좌우 극단 배치 (Safe Zone)
    const isLeft = Math.random() > 0.5;
    const horizontalPos = isLeft ? Math.random() * 12 + 4 : Math.random() * 12 + 84;
    return {
      top: `${Math.random() * 35 + 10}%`,
      left: `${horizontalPos}%`,
      duration: `${Math.random() * 10 + 20}s`,
      delay: `${Math.random() * 5}s`
    };
  });

  const safeName = String(msg?.name || "Anon");
  const safeText = String(msg?.text || "");
  const summary = safeText.length > 12 ? safeText.substring(0, 12) + ".." : safeText;

  return (
    <div 
      className="absolute pointer-events-none select-none animate-bubble-float z-[2]"
      style={{ top: coords.top, left: coords.left, animationDuration: coords.duration, animationDelay: coords.delay }}
    >
      <div className="relative group scale-75 transition-transform duration-1000">
        <div className="relative flex items-center gap-2 px-3 py-2 rounded-full glass-panel border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="absolute top-1 left-3 w-4 h-2 bg-white/10 rounded-full blur-[1px] rotate-[-20deg]" />
          {msg.image && (
            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-white/20">
              <img src={msg.image} className="w-full h-full object-cover grayscale brightness-125" alt="" />
            </div>
          )}
          <div className="flex flex-col text-left pr-1 text-white">
            <span className="text-[6px] font-brand text-cyan-400 font-black uppercase tracking-tighter opacity-60">{safeName}</span>
            <span className="text-[8px] text-white/40 font-light italic leading-tight truncate max-w-[60px]">"{summary}"</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- [공통 컴포넌트: Cover Flow Wrapper - 3D 효과 절대 고정] ---
const CoverFlow = ({ items, renderItem, activeIndex, setActiveIndex }) => {
  const touchStartRef = useRef(null);
  const handlePrev = () => setActiveIndex(Math.max(0, activeIndex - 1));
  const handleNext = () => setActiveIndex(Math.min(items.length - 1, activeIndex + 1));

  const onTouchStart = (e) => { touchStartRef.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartRef.current === null) return;
    const diff = touchStartRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { diff > 0 ? handleNext() : handlePrev(); }
    touchStartRef.current = null;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center perspective-[1500px] overflow-visible touch-pan-y" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <button onClick={handlePrev} className={`absolute left-0 z-[100] p-2 text-white/10 hover:text-white/50 transition-all ${activeIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}><ChevronLeft size={24} /></button>
      <button onClick={handleNext} className={`absolute right-0 z-[100] p-2 text-white/10 hover:text-white/50 transition-all ${activeIndex === items.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}><ChevronRight size={24} /></button>
      
      <div className="relative w-full h-full flex items-center justify-center preserve-3d">
        {items.map((item, idx) => {
          const offset = idx - activeIndex;
          const isCenter = offset === 0;
          
          // 3D 효과: 70도 기울기 및 -450px 깊이감 고정
          let transform = `translateX(${offset * 90}%) translateZ(${Math.abs(offset) * -450}px) rotateY(${offset * -70}deg)`;
          if (isCenter) transform = `translateZ(200px) scale(1.15)`;

          return (
            <div 
              key={`${idx}-${activeIndex}-${isCenter}`}
              className={`absolute w-[240px] sm:w-[320px] h-[160px] preserve-3d cursor-pointer transition-all duration-[800ms] ${isCenter ? 'ease-[cubic-bezier(0.22,1.4,0.36,1)]' : 'ease-out'}`}
              style={{
                transform,
                zIndex: 20 - Math.abs(offset),
                pointerEvents: isCenter ? 'auto' : 'none',
                opacity: isCenter ? 1 : Math.max(0.05, 0.4 - Math.abs(offset) * 0.15)
              }}
              onClick={() => setActiveIndex(idx)}
            >
              <div className="relative w-full h-full preserve-3d">
                {renderItem(item, isCenter)}
                {!isCenter && (
                  <div className="absolute inset-0 rounded-[2.5rem] bg-black/75 backdrop-blur-[6px] transition-all duration-500 pointer-events-none" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeView, setActiveView] = useState('traces');
  const [activeIndices, setActiveIndices] = useState({ roadmap: 0, works: 0, traces: 0 });
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuestbookOpen, setIsGuestbookOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState(null);
  const [deletePass, setDeletePass] = useState("");
  const [imgLoadStatus, setImgLoadStatus] = useState('loading');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState({ name: '', text: '', image: null });
  
  const fileInputRef = useRef(null);
  const founderImgSrc = "YJ.PNG"; 

  // --- [Initialization & Auth] ---
  useEffect(() => {
    const initAuth = async () => {
      if (!auth) { 
        console.warn("Auth not initialized");
        return;
      }
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else { await signInAnonymously(auth); }
      } catch (err) { console.warn("Firebase Auth Fail - Running Local Only"); }
    };
    initAuth();
    const unsubscribe = auth ? onAuthStateChanged(auth, setUser) : () => {};
    const timer = setTimeout(() => setIsInitializing(false), 2800);
    return () => { unsubscribe(); clearTimeout(timer); };
  }, []);

  // --- [Real-time Persistence Synchronization] ---
  useEffect(() => {
    if (!user || !db) return;
    try {
      const messagesCollection = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
      const q = query(messagesCollection);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // 최신순 정렬 (서버 타임스탬프 기준)
        const sortedMsgs = msgs.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        setMessages(sortedMsgs.slice(0, 15));
      }, (error) => console.error("Snapshot Error:", error));
      return () => unsubscribe();
    } catch (e) { console.error("Firestore Context Error:", e); }
  }, [user]);

  // --- [Absolute Layout Reset Logic] ---
  useEffect(() => {
    if (!isModalOpen && !isGuestbookOpen && !isDeleteModalOpen) {
      // 팝업이 닫히면 강제로 최상단으로 정렬하고 스크롤 잠금 유지
      window.scrollTo(0, 0);
      document.body.style.overflow = 'hidden';
      // 뷰포트 강제 리프레시를 통해 줌 현상 최종 제거
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    }
  }, [isModalOpen, isGuestbookOpen, isDeleteModalOpen]);

  const triggerSync = useCallback(() => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1500);
  }, []);

  const openGuestbook = () => {
    setNewMessage({ name: '', text: '', image: null });
    setIsGuestbookOpen(true);
  };

  const handleDeleteRequest = (id) => {
    setTargetDeleteId(id);
    setDeletePass("");
    setIsDeleteModalOpen(true);
  };

  const handleMessageSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.name || !newMessage.text) return;

    // [CRITICAL] 모바일 줌 현상 해결을 위해 포커스 강제 해제 (줌아웃 유도)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (user && db) {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), {
          name: String(newMessage.name),
          text: String(newMessage.text),
          image: newMessage.image,
          createdAt: serverTimestamp(),
          date: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        });
      } catch (err) { console.error("Submit Fail", err); }
    } else {
      // 오프라인 폴백
      const fallbackMsg = {
        id: Date.now().toString(),
        name: newMessage.name,
        text: newMessage.text,
        image: newMessage.image,
        date: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [fallbackMsg, ...prev].slice(0, 15));
    }

    setNewMessage({ name: '', text: '', image: null });
    triggerSync();
    // 전송과 동시에 팝업 닫기
    setIsGuestbookOpen(false);
  };

  const confirmDelete = async () => {
    if (deletePass === ADMIN_PASS && targetDeleteId && user && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', targetDeleteId));
        setIsDeleteModalOpen(false);
        setTargetDeleteId(null);
        triggerSync();
      } catch (err) { console.error("Delete Fail", err); }
    }
    setDeletePass("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsGuestbookOpen(false);
    setIsDeleteModalOpen(false);
  };

  const isAnyModalOpen = isModalOpen || isGuestbookOpen || isDeleteModalOpen;
  const setViewIndex = (view, index) => setActiveIndices(prev => ({ ...prev, [view]: index }));

  const roadmapSteps = [
    { phase: "PHASE 01", title: "Reality Grounding", status: "In Prep", icon: <Cpu className="w-10 h-10 text-cyan-400" /> },
    { phase: "PHASE 02", title: "Intelligence Augment", status: "In Prep", icon: <BrainCircuit className="w-10 h-10 text-violet-400" /> },
    { phase: "PHASE 03", title: "Seamless Convergence", status: "Upcoming", icon: <Layers className="w-10 h-10 text-amber-400" /> }
  ];

  const projects = [
    { id: 1, tag: "Visual Synthesis", title: "잠재적 공간의 초상", desc: "인간의 무의식적 직관을 AI 잠재 공간과 연결합니다.", goal: "AI 생성물에서 인간적 직관의 흔적을 발견함.", process: "SDXL과 커스텀 LoRA를 활용한 현실 질감 이식.", result: "하이퍼-리얼리스틱 렌더링 기술 확보." },
    { id: 2, tag: "Spatial Computing", title: "물리적 공간의 디지털 증강", desc: "현실 오브젝트 인식 실시간 AR 시각화 엔진.", goal: "현실 사물을 AI가 이해하고 새로운 인터페이스를 제공.", process: "On-device AI 비전 모델 기반 객체 감지 기술.", result: "실시간 공간 데이터 주권 확보." },
    { id: 3, tag: "Energy Resonance", title: "배터리 에너지의 지능적 가시화", desc: "물리적 배터리팩의 데이터를 AI가 가시화하는 지능형 코어.", goal: "보이지 않는 에너지의 흐름을 지능적으로 시각화.", process: "BMS 데이터와 AI 물리 모델링 융합 시스템.", result: "물리적 안전성 인지 능력 300% 향상." }
  ];

  return (
    <div className="h-screen w-screen bg-[#010101] text-white selection:bg-cyan-500/30 overflow-hidden font-sans flex flex-col relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none z-[1] mix-blend-overlay" />
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Michroma&family=Orbitron:wght@400;700;900&family=JetBrains+Mono&display=swap');
        .font-brand { font-family: 'Orbitron', sans-serif; }
        .font-title { font-family: 'Michroma', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.12); }
        .text-outline { -webkit-text-stroke: 1px rgba(255,255,255,0.2); color: transparent; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .preserve-3d { transform-style: preserve-3d; }
        @keyframes scanline { 0% { top: -10%; opacity: 0; } 50% { opacity: 1; } 100% { top: 110%; opacity: 0; } }
        .animate-scan { animation: scanline 4s linear infinite; }
        @keyframes fadeInSoft { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-soft { animation: fadeInSoft 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes bubbleFloat { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; } 50% { transform: translate(6px, -10px) scale(1.05); opacity: 0.35; } }
        .animate-bubble-float { animation: bubbleFloat 20s ease-in-out infinite; }
        @keyframes orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .tap-feedback:active { transform: scale(0.97); transition: transform 0.1s ease; }
        @keyframes initProgress { 0% { width: 0%; } 100% { width: 100%; } }
        .animate-init-progress { animation: initProgress 2.2s ease-in-out forwards; }
      `}</style>

      {/* --- [Entry Sequence] --- */}
      {isInitializing && (
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center p-8 transition-opacity duration-700">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-cyan-500/20 blur-[1px] animate-scan" />
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-4 text-cyan-400">
              <ShieldCheck size={28} className="animate-pulse" />
              <span className="font-brand text-[10px] tracking-[1em] font-black uppercase">Hyzen Labs. System</span>
            </div>
            <div className="relative w-48 h-[1px] bg-white/10 overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-cyan-500 animate-init-progress shadow-[0_0_10px_#22d3ee]" />
            </div>
            <div className="flex flex-col items-center gap-1 opacity-40">
              <span className="text-[7px] font-brand tracking-widest uppercase">Reality Data Synchronization...</span>
              <span className="text-[6px] font-mono italic">CODE: HYZEN-RC167-STABLE</span>
            </div>
          </div>
        </div>
      )}

      {/* --- [Structural Fix: Independent Backdrop Overlay] --- */}
      {isAnyModalOpen && (
        <div 
          className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xl animate-fade-in-soft pointer-events-auto" 
          onClick={closeModal} 
        />
      )}

      {/* --- [Main Layer: Absolute Scale Fixed to 100%] --- */}
      <div 
        className={`flex-1 flex flex-col relative transition-opacity duration-1000 
          ${isInitializing ? 'opacity-0' : 'opacity-100'}`}
        style={{ transform: 'scale(1)', filter: 'none' }} // 팝업 시에도 스케일 1 고정으로 Fit 문제 해결
      >
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {messages.map(msg => (
            <FloatingBubble key={msg.id} msg={msg} />
          ))}
        </div>

        <nav className="w-full z-[100] px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex flex-col text-left group text-white">
            <div className="flex items-center gap-2">
              <span className="font-brand text-[10px] tracking-[0.5em] text-cyan-400 font-black uppercase leading-none">Hyzen Labs.</span>
              <div className={`w-1 h-1 rounded-full ${isSyncing ? 'bg-cyan-400 animate-ping' : 'bg-cyan-900'}`} />
            </div>
            <span className="text-[7px] opacity-20 mt-1 uppercase tracking-[0.3em] font-brand font-bold">R1.6.7 | Absolute Fit</span>
          </div>
          <div className="flex gap-4 opacity-40 text-white">
            <a href="mailto:jini2aix@gmail.com"><Mail size={14} /></a>
            <Share2 size={14} />
          </div>
        </nav>

        {/* Hero Section */}
        <section className="flex-1 z-10 px-8 pt-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-cyan-500/5 blur-[100px] -z-10 transition-opacity duration-1000 ${isSyncing ? 'opacity-100' : 'opacity-40'}`} />
          
          <div className="relative inline-block animate-fade-in-soft mb-4 group pt-2">
            <div className="absolute left-0 w-full h-[1px] bg-cyan-500/40 blur-[1.5px] animate-scan z-10 pointer-events-none" />
            <div className="flex flex-col items-center text-white">
              <h1 className="text-[9.5vw] sm:text-8xl font-title tracking-[-0.07em] leading-[0.9] uppercase">
                <span className="bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent block">ME,</span>
                <span className="text-outline block my-1 group-hover:text-white transition-all duration-1000">REALITY</span>
                <span className="bg-gradient-to-b from-cyan-400 to-cyan-700 bg-clip-text text-transparent block">AND AI</span>
              </h1>
            </div>
          </div>
          
          <p className="text-[2.2vw] sm:text-[11px] text-cyan-400/60 tracking-[0.5em] font-brand font-black uppercase mb-8 animate-fade-in-soft">Augmented Reality Grounding</p>

          {/* Unified Identity Hub: Larger Profile (w-24) */}
          <div className="flex flex-col items-center gap-2 animate-fade-in-soft text-white" style={{ animationDelay: '0.2s' }}>
            <div onClick={openGuestbook} className="relative group cursor-pointer tap-feedback active:scale-95 transition-all">
              <div className="absolute -inset-10 border border-white/5 rounded-full animate-[orbit_25s_linear_infinite] pointer-events-none" />
              <div className="absolute -inset-8 border border-cyan-500/10 rounded-full animate-[orbit_15s_linear_infinite_reverse] pointer-events-none" />
              
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full p-[1px] bg-gradient-to-br from-white/30 to-transparent shadow-2xl shadow-black overflow-visible">
                <div className="w-full h-full rounded-full border border-white/10 overflow-hidden bg-zinc-900 flex items-center justify-center relative">
                  {imgLoadStatus !== 'error' ? (
                    <img src={founderImgSrc} alt="Founder" className={`w-full h-full object-cover grayscale brightness-90 transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-110 ${imgLoadStatus === 'loading' ? 'opacity-0' : 'opacity-100'}`} onLoad={() => setImgLoadStatus('success')} onError={() => setImgLoadStatus('error')} />
                  ) : (
                    <User size={40} strokeWidth={1} className="text-white/10" />
                  )}
                  <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/20 backdrop-blur-[0px] group-hover:backdrop-blur-[2px] transition-all duration-500 flex items-center justify-center pointer-events-none">
                    <Fingerprint size={48} className="text-cyan-400 opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 rotate-12 group-hover:rotate-0 transition-all duration-500 drop-shadow-[0_0_10px_#22d3ee]" />
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-5 py-2 glass-panel border border-cyan-500/40 rounded-full flex items-center gap-2 shadow-[0_5px_20px_rgba(34,211,238,0.3)] bg-black transition-all group-hover:border-cyan-300">
                <MessageSquare size={12} className="text-cyan-400" />
                <span className="text-[9px] font-brand tracking-[0.2em] font-black uppercase text-white/80 whitespace-nowrap">Sync Trace</span>
              </div>
            </div>

            <div className="mt-4 flex flex-col items-center">
              <h3 className="text-[14px] font-title tracking-tight text-white font-bold leading-none">Youngji.Park</h3>
              <span className="text-[8px] font-brand tracking-[0.4em] uppercase font-bold text-white/20 mt-1.5 pb-1">Founder</span>
            </div>
          </div>
        </section>

        {/* Controller Section */}
        <div className="shrink-0 z-10 pb-6 animate-fade-in-soft" style={{ animationDelay: '0.4s' }}>
          <div className="px-6 mb-6 max-w-lg mx-auto text-white">
            <div className="glass-panel p-1 rounded-2xl flex gap-1 relative border border-white/10 shadow-2xl overflow-hidden">
              {['roadmap', 'works', 'traces'].map((view) => (
                <button key={view} onClick={() => { setActiveView(view); triggerSync(); }} className={`flex-1 py-3.5 rounded-xl text-[7px] font-brand tracking-[0.1em] transition-all tap-feedback uppercase ${activeView === view ? 'bg-white text-black font-black shadow-lg' : 'text-white/30'}`}>
                  {view}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 max-w-5xl mx-auto h-[180px] relative overflow-visible text-white">
            <div key={activeView} className="w-full h-full animate-fade-in-soft">
              {activeView === 'roadmap' && (
                <CoverFlow items={roadmapSteps} activeIndex={activeIndices.roadmap} setActiveIndex={(i) => setViewIndex('roadmap', i)} renderItem={(step) => (
                    <div className="w-full h-full glass-panel p-6 rounded-[2.5rem] border border-cyan-500/30 flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-2 text-white">
                        <div className="w-14 h-14 flex items-center justify-center bg-white/[0.03] rounded-[1.2rem] border border-white/15 text-cyan-400">{step.icon}</div>
                        <div className="text-[6px] font-brand px-2.5 py-1 rounded-full border border-cyan-500/50 text-cyan-400 bg-cyan-500/5 uppercase font-black">In Prep</div>
                      </div>
                      <div className="text-left">
                        <span className="text-[8px] font-brand text-white/30 tracking-[0.2em] uppercase font-bold text-white">{String(step.phase || "")}</span>
                        <h3 className="text-[13px] font-bold tracking-tight mt-1 leading-tight text-white">{String(step.title || "")}</h3>
                      </div>
                    </div>
                  )}
                />
              )}
              {activeView === 'works' && (
                <CoverFlow items={projects} activeIndex={activeIndices.works} setActiveIndex={(i) => setViewIndex('works', i)} renderItem={(project) => (
                    <div onClick={() => { setSelectedProject(project); setIsModalOpen(true); }} className="w-full h-full glass-panel p-6 rounded-[2.5rem] border border-white/20 flex flex-col justify-between tap-feedback group hover:border-cyan-500/40 transition-all shadow-2xl">
                      <div className="flex justify-between items-start mb-2 text-white">
                        <span className="text-cyan-500 font-brand text-[8px] font-bold uppercase tracking-[0.3em]">{String(project.tag || "")}</span>
                        <Maximize2 size={12} className="text-white/20 group-hover:text-cyan-400" />
                      </div>
                      <div className="flex-1 flex flex-col justify-center text-left text-white">
                        <h3 className="text-[15px] font-black mb-1 uppercase tracking-tight leading-tight">{String(project.title || "")}</h3>
                        <p className="text-white/40 text-[9px] leading-relaxed line-clamp-2 font-light">{String(project.desc || "")}</p>
                      </div>
                    </div>
                  )}
                />
              )}
              {activeView === 'traces' && (
                messages.length > 0 ? (
                  <CoverFlow items={messages} activeIndex={activeIndices.traces} setActiveIndex={(i) => setViewIndex('traces', i)} renderItem={(msg) => (
                      <div className="w-full h-full glass-panel rounded-[2.5rem] relative overflow-hidden border border-violet-500/30 group shadow-[0_15px_40px_rgba(0,0,0,0.5)]">
                        {msg.image && (
                          <div className="absolute right-0 top-0 w-full h-full z-0 overflow-hidden pointer-events-none">
                            <img src={msg.image} className="absolute right-0 h-full w-[75%] object-cover brightness-[0.85] contrast-110 opacity-100 transition-all duration-700 group-hover:brightness-100" alt="" />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#010101] via-[#010101]/90 to-transparent z-1" />
                          </div>
                        )}
                        <div className="relative z-10 p-6 h-full flex flex-col justify-between text-left text-white">
                          <div>
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className="w-1 h-1 bg-violet-400 rounded-full shadow-[0_0_10px_#a78bfa]" />
                              <span className="text-[10px] font-brand text-violet-400/90 font-black uppercase tracking-[0.3em] drop-shadow-md">{String(msg?.name || "Anon")}</span>
                            </div>
                            <p className="text-[12px] text-white/95 font-light italic leading-[1.6] line-clamp-3 drop-shadow-xl pl-1">{String(msg?.text || "")}</p>
                          </div>
                          <div className="flex justify-between items-end mt-4">
                            <div className="flex items-center gap-2 bg-white/[0.03] px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                              <Clock size={10} className="text-white/20" />
                              <span className="text-[8px] font-mono text-white/40 uppercase tracking-[0.15em]">{String(msg?.date || "")}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteRequest(msg.id); }} className="p-3 bg-white/[0.02] hover:bg-red-500 rounded-2xl text-white/5 hover:text-black transition-all duration-300 active:scale-90 border border-white/5 hover:border-red-500"><Trash2 size={15} strokeWidth={2} /></button>
                          </div>
                        </div>
                      </div>
                    )}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-10 gap-3 border border-dashed border-white/20 rounded-[2.5rem]">
                    <ArrowRight size={32} className="animate-pulse text-white" />
                    <span className="text-[11px] font-brand uppercase tracking-widest text-center text-white">Neural void awaiting sync.</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <footer className="w-full shrink-0 z-10 py-6 flex flex-col items-center justify-center border-t border-white/5 bg-black/20 text-white">
          <span className="font-brand text-[10px] tracking-[0.8em] font-black text-white/90 uppercase animate-pulse">HYZEN LABS. 2026</span>
          <p className="text-[6px] font-brand tracking-[0.2em] uppercase opacity-20 mt-2 text-white">© All Rights Reserved by HYZEN LABS.</p>
        </footer>
      </div>

      {/* --- [Modals: Dynamic Pop-ups] --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6 animate-fade-in-soft" onClick={closeModal}>
          <div className="w-full max-w-xs glass-panel p-8 rounded-[2.5rem] border border-red-500/30 flex flex-col items-center text-center shadow-2xl text-white" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]"><Lock size={24} /></div>
            <h3 className="font-brand text-[10px] tracking-[0.3em] uppercase text-white/40 mb-2">Security Verification</h3>
            <h2 className="text-xl font-black uppercase tracking-tight mb-6">Erase Neural Trace?</h2>
            <input type="password" placeholder="PASSCODE" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-center text-[13px] font-brand focus:border-red-500/50 transition-all outline-none mb-6 tracking-[0.4em] placeholder:tracking-normal placeholder:opacity-20 text-red-500 font-mono" value={deletePass} onChange={e => setDeletePass(e.target.value)} autoFocus />
            <div className="flex gap-2 w-full">
              <button onClick={closeModal} className="flex-1 py-4 rounded-2xl bg-white/5 text-[10px] font-brand uppercase tracking-widest hover:bg-white/10 transition-colors text-white">Abort</button>
              <button onClick={confirmDelete} className="flex-1 py-4 rounded-2xl bg-red-500 text-black text-[10px] font-brand font-black uppercase tracking-widest shadow-lg shadow-red-500/40 transition-all">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {isGuestbookOpen && (
        <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in-soft" onClick={closeModal}>
          <div className="w-full h-[90vh] sm:h-auto sm:max-w-md glass-panel rounded-t-[3.5rem] sm:rounded-[3.5rem] p-8 relative flex flex-col shadow-2xl border-t border-cyan-500/20 text-white" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-1.5 bg-white/10 rounded-full mx-auto mb-8 sm:hidden" />
            <button onClick={closeModal} className="absolute top-8 right-8 p-2 text-white/20 hover:text-white transition-colors"><X size={22} /></button>
            <div className="mb-6 text-left text-white">
              <div className="flex items-center gap-3 text-cyan-400 mb-2"><Activity size={14} /><span className="font-brand text-[9px] font-bold uppercase tracking-[0.5em]">Digital Trace Sync</span></div>
              <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Synchronize Reality</h2>
            </div>
            <form onSubmit={handleMessageSubmit} className="space-y-4 pt-4 safe-pb text-white">
              <div className="flex gap-2">
                {/* Prevent mobile zoom by setting font-size to 16px (text-base) */}
                <input type="text" placeholder="IDENTIFIER" className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-base sm:text-[11px] font-brand focus:outline-none focus:border-cyan-500/50 uppercase tracking-widest placeholder:opacity-20 text-white" value={newMessage.name} required onChange={e => setNewMessage({...newMessage, name: e.target.value})} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`px-4 rounded-2xl border transition-all ${newMessage.image ? 'bg-cyan-500 border-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-white/5 border-white/10 text-white/30'}`}><Camera size={18} /></button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setNewMessage(prev => ({ ...prev, image: reader.result }));
                    reader.readAsDataURL(file);
                  }
                }} />
              </div>
              {newMessage.image && <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-cyan-500 shadow-xl"><img src={newMessage.image} className="w-full h-full object-cover" alt="" /><button onClick={() => setNewMessage(prev => ({...prev, image: null}))} className="absolute top-1 right-1 bg-black/50 p-1 text-white rounded-lg"><X size={10} /></button></div>}
              <div className="relative">
                <textarea placeholder="Input your reality data..." className="w-full h-24 bg-white/5 border border-white/10 rounded-3xl px-6 py-4 text-base sm:text-[13px] font-light focus:outline-none focus:border-cyan-500/50 resize-none placeholder:opacity-20 text-white" value={newMessage.text} required onChange={e => setNewMessage({...newMessage, text: e.target.value})} />
                <button type="submit" className="absolute bottom-3 right-3 p-3 bg-cyan-500 rounded-2xl text-black active:scale-90 transition-all shadow-xl shadow-cyan-500/30"><Send size={18} strokeWidth={2.5} /></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && selectedProject && (
        <div className="fixed inset-0 z-[4000] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in-soft" onClick={closeModal}>
          <div className="w-full h-[80vh] sm:h-auto sm:max-w-xl glass-panel rounded-t-[3.5rem] sm:rounded-[3.5rem] p-10 relative overflow-y-auto no-scrollbar border-t border-white/10 text-white" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-1.5 bg-white/10 rounded-full mx-auto mb-10 sm:hidden" />
            <button onClick={closeModal} className="absolute top-10 right-10 p-2 text-white/20"><X size={22} /></button>
            <div className="text-left text-white">
              <div className="flex items-center gap-2 mb-2"><Zap size={14} className="text-cyan-400" /><span className="text-cyan-500 font-brand text-[9px] font-bold uppercase tracking-[0.4em] text-white">{String(selectedProject.tag || "")}</span></div>
              <h2 className="text-3xl font-black mb-10 uppercase tracking-tighter leading-tight text-white">{String(selectedProject.title || "")}</h2>
              <div className="space-y-6 pb-12">
                <section><h4 className="text-[9px] font-brand tracking-[0.2em] uppercase font-bold text-white/30 mb-2 border-l-2 border-cyan-500 pl-3 text-white">Goal</h4><p className="text-sm font-light text-white/70 leading-relaxed pl-4">{String(selectedProject.goal || "")}</p></section>
                <section><h4 className="text-[9px] font-brand tracking-[0.2em] uppercase font-bold text-white/30 mb-2 border-l-2 border-cyan-500 pl-3 text-white">Process</h4><p className="text-sm font-light text-white/70 leading-relaxed pl-4">{String(selectedProject.process || "")}</p></section>
                <section><h4 className="text-[9px] font-brand tracking-[0.2em] uppercase font-bold text-white/30 mb-2 border-l-2 border-cyan-500 pl-3 text-white">Result</h4><p className="text-sm font-light text-white/70 leading-relaxed pl-4">{String(selectedProject.result || "")}</p></section>
              </div>
              <button className="w-full bg-white text-black py-5 rounded-[2.2rem] font-brand text-[10px] font-black tracking-[0.3em] uppercase shadow-2xl">Access Case Study</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;