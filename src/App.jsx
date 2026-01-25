import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { 
  Cpu, 
  Layers, 
  ArrowRight, 
  X, 
  Share2, 
  Mail,
  BrainCircuit, 
  User, 
  MessageSquare, 
  Send, 
  Activity, 
  Fingerprint, 
  Maximize2, 
  Camera, 
  Image as ImageIcon, 
  Trash2, 
  Lock, 
  Clock, 
  ShieldCheck,
  Cloud,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Zap,
  AlertCircle,
  Eye,
  Box,
  ZapOff,
  Globe,
  Loader2,
  RefreshCw
} from 'lucide-react';

/**
 * [Hyzen Labs. CTO Optimized - R1.9.8 | Safe-Config Edition]
 * 1. 환경 변수 정제(Sanitization): __firebase_config의 앞뒤 공백 및 줄바꿈 자동 제거 로직 추가
 * 2. 진단 기능 유지: 클라우드 연결 상태 및 에러 메시지 실시간 시각화
 * 3. 이미지 압축 최적화: 1MB 제한 준수를 위한 Neural Compression 로직 유지
 * 4. Rule 1, 2, 3 준수: Firestore 경로 및 Auth 시퀀스 보호
 */

const ADMIN_PASS = "5733906";
const FALLBACK_APP_ID = 'hyzen-labs-production';

// --- [Firebase Configuration Sanitize Logic] ---
const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
      // 앞뒤 공백, 줄바꿈, 그리고 혹시 섞여 들어왔을지 모를 백틱(`)까지 모두 제거합니다.
      const sanitizedConfig = __firebase_config.trim().replace(/^`+|`+$/g, '');
      return JSON.parse(sanitizedConfig);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      return null;
    }
  }
  return null;
};

const fConfig = getFirebaseConfig();
const firebaseApp = (fConfig && fConfig.apiKey) ? (getApps().length === 0 ? initializeApp(fConfig) : getApps()[0]) : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : FALLBACK_APP_ID;

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
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIDE) { height *= MAX_SIDE / width; width = MAX_SIDE; }
        } else {
          if (height > MAX_SIDE) { width *= MAX_SIDE / height; height = MAX_SIDE; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
  });
};

const FloatingBubble = ({ msg }) => {
  const [coords] = useState(() => ({
    top: `${Math.random() * 80 + 10}%`,
    left: `${Math.random() * 80 + 10}%`,
    duration: `${Math.random() * 12 + 18}s`,
    delay: `${Math.random() * 5}s`
  }));

  return (
    <div className="absolute pointer-events-none select-none animate-bubble-float z-[2]" style={{ top: coords.top, left: coords.left, animationDuration: coords.duration, animationDelay: coords.delay }}>
      <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border border-white/10 shadow-2xl scale-75">
        {msg.image && <div className="w-5 h-5 rounded-full overflow-hidden shrink-0"><img src={msg.image} className="w-full h-full object-cover grayscale" alt="" /></div>}
        <span className="text-[7px] font-brand text-cyan-400 font-black uppercase truncate max-w-[50px]">{msg?.name}</span>
      </div>
    </div>
  );
};

