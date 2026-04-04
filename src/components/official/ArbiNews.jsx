import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Newspaper, ExternalLink, RefreshCw, Clock, Filter, 
    Search, TrendingUp, NewspaperIcon, Share2, X, 
    ChevronRight, Image as ImageIcon
} from 'lucide-react';
import { fetchArbiNews } from '../../lib/api-fetcher';

const NewsModal = ({ item, onClose }) => {
    return createPortal(
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-3xl overflow-hidden p-0 md:p-6"
            onClick={onClose}
        >
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full h-full lg:max-w-5xl lg:h-[90vh] lg:rounded-[32px] bg-[#050505] border border-white/10 shadow-[0_0_100px_rgba(33,194,255,0.15)] flex flex-col overflow-hidden relative"
                onClick={e => e.stopPropagation()}
            >
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
                >
                    <X size={20} />
                </button>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-black">
                    {/* Hero Image Section */}
                    {item.thumbnail ? (
                        <div className="w-full aspect-video md:aspect-[21/9] relative group">
                            <img src={item.thumbnail} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-1000" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                        </div>
                    ) : (
                        <div className="w-full h-48 md:h-64 bg-gradient-to-br from-blue-900/20 to-black relative flex items-center justify-center">
                            <Newspaper size={64} className="text-white/10" />
                        </div>
                    )}

                    <div className="p-6 md:p-14 max-w-4xl mx-auto">
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                             <span className="text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1.5 bg-[#21c2ff]/10 text-[#21c2ff] rounded-lg border border-[#21c2ff]/20">
                                {item.source}
                            </span>
                            <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">{new Date(item.pubDate).toLocaleString()}</span>
                        </div>

                        <h2 className="text-2xl md:text-5xl font-black italic tracking-tighter leading-tight mb-8 text-white" lang="en" translate="yes">
                            {item.title}
                        </h2>

                        <div className="prose prose-invert max-w-none" lang="en" translate="yes">
                            <div 
                                className="text-white/60 text-base md:text-xl leading-relaxed font-medium space-y-6"
                                dangerouslySetInnerHTML={{ __html: item.fullDescription || item.content }}
                            />
                        </div>

                        <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap items-center gap-6">
                             <a 
                                href={item.link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white text-black font-black text-[11px] uppercase tracking-widest hover:bg-[#21c2ff] transition-all group"
                                lang="en" translate="yes"
                            >
                                View Original Content <ExternalLink size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </a>
                            <button className="flex items-center gap-2 text-white/20 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all">
                                <Share2 size={16} /> Share Link
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
};

const NewsCard = ({ item, index, onOpen }) => (
    <motion.article 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.5, ease: "easeOut" }}
        className="group relative bg-[#0a0a0a] border border-white/5 rounded-[24px] overflow-hidden hover:border-[#21c2ff]/30 transition-all duration-500 cursor-pointer"
        onClick={() => onOpen(item)}
    >
        <div className="absolute inset-0 bg-gradient-to-br from-[#21c2ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* News Image */}
        {item.thumbnail ? (
            <div className="w-full h-40 md:h-48 relative overflow-hidden bg-black">
                <img src={item.thumbnail} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
            </div>
        ) : (
            <div className="w-full h-32 md:h-40 bg-gradient-to-br from-blue-900/10 to-black flex items-center justify-center">
                <ImageIcon size={32} className="text-white/5" />
            </div>
        )}

        <div className="p-5 md:p-6 flex flex-col h-full transform group-hover:-translate-y-1 transition-transform duration-500" lang="en" translate="yes">
            <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-white/50 group-hover:text-[#21c2ff] group-hover:border-[#21c2ff]/30 transition-all">
                    {item.source}
                </span>
                <div className="flex items-center gap-2 text-[9px] text-white/30 font-mono">
                    <Clock size={10} />
                    {new Date(item.pubDate).toLocaleDateString()}
                </div>
            </div>

            <h3 className="text-white font-black text-lg md:text-2xl tracking-tighter leading-tight mb-4 group-hover:text-[#21c2ff] transition-colors duration-300 line-clamp-2">
                {item.title}
            </h3>

            <p className="text-white/40 text-[13px] leading-relaxed mb-6 line-clamp-3 font-medium">
                {item.content}
            </p>

            <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#21c2ff]">
                    Read More <ChevronRight size={10} />
                </div>
            </div>
        </div>
    </motion.article>
);

const ArbiNews = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedNews, setSelectedNews] = useState(null);

    const loadNews = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        
        try {
            const data = await fetchArbiNews();
            setNews(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadNews();
        const interval = setInterval(() => loadNews(true), 30 * 60 * 1000); 
        return () => clearInterval(interval);
    }, [loadNews]);

    return (
        <div className="min-h-screen bg-[#050505] text-white pt-24 pb-32 px-4 md:px-12 selection:bg-[#21c2ff] selection:text-black">
            {/* Header Area */}
            <div className="max-w-7xl mx-auto mb-10 md:mb-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-[#21c2ff] to-[#0a84ff] flex items-center justify-center shadow-[0_0_30px_rgba(33,194,255,0.4)]">
                                <NewspaperIcon size={20} className="text-black" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-[0.5em] text-[#21c2ff]">Network Stream</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic">Real-Time Archive</span>
                            </div>
                        </div>
                        <h2 className="text-4xl md:text-7xl font-black italic tracking-tighter uppercase leading-none" lang="en" translate="yes">
                            Arbi News <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/10">Archive.</span>
                        </h2>
                        <p className="text-white/40 font-medium max-w-2xl text-xs md:text-lg leading-relaxed mt-4 md:mt-6" lang="en" translate="yes">
                            Latest developments from the Arbitrum Foundation, ecosystem builders, and major financial institutions.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => loadNews(true)}
                            disabled={refreshing}
                            className="w-full md:w-auto flex items-center justify-center gap-3 px-5 py-3 md:px-6 md:py-4 rounded-2xl bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-[#21c2ff] transition-all disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            {refreshing ? 'Syncing...' : 'Sync Feed'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="max-w-7xl mx-auto">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-[50vh] flex flex-col items-center justify-center gap-6 text-center"
                        >
                            <RefreshCw size={40} className="text-[#21c2ff] animate-spin opacity-20" />
                            <span className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20">Establishing Data Link...</span>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            {news.map((item, idx) => (
                                <NewsCard key={item.id} item={item} index={idx} onOpen={setSelectedNews} />
                            ))}
                        </div>
                    )}
                </AnimatePresence>

                {!loading && news.length === 0 && (
                    <div className="h-[40vh] flex flex-col items-center justify-center text-center">
                        <Filter size={40} className="text-white/10 mb-6" />
                        <h4 className="text-white/40 font-black mb-3 uppercase tracking-[0.3em] text-lg">No Signal</h4>
                        <p className="text-white/20 text-sm">Waiting for incoming transmission data.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence mode="wait">
                {selectedNews && (
                    <NewsModal 
                        item={selectedNews} 
                        onClose={() => setSelectedNews(null)} 
                    />
                )}
            </AnimatePresence>

            {/* Terminal Footer Info */}
            <div className="max-w-7xl mx-auto mt-24 md:mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[#21c2ff]/40">
                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-[10px] font-mono uppercase tracking-[0.3em]">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                        Transmission Active
                    </div>
                    <span className="hidden md:inline">|</span>
                    <span className="text-white/30">Latency: 12ms</span>
                </div>
                <div className="text-[10px] font-mono text-white/10 italic text-center md:text-right uppercase tracking-widest">
                    Hyzen Labs R&D Platform. 2026.
                </div>
            </div>
        </div>
    );
};

export default ArbiNews;
