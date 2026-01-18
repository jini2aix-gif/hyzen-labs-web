import React, { useState, useEffect } from 'react';
import { 
  Github, 
  Linkedin, 
  Mail, 
  ExternalLink, 
  ChevronRight, 
  Code, 
  Palette, 
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { Chart, registerables } from 'chart.js';

// Chart.js 플러그인 등록
Chart.register(...registerables);

const App = () => {
  const [activeView, setActiveView] = useState('roadmap');
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // 스크롤 감지 및 네비게이션 스타일 변경
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 프로젝트 데이터 (v0.3 상세 버전)
  const projects = [
    {
      id: 1,
      tag: "Visual Synthesis",
      title: "잠재적 공간의 초상",
      desc: "매니페스토에서 강조한 '유한한 직관'을 AI 데이터로 변환하여 생성한 추상적 비주얼 실험.",
      goal: "인간의 무의식적인 시각적 직관을 수치화하여 AI 모델의 잠재 공간(Latent Space)과 연결합니다.",
      process: "스테이블 디퓨전과 자체 파인튜닝된 가중치를 사용하여, 현실의 질감이 살아있으면서도 기하학적인 의외성을 갖춘 이미지를 생성했습니다.",
      result: "기존의 무작위적인 생성물과 차별화된, 작가 고유의 미학적 질서가 담긴 합성 시각 언어를 구축했습니다.",
      notes: ["Model: Stable Diffusion XL Custom", "Token: Reality-V1", "Seed Filtering: 1,200 samples"]
    },
    {
      id: 2,
      tag: "UX Architecture",
      title: "지능형 인터페이스",
      desc: "'기술의 지능'을 수용하여 사용자의 의도를 예측하고 가변하는 적응형 레이아웃 설계.",
      goal: "고정된 레이아웃에서 벗어나, 사용자의 맥락에 따라 인터페이스 스스로 조형을 변경하는 '지능형 도구'를 제안합니다.",
      process: "사용자의 시선 흐름과 클릭 로그 데이터를 LLM이 실시간 분석하여 최적화된 레이아웃 프롬프트를 생성하고 렌더링합니다.",
      result: "정적인 웹페이지를 넘어, 사용자와 실시간으로 대화하고 진화하는 유동적 인터페이스 엔진을 구현했습니다.",
      notes: ["LLM: GPT-4o Integration", "Library: Tailwind Dynamic Engine", "Latency: < 400ms"]
    },
    {
      id: 3,
      tag: "Material Study",
      title: "물질과 비물질의 경계",
      desc: "'현실의 질감'을 데이터화하여 AI 텍스처 합성을 통해 구현한 초현실적 오브젝트.",
      goal: "현실의 물리적 한계를 디지털에서 해체하고, AI를 통해 재정의된 '새로운 물질성'을 탐구합니다.",
      process: "금속, 유리, 스톤의 고해상도 매크로 촬영 데이터를 뉴럴 텍스처 합성 기술로 교차 융합했습니다.",
      result: "현실과 가상 사이의 심미적 간극을 좁히고, AI가 제안하는 새로운 조형의 가능성을 입증했습니다.",
      notes: ["Engine: Unreal Engine 5", "Processing: Neural Synthesis", "Output: 8K High Fidelity"]
    }
  ];

  // 레이더 차트 초기화 (Archive 뷰 진입 시)
  useEffect(() => {
    if (activeView === 'archive') {
      const ctx = document.getElementById('growthRadarChart');
      if (ctx) {
        const chart = new Chart(ctx, {
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
        return () => chart.destroy();
      }
    }
  }, [activeView]);

  const openModal = (project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = 'auto';
  };

  const copyPageLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      const toast = document.getElementById('copy-toast');
      if (toast) {
        toast.style.display = 'block';
        toast.style.opacity = '1';
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => { toast.style.display = 'none'; }, 500);
        }, 2000);
      }
    });
  };

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
      `}</style>

      {/* Ambient Background Particles */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-cyan-500/10 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '-5s' }}></div>
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${isScrolled ? 'bg-black/80 backdrop-blur-2xl py-4 border-b border-white/5' : 'bg-transparent py-8'}`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 flex justify-between items-center">
          <div className="flex items-center" onClick={() => setActiveView('roadmap')}>
            <span className="font-brand font-black text-lg sm:text-xl tracking-tighter cursor-pointer">
              <span className="text-cyan-500">H</span>YZEN LABS<span className="text-cyan-500">.</span>
            </span>
          </div>
          <div className="hidden md:flex space-x-12 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
            <button onClick={() => setActiveView('roadmap')} className="hover:text-white transition-colors">Vision</button>
            <button onClick={() => document.getElementById('manifesto')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">Philosophy</button>
            <button onClick={() => setActiveView('archive')} className="hover:text-white transition-colors">Archive</button>
          </div>
          <div className="flex items-center space-x-4">
            <a href="mailto:jini2aix@gmail.com" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-cyan-500 hover:text-white transition-all text-sm">✉</a>
            <button onClick={copyPageLink} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-cyan-500 hover:text-white transition-all text-sm">🔗</button>
          </div>
        </div>
      </nav>

      {activeView === 'roadmap' ? (
        <main className="reveal-text">
          {/* Hero Section */}
          <section className="h-screen flex flex-col items-center justify-center px-6 text-center">
            <span className="font-tech text-cyan-500 text-[9px] font-bold tracking-[0.6em] uppercase mb-12 opacity-80">ME, REALITY, AND AI</span>
            <h1 className="text-4xl sm:text-7xl md:text-8xl lg:text-[8.5rem] tracking-tighter leading-none mb-16">
              <span className="font-tech font-bold uppercase">Reality</span><br/>
              <span className="text-[0.35em] text-white/40 italic font-light tracking-[0.4em]">ME's</span><br className="sm:hidden" />
              <span className="font-brand font-black ai-text-glow ml-2">AI</span>
            </h1>
            <p className="text-sm sm:text-lg text-white/30 max-w-xl mx-auto font-light leading-relaxed">
              기술이 감각을 넘어서는 순간을 기록합니다. <br/>
              논리와 직관이 교차하는 지점에서 탄생한 나만의 새로운 창작 문법.
            </p>
          </section>

          {/* Manifesto Section */}
          <section id="manifesto" className="min-h-screen flex items-center justify-center bg-white text-black px-8 py-32">
            <div className="max-w-4xl w-full text-left">
              <h2 className="font-brand text-4xl sm:text-6xl font-black mb-20 tracking-tighter">THE MANIFESTO</h2>
              <div className="grid md:grid-cols-2 gap-20 text-lg leading-relaxed font-light">
                <p>
                  <span className="text-cyan-500 font-bold">Hyzen Labs</span>는 단순히 <strong>AI를 도구로 사용하는 것</strong>에 그치지 않습니다. 우리는 인공지능이 제시하는 <strong>무한한 연산</strong>과 인간이 가진 <strong>유한한 직관</strong>이 충돌할 때 발생하는 <strong>'의외성'</strong>에 주목합니다.
                </p>
                <p className="text-black/40">
                  이 공간은 그 충돌의 결과물을 담아내는 <strong>아카이브</strong>이자, 미래의 창의성을 설계하는 <strong>실험실</strong>입니다. 우리는 <strong>현실의 질감</strong>을 잃지 않으면서 <strong>기술의 지능</strong>을 기꺼이 수용합니다.
                </p>
              </div>
              <div className="mt-24 border-t border-black/10 pt-12 flex flex-col gap-2">
                <span className="font-brand text-[10px] text-black/30 uppercase tracking-widest">Build Version 0.1</span>
                <span className="font-brand text-sm font-black tracking-widest text-cyan-600 uppercase">Founder Young Ji. Park</span>
              </div>
            </div>
          </section>

          {/* Convergence Pipeline Section */}
          <section className="py-32 bg-zinc-900 border-y border-white/5">
            <div className="max-w-7xl mx-auto px-8 text-left">
                <h2 className="font-brand text-cyan-500 text-[10px] font-bold tracking-[0.4em] uppercase mb-10">Workflow</h2>
                <h3 className="text-4xl sm:text-5xl font-black mb-16 tracking-tighter">Convergence Pipeline</h3>
                <div className="grid md:grid-cols-3 gap-12">
                    {[
                        { num: "01", title: "Context Extraction", body: "현실의 질감을 데이터로 추출합니다. AI가 이해할 수 있는 벡터 데이터로 변환하는 단계입니다." },
                        { num: "02", title: "AI Augmentation", body: "추출된 데이터에 무한한 연산을 더합니다. LLM과 Diffusion 모델을 통해 수천 개의 변주를 생성합니다." },
                        { num: "03", title: "Human Synthesis", body: "마지막은 유한한 직관의 선택입니다. 인간의 감각으로 최종 디테일을 다듬어 완성합니다." }
                    ].map(step => (
                        <div key={step.num} className="border-l border-white/10 p-8 hover:bg-cyan-500/5 transition-all group">
                            <span className="font-brand text-4xl text-white/10 block mb-6 group-hover:text-cyan-500/20 transition-colors">{step.num}</span>
                            <h4 className="text-xl font-bold mb-4 text-cyan-400">{step.title}</h4>
                            <p className="text-sm text-white/50 leading-relaxed font-light">{step.body}</p>
                        </div>
                    ))}
                </div>
            </div>
          </section>
        </main>
      ) : (
        <main className="pt-32 reveal-text">
          {/* Archive View */}
          <section className="max-w-7xl mx-auto px-8 pb-32">
            <div className="flex justify-between items-end mb-24 text-left">
              <div>
                <h2 className="font-brand text-4xl sm:text-5xl font-black uppercase tracking-tighter">Synthetic Artifacts</h2>
                <p className="text-white/30 text-sm mt-4 italic">매니페스토가 실현된 기술과 감각의 교차점들</p>
              </div>
              <span className="hidden sm:block text-[10px] border border-white/10 px-5 py-2 rounded-full text-white/30 uppercase tracking-widest">Selected Works</span>
            </div>
            <div className="grid md:grid-cols-3 gap-12 sm:gap-16 text-left">
              {projects.map(p => (
                <div key={p.id} className="group cursor-pointer" onClick={() => openModal(p)}>
                  <div className="aspect-[16/10] bg-white/5 rounded-3xl mb-8 border border-white/10 group-hover:border-cyan-500/50 transition-all flex items-center justify-center overflow-hidden relative">
                    <span className="text-white/10 font-brand text-[10px] tracking-widest uppercase">[Project {p.id} Preview]</span>
                    <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/5 transition-colors"></div>
                  </div>
                  <span className="text-cyan-500 font-brand text-[10px] font-bold tracking-widest uppercase">{p.tag}</span>
                  <h4 className="text-xl font-bold mt-2 group-hover:text-cyan-400 transition-colors">{p.title}</h4>
                  <p className="text-sm text-white/30 mt-4 font-light leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Radar Chart Section */}
          <section className="py-32 bg-black/40 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-8 lg:grid lg:grid-cols-2 gap-40 items-center text-left">
              <div>
                <h2 className="font-brand text-cyan-600 text-[10px] font-bold tracking-[0.4em] uppercase mb-10">Capabilities</h2>
                <h3 className="text-4xl sm:text-5xl font-black mb-10 leading-tight tracking-tighter">데이터와 예술의 <br/>교차점 분석.</h3>
                <p className="text-white/30 font-light leading-relaxed mb-8">Hyzen Labs는 기술적 완성도와 미적 직관의 밸런스를 측정합니다. 인간의 감각과 기계의 연산력을 결합한 지표입니다.</p>
                <div className="space-y-4">
                  {['PROMPT ENG.', 'AESTHETIC SENSE', 'LOGICAL DATA'].map(skill => (
                    <div key={skill} className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-white/40">{skill}</span>
                        <span className="text-xs text-cyan-500 font-brand">90%+</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white/5 p-8 sm:p-16 rounded-[3rem] border border-white/10 shadow-2xl">
                <div className="h-[320px]"><canvas id="growthRadarChart"></canvas></div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Detail Modal */}
      {isModalOpen && selectedProject && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4" onClick={closeModal}>
          <div className="max-w-5xl w-full bg-zinc-900 border border-white/10 rounded-[3rem] p-8 sm:p-16 relative overflow-y-auto max-h-[90vh] shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={closeModal} className="absolute top-8 right-8 text-white/20 hover:text-white text-4xl font-light">&times;</button>
            <div className="grid lg:grid-cols-12 gap-12 text-left">
              <div className="lg:col-span-7">
                <span className="text-cyan-500 font-brand text-[10px] font-bold uppercase mb-6 block tracking-[0.2em]">{selectedProject.tag}</span>
                <h2 className="text-4xl sm:text-6xl font-black mb-10 tracking-tighter leading-none">{selectedProject.title}</h2>
                <div className="text-white/60 space-y-8 font-light leading-relaxed text-lg">
                  <div><h5 className="text-cyan-500 font-bold text-xs mb-2 uppercase tracking-widest">Research Goal</h5><p>{selectedProject.goal}</p></div>
                  <div><h5 className="text-cyan-500 font-bold text-xs mb-2 uppercase tracking-widest">Process Log</h5><p>{selectedProject.process}</p></div>
                  <div><h5 className="text-cyan-500 font-bold text-xs mb-2 uppercase tracking-widest">Synthesis Result</h5><p>{selectedProject.result}</p></div>
                </div>
              </div>
              <div className="lg:col-span-5 bg-white/5 p-8 rounded-[2rem] border border-white/5">
                <h4 className="font-brand text-[10px] font-bold text-cyan-500 mb-8 uppercase tracking-[0.3em]">Research Metadata</h4>
                <div className="space-y-4">
                  {selectedProject.notes.map((note, i) => (
                    <div key={i} className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-xs text-white/30 uppercase font-bold">{note.split(':')[0]}</span>
                      <span className="text-xs font-mono text-cyan-500">{note.split(':')[1]}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-12 opacity-10 font-brand text-[8px] uppercase leading-relaxed">
                  Confidential Property of Hyzen Labs.<br/>All rights reserved.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Toast */}
      <div id="copy-toast" className="hidden fixed bottom-8 left-1/2 -translate-x-1/2 bg-white text-black px-10 py-4 rounded-full text-xs font-bold shadow-2xl tracking-[0.3em] opacity-0 transition-opacity">
        LINK COPIED TO CLIPBOARD 🔗
      </div>

      {/* Global Footer */}
      <footer className="py-20 text-center opacity-20 border-t border-white/5">
        <span className="font-brand text-xs tracking-[0.5em] uppercase text-white">Hyzen Labs. Archive</span>
      </footer>
    </div>
  );
};

export default App;r