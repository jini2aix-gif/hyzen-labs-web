import React, { useState, useEffect, useRef } from 'react';
import { 
  Github, 
  Linkedin, 
  Mail, 
  ChevronRight, 
  Cpu, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  X, 
  Share2, 
  Activity,
  Box,
  BrainCircuit,
  Zap,
  User
} from 'lucide-react';

/**
 * [Hyzen Labs. CTO Optimized - R0.9.8.5 Stability Fix]
 * 1. 이미지 로드 컴파일 에러 해결 (import 대신 경로 문자열 사용)
 * 2. 히어로 워딩: ME, REALITY, AND AI
 * 3. 비전 슬로건: 한 줄 구성 (Grounded in Reality, Augmented by Intelligence)
 * 4. 로드맵 상태: "In Preparation" (준비중)
 */

// --- [시각화 컴포넌트: Convergence Engine] ---
const ConvergenceEngine = () => {
  return (
    <div className="relative w-full h-[300px] flex items-center justify-center overflow-hidden">
      {/* Intelligence Network */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-48 h-48 border border-cyan-500/20 rounded-full animate-[spin_15s_linear_infinite]" />
        <div className="w-64 h-64 border border-violet-500/10 rounded-full animate-[spin_25s_linear_infinite_reverse]" />
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <div 
            key={i}
            className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]"
            style={{
              transform: `rotate(${angle}deg) translate(100px) rotate(-${angle}deg)`,
              animation: `pulse 2s infinite ${i * 0.4}s`
            }}
          />
        ))}
      </div>

      {/* Reality Core */}
      <div className="relative z-10 w-24 h-24 bg-gradient-to-br from-zinc-800 to-black rounded-3xl border border-white/20 flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,1)]">
        <Box size={32} className="text-white opacity-80" />
        <div className="absolute inset-0 border border-cyan-500/40 rounded-3xl animate-[ping_3s_infinite]" />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1) rotate(var(--tw-rotate)) translate(100px) rotate(calc(-1 * var(--tw-rotate))); }
          50% { opacity: 1; transform: scale(1.5) rotate(var(--tw-rotate)) translate(100px) rotate(calc(-1 * var(--tw-rotate))); }
        }
      `}</style>
    </div>
  );
};

const App = () => {
  const [activeView, setActiveView] = useState('roadmap');
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // 컴파일 에러 방지를 위해 이미지 경로를 상수로 관리
  // VS Code 환경의 src/assets/yj.png 파일을 가리킵니다.
  const founderImgSrc = "/src/assets/yj.png";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const projects = [
    {
      id: 1,
      tag: "Visual Synthesis",
      title: "잠재적 공간의 초상",
      desc: "매니페스토에서 강조한 '유한한 직관'을 AI 데이터로 변환하여 생성한 추상적 비주얼 실험.",
      goal: "인간의 무의식적인 시각적 직관을 수치화하여 AI 모델의 잠재 공간(Latent Space)과 연결합니다.",
      process: "SDXL과 커스텀 LoRA를 활용하여 현실의 질감을 AI 생성물에 이식하는 워크플로우 개발.",
      result: "AI가 생성한 이미지에서 '기계적 차가움'을 걷어내고 '인간적 직관'의 흔적을 발견함."
    },
    {
      id: 2,
      tag: "Spatial Computing",
      title: "물리적 공간의 디지털 증강",
      desc: "현실 오브젝트를 인식하여 AI가 실시간으로 정보를 오버레이하는 AR 시각화 엔진 프로토타입.",
      goal: "현실 세계의 사물을 AI가 이해하고 인간에게 새로운 인터페이스를 제공하는 것을 목표로 합니다.",
      process: "On-device AI 비전 모델을 활용한 객체 감지 및 공간 좌표계 매핑 기술 적용.",
      result: "사물과 디지털 정보의 이질감을 최소화하는 하이퍼-리얼리스틱 렌더링 기술 확보."
    }
  ];

  const roadmapSteps = [
    { phase: "Phase 01", title: "Reality Grounding", status: "In Preparation", icon: <Cpu className="w-5 h-5 text-cyan-400" /> },
    { phase: "Phase 02", title: "Intelligence Augmentation", status: "In Preparation", icon: <BrainCircuit className="w-5 h-5 text-violet-400" /> },
    { phase: "Phase 03", title: "Seamless Convergence", status: "Upcoming", icon: <Layers className="w-5 h-5 text-amber-400" /> }
  ];

  const openModal = (project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = 'auto';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 overflow-x-hidden font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Michroma&family=Orbitron:wght@400;700;900&family=JetBrains+Mono&display=swap');
        .font-brand { font-family: 'Orbitron', sans-serif; }
        .font-title { font-family: 'Michroma', sans-serif; }
        .glass-panel { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); }
        ::-webkit-scrollbar { display: none; }
        .safe-pb { padding-bottom: env(safe-area-inset-bottom); }
        .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 w-full z-[1000] transition-all duration-500 px-6 py-5 ${isScrolled ? 'glass-panel border-b border-white/10' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex flex-col">
            <span className="font-brand text-[10px] tracking-[0.4em] text-cyan-400 font-black uppercase leading-none">Hyzen Labs.</span>
            <span className="text-[8px] opacity-20 mt-1 uppercase tracking-widest font-brand font-bold text-white">Me, Reality, and AI</span>
          </div>
          <button className="p-2 bg-white/5 rounded-full border border-white/10 active:scale-90 transition-transform">
            <Share2 size={16} className="text-white/40" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-16 px-8 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-[500px] bg-radial-gradient from-cyan-500/5 via-transparent to-transparent opacity-50 pointer-events-none -z-10" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/5 border border-cyan-500/20 mb-10 animate-fade-in">
          <Sparkles size={10} className="text-cyan-400" />
          <span className="text-[8px] font-brand tracking-[0.4em] uppercase text-cyan-400 font-bold">Release Candidate 0.9.8.5</span>
        </div>

        <h1 className="text-[10vw] sm:text-7xl font-title tracking-tighter leading-tight mb-10 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent uppercase">
          ME, REALITY,<br/>AND AI
        </h1>
        
        <div className="w-full overflow-hidden mb-16 px-4">
          <p className="text-[3.1vw] sm:text-base text-cyan-400/80 leading-none tracking-[0.12em] font-brand font-black uppercase whitespace-nowrap">
            Grounded in Reality, Augmented by Intelligence
          </p>
        </div>

        <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      </section>

      {/* Founder Profile Section */}
      <section className="px-8 pb-20 flex flex-col items-center animate-fade-in">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          
          <div className="relative w-28 h-28 rounded-full border border-white/10 overflow-hidden glass-panel shadow-2xl bg-zinc-900 flex items-center justify-center">
            <img 
              src={founderImgSrc} 
              alt="Founder Youngji.Park"
              loading="lazy"
              className="w-full h-full object-cover grayscale brightness-90 hover:grayscale-0 transition-all duration-700 ease-in-out scale-105"
              onError={(e) => {
                // 이미지 로드 실패 시 대체 아이콘 표시 (공백 방지)
                e.target.style.display = 'none';
                const container = e.target.parentElement;
                if (container && !container.querySelector('.placeholder-icon')) {
                  const iconDiv = document.createElement('div');
                  iconDiv.className = "placeholder-icon text-white/20";
                  iconDiv.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
                  container.appendChild(iconDiv);
                }
              }}
            />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1 bg-[#050505] rounded-full border border-cyan-500/30">
            <Sparkles size={10} className="text-cyan-400 animate-pulse" />
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-1.5 text-center">
          <span className="text-[9px] font-brand tracking-[0.4em] text-cyan-400 font-black uppercase font-bold">Founder</span>
          <h3 className="text-sm sm:text-lg font-title tracking-tight text-white/90 font-bold">Youngji.Park</h3>
          <div className="w-10 h-[1px] bg-white/10 mt-2"></div>
        </div>
      </section>

      {/* View Switcher */}
      <div className="sticky top-20 z-[900] px-6 mb-12">
        <div className="glass-panel p-1 rounded-2xl flex gap-1 shadow-2xl">
          <button 
            onClick={() => setActiveView('roadmap')}
            className={`flex-1 py-4 rounded-xl text-[9px] font-brand tracking-widest transition-all ${activeView === 'roadmap' ? 'bg-cyan-500 text-black font-black' : 'text-white/30'}`}
          >
            ROADMAP
          </button>
          <button 
            onClick={() => setActiveView('works')}
            className={`flex-1 py-4 rounded-xl text-[9px] font-brand tracking-widest transition-all ${activeView === 'works' ? 'bg-violet-500 text-black font-black' : 'text-white/30'}`}
          >
            WORKS
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      <main className="px-6 max-w-7xl mx-auto pb-32">
        {activeView === 'roadmap' ? (
          <div className="space-y-12 animate-fade-in">
            <div className="grid gap-3">
              {roadmapSteps.map((step, idx) => (
                <div key={idx} className="glass-panel p-5 rounded-[2rem] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                      {step.icon}
                    </div>
                    <div>
                      <span className="text-[8px] font-brand text-white/20 tracking-widest uppercase font-bold">{step.phase}</span>
                      <h3 className="text-xs font-bold tracking-tight">{step.title}</h3>
                    </div>
                  </div>
                  <div className={`text-[6px] font-brand px-2 py-0.5 rounded border ${step.status === 'In Preparation' ? 'border-cyan-500/50 text-cyan-400' : 'border-white/5 text-white/10'}`}>
                    {step.status}
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-panel p-10 rounded-[3.5rem] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
              <div className="flex flex-col mb-4 text-center">
                <h3 className="text-[10px] font-brand tracking-[0.4em] text-white/40 uppercase mb-2">Convergence Engine</h3>
                <p className="text-[8px] text-cyan-400/60 uppercase tracking-[0.2em] font-brand font-bold italic">Vision Sync Profile</p>
              </div>
              <ConvergenceEngine />
              <p className="mt-8 text-center text-[9px] text-white/20 font-brand tracking-[0.3em] leading-relaxed uppercase">
                Real-time synchronization of<br/>
                Physical environments & Intelligence layers
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 animate-fade-in">
            {projects.map(project => (
              <div 
                key={project.id} 
                className="glass-panel p-10 rounded-[3rem] relative overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => openModal(project)}
              >
                <div className="absolute top-0 right-0 p-6 opacity-20">
                  <ArrowRight size={20} className="text-cyan-400" />
                </div>
                <span className="text-cyan-500 font-brand text-[9px] font-bold uppercase mb-4 block tracking-widest">{project.tag}</span>
                <h3 className="text-xl font-black mb-4 uppercase tracking-tighter leading-tight">{project.title}</h3>
                <p className="text-white/40 text-[10px] leading-relaxed font-light">{project.desc}</p>
                <div className="mt-8 flex items-center gap-2 text-[9px] font-brand text-cyan-400 uppercase tracking-widest font-bold">
                  자세히 보기 <ChevronRight size={12} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Project Modal */}
      {isModalOpen && selectedProject && (
        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-4 animate-fade-in" onClick={closeModal}>
          <div className="w-full h-[85vh] sm:h-auto sm:max-w-xl glass-panel rounded-t-[3.5rem] sm:rounded-[3.5rem] p-10 relative overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-10 sm:hidden" />
            <button onClick={closeModal} className="absolute top-10 right-10 p-2 text-white/20 hover:text-white transition-colors">
              <X size={20} />
            </button>
            <div className="text-left">
              <span className="text-cyan-500 font-brand text-[9px] font-bold uppercase mb-4 block tracking-widest">{selectedProject.tag}</span>
              <h2 className="text-3xl font-black mb-12 uppercase tracking-tighter">{selectedProject.title}</h2>
              
              <div className="space-y-10 pb-10">
                <div className="space-y-3">
                  <h4 className="text-[9px] font-brand tracking-[0.3em] text-white/20 uppercase font-black font-bold">Goal</h4>
                  <p className="text-[13px] font-light text-white/70 leading-relaxed">{selectedProject.goal}</p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-[9px] font-brand tracking-[0.3em] text-white/20 uppercase font-black font-bold">Process</h4>
                  <p className="text-[13px] font-light text-white/70 leading-relaxed">{selectedProject.process}</p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-[9px] font-brand tracking-[0.3em] text-white/20 uppercase font-black font-bold">Result</h4>
                  <p className="text-[13px] font-light text-white/70 leading-relaxed">{selectedProject.result}</p>
                </div>
              </div>

              <div className="border-t border-white/5 pt-10 safe-pb">
                <button className="w-full bg-cyan-500 text-black py-5 rounded-2xl font-brand text-[10px] font-black tracking-widest active:scale-95 transition-transform uppercase">
                  Launch Case Study
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-20 text-center safe-pb border-t border-white/5 mx-6">
        <div className="flex flex-col items-center gap-8">
          <div className="flex gap-10 opacity-30">
            <Github size={18} />
            <Linkedin size={18} />
            <Mail size={18} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="font-brand text-[9px] tracking-[0.5em] uppercase font-black opacity-20 italic font-bold">Hyzen Labs. RC-0.9.8.5</span>
            <p className="text-[7px] font-brand tracking-[0.2em] font-bold uppercase opacity-5">© 2026 Designed by Jin & Park</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;