const CoverFlow = ({ items, renderItem, activeIndex, setActiveIndex }) => {
  const touchStartRef = useRef(null);
  const handlePrev = () => setActiveIndex(Math.max(0, activeIndex - 1));
  const handleNext = () => setActiveIndex(Math.min(items.length - 1, activeIndex + 1));

  return (
    <div className="relative w-full h-full flex items-center justify-center perspective-[1500px] overflow-visible touch-pan-y" 
      onTouchStart={(e) => { touchStartRef.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (!touchStartRef.current) return;
        const diff = touchStartRef.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) diff > 0 ? handleNext() : handlePrev();
        touchStartRef.current = null;
      }}>
      <button onClick={handlePrev} className={`absolute left-0 z-[100] p-2 text-white/20 hover:text-white transition-all ${activeIndex === 0 ? 'opacity-0' : 'opacity-100'}`}><ChevronLeft size={24} /></button>
      <button onClick={handleNext} className={`absolute right-0 z-[100] p-2 text-white/20 hover:text-white transition-all ${activeIndex === items.length - 1 ? 'opacity-0' : 'opacity-100'}`}><ChevronRight size={24} /></button>
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
  const [activeView, setActiveView] = useState('roadmap');
  const [activeIndices, setActiveIndices] = useState({ roadmap: 0, works: 0, traces: 0 });
  const [selectedItem, setSelectedItem] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuestbookOpen, setIsGuestbookOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState(null);
  const [deletePass, setDeletePass] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [cloudStatus, setCloudStatus] = useState('disconnected');
  const [diagInfo, setDiagInfo] = useState("");
  
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState({ name: '', text: '', image: null });
  
  const fileInputRef = useRef(null);

  const initAuthSequence = useCallback(async () => {
    if (!fConfig || !auth) {
      setCloudStatus('error');
      setDiagInfo(!fConfig ? "Check Environment Variables" : "Firebase Init Failed");
      return;
    }
    
    setCloudStatus('connecting');
    setDiagInfo("Calibrating Neural Sync...");
    
    try {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else { 
        await signInAnonymously(auth); 
      }
    } catch (err) { 
      setCloudStatus('error');
      setDiagInfo(`Auth Error: ${err.message.substring(0, 30)}...`);
    }
  }, []);

  useEffect(() => {
    initAuthSequence();
    const unsubscribe = auth ? onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setCloudStatus('connected');
        setDiagInfo("Cloud Core Synchronized.");
      }
    }) : () => {};

    const timer = setTimeout(() => setIsInitializing(false), 2000);
    return () => { unsubscribe(); clearTimeout(timer); };
  }, [initAuthSequence]);

  useEffect(() => {
    if (!user || !db) return;
    const messagesCollection = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    
    const unsubscribe = onSnapshot(messagesCollection, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)).slice(0, 15));
    }, (err) => {
      setCloudStatus('error');
      setDiagInfo(`Snapshot Fail: ${err.code}`);
    });
    
    return () => unsubscribe();
  }, [user]);

  const closeModal = () => { 
    setIsModalOpen(false); setIsGuestbookOpen(false); setIsDeleteModalOpen(false); 
    setSelectedItem(null); setErrorMsg(null);
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
    <div className="h-screen w-screen bg-[#010101] text-white selection:bg-cyan-500/30 overflow-hidden font-sans flex flex-col relative">
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
        @keyframes bubbleFloat { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; } 50% { transform: translate(10px, -10px) scale(1.05); opacity: 0.5; } }
        .animate-bubble-float { animation: bubbleFloat 20s ease-in-out infinite; }
        .tap-feedback:active { transform: scale(0.97); }
      `}</style>

      {isInitializing && (
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center p-8">
          <ShieldCheck size={40} className="text-cyan-400 animate-pulse mb-6" />
          <div className="w-48 h-[1px] bg-white/10 overflow-hidden relative"><div className="absolute inset-0 bg-cyan-500 animate-[initProgress_2s_ease-in-out_forwards]" /></div>
        </div>
      )}

      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {messages.filter(m => m.image).slice(0, 5).map(msg => <FloatingBubble key={msg.id} msg={msg} />)}
      </div>

      <nav className="z-[100] px-6 py-4 flex justify-between items-start shrink-0">
        <div className="flex flex-col text-left">
          <span className="font-brand text-[10px] tracking-[0.5em] text-cyan-400 font-black uppercase">Hyzen Labs.</span>
          <span className="text-[7px] opacity-20 uppercase tracking-[0.3em] font-brand mt-1">R1.9.8 | Safe-Config</span>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex flex-col items-end">
              <span className={`text-[8px] font-brand uppercase tracking-widest ${cloudStatus === 'connected' ? 'text-cyan-400' : cloudStatus === 'error' ? 'text-red-500' : 'text-amber-500'}`}>
                {cloudStatus.toUpperCase()}
              </span>
              <span className="text-[6px] font-mono opacity-30 uppercase">{diagInfo}</span>
           </div>
           <button 
             onClick={initAuthSequence}
             disabled={cloudStatus === 'connecting' || cloudStatus === 'connected'}
             className={`w-10 h-10 rounded-xl glass-panel border flex items-center justify-center transition-all active:scale-90 ${cloudStatus === 'connected' ? 'border-cyan-500/30 text-cyan-400' : cloudStatus === 'error' ? 'border-red-500/30 text-red-500' : 'border-amber-500/30 text-amber-500'}`}>
              {cloudStatus === 'connected' ? <Cloud size={16} /> : cloudStatus === 'error' ? <RefreshCw size={16} /> : <Loader2 size={16} className="animate-spin" />}
           </button>
        </div>
      </nav>

      <section className="flex-1 z-10 flex flex-col items-center justify-center text-center px-8 relative">
        <div className="relative inline-block mb-4 pt-2">
          <div className="absolute left-0 w-full h-[1px] bg-cyan-500/40 blur-[1.5px] animate-scan z-10" />
          <h1 className="text-[10vw] sm:text-8xl font-title tracking-[-0.07em] leading-[0.9] uppercase">
            <span className="bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent block">ME,</span>
            <span className="block my-1" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent' }}>REALITY</span>
            <span className="bg-gradient-to-b from-cyan-400 to-cyan-700 bg-clip-text text-transparent block">AND AI</span>
          </h1>
        </div>
        
        <div className="mt-8 flex flex-col items-center gap-6">
          <div onClick={() => setIsGuestbookOpen(true)} className="group relative cursor-pointer tap-feedback">
            <div className="absolute -inset-8 border border-white/5 rounded-full animate-[spin_25s_linear_infinite]" />
            <div className="w-24 h-24 rounded-full p-[1px] bg-gradient-to-br from-white/30 to-transparent">
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden border border-white/10">
                <img src="YJ.PNG" className="w-full h-full object-cover grayscale brightness-90 group-hover:grayscale-0 transition-all duration-700" alt="Founder" />
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 glass-panel border border-cyan-500/40 rounded-full flex items-center gap-2">
              <MessageSquare size={10} className="text-cyan-400" />
              <span className="text-[8px] font-brand font-black uppercase tracking-widest">Sync Trace</span>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-title font-bold">Youngji.Park</h3>
            <span className="text-[8px] font-brand text-white/20 uppercase tracking-[0.4em]">Founder</span>
          </div>
        </div>
      </section>

      <div className="z-10 pb-8 px-6 max-w-lg mx-auto w-full shrink-0">
        <div className="glass-panel p-1 rounded-2xl flex gap-1 mb-6 border border-white/10">
          {['roadmap', 'works', 'traces'].map((view) => (
            <button key={view} onClick={() => setActiveView(view)} 
              className={`flex-1 py-3 rounded-xl text-[8px] font-brand tracking-widest uppercase transition-all ${activeView === view ? 'bg-white text-black font-black' : 'text-white/30'}`}>
              {view}
            </button>
          ))}
        </div>

        <div className="h-[180px] relative">
          {activeView === 'traces' ? (
            <div className="h-full flex flex-col">
              {messages.length > 0 ? (
                <CoverFlow items={messages} activeIndex={activeIndices.traces} setActiveIndex={(i) => setActiveIndices({...activeIndices, traces: i})} renderItem={(msg) => (
                  <div className="w-full h-full glass-panel rounded-[2.5rem] relative overflow-hidden border border-violet-500/30 p-6 flex flex-col justify-between">
                    {msg.image && <img src={msg.image} className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" alt="" />}
                    <div className="relative z-10 text-left">
                      <span className="text-[9px] font-brand text-violet-400 font-black uppercase tracking-widest">{msg.name}</span>
                      <p className="text-[11px] font-light mt-2 line-clamp-2 italic opacity-80 leading-relaxed">"{msg.text}"</p>
                    </div>
                    <div className="relative z-10 flex justify-between items-end">
                      <span className="text-[7px] font-mono opacity-30">{msg.date}</span>
                      <button onClick={(e) => { e.stopPropagation(); setTargetDeleteId(msg.id); setIsDeleteModalOpen(true); }} className="p-2 text-white/10 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                    </div>
                  </div>
                )} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-20 gap-2 border border-dashed border-white/10 rounded-[2rem]"><Activity size={24} /><span className="text-[9px] font-brand uppercase tracking-widest">Awaiting Neural Data</span></div>
              )}
            </div>
          ) : (
            <CoverFlow items={activeView === 'roadmap' ? roadmapSteps : projects} activeIndex={activeView === 'roadmap' ? activeIndices.roadmap : activeIndices.works} 
              setActiveIndex={(i) => setActiveIndices({...activeIndices, [activeView]: i})} renderItem={(item) => (
              <div onClick={() => { setSelectedItem(item); setIsModalOpen(true); }} className={`w-full h-full glass-panel p-6 rounded-[2.5rem] border ${activeView === 'roadmap' ? 'border-cyan-500/30' : 'border-emerald-500/30'} flex flex-col justify-between text-left`}>
                <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-cyan-400">{item.icon}</div>
                <div><span className="text-[7px] font-brand text-white/30 uppercase tracking-widest">{item.phase || item.tag}</span><h3 className="text-xs font-bold mt-1 uppercase">{item.title}</h3></div>
              </div>
            )} />
          )}
        </div>
      </div>

      <footer className="z-10 py-6 flex flex-col items-center bg-black/40">
        <span className="font-brand text-[9px] tracking-[0.8em] font-black opacity-30 uppercase">HYZEN LABS. 2026</span>
      </footer>

      {/* Guestbook Modal */}
      {isGuestbookOpen && (
        <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md" onClick={closeModal}>
          <div className="w-full sm:max-w-md glass-panel rounded-t-[3rem] sm:rounded-[3rem] p-8 animate-[slideUp_0.4s_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Sync Trace</h2>
              <button onClick={closeModal}><X size={20} className="opacity-40 hover:opacity-100" /></button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newMessage.name || !newMessage.text || isUploading) return;
              
              setIsUploading(true);
              setErrorMsg(null);
              
              if (!db || !user) {
                setErrorMsg(`Sync Failed: ${!db ? "Config Load Error" : "Auth Not Ready"}`);
                setIsUploading(false);
                return;
              }
              
              try {
                const messagesCollection = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
                await addDoc(messagesCollection, {
                  ...newMessage,
                  createdAt: serverTimestamp(),
                  date: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                });
                setNewMessage({ name: '', text: '', image: null });
                setIsGuestbookOpen(false);
              } catch (err) {
                setErrorMsg(`Sync Error: ${err.code || "Network Timeout"}`);
              } finally {
                setIsUploading(false);
              }
            }} className="space-y-4">
              <div className="flex gap-2">
                <input type="text" placeholder="ID" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-brand outline-none focus:border-cyan-500/50" value={newMessage.name} onChange={e => setNewMessage({...newMessage, name: e.target.value.toUpperCase()})} required />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`px-4 rounded-xl border transition-all ${newMessage.image ? 'bg-cyan-500 border-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-white/5 border-white/10 text-white/30'}`} disabled={isUploading}>
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setIsUploading(true);
                    try {
                      const compressed = await compressImage(file);
                      setNewMessage(prev => ({ ...prev, image: compressed }));
                    } catch (e) { setErrorMsg("Neural Compression Failed."); }
                    finally { setIsUploading(false); }
                  }
                }} />
              </div>
              <textarea placeholder="Share your reality data..." className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-cyan-500/50 resize-none" value={newMessage.text} onChange={e => setNewMessage({...newMessage, text: e.target.value})} required />
              
              {errorMsg && (
                <div className="flex flex-col gap-1 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-pulse">
                   <div className="flex items-center gap-2 text-red-400 text-[10px] font-brand uppercase">
                      <AlertCircle size={12} /> Sync Error
                   </div>
                   <p className="text-[9px] text-red-300/70 font-mono leading-tight">{errorMsg}</p>
                </div>
              )}
              
              <button type="submit" className="w-full bg-cyan-500 py-4 rounded-2xl text-black font-brand font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50" disabled={isUploading || cloudStatus !== 'connected'}>
                {isUploading ? "Processing..." : "Upload Neural Trace"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm" onClick={closeModal}>
          <div className="w-full max-w-xs glass-panel p-8 rounded-[2.5rem] border border-red-500/30 text-center" onClick={e => e.stopPropagation()}>
            <Lock size={32} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-black uppercase mb-6">Erase Trace?</h2>
            <input type="password" placeholder="PASSCODE" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center mb-6 outline-none focus:border-red-500" value={deletePass} onChange={e => setDeletePass(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-white/5 text-[10px] font-brand uppercase">Abort</button>
              <button onClick={async () => {
                if (deletePass === ADMIN_PASS && targetDeleteId && db) {
                  await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', targetDeleteId));
                  closeModal(); setDeletePass("");
                }
              }} className="flex-1 py-3 rounded-xl bg-red-500 text-black font-brand font-black text-[10px] uppercase">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[4000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md" onClick={closeModal}>
          <div className="w-full h-[70vh] sm:h-auto sm:max-w-xl glass-panel rounded-t-[3rem] sm:rounded-[3rem] p-10 relative overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={closeModal} className="absolute top-8 right-8 text-white/20 hover:text-white"><X size={24} /></button>
            <span className="text-cyan-400 font-brand text-[10px] font-bold uppercase tracking-[0.4em]">{selectedItem.phase || selectedItem.tag}</span>
            <h2 className="text-3xl font-black mt-2 mb-8 uppercase tracking-tighter leading-tight">{selectedItem.title}</h2>
            <div className="space-y-6 mb-10 text-left">
              <div><h4 className="text-[10px] font-brand text-white/30 uppercase mb-2 border-l-2 border-cyan-500 pl-3">Goal</h4><p className="text-sm font-light opacity-80 leading-relaxed">{selectedItem.goal}</p></div>
              <div><h4 className="text-[10px] font-brand text-white/30 uppercase mb-2 border-l-2 border-cyan-500 pl-3">Process</h4><p className="text-sm font-light opacity-80 leading-relaxed">{selectedItem.process}</p></div>
              <div><h4 className="text-[10px] font-brand text-white/30 uppercase mb-2 border-l-2 border-cyan-500 pl-3">Result</h4><p className="text-sm font-light opacity-80 leading-relaxed">{selectedItem.result}</p></div>
            </div>
            <button onClick={closeModal} className="w-full bg-white text-black py-4 rounded-2xl font-brand text-[11px] font-black uppercase tracking-widest">Close Hub</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;