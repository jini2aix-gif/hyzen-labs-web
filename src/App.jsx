import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
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
  LogIn,
  LogOut,
  UserPlus,
  Key,
  AtSign,
  Image as ImageIcon
} from 'lucide-react';

/**
 * [Hyzen Labs. CTO Optimized - R4.0.0 | Identity & Matrix Core]
 * 1. 인증 시스템: 이메일/별명 기반 가입 및 로그인 엔진 탑재
 * 2. 접근 제어: 인증된 사용자 전용 방명록(Trace) 작성 기능
 * 3. 진입 시퀀스: 매크로 스케일 셔플(3~4배 변동) 및 안정화 연출 유지
 * 4. 인터랙션: 모바일 엘라스틱 스크롤 및 이미지 Contain 모드 유지
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
  const [isShuffling, setIsShuffling] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuestbookOpen, setIsGuestbookOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'join'
  
  const [targetDeleteId, setTargetDeleteId] = useState(null);
  const [deletePass, setDeletePass] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [cloudStatus, setCloudStatus] = useState('disconnected');
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // Auth Form State
  const [authForm, setAuthForm] = useState({ email: '', password: '', nickname: '' });
  const [newMessage, setNewMessage] = useState({ name: '', text: '', image: null });

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef(null);
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
          // 익명 로그인을 기본으로 하여 데이터 열람은 가능하게 유지
          await signInAnonymously(auth);
        }
      } catch (err) { setCloudStatus('error'); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) {
        setCloudStatus('connected');
        // 로그인 시 닉네임을 작성자 이름으로 자동 설정
        if (u.displayName) {
          setNewMessage(prev => ({ ...prev, name: u.displayName }));
        }
      }
    });

    const timer = setTimeout(() => {
      setIsInitializing(false);
      playSystemSound('start');
      setTimeout(() => { setShowMainTitle(true); }, 500);
      setTimeout(() => { setIsShuffling(false); }, 3500);
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
    setIsModalOpen(false); 
    setIsGuestbookOpen(false); 
    setIsDeleteModalOpen(false); 
    setIsAuthModalOpen(false);
    setSelectedItem(null); 
    setDeletePass("");
    setAuthForm({ email: '', password: '', nickname: '' });
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

  // --- Auth Actions ---
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!auth || isAuthLoading) return;
    setIsAuthLoading(true);
    try {
      if (authMode === 'join') {
        const userCred = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        await updateProfile(userCred.user, { displayName: authForm.nickname });
        // 프로필 데이터 저장
        await setDoc(doc(db, 'artifacts', appId, 'users', userCred.user.uid, 'profile', 'data'), {
          nickname: authForm.nickname,
          email: authForm.email,
          createdAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      }
      closeModal();
      playSystemSound('popup');
    } catch (err) {
      console.error(err);
      // alert 대신 커스텀 메시지나 로직 필요 (여기선 생략)
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    await signInAnonymously(auth); // 로그아웃 후 다시 익명으로 전환하여 관찰 가능하게
    playSystemSound('start');
  };

  const openSyncTrace = () => {
    if (!user || user.isAnonymous) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
    } else {
      setIsGuestbookOpen(true);
    }
  };

  // --- Elastic Scroll Handlers ---
  const onTouchStart = (e) => {
    if (isModalOpen || isGuestbookOpen || isAuthModalOpen) return;
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      touchStartRef.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  const onTouchMove = (e) => {
    if (!touchStartRef.current || !isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartRef.current;

    if (diff > 0) {
      const easedOffset = Math.pow(diff, 0.8) * 1.5;
      setDragOffset(easedOffset);
    } else {
      setDragOffset(0);
      touchStartRef.current = null;
      setIsDragging(false);
    }
  };

  const onTouchEnd = () => {
    touchStartRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  return (
    <div 
      className="fixed inset-0 bg-[#020202] text-white selection:bg-cyan-500/30 overflow-hidden font-sans flex flex-col max-w-full" 
      style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
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
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: inset 0 0 30px rgba(0,0,0,0.8);
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
          z-index: 1;
        }

        @keyframes shuffleBurstMacro {
          0% { transform: scale(1) translate(0, 0) rotate(0deg); opacity: 0.7; z-index: 1; filter: blur(0px); }
          25% { transform: scale(3.2) translate(-15%, 25%) rotate(-6deg); opacity: 0.3; z-index: 50; filter: blur(2px); }
          50% { transform: scale(0.6) translate(30%, -15%) rotate(10deg); opacity: 0.6; z-index: 1; filter: blur(0px); }
          75% { transform: scale(3.8) translate(-25%, -30%) rotate(-4deg); opacity: 0.2; z-index: 50; filter: blur(3px); }
          100% { transform: scale(1) translate(0, 0) rotate(0deg); opacity: 0.7; z-index: 1; filter: blur(0px); }
        }
        .animate-shuffle {
          animation: shuffleBurstMacro 1.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }

        @keyframes driftA { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-3px, -10px) rotate(1.5deg); } }
        @keyframes driftB { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(6px, -8px) rotate(-1.5deg); } }
        @keyframes driftC { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-2px, -12px); } }

        .packet-drift-0 { animation: driftA 3s ease-in-out infinite; }
        .packet-drift-1 { animation: driftB 3.5s ease-in-out infinite; }
        .packet-drift-2 { animation: driftC 4s ease-in-out infinite; }
        .packet-drift-3 { animation: driftA 4.5s ease-in-out infinite; animation-direction: reverse; }

        .data-packet:active { transform: scale(0.92) !important; border-color: #22d3ee; }

        @keyframes kenBurns {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .animate-ken-burns { animation: kenBurns 20s ease-in-out infinite; }

        @keyframes syncPulse { 0%, 100% { height: 30%; opacity: 0.3; } 50% { height: 100%; opacity: 1; } }
        @keyframes heroPop { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-hero-pop { animation: heroPop 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .fused-highlight { background: linear-gradient(90deg, #22d3ee 0%, #ffffff 50%, #22d3ee 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: fusedShimmer 4s linear infinite; }
        @keyframes fusedShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        @keyframes coreBreatheEnhanced { 
          0%, 100% { transform: scale(1); opacity: 0.4; filter: blur(6px); box-shadow: 0 0 30px rgba(34, 211, 238, 0.2); } 
          50% { transform: scale(1.3); opacity: 1; filter: blur(0px); box-shadow: 0 0 80px rgba(34, 211, 238, 0.5); } 
        }
        .animate-core-breathe-enhanced { animation: coreBreatheEnhanced 3s ease-in-out infinite; }

        .floating-modal-container {
          width: 94%;
          max-width: 480px;
          max-height: 85vh;
          border-radius: 32px;
          box-shadow: 0 50px 100px -20px rgba(0,0,0,0.9), 0 0 40px rgba(34, 211, 238, 0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: rgba(10, 10, 10, 0.98);
          backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        @media (min-width: 1024px) {
          .floating-modal-container { width: 50%; max-width: 900px; flex-direction: row; max-height: 65vh; }
        }

        .auth-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 14px 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          color: white;
          outline: none;
          transition: all 0.3s;
        }
        .auth-input:focus { border-color: #22d3ee; box-shadow: 0 0 10px rgba(34, 211, 238, 0.2); }
      `}</style>

      {/* --- Boot Sequence --- */}
      {isInitializing && (
        <div className="fixed inset-0 z-[10000] bg-[#010101] flex flex-col items-center justify-center p-8 overflow-hidden">
          <div className="absolute w-[600px] h-[600px] bg-cyan-500/10 blur-[180px] rounded-full animate-pulse pointer-events-none" />
          
          <div className="relative flex items-center justify-center w-32 h-32 mb-12">
            <div className="absolute inset-[-60px] border-[0.5px] border-cyan-400/10 rounded-full animate-ping opacity-10" />
            <div className="absolute inset-[-30px] border-[0.5px] border-white/5 rounded-full animate-pulse opacity-20" />
            <div className="relative w-16 h-16 bg-gradient-to-tr from-cyan-400 to-white rounded-full flex items-center justify-center animate-core-breathe-enhanced shadow-[0_0_100px_rgba(34,211,238,0.4)]" />
          </div>

          <div className="flex flex-col items-center gap-4 text-center">
            <span className="font-brand text-[10px] sm:text-[12px] tracking-[0.7em] text-cyan-400/80 font-black uppercase animate-hero-pop">
              Entering Hyzen Labs
            </span>
            <div className="flex gap-2">
               {[0,1,2].map(i => (
                 <div key={i} className="w-1.5 h-1.5 bg-cyan-400/30 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
               ))}
            </div>
            <span className="text-[7px] font-mono opacity-20 uppercase tracking-[0.4em] mt-1">v4.0.0 | CORE IDENTITY</span>
          </div>
        </div>
      )}

      {/* --- Main Content Wrap --- */}
      <div 
        className="flex-1 flex flex-col relative"
        style={{ 
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <nav className="z-[100] px-8 pt-12 pb-2 flex justify-between items-start shrink-0">
          <div className="flex flex-col">
            <span className="font-brand text-[10px] tracking-[0.4em] text-cyan-400 font-black uppercase">Hyzen Labs.</span>
            <span className="text-[7px] opacity-20 uppercase tracking-[0.2em] font-brand mt-1">Digital Matrix Ecosystem</span>
          </div>
          <div className="flex items-center gap-4">
             {/* Auth Status / Identity Toggle */}
             {user && !user.isAnonymous ? (
               <button onClick={handleLogout} className="flex items-center gap-2 glass-panel px-3 py-1.5 rounded-full border border-red-500/20 hover:border-red-500/50 transition-all">
                  <span className="text-[9px] font-brand font-black text-white uppercase tracking-tighter">{user.displayName}</span>
                  <LogOut size={12} className="text-red-400" />
               </button>
             ) : (
               <button onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }} className="flex items-center gap-2 glass-panel px-3 py-1.5 rounded-full border border-cyan-500/20 hover:border-cyan-500/50 transition-all">
                  <span className="text-[9px] font-brand font-black text-white uppercase tracking-tighter">Connect Identity</span>
                  <LogIn size={12} className="text-cyan-400" />
               </button>
             )}
             
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
            
            <button 
              onClick={openSyncTrace} 
              className="group flex items-center gap-3 glass-panel px-4 py-2 rounded-full border border-white/10 hover:bg-white active:scale-95 transition-all duration-500 shadow-xl"
            >
              <div className="relative w-4 h-4 flex items-center justify-center">
                <Fingerprint size={14} className="text-cyan-400 group-hover:text-black transition-colors" />
              </div>
              <span className="text-[9px] font-brand font-black text-white group-hover:text-black uppercase tracking-tighter">Sync Trace</span>
            </button>
          </div>

          <div className="matrix-container">
            <div className="matrix-grid" ref={scrollRef}>
              {messages.length > 0 ? messages.map((item, idx) => (
                <div 
                  key={item.id || idx} 
                  className={`data-packet group ${isShuffling ? 'animate-shuffle' : `packet-drift-${idx % 4}`}`}
                  style={{ animationDelay: isShuffling ? `${idx * 0.1}s` : '0s' }}
                  onClick={() => { setSelectedItem(item); setIsModalOpen(true); playSystemSound('popup'); }}
                >
                  <div className="absolute inset-0 overflow-hidden">
                    {item.image ? (
                      <img src={item.image} className="absolute inset-0 w-full h-full object-cover opacity-50 brightness-75 group-hover:opacity-100 transition-all" alt="" />
                    ) : (
                      <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center">
                        <User size={18} className="text-white/10" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/90 to-transparent">
                    <span className="block text-[6.5px] font-brand font-black text-cyan-400/80 truncate uppercase tracking-tight">
                      {item.name || 'ANON'}
                    </span>
                  </div>
                </div>
              )) : (
                Array.from({length: 30}).map((_, i) => (
                  <div key={i} className="data-packet bg-zinc-900/5 flex items-center justify-center border border-white/5 rounded-2xl">
                    <Fingerprint size={14} className="text-white/5" />
                  </div>
                ))
              )}
            </div>
            <div className="absolute inset-0 pointer-events-none border border-cyan-500/5 rounded-2xl shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]" />
          </div>
        </main>
      </div>

      <footer className="z-[100] px-10 py-6 flex justify-between items-end border-t border-white/5 bg-black/60 backdrop-blur-md shrink-0">
        <div className="flex flex-col gap-1.5">
          <span className="font-brand text-[9px] tracking-[0.8em] font-black uppercase text-white/40">HYZEN LABS. 2026</span>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-white/20 animate-pulse" />
            <span className="text-[9px] font-brand tracking-[0.4em] text-white/40 uppercase">
              Founder Gene
            </span>
          </div>
        </div>
        <div className="flex gap-2 mb-1">
           <Sparkles size={10} className="text-white/10 animate-pulse" />
           <div className="w-1 h-1 rounded-full bg-white/10" />
        </div>
      </footer>

      {/* --- Identity / Auth Modal --- */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/90 backdrop-blur-3xl animate-hero-pop p-4" onClick={closeModal}>
          <div className="w-full max-w-sm glass-panel p-10 rounded-[2.5rem] border border-cyan-500/30 shadow-[0_0_80px_rgba(34,211,238,0.15)]" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center mb-10">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <Fingerprint size={32} className="text-cyan-400" />
              </div>
              <h2 className="text-xl font-black font-brand uppercase tracking-widest text-white">
                {authMode === 'login' ? 'Connect Identity' : 'Register Identity'}
              </h2>
              <p className="text-[8px] font-mono text-cyan-400/60 uppercase tracking-[0.3em] mt-2">
                Authentication Required for Sync
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="relative">
                <AtSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  type="email" 
                  placeholder="EMAIL_ADDRESS" 
                  className="auth-input pl-12"
                  value={authForm.email}
                  onChange={e => setAuthForm({...authForm, email: e.target.value})}
                  required
                />
              </div>

              <div className="relative">
                <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  type="password" 
                  placeholder="SECURE_PASSWORD" 
                  className="auth-input pl-12"
                  value={authForm.password}
                  onChange={e => setAuthForm({...authForm, password: e.target.value})}
                  required
                />
              </div>

              {authMode === 'join' && (
                <div className="relative animate-hero-pop">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <input 
                    type="text" 
                    placeholder="NICKNAME_ID" 
                    className="auth-input pl-12 uppercase"
                    value={authForm.nickname}
                    onChange={e => setAuthForm({...authForm, nickname: e.target.value.toUpperCase()})}
                    required
                  />
                </div>
              )}

              <button 
                type="submit" 
                className="w-full h-14 bg-white text-black rounded-xl font-brand font-black uppercase tracking-[0.5em] text-[12px] active:scale-[0.98] transition-all hover:bg-cyan-400 mt-4 shadow-xl flex items-center justify-center gap-3"
                disabled={isAuthLoading}
              >
                {isAuthLoading ? <Loader2 size={18} className="animate-spin" /> : (authMode === 'login' ? 'AUTHENTICATE' : 'INITIALIZE')}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'join' : 'login')}
                className="text-[9px] font-brand font-black text-cyan-400/60 hover:text-cyan-400 uppercase tracking-widest transition-all"
              >
                {authMode === 'login' ? 'Need a new identity? Register' : 'Already registered? Login'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Floating Detail Modal --- */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/90 backdrop-blur-3xl animate-hero-pop p-4" onClick={closeModal}>
          <div className="floating-modal-container glass-panel relative" onClick={e => e.stopPropagation()}>
            <button onClick={closeModal} className="absolute top-5 right-5 z-[110] p-2 bg-black/50 hover:bg-white text-white hover:text-black rounded-full transition-all border border-white/10 backdrop-blur-md">
              <X size={18} />
            </button>
            <div className="h-[35vh] lg:h-auto lg:w-[50%] relative bg-black overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10 flex items-center justify-center">
              {selectedItem.image ? (
                <img src={selectedItem.image} className="w-full h-full object-contain animate-ken-burns" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/5 bg-zinc-900">
                   <Fingerprint size={100} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-5 left-6">
                <span className="text-cyan-400 font-brand text-[8px] font-black uppercase tracking-[0.4em] border-b border-cyan-400/30 pb-0.5">Linked Core</span>
              </div>
            </div>
            <div className="flex-1 p-6 lg:p-10 flex flex-col justify-between overflow-hidden">
              <div className="space-y-4">
                <div>
                  <span className="text-cyan-400 font-brand text-[9px] font-black uppercase tracking-[0.3em] inline-block mb-1">Identity</span>
                  <h2 className="text-3xl lg:text-4xl font-black uppercase font-title leading-none text-white tracking-tighter truncate">
                    {selectedItem.name}
                  </h2>
                </div>
                <div className="relative">
                  <div className="absolute -left-3.5 top-0 bottom-0 w-[1.5px] bg-cyan-500/40" />
                  <p className="text-xs lg:text-base font-light italic text-white/80 leading-relaxed font-sans line-clamp-5 lg:line-clamp-8">
                    "{selectedItem.text}"
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.3em]">Temporal Stamp</span>
                    <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-tighter">{selectedItem.date}</span>
                  </div>
                  {/* 삭제 권한: 관리자 혹은 본인(닉네임 일치 시) */}
                  {(deletePass === ADMIN_PASS || (user && user.displayName === selectedItem.name)) && (
                    <button onClick={(e) => { e.stopPropagation(); setTargetDeleteId(selectedItem.id); setIsDeleteModalOpen(true); }} className="p-3 text-white/10 hover:text-red-500 transition-all">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Sync (Input) Modal --- */}
      {isGuestbookOpen && (
        <div className="fixed inset-0 z-[7000] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/95 backdrop-blur-3xl animate-hero-pop" onClick={closeModal}>
          <div className="w-full sm:max-w-md glass-panel rounded-t-[3.5rem] sm:rounded-[2.5rem] p-10 sm:p-12 shadow-[0_0_100px_rgba(34,211,238,0.1)]" onClick={e => e.stopPropagation()}>
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
                  image: newMessage.image, 
                  uid: user.uid, // 보안 및 본인 확인용 UID 추가
                  createdAt: serverTimestamp(), 
                  date: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) 
                });
                setNewMessage(prev => ({ ...prev, text: '', image: null })); closeModal(); playSystemSound('popup');
              } catch (err) { console.error(err); } finally { setIsUploading(false); }
            }} className="space-y-10">
              <div className="space-y-1.5 opacity-50">
                <label className="text-[8px] font-brand text-cyan-400/60 uppercase tracking-[0.3em] ml-1">Identity Name (Locked)</label>
                <input 
                  type="text" 
                  disabled
                  className="w-full bg-white/5 border-b border-white/10 px-1 py-4 text-sm font-brand outline-none uppercase tracking-widest text-white/80" 
                  value={newMessage.name} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-brand text-cyan-400/60 uppercase tracking-[0.3em] ml-1">Your Narrative Data</label>
                <textarea 
                  style={{fontSize: '16px'}} 
                  placeholder="ENTER FRAGMENTED THOUGHTS..." 
                  className="w-full h-24 bg-white/5 border-b border-white/10 px-1 py-4 text-sm font-title outline-none focus:border-cyan-500 resize-none transition-all font-light tracking-tight text-white/90 placeholder:text-white/10" 
                  value={newMessage.text} 
                  onChange={e => setNewMessage({...newMessage, text: e.target.value})} 
                  required 
                />
              </div>
              <div className="flex flex-col gap-3">
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`h-16 flex items-center justify-center gap-4 rounded-3xl border transition-all ${newMessage.image ? 'border-cyan-500 text-cyan-400 bg-cyan-400/5' : 'border-white/10 text-white/30 hover:border-white/20'}`}>
                  {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                  <span className="text-[9px] font-brand font-black uppercase tracking-widest">{newMessage.image ? "Visual Ready" : "Attach Image"}</span>
                </button>
              </div>
              {newMessage.image && (
                <div className="w-full h-32 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl animate-hero-pop">
                  <img src={newMessage.image} className="w-full h-full object-cover" alt="Preview" />
                </div>
              )}
              <button 
                type="submit" 
                className="w-full h-14 bg-white text-black rounded-2xl font-brand font-black uppercase tracking-[0.5em] text-[13px] active:scale-[0.98] disabled:opacity-50 shadow-xl transition-all hover:bg-cyan-400" 
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
                if ((deletePass === ADMIN_PASS || deletePass === "OWNER") && targetDeleteId && db) { 
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