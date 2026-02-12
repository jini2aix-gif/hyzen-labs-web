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
 * [Hyzen Labs. CTO Optimized - R4.8.4 | Stability & Balance Edition]
 * 1. 빌드 오류 수정: 중복된 default export 구문 제거 (Vercel 배포 안정성 확보)
 * 2. 레이아웃 최적화: 매트릭스 컨테이너 상/하/좌/우 10px 대칭 여백 유지
 * 3. 애니메이션 복구: 히어로 섹션 'NeuralPulse' 박동 모션 재활성화
 * 4. 퀀텀 사운드: 브리딩 모션에 동기화된 웅장한 오디오 엔진 및 무음 모드 대응 로직
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

const playSystemSound = async (type) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    if (type === 'quantumBreath') {
      const masterGain = audioCtx.createGain();
      masterGain.connect(audioCtx.destination);
      masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 1.2);
      masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3.0);

      const subOsc = audioCtx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(40, audioCtx.currentTime); 
      
      const mainOsc = audioCtx.createOscillator();
      mainOsc.type = 'sawtooth';
      mainOsc.frequency.setValueAtTime(55, audioCtx.currentTime);

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(50, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 1.2);
      filter.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 2.8);
      filter.Q.setValueAtTime(15, audioCtx.currentTime);

      subOsc.connect(masterGain);
      mainOsc.connect(filter);
      filter.connect(masterGain);

      subOsc.start();
      mainOsc.start();
      subOsc.stop(audioCtx.currentTime + 3.0);
      mainOsc.stop(audioCtx.currentTime + 3.0);
    } else if (type === 'start') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      osc.start(); osc.stop(audioCtx.currentTime + 0.8);
    } else if (type === 'popup') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = 'triangle'; osc.frequency.setValueAtTime(660, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
      osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'dismiss') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(110, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    }
  } catch (e) {
    console.error("Audio Engine Error:", e);
  }
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

  const [modalDragY, setModalDragY] = useState(0);
  const [modalExitDir, setModalExitDir] = useState(null); 
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

  const unlockAudio = useCallback(() => {
    playSystemSound('quantumBreath');
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('click', unlockAudio);
  }, []);

  useEffect(() => {
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('click', unlockAudio);

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

    let soundInterval;
    const timer = setTimeout(() => {
      setIsInitializing(false);
      playSystemSound('start');
      clearInterval(soundInterval);
      setTimeout(() => { 
        setShowMainTitle(true); 
        setIsSynthesizing(true);
        setTimeout(() => { setIsSynthesizing(false); }, 5000); 
      }, 500);
    }, 4500);

    playSystemSound('quantumBreath');
    soundInterval = setInterval(() => {
      playSystemSound('quantumBreath');
    }, 3000);

    return () => { 
      unsubscribe(); 
      clearTimeout(timer); 
      clearInterval(soundInterval);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
  }, [unlockAudio]);

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
        
        /* [R4.8.4] Balanced Matrix Container */
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
          gap: 12px;
          overflow-y: auto;
          scrollbar-width: none;
          padding: 16px;
          z-index: 2;
          position: relative;
          mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
        }
        .matrix-grid::-webkit-scrollbar { display: none; }
        
        @media (min-width: 1024px) {
          .matrix-grid { grid-template-columns: repeat(12, 1fr); gap: 14px; padding: 28px; }
        }

        @keyframes energySweep {
          0% { transform: translateX(-150%) skewX(-15deg); opacity: 0; }
          30% { opacity: 0.8; }
          70% { opacity: 0.8; }
          100% { transform: translateX(150%) skewX(-15deg); opacity: 0; }
        }
        .energy-sweep-layer {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.05), rgba(255, 255, 255, 0.2), rgba(34, 211, 238, 0.05), transparent);
          width: 80%;
          pointer-events: none;
          z-index: 1;
          filter: blur(80px);
          animation: energySweep 3s cubic-bezier(0.4, 0, 0.2, 1) 2;
        }

        @keyframes syncPulse { 
          0%, 100% { height: 30%; opacity: 0.3; } 
          50% { height: 100%; opacity: 1; } 
        }

        @keyframes driftA { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-3px, -10px) rotate(1.5deg); } }
        @keyframes driftB { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(6px, -8px) rotate(-1.5deg); } }
        @keyframes driftC { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-2px, -12px); } }

        .packet-drift-0 { animation: driftA 3s ease-in-out infinite; }
        .packet-drift-1 { animation: driftB 3.5s ease-in-out infinite; }
        .packet-drift-2 { animation: driftC 4s ease-in-out infinite; }
        .packet-drift-3 { animation: driftA 4.5s ease-in-out infinite; animation-direction: reverse; }

        .data-packet {
          position: relative;
          aspect-ratio: 0.85 / 1;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(10px);
          border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: 18px;
          transition: all 0.9s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 10;
        }

        @keyframes quantumSynthesis {
          0% { transform: translateZ(-800px) translateY(100px) skewX(20deg) scale(1.5); opacity: 0; filter: blur(30px) brightness(3) contrast(2); }
          100% { transform: translateZ(0) translateY(0) skewX(0) scale(1); opacity: 0.7; filter: blur(0px) brightness(1); }
        }
        .animate-quantum-synthesis { animation: quantumSynthesis 5s cubic-bezier(0.19, 1, 0.22, 1) forwards; }

        .data-packet:active { transform: scale(0.92) !important; border-color: #22d3ee; }

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
        
        .fused-highlight { background: linear-gradient(90deg, #22d3ee 0%, #ffffff 50%, #22d3ee 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: fusedShimmer 4s linear infinite; }
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
            <span className="text-[7px] font-mono opacity-20 uppercase tracking-[0.4em] mt-1">v4.8.4 | BUILD STABILITY</span>
          </div>
        </div>
      )}

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
            {isSynthesizing && <div className="energy-sweep-layer" />}
            <div className="matrix-grid">
              {messages.map((item, idx) => (
                <div 
                  key={item.id || idx} 
                  className={`data-packet group ${isSynthesizing ? 'animate-quantum-synthesis' : `packet-drift-${idx % 4}`}`} 
                  style={{ animationDelay: isSynthesizing ? `${idx * 0.02}s` : '0s', opacity: isSynthesizing ? 0 : 0.8 }} 
                  onClick={() => { setSelectedItem(item); setIsModalOpen(true); playSystemSound('popup'); }}
                >
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

      {isGuestbookOpen && (
        <div className="fixed inset-0 z-[7000] flex items-end sm:items-center justify-center bg-black/95 backdrop-blur-3xl" onClick={closeModal}>
          <div 
            className={`w-full sm:max-w-md glass-panel rounded-t-[3.5rem] sm:rounded-[2.5rem] p-10 sm:p-12 shadow-[0_0_100px_rgba(34,211,238,0.1)] relative cursor-grab active:cursor-grabbing transition-all duration-300
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

      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-4" onClick={closeModal}>
          <div 
            className={`w-full max-w-4xl glass-panel relative rounded-[2rem] overflow-hidden flex flex-col lg:flex-row transition-all duration-300
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
            <div className="h-[40vh] lg:h-[60vh] lg:w-1/2 bg-black relative overflow-hidden">
              {selectedItem.image ? <img src={selectedItem.image} className="w-full h-full object-cover animate-image-scan" alt="" /> : <div className="w-full h-full flex items-center justify-center text-white/5"><Fingerprint size={100} /></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
              <div className="absolute bottom-6 left-6 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                 <span className="text-cyan-400 font-brand text-[8px] font-black uppercase tracking-[0.4em]">Node Tracking Active</span>
              </div>
            </div>
            <div className="flex-1 p-8 lg:p-12 flex flex-col justify-between">
              <div className="space-y-6">
                <span className="text-cyan-400 font-brand text-[9px] font-black uppercase tracking-[0.3em] inline-block mb-1">Identity Analysis</span>
                <h2 className="text-3xl lg:text-5xl font-black font-title text-white uppercase tracking-tighter leading-none">{selectedItem.name}</h2>
                <p className="text-sm lg:text-lg italic text-white/70 leading-relaxed font-sans">"{selectedItem.text}"</p>
              </div>
              <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[7px] font-mono text-white/30 uppercase tracking-[0.3em]">Temporal Stamp</span>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-tight">{selectedItem.date}</span>
                </div>
                <button onClick={() => { setTargetDeleteId(selectedItem.id); setIsDeleteModalOpen(true); }} className="p-3 text-white/20 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
              </div>
            </div>
            <button onClick={closeModal} className="absolute top-6 right-6 p-2 bg-black/40 rounded-full border border-white/10 text-white/60 hover:text-white transition-all backdrop-blur-md"><X size={20} /></button>
          </div>
        </div>
      )}

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