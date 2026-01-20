import React, { useState, useEffect, useRef } from 'react';
import { 
  Github, 
  Linkedin, 
  Mail, 
  ExternalLink, 
  ChevronRight, 
  Code, 
  Palette, 
  TrendingUp,
  Monitor,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Chart, registerables } from 'chart.js';

// Chart.js Plugins Registration
Chart.register(...registerables);

const App = () => {
  const [activeView, setActiveView] = useState('roadmap');
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Project Data v0.3
  const projects = [
    {
      id: 1,
      tag: "Visual Synthesis",
      title: "잠재적 공간의 초상",
      desc: "매니페스토에서 강조한 '유한한 직관'을 AI 데이터로 변환하여 생성한 추상적 비주얼 실험.",
      goal: "인간의 무의식적인 시각적 직관을 수치화하여 AI 모델의 잠재 공간(Latent Space)과 연결합니다.",
      process: "SDXL과 자체 파인튜닝된 가중치를 사용하여 현실의 질감이 살아있는 이미지를 생성했습니다.",
      result: "기존의 무작위적인 생성물과 차별화된 작가 고유의 미학적 질서가 담긴 합성 시각 언어 구축.",
      notes: ["Model: SDXL Custom", "Token: Reality-V1", "Seed: 1,200 samples"]
    },
    {
      id: 2,
      tag: "UX Architecture",
      title: "지능형 인터페이스",
      desc: "'기술의 지능'을 수용하여 사용자의 의도를 예측하고 가변하는 적응형 레이아웃 설계.",
      goal: "고정된 레이아웃에서 벗어나 사용자의 맥락에 따라 인터페이스 스스로 조형을 변경하는 지능형 도구 제안.",
      process: "사용자 로그 데이터를 LLM이 실시간 분석하여 최적화된 레이아웃 프롬프트를 생성하고 렌더링합니다.",
      result: "정적인 웹페이지를 넘어 사용자와 실시간으로 대화하고 진화하는 유동적 인터페이스 엔진 구현.",
      notes: ["LLM: GPT-4o Integration", "Library: Tailwind Dynamic", "Latency: < 400ms"]
    },
    {
      id: 3,
      tag: "Material Study",
      title: "물질과 비물질의 경계",
      desc: "'현실의 질감'을 데이터화하여 AI 텍스처 합성을 통해 구현한 초현실적 오브젝트.",
      goal: "현실의 물리적 한계를 디지털에서 해체하고 AI를 통해 재정의된 '새로운 물질성'을 탐구합니다.",
      process: "금속, 유리, 스톤의 고해상도 촬영 데이터를 뉴럴 텍스처 합성 기술로 교차 융합했습니다.",
      result: "현실과 가상 사이의 심미적 간극을 좁히고 AI가 제안하는 새로운 조형의 가능성 입증.",
      notes: ["Engine: Unreal Engine 5", "Output: 8K High Fidelity", "Tech: Neural Synth"]
    }
  ];

  // Radar Chart Initialization
  useEffect(() => {
    if (activeView === 'archive') {
      const ctx = document.getElementById('growthRadarChart');
      if (ctx) {
        if (chartRef.current) chartRef.current.destroy();
        chartRef.current = new Chart(ctx, {
          type: 'radar',
          data: {
            labels: ['PROMPT', 'AESTHETIC', 'LOGIC', 'INTUITION', 'DATA'],
            datasets: [{
              data: [95, 85, 90, 75, 85],
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              borderColor: '#06b6d4',
              borderWidth: 2,
              pointBackgroundColor: '#06b6d4',
              pointBorderColor: '#fff',
              pointRadius: 5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              r: {
                angleLines: { color: 'rgba(255,255,255,0.1)' },
                grid: { color: 'rgba(255,255,255,0.1)' },
                suggestedMin: 0, suggestedMax: 100,
                ticks: { display: false },
                pointLabels: { font: { size: 11, family: 'Orbitron', weight: 'bold' }, color: '#94a3b8' }
              }
            },
            plugins: { legend: { display: false } }
          }
        });
      }
    }
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [activeView]);

  const openModal = (p) => { setSelectedProject(p); setIsModalOpen(true); document.body.style.overflow = 'hidden'; };
  const closeModal = () => { setIsModalOpen(false); document.body.style.overflow = 'auto'; };

  return (
    <div className="bg-[#050505] text-white min-h-screen font-sans selection:bg-cyan-500/30">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;900&family=Syncopate:wght@400;700&display=swap');
        .font-brand { font-family: 'Orbitron', sans-serif; }
        .font-tech { font-family: 'Syncopate', sans-serif; }
        .reveal-text { animation: reveal 2.2s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        @keyframes reveal {
          0% { transform: translateY(40px); opacity: 0; filter: blur(20px); }
          100% { transform: translateY(0); opacity: 1; filter: blur(0); }
        }
        .ai-text-glow { text-shadow: 0 0 40px rgba(6, 182, 212, 0.9), 0 0 10px rgba(6, 182, 212, 0.4); }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); }
      `}</style>

      {/* Ambient Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-cyan-500/10 blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[100px] animate-pulse"></div>
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${isScrolled ? 'bg-black/80 backdrop-blur-2xl py-4 border-b border-white/5' : 'bg-transparent py-8'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => setActiveView('roadmap')}>
            <span className="font-brand font-black text-xl tracking-tighter">
              <span className="text-cyan-500">H</span>YZEN LABS.
            </span>
          </div>
          <div className="hidden md:flex space-x-12 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
            <button onClick={() => setActiveView('roadmap')} className={`hover:text-white transition-colors ${activeView === 'roadmap' ? 'text-cyan-400' : ''}`}>Vision</button>
            <button onClick={() => setActiveView('archive')} className={`hover:text-white transition-colors ${activeView === 'archive' ? 'text-cyan-400' : ''}`}>Archive</button>
          </div>
          <a href="mailto:jini2aix@gmail.com" className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-cyan-500 transition-all">
            <Mail size={16} />
          </a>
        </div>
      </nav>

      {activeView === 'roadmap' ? (
        <main className="reveal-text">
          {/* Hero */}
          <section className="h-screen flex flex-col items-center justify-center px-6 text-center">
            <span className="font-tech text-cyan-500 text-[9px] font-bold tracking-[0.6em] mb-12 opacity-80 uppercase tracking-widest">Me, Reality, and AI</span>
            <h1 className="text-5xl md:text-8xl lg:text-[8.5rem] tracking-tighter leading-none mb-16 font-brand font-black">
              REALITY<br/>
              <span className="text-white/20 font-light italic tracking-[0.2em] text-[0.4em]">ME'S</span> <span className="text-cyan-500 ai-text-glow">AI</span>
            </h1>
            <p className="text-sm md:text-lg text-white/40 max-w-xl mx-auto font-light leading-relaxed">
              기술이 감각을 넘어서는 순간을 기록합니다. <br/>
              논리와 직관이 교차하는 지점에서 탄생한 나만의 새로운 창작 문법.
            </p>
          </section>

          {/* Manifesto */}
          <section id="manifesto" className="min-h-screen flex items-center justify-center bg-white text-black px-8 py-32">
            <div className="max-w-4xl w-full text-left">
              <h2 className="font-brand text-4xl sm:text-6xl font-black mb-20 tracking-tighter">THE MANIFESTO</h2>
              <div className="grid md:grid-cols-2 gap-20 text-lg leading-relaxed font-light">
                <p>
                  <span className="text-cyan-600 font-bold">Hyzen Labs</span>는 단순히 <strong>AI를 도구로 사용하는 것</strong>에 그치지 않습니다. 우리는 인공지능이 제시하는 <strong>무한한 연산</strong>과 인간이 가진 <strong>유한한 직관</strong>이 충돌할 때 발생하는 <strong>'의외성'</strong>에 주목합니다.
                </p>
                <p className="text-black/40">
                  이 공간은 그 충돌의 결과물을 담아내는 <strong>아카이브</strong>이자, 미래의 창의성을 설계하는 <strong>실험실</strong>입니다. 우리는 <strong>현실의 질감</strong>을 잃지 않으면서 <strong>기술의 지능</strong>을 기꺼이 수용합니다.
                </p>
              </div>
              <div className="mt-24 border-t border-black/10 pt-12 flex flex-col gap-2">
                <span className="font-brand text-[10px] text-black/30 uppercase tracking-widest">Build Version 0.3</span>
                <span className="font-brand text-sm font-black tracking-widest text-cyan-600 uppercase">Founder Young Ji. Park</span>
              </div>
            </div>
          </section>

          {/* Pipeline */}
          <section className="py-32 bg-zinc-900 border-y border-white/5 text-left">
            <div className="max-w-7xl mx-auto px-8">
                <h2 className="font-brand text-cyan-500 text-[10px] font-bold tracking-[0.4em] uppercase mb-12">Workflow</h2>
                <h3 className="text-4xl sm:text-5xl font-black mb-16 tracking-tighter">Convergence Pipeline</h3>
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { icon: <Monitor size={24}/>, num: "01", title: "Context Extraction", body: "현실의 질감을 AI가 이해할 수 있는 고해상도 데이터로 치환합니다." },
                        { icon: <Cpu size={24}/>, num: "02", title: "AI Augmentation", body: "추출된 데이터를 바탕으로 수천 개의 시각적 변주를 생성하고 연산합니다." },
                        { icon: <Layers size={24}/>, num: "03", title: "Human Synthesis", body: "인간의 감각 필터로 최종 산출물을 선별하고 완성합니다." }
                    ].map(step => (
                        <div key={step.num} className="glass-panel p-10 group hover:border-cyan-500/50 transition-all rounded-[2rem]">
                            <div className="text-cyan-500 mb-8 opacity-40 group-hover:opacity-100 transition-opacity">{step.icon}</div>
                            <span className="font-brand text-3xl text-white/5 block mb-4 font-black">{step.num}</span>
                            <h4 className="text-xl font-bold mb-4 text-white group-hover:text-cyan-400 transition-colors">{step.title}</h4>
                            <p className="text-sm text-white/40 leading-relaxed font-light">{step.body}</p>
                        </div>
                    ))}
                </div>
            </div>
          </section>
        </main>
      ) : (
        <main className="pt-32 reveal-text max-w-7xl mx-auto px-8 pb-32">
          {/* Archive Grid */}
          <div className="flex justify-between items-end mb-24 text-left">
            <div>
              <h2 className="font-brand text-4xl sm:text-5xl font-black uppercase tracking-tighter">Synthetic Artifacts</h2>
              <p className="text-white/30 text-sm mt-4">매니페스토가 실현된 기술과 감각의 교차점들</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-12 text-left">
            {projects.map(p => (
              <div key={p.id} className="group cursor-pointer" onClick={() => openModal(p)}>
                <div className="aspect-[16/10] glass-panel rounded-[2.5rem] mb-8 border border-white/10 group-hover:border-cyan-500/50 transition-all flex items-center justify-center relative overflow-hidden">
                   <Sparkles className="text-white/5 group-hover:text-cyan-500/20" size={40} />
                </div>
                <span className="text-cyan-500 font-brand text-[10px] font-bold uppercase tracking-widest">{p.tag}</span>
                <h4 className="text-2xl font-bold mt-2 group-hover:text-cyan-400 transition-colors uppercase tracking-tighter">{p.title}</h4>
                <p className="text-sm text-white/30 mt-4 font-light leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          {/* Radar Chart */}
          <div className="mt-40 bg-white/5 p-10 rounded-[3rem] border border-white/10 lg:grid lg:grid-cols-2 gap-20 items-center text-left">
              <div>
                <h2 className="font-brand text-cyan-600 text-[10px] font-bold tracking-[0.6em] uppercase mb-10">Capabilities</h2>
                <h3 className="text-4xl sm:text-5xl font-black mb-10 tracking-tighter leading-tight">데이터와 예술의 <br/>교차점 분석.</h3>
                <p className="text-white/30 font-light leading-relaxed mb-8">Hyzen Labs는 기술적 완성도와 미적 직관의 밸런스를 측정합니다. 기계의 연산력과 인간의 감각이 결합된 하이브리드 지표입니다.</p>
              </div>
              <div className="h-[350px]"><canvas id="growthRadarChart"></canvas></div>
          </div>
        </main>
      )}

      {/* Modal */}
      {isModalOpen && selectedProject && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4" onClick={closeModal}>
          <div className="max-w-4xl w-full glass-panel rounded-[3rem] p-10 relative overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={closeModal} className="absolute top-8 right-10 text-white/20 hover:text-white text-4xl">&times;</button>
            <div className="text-left">
              <span className="text-cyan-500 font-brand text-[10px] font-bold uppercase mb-4 block tracking-widest">{selectedProject.tag}</span>
              <h2 className="text-4xl font-black mb-10 uppercase tracking-tighter">{selectedProject.title}</h2>
              <div className="text-white/60 space-y-6 font-light">
                <p><strong>GOAL:</strong> {selectedProject.goal}</p>
                <p><strong>PROCESS:</strong> {selectedProject.process}</p>
                <p><strong>RESULT:</strong> {selectedProject.result}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="py-20 text-center opacity-20 border-t border-white/5">
        <span className="font-brand text-xs tracking-[0.5em] uppercase">Hyzen Labs. Archive</span>
      </footer>
    </div>
  );
};

export default App;