import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Flame
} from 'lucide-react';

/**
 * [Hyzen Labs. CTO Optimized - R1.1.7 | Visual Expansion Edition]
 * 1. 브랜드: "ME," 쉼표 포함 키네틱 타이포그래피 & 'HYZEN LABS.' 푸터
 * 2. 시각 요소: 확대된 아이콘/이미지(w-16) 및 배경 플로팅 트윙클 Spark 효과
 * 3. 탐색: ROADMAP / WORKS / TRACES 3개 탭의 수평 스크롤 및 화살표 내비게이션
 * 4. UX: 방명록 진입 시 폼 리셋, 전송 후 자동 팝업 닫힘 및 페이드인 애니메이션
 */

// --- [배경 플로팅 요소 컴포넌트] ---
const FloatingMessage = ({ msg }) => {
  const [coords] = useState({
    top: `${Math.random() * 60 + 15}%`,
    left: `${Math.random() * 75 + 5}%`,
  });

  const summary = msg.text.length > 20 ? msg.text.substring(0, 20) + "..." : msg.text;

  return (
    <div 
      className="absolute pointer-events-none select-none transition-opacity duration-1000 ease-in-out animate-float z-[2]"
      style={{ ...coords, opacity: 0.45 }}
    >
      <div className="relative flex items-center gap-2 glass-panel px-3 py-2 rounded-2xl border border-cyan-500/10 scale-75 sm:scale-100 shadow-2xl">
        {/* Intelligence Spark Effect */}
        <div className="absolute -top-1 -left-1 w-2 h-2">
          <div className="w-full h-full bg-cyan-400 rounded-full animate-twinkle shadow-[0_0_8px_#22d3ee]" />
        </div>
        {msg.image && (
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/10">
            <img src={msg.image} className="w-full h-full object-cover grayscale" alt="" />
          </div>
        )}
        <div className="flex flex-col text-left">
          <span className="text-[7px] font-brand text-cyan-400 font-black uppercase tracking-tighter">{msg.name}</span>
          <span className="text-[9px] text-white/70 font-light italic leading-tight">"{summary}"</span>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [activeView, setActiveView] = useState('roadmap');
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuestbookOpen, setIsGuestbookOpen] = useState(false);
  const [imgLoadStatus, setImgLoadStatus] = useState('loading');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState({ name: '', text: '', image: null });
  
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

  const founderImgSrc = "YJ.PNG"; 

  const triggerSync = useCallback(() => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1500);
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const projects = [
    {
      id: 1,
      tag: "Visual Synthesis",
      title: "잠재적 공간의 초상",
      desc: "매니페스토의 '유한한 직관'을 AI 데이터로 변환한 비주얼 실험.",
      goal: "인간의 무의식적 직관을 AI 잠재 공간과 연결합니다.",
      process: "SDXL과 커스텀 LoRA를 활용한 현실 질감 이식.",
      result: "AI 생성물에서 인간적 직관의 흔적을 발견함."
    },
    {
      id: 2,
      tag: "Spatial Computing",
      title: "물리적 공간의 디지털 증강",
      desc: "현실 오브젝트 인식 실시간 AR 시각화 엔진.",
      goal: "현실 사물을 AI가 이해하고 새로운 인터페이스를 제공하는 목적.",
      process: "On-device AI 비전 모델 기반 객체 감지 기술.",
      result: "하이퍼-리얼리스틱 렌더링 기술 확보."
    },
    {
      id: 3,
      tag: "Energy Resonance",
      title: "배터리 에너지의 지능적 가시화",
      desc: "물리적 배터리팩의 열 역학 데이터를 AI가 분석하여 AR로 시각화하는 지능형 코어.",
      goal: "보이지 않는 에너지의 흐름을 지능적으로 가시화하여 안전과 효율을 극대화합니다.",
      process: "BMS 데이터와 AI 물리 모델링을 융합한 실시간 렌더링 시스템 개발.",
      result: "물리적 배터리 상태에 대한 직관적 인지 능력을 300% 이상 향상."
    }
  ];

  const roadmapSteps = [
    { phase: "PHASE 01", title: "Reality Grounding", status: "In Prep", progress: 0, icon: <Cpu className="w-6 h-6 text-cyan-400" /> },
    { phase: "PHASE 02", title: "Intelligence Augment", status: "In Prep", progress: 0, icon: <BrainCircuit className="w-6 h-6 text-violet-400" /> },
    { phase: "PHASE 03", title: "Seamless Convergence", status: "Upcoming", progress: 0, icon: <Layers className="w-6 h-6 text-amber-400" /> }
  ];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMessage(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMessageSubmit = (e) => {
    e.preventDefault();
    if (!newMessage.name || !newMessage.text) return;
    const msg = {
      id: Date.now(),
      name: newMessage.name,
      text: newMessage.text,
      image: newMessage.image,
      date: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };
    const updatedMessages = [msg, ...messages].slice(0, 10);
    setMessages(updatedMessages);
    setNewMessage({ name: '', text: '', image: null });
    triggerSync();
    
    setTimeout(() => {
      setIsGuestbookOpen(false);
      document.body.style.overflow = 'auto';
    }, 500);
  };

  const openGuestbook = () => {
    setNewMessage({ name: '', text: '', image: null });
    setIsGuestbookOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsGuestbookOpen(false);
    document.body.style.overflow = 'auto';
  };

  return (
    <div className="h-screen w-screen bg-[#010101] text-white selection:bg-cyan-500/30 overflow-hidden font-sans flex flex-col relative">
      {/* Background System */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none z-[1] mix-blend-overlay" />
      
      {/* Floating Trace Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {messages.map(msg => (
          <FloatingMessage key={msg.id} msg={msg} />
        ))}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Michroma&family=Orbitron:wght@400;700;900&family=JetBrains+Mono&display=swap');
        .font-brand { font-family: 'Orbitron', sans-serif; }
        .font-title { font-family: 'Michroma', sans-serif; }
        .glass-panel { 
          background: rgba(255, 255, 255, 0.02); 
          backdrop-filter: blur(20px); 
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .text-outline { -webkit-text-stroke: 1px rgba(255,255,255,0.2); color: transparent; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        
        @keyframes scanline {
          0% { top: -10%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
        .animate-scan { animation: scanline 4s linear infinite; }
        
        @keyframes fadeInSoft { 
          from { opacity: 0; transform: translateY(15px) scale(0.98); } 
          to { opacity: 1; transform: translateY(0) scale(1); } 
        }
        .animate-fade-in-soft { animation: fadeInSoft 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(8px, -12px) rotate(0.5deg); }
          50% { transform: translate(-4px, 8px) rotate(-0.5deg); }
          75% { transform: translate(-8px, -4px) rotate(0.2deg); }
        }
        .animate-float { animation: float 20s ease-in-out infinite; }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .animate-twinkle { animation: twinkle 2s infinite ease-in-out; }
        
        @keyframes orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .tap-feedback:active { transform: scale(0.97); transition: transform 0.1s ease; }
      `}</style>

      {/* Header Navigation */}
      <nav className="w-full z-[100] px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex flex-col text-left group">
          <div className="flex items-center gap-2">
            <span className="font-brand text-[10px] tracking-[0.5em] text-cyan-400 font-black uppercase leading-none">Hyzen Labs.</span>
            <div className={`w-1 h-1 rounded-full ${isSyncing ? 'bg-cyan-400 animate-ping' : 'bg-cyan-900'}`} />
          </div>
          <span className="text-[7px] opacity-20 mt-1 uppercase tracking-[0.3em] font-brand font-bold">R1.1.7 | Visual Expansion</span>
        </div>
        <div className="flex gap-4 opacity-40">
          <a href="mailto:jini2aix@gmail.com"><Mail size={14} /></a>
          <Share2 size={14} />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 z-10 px-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-cyan-500/5 blur-[100px] -z-10 transition-opacity duration-1000 ${isSyncing ? 'opacity-100' : 'opacity-40'}`} />
        
        <div className="relative inline-block animate-fade-in-soft mb-6 group">
          <div className="absolute -top-3 -left-3 w-3 h-3 border-t border-l border-cyan-500/40" />
          <div className="absolute -top-3 -right-3 w-3 h-3 border-t border-r border-cyan-500/40" />
          <div className="absolute -bottom-3 -left-3 w-3 h-3 border-b border-l border-cyan-500/40" />
          <div className="absolute -bottom-3 -right-3 w-3 h-3 border-b border-r border-cyan-500/40" />
          <div className="absolute left-0 w-full h-[1px] bg-cyan-500/40 blur-[1.5px] animate-scan z-10 pointer-events-none" />

          <div className="flex flex-col items-center">
            <h1 className="text-[13vw] sm:text-8xl font-title tracking-[-0.07em] leading-[0.9] uppercase">
              <span className="bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent block">ME,</span>
              <span className="text-outline block my-1 group-hover:text-white transition-all duration-1000">REALITY</span>
              <span className="bg-gradient-to-b from-cyan-400 to-cyan-700 bg-clip-text text-transparent block">AND AI</span>
            </h1>
          </div>
        </div>
        
        <p className="text-[2.5vw] sm:text-[11px] text-cyan-400/60 tracking-[0.5em] font-brand font-black uppercase mb-10 animate-fade-in-soft" style={{ animationDelay: '0.1s' }}>
          Augmented Reality Grounding
        </p>

        <div className="flex flex-col items-center gap-6 animate-fade-in-soft" style={{ animationDelay: '0.2s' }}>
          <div className="relative group scale-110 sm:scale-125" onClick={triggerSync}>
            <div className="absolute -inset-4 border border-white/5 rounded-full animate-[orbit_20s_linear_infinite] pointer-events-none" />
            <div className="relative w-16 h-16 rounded-full p-[1px] bg-gradient-to-br from-white/30 to-transparent">
              <div className="w-full h-full rounded-full border border-white/10 overflow-hidden bg-zinc-900 flex items-center justify-center relative shadow-2xl">
                {imgLoadStatus !== 'error' ? (
                  <img 
                    src={founderImgSrc} 
                    alt="Founder"
                    className={`w-full h-full object-cover grayscale brightness-90 transition-all duration-1000 group-hover:grayscale-0 ${imgLoadStatus === 'loading' ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setImgLoadStatus('success')}
                    onError={() => setImgLoadStatus('error')}
                  />
                ) : (
                  <User size={24} strokeWidth={1} className="text-white/10" />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <h3 className="text-[14px] font-title tracking-tight text-white font-bold">Youngji.Park</h3>
            <span className="text-[8px] font-brand tracking-[0.4em] uppercase font-bold text-white/20 mb-6">Founder</span>
            
            <button 
              onClick={openGuestbook}
              className="group flex items-center gap-3 px-8 py-3.5 rounded-full border border-white/15 glass-panel hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all active:scale-95 shadow-2xl"
            >
              <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-black shadow-lg shadow-cyan-500/20 group-hover:rotate-12 transition-transform">
                <MessageSquare size={12} strokeWidth={2.5} />
              </div>
              <span className="text-[9px] font-brand tracking-[0.4em] font-black uppercase text-white/80">Sync Trace</span>
            </button>
          </div>
        </div>
      </section>

      {/* Controller Section */}
      <div className="shrink-0 z-10 pb-4 animate-fade-in-soft" style={{ animationDelay: '0.3s' }}>
        <div className="px-6 mb-4 max-w-lg mx-auto">
          <div className="glass-panel p-1 rounded-2xl flex gap-1 relative overflow-hidden">
            {['roadmap', 'works', 'traces'].map((view) => (
              <button 
                key={view}
                onClick={() => { setActiveView(view); triggerSync(); }}
                className={`flex-1 py-3.5 rounded-xl text-[7px] font-brand tracking-[0.1em] transition-all tap-feedback uppercase ${activeView === view ? 'bg-white text-black font-black' : 'text-white/30'}`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area - Visual Elements Enlarged */}
        <div className="px-6 max-w-4xl mx-auto h-[180px] relative">
          <button onClick={() => scroll('left')} className="absolute left-1 top-1/2 -translate-y-1/2 z-20 p-2 text-white/20 hover:text-white/60 transition-colors hidden sm:block"><ChevronLeft size={24} /></button>
          <button onClick={() => scroll('right')} className="absolute right-1 top-1/2 -translate-y-1/2 z-20 p-2 text-white/20 hover:text-white/60 transition-colors hidden sm:block"><ChevronRight size={24} /></button>

          <div ref={scrollRef} key={activeView} className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 h-full animate-fade-in-soft">
            {activeView === 'roadmap' ? (
              roadmapSteps.map((step, idx) => (
                <div key={idx} className="glass-panel p-5 rounded-[2.5rem] relative overflow-hidden flex-shrink-0 w-[85%] sm:w-[35%] snap-center border border-white/5 flex flex-col justify-between">
                  <div className="absolute bottom-0 left-0 h-[1px] bg-cyan-500/20 w-full" />
                  <div className="flex justify-between items-start mb-2">
                    <div className="w-16 h-16 flex items-center justify-center bg-white/[0.03] rounded-[1.5rem] border border-white/5 text-cyan-400">
                      {step.icon}
                    </div>
                    <div className={`text-[6px] font-brand px-2.5 py-1 rounded-full border ${step.status === 'In Prep' ? 'border-cyan-500/50 text-cyan-400' : 'border-white/10 text-white/20'}`}>
                      {step.status}
                    </div>
                  </div>
                  <div>
                    <span className="text-[8px] font-brand text-white/30 tracking-[0.2em] uppercase font-bold">{step.phase}</span>
                    <h3 className="text-[14px] font-bold tracking-tight mt-1 leading-tight">{step.title}</h3>
                  </div>
                </div>
              ))
            ) : activeView === 'works' ? (
              projects.map(project => (
                <div key={project.id} className="glass-panel p-5 rounded-[2.5rem] relative overflow-hidden flex-shrink-0 w-[85%] sm:w-[35%] snap-center border border-white/5 flex flex-col justify-between tap-feedback group" onClick={() => { setSelectedProject(project); setIsModalOpen(true); }}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-cyan-500 font-brand text-[8px] font-bold uppercase tracking-[0.3em]">{project.tag}</span>
                    <Maximize2 size={12} className="text-white/20 group-hover:text-cyan-400" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-[15px] font-black mb-1 uppercase tracking-tight leading-tight">{project.title}</h3>
                    <p className="text-white/40 text-[10px] leading-relaxed line-clamp-2 font-light">{project.desc}</p>
                  </div>
                </div>
              ))
            ) : (
              messages.length > 0 ? (
                messages.map(msg => (
                  <div key={msg.id} className="glass-panel p-5 rounded-[2.5rem] relative overflow-hidden flex-shrink-0 w-[85%] sm:w-[35%] snap-center border border-white/5 flex flex-col justify-between">
                    <div className="absolute bottom-0 left-0 h-[1px] bg-violet-500/20 w-full" />
                    <div className="flex justify-between items-start mb-2">
                      <div className="w-16 h-16 flex items-center justify-center bg-white/[0.03] rounded-[1.5rem] border border-white/5 overflow-hidden text-cyan-400 shrink-0 shadow-lg">
                        {msg.image ? <img src={msg.image} className="w-full h-full object-cover grayscale brightness-110" alt="Trace" /> : <User size={24} strokeWidth={1} className="opacity-20" />}
                      </div>
                      <span className="text-[8px] font-mono text-white/20 uppercase bg-white/5 px-2 py-0.5 rounded-full">{msg.date}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-brand text-violet-400 tracking-[0.1em] uppercase font-bold">{msg.name}</span>
                      <p className="text-[12px] text-white/70 font-light italic mt-1 leading-tight line-clamp-2">"{msg.text}"</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="w-full flex flex-col items-center justify-center opacity-10 gap-2 border border-dashed border-white/10 rounded-[2.5rem]">
                  <Sparkles size={32} />
                  <span className="text-[10px] font-brand uppercase tracking-widest text-center">Awaiting traces.</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full shrink-0 z-10 py-6 flex flex-col items-center justify-center border-t border-white/5 bg-black/20">
        <span className="font-brand text-[10px] tracking-[0.8em] font-black text-white/90 uppercase animate-pulse">HYZEN LABS. 2026</span>
        <p className="text-[6px] font-brand tracking-[0.2em] uppercase opacity-20 mt-2">© All Rights Reserved by HYZEN LABS.</p>
      </footer>

      {/* Modals */}
      {isGuestbookOpen && (
        <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-black/95 backdrop-blur-3xl p-0 sm:p-4 animate-fade-in-soft" onClick={closeModal}>
          <div className="w-full h-[90vh] sm:h-auto sm:max-w-md glass-panel rounded-t-[3.5rem] sm:rounded-[3.5rem] p-8 relative flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-1.5 bg-white/10 rounded-full mx-auto mb-8 sm:hidden" />
            <button onClick={closeModal} className="absolute top-8 right-8 p-2 text-white/20 hover:text-white transition-colors"><X size={22} /></button>
            <div className="mb-6">
              <div className="flex items-center gap-3 text-cyan-400 mb-2"><Activity size={14} /><span className="font-brand text-[9px] font-bold uppercase tracking-[0.5em]">Digital Trace Sync</span></div>
              <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Synchronize Reality</h2>
            </div>
            <form onSubmit={handleMessageSubmit} className="space-y-4 pt-4 safe-pb">
              <div className="flex gap-2">
                <input type="text" placeholder="NAME" className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-[11px] font-brand focus:outline-none focus:border-cyan-500/50 uppercase tracking-widest" value={newMessage.name} required onChange={e => setNewMessage({...newMessage, name: e.target.value})} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`px-4 rounded-2xl border transition-all ${newMessage.image ? 'bg-cyan-500 border-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-white/5 border-white/10 text-white/30'}`}><Camera size={18} /></button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
              </div>
              {newMessage.image && <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-cyan-500 shadow-xl"><img src={newMessage.image} className="w-full h-full object-cover" alt="" /><button onClick={() => setNewMessage(prev => ({...prev, image: null}))} className="absolute top-1 right-1 bg-black/50 p-1 text-white rounded-lg"><X size={10} /></button></div>}
              <div className="relative">
                <textarea placeholder="Leave your trace..." className="w-full h-24 bg-white/5 border border-white/10 rounded-3xl px-6 py-4 text-[13px] font-light focus:outline-none focus:border-cyan-500/50 resize-none" value={newMessage.text} required onChange={e => setNewMessage({...newMessage, text: e.target.value})} />
                <button type="submit" className="absolute bottom-3 right-3 p-3 bg-cyan-500 rounded-2xl text-black active:scale-90 transition-all shadow-xl shadow-cyan-500/30"><Send size={18} strokeWidth={2.5} /></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && selectedProject && (
        <div className="fixed inset-0 z-[4000] flex items-end sm:items-center justify-center bg-black/98 backdrop-blur-3xl p-0 sm:p-4 animate-fade-in-soft" onClick={closeModal}>
          <div className="w-full h-[80vh] sm:h-auto sm:max-w-xl glass-panel rounded-t-[3.5rem] sm:rounded-[3.5rem] p-10 relative overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-1.5 bg-white/10 rounded-full mx-auto mb-10 sm:hidden" />
            <button onClick={closeModal} className="absolute top-10 right-10 p-2 text-white/20"><X size={22} /></button>
            <div className="text-left">
              <div className="flex items-center gap-2 mb-2"><Zap size={14} className="text-cyan-400" /><span className="text-cyan-500 font-brand text-[9px] font-bold uppercase tracking-[0.4em]">{selectedProject.tag}</span></div>
              <h2 className="text-3xl font-black mb-10 uppercase tracking-tighter leading-tight">{selectedProject.title}</h2>
              <div className="space-y-6 pb-12">
                <section><h4 className="text-[9px] font-brand tracking-[0.2em] uppercase font-bold text-white/30 mb-2 border-l-2 border-cyan-500 pl-3">Goal</h4><p className="text-sm font-light text-white/70 leading-relaxed pl-4">{selectedProject.goal}</p></section>
                <section><h4 className="text-[9px] font-brand tracking-[0.2em] uppercase font-bold text-white/30 mb-2 border-l-2 border-cyan-500 pl-3">Process</h4><p className="text-sm font-light text-white/70 leading-relaxed pl-4">{selectedProject.process}</p></section>
                <section><h4 className="text-[9px] font-brand tracking-[0.2em] uppercase font-bold text-white/30 mb-2 border-l-2 border-cyan-500 pl-3">Result</h4><p className="text-sm font-light text-white/70 leading-relaxed pl-4">{selectedProject.result}</p></section>
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