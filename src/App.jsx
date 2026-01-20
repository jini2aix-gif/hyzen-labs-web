import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Cpu, 
  Layers, 
  Zap, 
  ChevronRight, 
  Github, 
  Twitter, 
  Mail, 
  ExternalLink,
  Box,
  Camera,
  Share2,
  Globe
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from 'recharts';

const App = () => {
  const [activeTab, setActiveTab] = useState('projects');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Hyzen Labs.의 성장을 나타내는 융합 역량 지표
  const growthData = [
    { subject: 'Reality Capture', A: 95, fullMark: 100 },
    { subject: 'AI Synthesis', A: 90, fullMark: 100 },
    { subject: 'Spatial Logic', A: 85, fullMark: 100 },
    { subject: 'Humanities', A: 80, fullMark: 100 },
    { subject: 'Visual Arts', A: 88, fullMark: 100 },
    { subject: 'Engineering', A: 92, fullMark: 100 },
  ];

  // 현실과 AI의 융합 콘텐츠 중심 프로젝트 데이터
  const projects = [
    {
      title: "Reality Refraction",
      category: "Visual Synthesis",
      description: "현실의 물리적 오브젝트를 3D 가우시안 스플래팅으로 디지털화하고, AI 지능을 결합하여 새로운 서사를 부여합니다.",
      tags: ["3D Scanning", "AI Persona", "Digital Twin"],
      icon: <Camera className="w-5 h-5" />
    },
    {
      title: "Latent Space Objects",
      category: "Spatial Intelligence",
      description: "물리적 공간을 촬영한 데이터 위에 AI가 생성한 가상 객체를 조화롭게 융합하여 현실의 경계를 확장합니다.",
      tags: ["Mixed Reality", "Spatial Computing", "Generative AI"],
      icon: <Box className="w-5 h-5" />
    },
    {
      title: "Digital Mirroring",
      category: "Object Archive",
      description: "아날로그 사물의 본질과 질감을 정교하게 캡처하여 AI 데이터로 보존하고, 지능형 아카이브로 재탄생시킵니다.",
      tags: ["Archiving", "Texture Synthesis", "Neural Rendering"],
      icon: <Layers className="w-5 h-5" />
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 font-sans selection:bg-blue-500/30">
      {/* Background Effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <header className={`transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex justify-between items-center mb-16">
            <div className="flex items-center space-x-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20 group-hover:rotate-12 transition-transform">
                <Cpu className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                  Hyzen Labs. Tech
                </h1>
                <p className="text-xs text-blue-500 font-mono tracking-widest uppercase">CTO Arche's Nexus</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-400">
              <button onClick={() => setActiveTab('projects')} className={`hover:text-blue-400 transition-colors ${activeTab === 'projects' ? 'text-blue-400' : ''}`}>Projects</button>
              <button onClick={() => setActiveTab('capabilities')} className={`hover:text-blue-400 transition-colors ${activeTab === 'capabilities' ? 'text-blue-400' : ''}`}>Capabilities</button>
              <a href="https://hyzen-labs-web.vercel.app/" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all">Launch Nexus</a>
            </nav>
          </div>

          <div className="mb-24">
            <h2 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Grounded in Reality,<br />
              <span className="text-blue-600">Augmented by Intelligence.</span>
            </h2>
            <p className="max-w-2xl text-lg text-gray-400 leading-relaxed italic">
              "우리는 현실 세계의 본질을 촬영하고, AI의 지능을 통해 그 가치를 재해석하여 실재와 가상이 조화롭게 공존하는 새로운 미래를 설계합니다."
            </p>
          </div>
        </header>

        {/* Main Section */}
        <main className={`transition-all duration-1000 delay-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Project Feed */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold flex items-center">
                  <Terminal className="w-5 h-5 mr-2 text-blue-500" />
                  Fusion Projects
                </h3>
                <div className="h-[1px] flex-grow mx-4 bg-white/10" />
              </div>

              {projects.map((project, idx) => (
                <div key={idx} className="group p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-blue-500/30 transition-all duration-500">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                      {project.icon}
                    </div>
                    <span className="text-xs font-mono text-gray-500 px-3 py-1 border border-white/10 rounded-full">
                      {project.category}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{project.title}</h4>
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">{project.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="text-[10px] font-medium text-gray-500 bg-white/5 px-2 py-1 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Growth Chart & Vision Info */}
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-3xl">
                <h3 className="text-lg font-bold mb-6 text-center">Convergence Growth Radar</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={growthData}>
                      <PolarGrid stroke="#ffffff10" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                      <Radar
                        name="Arche"
                        dataKey="A"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.5}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                <h4 className="font-bold mb-4 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                  Mission Focus
                </h4>
                <ul className="space-y-4 text-sm text-gray-400 font-mono">
                  <li className="flex items-start">
                    <ChevronRight className="w-4 h-4 mr-1 text-blue-500 mt-0.5" />
                    현실 오브젝트의 초정밀 캡처 기술 확보
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-4 h-4 mr-1 text-blue-500 mt-0.5" />
                    AI 추론 기반의 공간 지능 콘텐츠 생성
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-4 h-4 mr-1 text-blue-500 mt-0.5" />
                    인문학적 서사를 품은 디지털 아카이빙
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
          <p>© 2026 Hyzen Labs. Tech. All rights reserved.</p>
          <div className="flex space-x-6 mt-6 md:mt-0">
            <Github className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
            <Twitter className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
            <Mail className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
            <Globe className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;