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
  ArrowRight,
  User,
  Image as ImageIcon
} from 'lucide-react';

/**
 * [Hyzen Labs. CTO Optimized - R3.5.0 | Neural Matrix Grid]
 * 1. 고밀도 그리드: 모바일 최적화 5x6 그리드 레이아웃 (30개 동시 조망)
 * 2. 인터렉션: 초소형 카드 터치 시 풀스크린 확장 및 팝업 닫기 UI
 * 3. 시각적 정체성: 데이터 패킷(Author + Mini Image) 중심의 매트릭스 시각화
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

const NeuralPulse = () => (
  <div className="inline-flex items-center gap-1 h-full px-1">
    <div className="flex items-end gap-[1px] h-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="w-[1.5px] bg-cyan-400/80 rounded-full" style={{ height: '100%', animation: `syncPulse ${1 + i * 0.2}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
    <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
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
    }, 3000);

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
    <div className="fixed inset-0 bg-[#050505] text-white selection:bg-cyan-500/30 overflow-hidden font-sans flex flex-col max-w-full touch-none" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none z-[1] mix-blend-overlay" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Michroma&family=Orbitron:wght@400;700;900&family=JetBrains+Mono&display=swap');
        .font-brand { font-family: 'Orbitron', sans-serif; }
        .font-title { font-family: 'Michroma', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); }
        
        /* Grid Layout Optimizations */
        .matrix-container {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          grid-auto-rows: minmax(min(15vh, 100px), 1fr);
          gap: 4px;
          overflow-y: auto;
          scrollbar-width: none;
          padding: 8px;
          scroll-snap-type: y mandatory;
        }
        .matrix-container::-webkit-scrollbar { display: none; }
        
        @media (min-width: 768px) {
          .matrix-container { grid-template-columns: repeat(8, 1fr); }
        }

        .data-packet {
          scroll-snap-align: start;
          position: relative;
          aspect-ratio: 0.8 / 1;
          overflow: hidden;
          background: rgba(255,255,255,0.02);
          border: 0.5px solid rgba(255,255,255,0.05);
          transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .data-packet:active {
          transform: scale(0.92);
          background: rgba(34, 211, 238, 0.1);
          border-color: rgba(34, 211, 238, 0.4);
        }

        @keyframes syncPulse { 0%, 100% { height: 30%; opacity: 0.3; } 50% { height: 100%; opacity: 1; } }
        @keyframes heroPop { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
        .animate-hero-pop { animation: heroPop 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .fused-highlight { background: linear-gradient(90deg, #22d3ee 0%, #ffffff 50%, #22d3ee 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: fusedShimmer 4s linear infinite; }
        @keyframes fusedShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        @keyframes coreBreathe { 0%, 100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.15); opacity: 0.8; } }
        .animate-core-breathe { animation: coreBreathe 4s ease-in-out infinite; }
      `}</style>

      {/* --- Boot Sequence --- */}
      {isInitializing && (
        <div className="fixed inset-0 z-[10000] bg-[#050505] flex flex-col items-center justify-center p-8 overflow-hidden">
          <div className="absolute w-[400px] h-[400px] bg-cyan-500/5 blur-[100px] rounded-full animate-core-breathe" />
          <div className="relative w-12 h-12 bg-cyan-400 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.4)] animate-pulse" />
          <div className="mt-8 flex flex-col items-center gap-2">
            <span className="font-brand text-[8px] tracking-[0.6em] text-cyan-400 font-black uppercase">Grid Loading</span>
            <span className="text-[6px] font-mono opacity-20 uppercase tracking-[0.3em]">Hyzen R3.5.0</span>
          </div>
        </div>
      )}

      {/* --- Nav --- */}
      <nav className="z-[100] px-6 pt-10 pb-2 flex justify-between items-center shrink-0 border-b border-white/5">
        <div className="flex flex-col">
          <span className="font-brand text-[9px] tracking-[0.4em] text-cyan-400 font-black uppercase">Hyzen Labs.</span>
          <div className="flex items-center gap-1.5 mt-0.5">
             <span className="text-[6px] opacity-20 uppercase tracking-[0.2em] font-brand">Matrix Sync</span>
             <NeuralPulse />
          </div>
        </div>
        <div className="flex gap-4">
           <Cloud size={14} className={cloudStatus === 'connected' ? 'text-cyan-400' : 'text-amber-500'} />
           <button onClick={() => setIsGuestbookOpen(true)} className="p-1.5 bg-white text-black rounded-full active:scale-90 transition-all"><Plus size={14} /></button>
        </div>
      </nav>

      {/* --- Main Matrix Canvas --- */}
      <main className="flex-1 overflow-hidden flex flex-col relative z-10">
        <div className="matrix-container flex-1">
          {messages.length > 0 ? messages.map((item, idx) => (
            <div key={item.id || idx} className="data-packet group" onClick={() => { setSelectedItem(item); setIsModalOpen(true); playSystemSound('popup'); }}>
              {/* Card Image Background */}
              {item.image ? (
                <img src={item.image} className="absolute inset-0 w-full h-full object-cover opacity-40 brightness-75" alt="" />
              ) : (
                <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center opacity-20">
                  <User size={24} className="text-white" />
                </div>
              )}
              {/* Identity Overlay */}
              <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                <span className="block text-[7px] font-brand font-black text-cyan-400 truncate tracking-tight uppercase">
                  {item.name || 'ANON'}
                </span>
              </div>
              {/* Scanline Effect */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(34,211,238,0.05)_50%,transparent_100%)] bg-[length:100%_2px] animate-scan pointer-events-none" />
            </div>
          )) : (
            // Placeholder 그리드 (데이터 없을 때)
            Array.from({length: 30}).map((_, i) => (
              <div key={i} className="data-packet bg-zinc-900/10 flex items-center justify-center border border-white/5">
                <Fingerprint size={16} className="text-white/5" />
              </div>
            ))
          )}
        </div>
      </main>

      {/* --- Footer Statistics --- */}
      <footer className="z-[100] px-6 py-4 flex justify-between items-center border-t border-white/5 bg-black/80 backdrop-blur-md shrink-0">
        <div className="flex flex-col">
          <span className="text-[7px] font-mono text-white/30 uppercase tracking-widest">Active Packets</span>
          <span className="text-[10px] font-brand font-black text-white">{messages.length} Units</span>
        </div>
        <div className="flex items-center gap-3">
           <a href={`mailto:${EMAIL_ADDRESS}`} className="text-white/20 hover:text-cyan-400"><Mail size={14} /></a>
           <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-red-500"><Youtube size={14} /></a>
        </div>
      </footer>

      {/* --- Detail Expansion Modal --- */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[6000] flex flex-col bg-black animate-hero-pop" onClick={closeModal}>
          {/* Modal Close Button */}
          <button onClick={closeModal} className="absolute top-10 right-8 z-[100] p-4 bg-white text-black rounded-full flex items-center gap-2 active:scale-90 transition-all shadow-2xl">
            <span className="text-[9px] font-brand font-black uppercase">Close</span>
            <X size={20} />
          </button>

          {/* Full-screen Image Section */}
          <div className="h-1/2 relative bg-zinc-950 overflow-hidden border-b border-white/10">
            {selectedItem.image ? (
              <img src={selectedItem.image} className="w-full h-full object-cover animate-pulse" style={{ animationDuration: '5s' }} alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/5">
                <Fingerprint size={120} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-10 left-10">
               <span className="text-cyan-400 font-brand text-[10px] font-black uppercase tracking-[0.4em] border-b border-cyan-400/30 pb-1 inline-block">Temporal Trace Captured</span>
            </div>
          </div>

          {/* Detailed Content Section */}
          <div className="flex-1 p-10 sm:p-16 overflow-y-auto">
            <div className="max-w-xl mx-auto space-y-10">
              <h2 className="text-4xl sm:text-6xl font-black uppercase font-title leading-[0.85] text-white">
                {selectedItem.name}
              </h2>
              
              <div className="relative">
                <div className="absolute -left-6 top-0 bottom-0 w-[2.5px] bg-cyan-500/30" />
                <p className="text-lg sm:text-2xl font-light italic text-white/90 leading-relaxed">
                  "{selectedItem.text}"
                </p>
              </div>

              <div className="pt-10 border-t border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Temporal Log ID</span>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase mt-1">{selectedItem.date} / SYNC_OK</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setTargetDeleteId(selectedItem.id); setIsDeleteModalOpen(true); }} className="p-3 text-white/20 hover:text-red-500 transition-all border border-white/10 rounded-xl">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Sync (Input) Modal --- */}
      {isGuestbookOpen && (
        <div className="fixed inset-0 z-[7000] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/90 backdrop-blur-xl animate-hero-pop" onClick={closeModal}>
          <div className="w-full sm:max-w-lg glass-panel rounded-t-[3rem] sm:rounded-[3rem] p-10 sm:p-12" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black font-brand uppercase tracking-tighter text-cyan-400">New Trace</h2>
              <button onClick={closeModal} className="p-2 bg-white/5 rounded-full hover:text-white"><X size={20} /></button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault(); if (!newMessage.name || !newMessage.text || isUploading) return;
              setIsUploading(true);
              try {
                const q = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
                await addDoc(q, { ...newMessage, createdAt: serverTimestamp(), date: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) });
                setNewMessage({ name: '', text: '', image: null }); closeModal(); playSystemSound('popup');
              } catch (err) { console.error(err); } finally { setIsUploading(false); }
            }} className="space-y-8">
              <input type="text" style={{fontSize: '16px'}} placeholder="IDENTITY NAME" className="w-full bg-transparent border-b border-white/10 px-0 py-4 text-xs font-brand outline-none focus:border-cyan-500 transition-all uppercase" value={newMessage.name} onChange={e => setNewMessage({...newMessage, name: e.target.value.toUpperCase()})} required />
              <textarea style={{fontSize: '16px'}} placeholder="LOG DATA..." className="w-full h-24 bg-transparent border-b border-white/10 px-0 py-4 text-sm outline-none focus:border-cyan-500 resize-none transition-all font-light" value={newMessage.text} onChange={e => setNewMessage({...newMessage, text: e.target.value})} required />

              <div className="flex gap-4">
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex-1 h-16 flex items-center justify-center gap-3 rounded-2xl border transition-all ${newMessage.image ? 'border-cyan-500 text-cyan-400' : 'border-white/10 text-white/30'}`}>
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                  <span className="text-[10px] font-brand uppercase font-black tracking-widest">{newMessage.image ? "Linked" : "Attach"}</span>
                </button>
              </div>

              {newMessage.image && (
                <div className="w-full h-32 rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                  <img src={newMessage.image} className="w-full h-full object-cover" alt="Preview" />
                </div>
              )}

              <button type="submit" className="w-full h-16 bg-white text-black rounded-2xl font-brand font-black uppercase tracking-widest active:scale-95 disabled:opacity-50 shadow-2xl" disabled={isUploading}>
                {isUploading ? "Syncing..." : "Initiate Sync"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Delete Protocol --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[8000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl" onClick={closeModal}>
          <div className="w-full max-w-xs glass-panel p-10 rounded-[3rem] border border-red-500/30 text-center" onClick={e => e.stopPropagation()}>
            <Lock size={40} className="text-red-500 mx-auto mb-6" />
            <h2 className="text-lg font-black uppercase font-brand mb-8">Erase Trace</h2>
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