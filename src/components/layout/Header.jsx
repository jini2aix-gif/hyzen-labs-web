import React from 'react';
import { Mail, Youtube, Cloud } from 'lucide-react';

import { useVisitorCount } from '../../hooks/useVisitorCount';

const YOUTUBE_URL = "Https://youtube.com/@hyzen-labs-ai";
const EMAIL_ADDRESS = "jini2aix@gmail.com";

const Header = ({ cloudStatus }) => {
    const visitorCount = useVisitorCount();

    return (
        <nav className="z-[100] px-8 pt-12 pb-2 flex justify-between items-start shrink-0">
            <div className="flex flex-col">
                <span className="font-brand text-[10px] tracking-[0.4em] text-cyan-400 font-black uppercase">Hyzen Labs.</span>
                <span className="text-[7px] opacity-20 uppercase tracking-[0.2em] font-brand mt-1">Digital Matrix Ecosystem</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end mr-4">
                    <span className="text-[8px] font-mono text-cyan-400/50 tracking-widest">SYS.TRAFFIC</span>
                    <span className="text-[10px] font-brand text-cyan-400 font-bold tracking-widest">
                        {visitorCount.toLocaleString().padStart(6, '0')}
                    </span>
                </div>
                <a href={`mailto:${EMAIL_ADDRESS}`} className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center text-white/30 hover:text-cyan-400 transition-all"><Mail size={14} /></a>
                <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center text-white/30 hover:text-red-500 transition-all"><Youtube size={14} /></a>
                <div className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center"><Cloud size={14} className={cloudStatus === 'connected' ? 'text-cyan-400' : 'text-amber-500'} /></div>
            </div>
        </nav>
    );
};

export default Header;
