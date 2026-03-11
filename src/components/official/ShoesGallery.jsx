import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
    Download, X, ZoomIn, ChevronLeft, ChevronRight,
    Sparkles, Eye, Heart, Share2, Info, Loader2,
    Plus, Upload, Trash2, LayoutGrid, LayoutList,
    Search, SlidersHorizontal, RefreshCw, Edit, Check
} from 'lucide-react';
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
    query, orderBy, startAfter, limit,
    serverTimestamp
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useFirebase, db, appId } from '../../hooks/useFirebase';
import { ADMIN_EMAIL } from '../admin/AdminPanel';

// ── 색상 팔레트 (새 항목 자동 할당) ───────────────────────────────────────────
const ACCENT_COLORS = [
    '#6366f1', '#0ea5e9', '#22d3ee', '#84cc16',
    '#f59e0b', '#ec4899', '#a855f7', '#ef4444',
    '#10b981', '#f97316', '#06b6d4', '#8b5cf6',
];

const PAGE_SIZE = 9; // 한 번에 로드할 항목 수

// ── 유틸: accent color 자동 배정 ─────────────────────────────────────────────
const getAccentColor = (index) => ACCENT_COLORS[index % ACCENT_COLORS.length];

// ── 카드 높이 계산 ────────────────────────────────────────────────────────────
const getCardHeight = (aspect) => {
    // Return a larger fixed height for PC screens, slightly smaller for mobile
    if (typeof window !== 'undefined' && window.innerWidth < 640) return "320px";
    return "420px"; // Increased from 340px for a more premium look
};

// ── 은하수 파티클 캔버스 ────────────────────────────────────────────────────────
const GalaxyCanvas = () => {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let raf;
        let mouse = { x: -999, y: -999 };

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);
        canvas.addEventListener('mousemove', e => {
            const r = canvas.getBoundingClientRect();
            mouse.x = e.clientX - r.left;
            mouse.y = e.clientY - r.top;
        });
        canvas.addEventListener('mouseleave', () => { mouse.x = -999; mouse.y = -999; });

        // 별 생성
        const COUNT = 260;
        const stars = Array.from({ length: COUNT }, (_, i) => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5 + 0.2,
            speed: Math.random() * 0.18 + 0.04,
            angle: Math.random() * Math.PI * 2,
            drift: (Math.random() - 0.5) * 0.008,
            baseOpacity: Math.random() * 0.7 + 0.15,
            twinkleSpeed: Math.random() * 0.02 + 0.005,
            twinkleOffset: Math.random() * Math.PI * 2,
            // 색상: 보라/파랑/흰 세 종류
            hue: [240, 200, 0][Math.floor(Math.random() * 3)],
            sat: Math.random() > 0.3 ? 70 : 0,
        }));

        // 유성 생성
        const METEOR_COUNT = 3;
        const meteors = Array.from({ length: METEOR_COUNT }, () => ({
            x: Math.random() * 2000,
            y: Math.random() * -400,
            len: Math.random() * 80 + 40,
            speed: Math.random() * 4 + 3,
            opacity: 0,
            active: false,
            timer: Math.random() * 300,
        }));

        let t = 0;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            t += 0.01;

            // 배경 성운 글로우
            const grad = ctx.createRadialGradient(
                canvas.width * 0.35, canvas.height * 0.5, 0,
                canvas.width * 0.35, canvas.height * 0.5, canvas.width * 0.55
            );
            grad.addColorStop(0, 'rgba(99,102,241,0.06)');
            grad.addColorStop(0.5, 'rgba(14,165,233,0.03)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 별 그리기
            stars.forEach(s => {
                // 마우스 인터랙션 — 가까우면 밀림
                const dx = s.x - mouse.x, dy = s.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 80) {
                    const force = (80 - dist) / 80;
                    s.x += (dx / dist) * force * 1.2;
                    s.y += (dy / dist) * force * 1.2;
                }

                s.angle += s.drift;
                s.x += Math.cos(s.angle) * s.speed * 0.3;
                s.y += s.speed * 0.15;

                if (s.y > canvas.height + 5) s.y = -5;
                if (s.x < -5) s.x = canvas.width + 5;
                if (s.x > canvas.width + 5) s.x = -5;

                const twinkle = s.baseOpacity + Math.sin(t * s.twinkleSpeed * 60 + s.twinkleOffset) * 0.2;
                const sat = s.sat;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = sat > 0
                    ? `hsla(${s.hue},${sat}%,85%,${twinkle})`
                    : `rgba(255,255,255,${twinkle})`;
                ctx.fill();

                // 큰 별 글로우
                if (s.r > 1.2) {
                    const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
                    glow.addColorStop(0, `hsla(${s.hue},${sat}%,85%,${twinkle * 0.25})`);
                    glow.addColorStop(1, 'transparent');
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // 유성
            meteors.forEach(m => {
                m.timer--;
                if (m.timer <= 0 && !m.active) {
                    m.x = Math.random() * canvas.width * 1.5;
                    m.y = Math.random() * -100;
                    m.opacity = 1;
                    m.active = true;
                    m.timer = Math.random() * 400 + 200;
                }
                if (m.active) {
                    m.x -= m.speed * 1.2;
                    m.y += m.speed;
                    m.opacity -= 0.012;
                    if (m.opacity <= 0 || m.y > canvas.height) { m.active = false; }
                    const tailX = m.x + m.len * 1.2;
                    const tailY = m.y - m.len;
                    const mg = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
                    mg.addColorStop(0, 'transparent');
                    mg.addColorStop(1, `rgba(200,210,255,${m.opacity})`);
                    ctx.beginPath();
                    ctx.moveTo(tailX, tailY);
                    ctx.lineTo(m.x, m.y);
                    ctx.strokeStyle = mg;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            });

            raf = requestAnimationFrame(draw);
        };
        draw();
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-auto"
            style={{ opacity: 0.9 }}
        />
    );
};

// ── 플레이스홀더 카드 ─────────────────────────────────────────────────────────
const PlaceholderCard = ({ item, isHovered }) => (
    <div
        className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${item.accentColor}08, #0a0a0a)` }}
    >
        <div className="absolute inset-0 opacity-10"
            style={{
                backgroundImage: `
                    linear-gradient(${item.accentColor}30 1px, transparent 1px),
                    linear-gradient(90deg, ${item.accentColor}30 1px, transparent 1px)`,
                backgroundSize: '28px 28px'
            }}
        />
        {isHovered && (
            <>
                {[0, 1].map(i => (
                    <motion.div key={i} className="absolute rounded-full border"
                        style={{ borderColor: `${item.accentColor}${i === 0 ? '25' : '15'}` }}
                        animate={{ width: ['50px', i === 0 ? '180px' : '280px'], height: ['50px', i === 0 ? '180px' : '280px'], opacity: [1, 0] }}
                        transition={{ duration: 1.6, delay: i * 0.35, repeat: Infinity }}
                    />
                ))}
            </>
        )}
        <motion.div
            animate={isHovered ? { scale: 1.08, y: -4 } : { scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="relative z-10 flex flex-col items-center gap-2.5"
        >
            <svg viewBox="0 0 80 50" fill="none" className="w-20 h-auto">
                <motion.path
                    d="M5 38 C10 20, 20 15, 35 18 C45 20, 52 28, 60 28 C65 28, 72 25, 75 30 C76 34, 72 40, 65 41 C55 42, 15 42, 8 41 C5 40, 4 39, 5 38Z"
                    stroke={item.accentColor} strokeWidth={isHovered ? 2 : 1.5}
                    fill={`${item.accentColor}15`} transition={{ duration: 0.3 }}
                />
                <path d="M30 18 C28 12, 30 8, 36 8 C42 8, 48 12, 52 18"
                    stroke={item.accentColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <circle cx="20" cy="38" r="4" fill={`${item.accentColor}30`} stroke={item.accentColor} strokeWidth="1" />
                <circle cx="60" cy="38" r="4" fill={`${item.accentColor}30`} stroke={item.accentColor} strokeWidth="1" />
            </svg>
            <p className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: item.accentColor }}>
                Image Coming Soon
            </p>
        </motion.div>
        {[['top-3 left-3', 'border-t border-l'], ['top-3 right-3', 'border-t border-r'],
        ['bottom-3 left-3', 'border-b border-l'], ['bottom-3 right-3', 'border-b border-r']].map(([pos, cls], i) => (
            <div key={i} className={`absolute ${pos} w-4 h-4 ${cls}`}
                style={{ borderColor: `${item.accentColor}35` }} />
        ))}
    </div>
);

// ── 갤러리 카드 ───────────────────────────────────────────────────────────────
const GalleryCard = ({ item, index, onOpen, viewMode }) => {
    const [isHovered, setIsHovered] = useState(false);

    if (viewMode === 'list') {
        return (
            <motion.article
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-4 p-3 rounded-2xl border cursor-pointer transition-all duration-300"
                style={{
                    borderColor: isHovered ? `${item.accentColor}40` : '#1a1a1a',
                    background: isHovered ? `${item.accentColor}08` : 'transparent',
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => onOpen(item)}
            >
                <div className="w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-white/5"
                    style={{ border: `1px solid ${item.accentColor}30` }}>
                    {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain" />
                        : <PlaceholderCard item={item} isHovered={false} />}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-black text-lg sm:text-xl tracking-tight truncate">{item.title}</h3>
                </div>
            </motion.article>
        );
    }

    return (
        <motion.article
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.06, 0.5), duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative group cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onOpen(item)}
        >
            <motion.div
                className="relative overflow-hidden rounded-2xl border"
                style={{
                    borderColor: isHovered ? `${item.accentColor}50` : '#1a1a1a',
                    height: getCardHeight(item.aspect),
                    boxShadow: isHovered
                        ? `0 0 28px ${item.accentColor}1a, 0 16px 48px rgba(0,0,0,0.5)`
                        : '0 4px 16px rgba(0,0,0,0.25)',
                }}
                animate={{ y: isHovered ? -4 : 0, scale: isHovered ? 1.01 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
                {/* Image */}
                <div className="absolute inset-0 bg-white/5">
                    {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain transition-transform duration-700"
                            style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }} />
                        : <PlaceholderCard item={item} isHovered={isHovered} />}
                </div>

                {/* Multi-Image Indicator (Stack & Badge) - Below Top Tags */}
                {item.images?.length > 1 && (
                    <div className="absolute top-[52px] right-3 z-30 flex items-center gap-2.5 transition-all duration-500"
                        style={{
                            opacity: isHovered ? 1 : 0.8,
                            transform: isHovered ? 'translateY(0)' : 'translateY(2px)'
                        }}>
                        <div className="relative w-9 h-9">
                            {[2, 1, 0].map((offset) => {
                                if (offset >= item.images.length) return null;
                                return (
                                    <div key={offset}
                                        className="absolute inset-0 rounded-lg border transition-all duration-500 overflow-hidden bg-[#0a0a0a] shadow-2xl"
                                        style={{
                                            transform: `translate(${offset * 3}px, ${-offset * 3}px)`,
                                            zIndex: 10 - offset,
                                            borderColor: offset === 0 && isHovered ? item.accentColor : 'rgba(255,255,255,0.15)',
                                            opacity: 1 - (offset * 0.25)
                                        }}>
                                        <img src={item.images[offset]} alt="" className="w-full h-full object-cover"
                                            style={{ opacity: isHovered ? 1 : 0.8 }} />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="h-6 px-2.5 rounded-lg bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-lg">
                            <span className="text-[10px] font-black tracking-tighter" style={{ color: item.accentColor }}>{item.images.length} VIEWS</span>
                        </div>
                    </div>
                )}

                {/* Gradient */}
                <div className="absolute inset-0 transition-opacity duration-300"
                    style={{
                        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.05) 100%)',
                        opacity: isHovered ? 1 : 0.82,
                    }} />

                {/* Tags (Top Left) */}
                <div className="absolute top-3 left-3 z-10 pointer-events-none">
                    <div className="flex flex-wrap gap-1.5">
                        {item.tags?.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg backdrop-blur-md"
                                style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                    {/* Stronger bottom gradient for text legibility */}
                    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/80 to-transparent opacity-95" />
                    <div style={{ transform: isHovered ? 'translateY(0)' : 'translateY(4px)', transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)' }}>
                        <p className="text-[10px] uppercase tracking-[0.3em] font-black mb-1.5" style={{ color: item.accentColor }}>
                            {item.subtitle}
                        </p>
                        <h3 className="text-white font-black text-xl md:text-2xl tracking-tight leading-tight mb-2 drop-shadow-lg">{item.title}</h3>
                        <div className="flex items-center gap-2">
                            <p className="text-white/50 text-[12px] font-medium tracking-wide">{item.medium}</p>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[11px] text-white/30 font-mono tracking-tighter">{item.year}</span>
                        </div>
                    </div>
                </div>

                {/* Zoom icon */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
                        >
                            <div className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md"
                                style={{ background: `${item.accentColor}28`, border: `1px solid ${item.accentColor}55` }}>
                                <ZoomIn size={15} color={item.accentColor} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom glow line */}
                <motion.div className="absolute bottom-0 left-0 h-[2px]"
                    style={{ background: `linear-gradient(90deg, ${item.accentColor}, transparent)` }}
                    animate={{ width: isHovered ? '100%' : '0%' }}
                    transition={{ duration: 0.4 }} />
            </motion.div>

            {/* Year badge */}
            <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-[7px] font-black font-mono z-20"
                style={{ background: item.accentColor, color: '#000' }}>
                {item.year?.slice(2)}
            </div>
        </motion.article>
    );
};

const LightBox = ({ item, allItems, onClose, onDownload, isAdmin, onDelete, onEdit }) => {
    const [idx, setIdx] = useState(allItems.findIndex(i => i.id === item.id));
    const [imgIdx, setImgIdx] = useState(0);
    const [showScrollIndicator, setShowScrollIndicator] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const scrollRef = useRef(null);
    const cur = allItems[idx] ?? item;

    // 현재 작품의 이미지 목록: images[] 우선, 없으면 imageUrl 단일
    const images = useMemo(() => {
        if (cur.images?.length) return cur.images;
        if (cur.imageUrl) return [cur.imageUrl];
        return [];
    }, [cur]);

    // 작품 변경 시 이미지 인덱스 초기화
    useEffect(() => { setImgIdx(0); }, [idx]);

    const goNextItem = useCallback(() => { if (allItems.length > 0) setIdx(i => (i + 1) % allItems.length); }, [allItems.length]);
    const goPrevItem = useCallback(() => { if (allItems.length > 0) setIdx(i => (i - 1 + allItems.length) % allItems.length); }, [allItems.length]);
    const goNextImg = useCallback(() => { if (images.length > 0) setImgIdx(i => (i + 1) % images.length); }, [images.length]);
    const goPrevImg = useCallback(() => { if (images.length > 0) setImgIdx(i => (i - 1 + images.length) % images.length); }, [images.length]);

    useEffect(() => {
        const h = (e) => {
            if (e.key === 'ArrowRight') images.length > 1 ? goNextImg() : goNextItem();
            if (e.key === 'ArrowLeft') images.length > 1 ? goPrevImg() : goPrevItem();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [goNextImg, goPrevImg, goNextItem, goPrevItem, images.length, onClose]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const canScroll = scrollHeight > clientHeight;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 30;
        setShowScrollIndicator(canScroll && !isAtBottom);
    };

    useEffect(() => {
        // LightBox content check
        const timer = setTimeout(() => {
            if (scrollRef.current) {
                const { scrollHeight, clientHeight } = scrollRef.current;
                setShowScrollIndicator(scrollHeight > clientHeight);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [idx]);

    // ── Professional Shoe Design Insight Generator ──
    const getShoeDesignInsight = (item) => {
        const title = item.title.toLowerCase();
        const color = item.accentColor;

        return [
            {
                label: 'Conceptual Aesthetic & Colorway',
                content: `'${item.title}' 모델은 하이테크 미래주의를 표방하며, 특히 ${color} 컬러 포인트는 정교하게 계산된 에너지의 흐름을 상징합니다. ${item.tags?.includes('Dark') || title.includes('dark') ? '심해의 심연을 연상시키는 블랙 베이스' : '도시적인 세련미를 담은 메탈릭 실버톤'}의 메인 바디와 대비되어 시각적인 파괴력을 전달합니다.`
            },
            {
                label: 'Structural Engineering',
                content: `이 제품의 핵심은 다이내믹 발란스를 구현한 중창(Midsole) 구조에 있습니다. ${item.tags?.includes('Carbon') || title.includes('carbon') ? '초경량 고강도 탄소 섬유 플레이트가 전장(Full-length) 삽입되어' : '진화된 반응형 폼 기술이 적용되어'} 매 발걸음마다 폭발적인 추진력을 제공합니다. 힐 카운터의 유선형 디자인은 공기 저항을 최소화하는 에어로다이내믹 설계를 반영했습니다.`
            },
            {
                label: 'Advanced Materials',
                content: `최첨단 '리퀴드 스킨' 니트 기술로 제작된 갑피는 신는 순간 발의 모양에 맞게 밀착되며, 습기와 열을 실시간으로 배출하는 벤틸레이션 존이 전략적으로 배치되었습니다. 안감에는 마찰을 극소화한 마이크로 파이버 소재를 사용해 전문 마라토너 수준의 극한 주행 조건에서도 물집 없는 쾌적한 피팅감을 유지합니다.`
            }
        ];
    };

    const handleShare = async (item) => {
        const shareUrl = window.location.href;
        const shareTitle = `[Hyzen Collection] ${item.title}`;
        const shareText = `${item.subtitle}\n\nHyzen의 새로운 디자인 비전을 확인해보세요.`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: shareUrl,
                });
                return;
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.log('Native share failed', err);
                } else {
                    return; // User cancelled
                }
            }
        }

        // Fallback for desktop or when native share fails
        try {
            await navigator.clipboard.writeText(shareUrl);
            alert("링크가 클립보드에 복사되었습니다.");
        } catch (err) {
            const mailto = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText + "\n\nLink: " + shareUrl)}`;
            window.location.href = mailto;
        }
    };

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.97)', backdropFilter: 'blur(32px)' }}
            onClick={onClose}
        >
            {/* Close */}
            <button onClick={onClose}
                className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center z-20 hover:bg-white/10 transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <X size={18} color="white" />
            </button>

            {/* 좌우 작품 네비 — 이미지 1장일 때만 보임 */}
            {images.length <= 1 && allItems.length > 1 && ['left', 'right'].map(dir => (
                <button key={dir}
                    onClick={e => { e.stopPropagation(); dir === 'left' ? goPrevItem() : goNextItem(); }}
                    className={`absolute ${dir === 'left' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-[150] hover:bg-white/10 transition-all`}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {dir === 'left' ? <ChevronLeft size={20} color="white" /> : <ChevronRight size={20} color="white" />}
                </button>
            ))}

            {/* Scroll Indicator */}
            <AnimatePresence>
                {showScrollIndicator && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[200] pointer-events-none md:hidden"
                    >
                        <div className="bg-white/10 backdrop-blur-xl text-white/90 py-2.5 px-6 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex items-center gap-2.5 animate-bounce border border-white/20">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Scroll for Details</span>
                            <div className="rotate-90"><ChevronRight size={14} strokeWidth={3} /></div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                <motion.div
                    key={cur.id}
                    initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.22 }}
                    ref={scrollRef}
                    onScroll={handleScroll}
                    onClick={e => e.stopPropagation()}
                    style={{ paddingTop: '4px' }}
                    className="flex flex-col lg:flex-row gap-8 w-full max-w-[1500px] mx-4 md:mx-auto max-h-[95vh] overflow-y-auto custom-scrollbar relative"
                >
                    {/* ── Image & Side Thumbnails ── */}
                    <div className="flex-1 flex flex-row gap-4 min-w-0 min-h-[400px]">
                        {/* Main Image */}
                        <div className="relative flex-1 rounded-[32px] overflow-hidden bg-black/40"
                            style={{ maxHeight: '85vh', border: `1px solid rgba(255,255,255,0.08)` }}>
                            <AnimatePresence mode="wait">
                                <motion.div key={imgIdx}
                                    initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
                                    className="absolute inset-0">
                                    {images[imgIdx]
                                        ? <img src={images[imgIdx]} alt={`${cur.title} ${imgIdx + 1}`} className="w-full h-full object-contain" />
                                        : <div className="w-full h-full" style={{ minHeight: '300px' }}><PlaceholderCard item={cur} isHovered /></div>
                                    }
                                </motion.div>
                            </AnimatePresence>

                            {/* 이미지 내부 좌우 버튼 */}
                            {images.length > 1 && (
                                <>
                                    {[['left', goPrevImg], ['right', goNextImg]].map(([dir, fn]) => (
                                        <button key={dir} onClick={e => { e.stopPropagation(); fn(); }}
                                            className={`absolute ${dir === 'left' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 group`}
                                            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}>
                                            {dir === 'left' ? <ChevronLeft size={20} color="white" /> : <ChevronRight size={20} color="white" />}
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>

                        {/* Side Thumbnails (Right) */}
                        {images.length >= 2 && (
                            <div className="flex flex-col gap-3 w-16 sm:w-20 shrink-0 py-2 items-center overflow-y-auto no-scrollbar">
                                {images.map((url, i) => (
                                    <button key={i} onClick={() => setImgIdx(i)}
                                        className="relative flex-shrink-0 w-full aspect-[4/3] rounded-xl overflow-hidden transition-all duration-300 group"
                                        style={{
                                            border: `2px solid ${i === imgIdx ? cur.accentColor : 'rgba(255,255,255,0.05)'}`,
                                            opacity: i === imgIdx ? 1 : 0.5,
                                            boxShadow: i === imgIdx ? `0 0 15px ${cur.accentColor}40` : 'none'
                                        }}>
                                        {url
                                            ? <img src={url} alt="" className="w-full h-full object-cover" />
                                            : <div className="w-full h-full" style={{ background: `${cur.accentColor}10` }} />}
                                        {i === imgIdx && (
                                            <div className="absolute inset-0 bg-white/5" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Info Panel ── */}
                    <div className="lg:w-[440px] flex flex-col justify-between gap-6 py-2 overflow-y-auto shrink-0">
                        <div>
                            <div className="flex flex-wrap gap-1.5 mb-5">
                                {cur.tags?.map(tag => (
                                    <span key={tag} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
                                        style={{ background: `${cur.accentColor}12`, color: cur.accentColor, border: `1px solid ${cur.accentColor}25` }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <p className="text-[11px] uppercase tracking-[0.4em] font-bold mb-2 opacity-50" style={{ color: cur.accentColor }}>{cur.subtitle}</p>
                            <h2 className="text-white font-black text-3xl md:text-4xl tracking-tighter mb-3 leading-none italic">{cur.title}</h2>
                            <div className="flex items-center gap-3 text-white/30 mb-6">
                                <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 rounded-md border border-white/10 uppercase tracking-widest">{cur.year} COLLECTION</span>
                                {images.length > 1 && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                        <span className="text-[10px] font-mono font-bold tracking-tighter" style={{ color: cur.accentColor }}>
                                            VIEW {imgIdx + 1} OF {images.length}
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="h-[2px] mb-6 w-12" style={{ background: cur.accentColor }} />
                            <p className="text-white/60 text-[13px] leading-relaxed mb-8 font-medium">{cur.description}</p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                                onClick={() => onDownload(images[imgIdx], cur.title)}
                                className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em]"
                                style={{ background: `linear-gradient(135deg, ${cur.accentColor}, ${cur.accentColor}cc)`, color: '#000', boxShadow: `0 8px 30px ${cur.accentColor}25` }}>
                                <Download size={14} strokeWidth={3} /> Download
                            </motion.button>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleShare(cur)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10 text-white/50 hover:text-white">
                                    <Share2 size={12} /> Share
                                </button>
                                <button
                                    onClick={() => setShowDetails(!showDetails)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10 text-white/50 hover:text-white">
                                    <Info size={12} /> {showDetails ? "Overview" : "Design Details"}
                                </button>
                            </div>

                            <AnimatePresence>
                                {showDetails && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mt-2">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: cur.accentColor }}>Designer's Insight</h4>
                                            <div className="space-y-4 text-[12px] leading-relaxed text-white/70">
                                                {getShoeDesignInsight(cur).map((section, si) => (
                                                    <div key={si}>
                                                        <span className="font-black text-white/90 block mb-1 uppercase tracking-tighter">[{section.label}]</span>
                                                        <p className="font-medium">{section.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            {isAdmin && (
                                <div className="flex gap-2">
                                    <button onClick={() => { onEdit(cur); onClose(); }}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-indigo-500/15 transition-all"
                                        style={{ border: '1px solid rgba(99,102,241,0.25)', color: 'rgba(129,140,248,0.7)' }}>
                                        <Edit size={11} /> Edit
                                    </button>
                                    <button onClick={() => { onDelete(cur); onClose(); }}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-red-500/15 transition-all"
                                        style={{ border: '1px solid rgba(239,68,68,0.25)', color: 'rgba(239,68,68,0.7)' }}>
                                        <Trash2 size={11} /> Delete
                                    </button>
                                </div>
                            )}
                            {/* 작품 간 이동 dots */}
                            {allItems.length > 1 && (
                                <div className="flex items-center gap-1 justify-center flex-wrap pt-1">
                                    {allItems.slice(0, 12).map((_, i) => (
                                        <button key={i} onClick={() => setIdx(i)}
                                            className="rounded-full transition-all duration-300"
                                            style={{
                                                width: i === idx ? '18px' : '5px', height: '5px',
                                                background: i === idx ? cur.accentColor : 'rgba(255,255,255,0.18)'
                                            }} />
                                    ))}
                                    {allItems.length > 12 && (
                                        <span className="text-[8px] text-white/25 font-mono ml-1">+{allItems.length - 12}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </motion.div>,
        document.body
    );
};


// ── 이미지 처리 캐시 (워터마크 로드 오버헤드 제거) ──
let watermarkCache = null;
const loadWatermark = () => {
    if (watermarkCache) return Promise.resolve(watermarkCache);
    return new Promise((resolve) => {
        const img = new Image();
        img.src = '/hyzen_logo_mark.png';
        img.crossOrigin = 'anonymous';

        // 3초 타임아웃 (워터마크 때문에 전체가 멈추지 않도록)
        const timeout = setTimeout(() => {
            console.warn('Watermark load timeout');
            resolve(null);
        }, 3000);

        img.onload = () => {
            clearTimeout(timeout);
            watermarkCache = img;
            resolve(img);
        };
        img.onerror = () => {
            clearTimeout(timeout);
            console.warn('Watermark load failed');
            resolve(null);
        };
    });
};

// ── 유틸: 배경 밝기 분석 ──
const checkBrightness = (ctx, x, y, w, h) => {
    try {
        const data = ctx.getImageData(x, y, w, h).data;
        let brightness = 0;
        for (let i = 0; i < data.length; i += 4) {
            brightness += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        }
        return brightness / (data.length / 4);
    } catch (e) {
        return 128; // 에러 시 중간값
    }
};

// ── 유틸: 이미지 압축 및 워터마크 추가 (해상도 및 품질 상향: 2400px / 0.82) ──
const compressImage = async (file, maxWidth = 2400, quality = 0.82) => {
    const [img, watermark] = await Promise.all([
        new Promise((resolve, reject) => {
            const i = new Image();
            const url = URL.createObjectURL(file);
            i.onload = () => {
                URL.revokeObjectURL(url);
                resolve(i);
            };
            i.onerror = reject;
            i.src = url;
        }),
        loadWatermark()
    ]);

    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, width, height);

    if (watermark) {
        const padding = width * 0.04;
        const wWidth = width * 0.15;
        const wHeight = (watermark.height / watermark.width) * wWidth;
        const wx = width - wWidth - padding;
        const wy = height - wHeight - padding;

        // 배경 밝기 체크
        const brightness = checkBrightness(ctx, wx, wy, wWidth, wHeight);
        const isLight = brightness > 180;

        ctx.save();
        ctx.globalAlpha = 0.95;

        if (isLight) {
            ctx.filter = 'invert(1) brightness(0.1)';
            ctx.shadowColor = 'rgba(255,255,255,0.4)';
            ctx.shadowBlur = 6;
        } else {
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 10;
        }

        ctx.drawImage(watermark, wx, wy, wWidth, wHeight);
        ctx.restore();
    }

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now()
            }));
        }, 'image/jpeg', quality);
    });
};

// ── Firebase Storage 업로드 헬퍼 (진행률 콜백 및 상세 로그 추가) ─────────────
const uploadImageToStorage = (file, path, onProgress) => {
    return new Promise((resolve, reject) => {
        try {
            const storage = getStorage();
            if (!appId) throw new Error('App ID is missing');

            const fullPath = `artifacts/${appId}/public/data/${path}`;
            console.log(`[Firebase Storage] Starting upload to: ${fullPath}`);

            const fileRef = storageRef(storage, fullPath);
            const uploadTask = uploadBytesResumable(fileRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`[Firebase Storage] Progress for ${path}: ${Math.round(progress)}%`);
                    if (onProgress) onProgress(progress);
                },
                (error) => {
                    console.error(`[Firebase Storage] Upload failed for ${path}:`, error);
                    reject(error);
                },
                async () => {
                    console.log(`[Firebase Storage] Success! Getting URL for ${path}`);
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                }
            );
        } catch (err) {
            console.error('[Firebase Storage] Setup Error:', err);
            reject(err);
        }
    });
};
// ── 업로드 모달 (관리자 전용) ─────────────────────────────────────────────────
const UploadModal = ({ onClose, onSave, totalCount, editItem }) => {
    const [form, setForm] = useState({
        title: editItem?.title || '',
        subtitle: editItem?.subtitle || '',
        year: editItem?.year || String(new Date().getFullYear()),
        tags: editItem?.tags?.join(', ') || '',
        description: editItem?.description || '',
    });
    const [showScrollIndicator, setShowScrollIndicator] = useState(false);
    const scrollRef = useRef(null);
    // ── 상태 관리 (기존 이미지와 새 파일을 분리) ──
    const [existingImages, setExistingImages] = useState(editItem?.images || (editItem?.imageUrl ? [editItem?.imageUrl] : []));
    const [files, setFiles] = useState([]); // File[]
    const [newPreviews, setNewPreviews] = useState([]); // ObjectURL[]

    const [saving, setSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [fileStatuses, setFileStatuses] = useState({});
    const fileInputRef = useRef(null);

    const isEditMode = !!editItem;

    // 파일 선택 처리
    const handleFileSelect = (e) => {
        const selected = Array.from(e.target.files || []);
        if (!selected.length) return;

        // 최대 합계 8개로 제한
        const totalPossibleNew = 8 - existingImages.length;
        const toAdd = selected.slice(0, totalPossibleNew);

        const updatedFiles = [...files, ...toAdd];
        setFiles(updatedFiles);

        const updatedPreviews = toAdd.map(f => URL.createObjectURL(f));
        setNewPreviews(prev => [...prev, ...updatedPreviews]);

        e.target.value = '';
    };

    // 이미지 제거
    const removeFile = (idx, isNew) => {
        if (isNew) {
            URL.revokeObjectURL(newPreviews[idx]);
            setFiles(prev => prev.filter((_, i) => i !== idx));
            setNewPreviews(prev => prev.filter((_, i) => i !== idx));
        } else {
            setExistingImages(prev => prev.filter((_, i) => i !== idx));
        }
    };

    // 통합 미리보기 (UI용)
    const allPreviews = [...existingImages, ...newPreviews];

    // Cleanup on unmount
    useEffect(() => {
        if (onClose) {
            const timer = setTimeout(() => {
                if (scrollRef.current) {
                    const { scrollHeight, clientHeight } = scrollRef.current;
                    setShowScrollIndicator(scrollHeight > clientHeight);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
        return () => newPreviews.forEach(p => URL.revokeObjectURL(p));
    }, []);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const canScroll = scrollHeight > clientHeight;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 30;
        setShowScrollIndicator(canScroll && !isAtBottom);
    };

    const handleSave = async () => {
        if (!form.title.trim()) return alert('제목을 입력해주세요.');
        if (!isEditMode && files.length === 0) return alert('이미지를 최소 1장 선택해주세요.');
        setSaving(true);
        try {
            const colorIndex = totalCount % ACCENT_COLORS.length;
            const timestamp = Date.now();
            let imageUrls = isEditMode ? [...(editItem.images || (editItem.imageUrl ? [editItem.imageUrl] : []))] : [];

            if (files.length > 0) {
                console.log(`[Gallery] Starting compression for ${files.length} images...`);
                const offset = existingImages.length;
                const compressedFiles = [];

                // 1. 순차적 최적화 (CPU 과부환 방지 및 상세 피드백)
                for (let i = 0; i < files.length; i++) {
                    const uiIdx = offset + i;
                    setUploadProgress(`${i + 1}/${files.length} 압축 중...`);
                    setFileStatuses(prev => ({ ...prev, [uiIdx]: { status: 'compressing', progress: 0 } }));

                    const result = await compressImage(files[i]).catch(err => {
                        console.error(`Compression failed for image ${i}:`, err);
                        throw new Error(`이미지 압축 실패 (${i + 1}번째)`);
                    });

                    compressedFiles.push(result);
                    setFileStatuses(prev => ({ ...prev, [uiIdx]: { status: 'uploading', progress: 0 } }));
                }

                console.log(`[Gallery] Compression complete. Starting parallel uploads...`);
                setUploadProgress(`서버로 전송 중...`);

                // 2. 병렬 업로드 (Network)
                const newUploadPromises = compressedFiles.map(async (file, i) => {
                    const uiIdx = offset + i;
                    const path = `gallery/${timestamp}_${i}.jpg`; // appId 중복 제거

                    try {
                        return await uploadImageToStorage(file, path, (progress) => {
                            setFileStatuses(prev => ({
                                ...prev,
                                [uiIdx]: { ...prev[uiIdx], progress: Math.round(progress) }
                            }));
                        });
                    } catch (err) {
                        console.error(`[Gallery] Upload Error for image ${i}:`, err);
                        throw err;
                    }
                });

                const uploadedUrls = await Promise.all(newUploadPromises);
                console.log(`[Gallery] All uploads complete!`);
                imageUrls = [...existingImages, ...uploadedUrls];
            } else {
                imageUrls = [...existingImages];
            }

            setUploadProgress('Firestore 저장 중...');
            await onSave({
                ...form,
                id: isEditMode ? editItem.id : undefined,
                imageUrl: imageUrls[0],
                images: imageUrls,
                tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
                accentColor: editItem?.accentColor || ACCENT_COLORS[colorIndex],
            });
            onClose();
        } catch (err) {
            console.error('Upload Error:', err);
            alert(`저장 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`);
        } finally {
            setSaving(false);
            setUploadProgress('');
        }
    };

    return createPortal(
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(24px)' }}
            onClick={onClose}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col relative overflow-hidden"
                onClick={e => e.stopPropagation()}>

                {/* Scroll Indicator */}
                <AnimatePresence>
                    {showScrollIndicator && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
                        >
                            <div className="bg-white/10 backdrop-blur-xl text-indigo-400 py-1.5 px-4 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex items-center gap-2 animate-bounce border border-white/20">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Scroll for More</span>
                                <div className="rotate-90"><ChevronRight size={12} strokeWidth={3} /></div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header - Fixed */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#111] z-10">
                    <div>
                        <h3 className="text-white font-black text-lg tracking-tight">{isEditMode ? '작품 수정' : '새 작품 추가'}</h3>
                        <p className="text-white/30 text-xs mt-0.5">{isEditMode ? '기존 정보를 수정합니다' : `총 ${totalCount}개 · 최대 8장까지 업로드`}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
                        <X size={14} color="white" />
                    </button>
                </div>

                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto custom-scrollbar p-6"
                >

                    {/* ── 이미지 업로드 영역 ── */}
                    <div className="mb-4">
                        <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-2">이미지 파일 (최대 8장) *</label>

                        {/* 드롭존 */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'; }}
                            onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                            onDrop={e => {
                                e.preventDefault();
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                const dt = e.dataTransfer;
                                if (dt.files.length) handleFileSelect({ target: { files: dt.files, value: '' } });
                            }}
                            className="cursor-pointer rounded-2xl flex flex-col items-center justify-center gap-2 py-6 transition-all hover:bg-white/5"
                            style={{ border: '2px dashed rgba(255,255,255,0.1)', minHeight: '100px' }}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
                                <Upload size={18} color="#818cf8" />
                            </div>
                            <p className="text-white/40 text-xs">클릭하거나 파일을 드래그 하세요</p>
                            <p className="text-white/20 text-[10px]">JPG, PNG, WebP · 최대 8장</p>
                        </div>
                        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />

                        {/* 미리보기 그리드 */}
                        {allPreviews.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mt-3">
                                {allPreviews.map((url, i) => {
                                    const isExisting = i < existingImages.length;
                                    const relativeIdx = isExisting ? i : i - existingImages.length;

                                    return (
                                        <div key={i} className="relative group aspect-square rounded-xl overflow-hidden"
                                            style={{ border: i === 0 ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)' }}>
                                            <img src={url} alt="" className="w-full h-full object-cover" />

                                            {/* 개별 업로드 상태 오버레이 (새 파일에만 해당) */}
                                            {saving && !isExisting && fileStatuses[i] && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 z-10">
                                                    <div className="text-[7px] text-white/70 font-black uppercase tracking-widest mb-1">
                                                        {fileStatuses[i].status === 'compressing' ? 'OPTIMIZING' : 'UPLOADING'}
                                                    </div>
                                                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative">
                                                        <motion.div
                                                            className="absolute inset-y-0 left-0 bg-[#6366f1]"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${fileStatuses[i].progress}%` }}
                                                            transition={{ duration: 0.3 }}
                                                        />
                                                        {fileStatuses[i].status === 'compressing' && (
                                                            <motion.div
                                                                className="absolute inset-0 bg-white/20"
                                                                animate={{ x: ['-100%', '100%'] }}
                                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="text-[8px] text-white font-mono mt-1">
                                                        {fileStatuses[i].progress}%
                                                    </div>
                                                </div>
                                            )}

                                            {/* 첫 번째 = 대표 배지 */}
                                            {i === 0 && (
                                                <div className="absolute top-1 left-1 text-[8px] font-black px-1.5 py-0.5 rounded-full"
                                                    style={{ background: '#6366f1', color: '#fff' }}>MAIN</div>
                                            )}
                                            {/* 제거 버튼 */}
                                            <button onClick={() => removeFile(relativeIdx, !isExisting)}
                                                disabled={saving}
                                                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all disabled:hidden"
                                                style={{ background: 'rgba(0,0,0,0.7)' }}>
                                                <X size={10} color="white" />
                                            </button>
                                            {/* 순서 번호 */}
                                            {!saving && (
                                                <div className="absolute bottom-1 right-1 text-[8px] font-mono px-1 rounded"
                                                    style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)' }}>{i + 1}</div>
                                            )}
                                        </div>
                                    );
                                })}
                                {/* 추가 버튼 */}
                                {allPreviews.length < 8 && (
                                    <button onClick={() => fileInputRef.current?.click()}
                                        className="aspect-square rounded-xl flex items-center justify-center transition-all hover:bg-white/8"
                                        style={{ border: '1px dashed rgba(255,255,255,0.15)' }}>
                                        <Plus size={18} color="rgba(255,255,255,0.3)" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── 텍스트 필드 ── */}
                    <div className="space-y-3">
                        {[
                            { key: 'title', label: '제목 *', placeholder: 'VOID RUNNER 002' },
                            { key: 'subtitle', label: '시리즈명', placeholder: 'Dark Matter Series' },
                            { key: 'tags', label: '태그 (쉼표 구분)', placeholder: 'Carbon Fiber, Limited, Speed' },
                            { key: 'description', label: '설명', placeholder: '디자인 컨셉 설명...' },
                        ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                                <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-1">{label}</label>
                                {key === 'description'
                                    ? <textarea rows={2} value={form[key]} placeholder={placeholder}
                                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-indigo-500/50 resize-none placeholder-white/20" />
                                    : <input value={form[key]} placeholder={placeholder}
                                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-indigo-500/50 placeholder-white/20" />}
                            </div>
                        ))}

                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-1">연도</label>
                                <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-indigo-500/50">
                                    {['2024', '2025', '2026', '2027'].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                </div>

                {/* ── Footer - Fixed ── */}
                <div className="p-6 border-t border-white/5 flex gap-2 shrink-0 bg-[#111] z-10">
                    <button onClick={onClose} disabled={saving}
                        className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-white/40 border border-white/10 hover:bg-white/5 transition-all disabled:opacity-40">
                        취소
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-indigo-500/10"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #0ea5e9)', color: '#fff' }}>
                        {saving ? <Loader2 size={13} className="animate-spin" /> : (isEditMode ? <Check size={13} /> : <Upload size={13} />)}
                        {saving ? (uploadProgress || '저장 중...') : (isEditMode ? '수정 완료' : `업로드 (${files.length}장)`)}
                    </button>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
const ShoesGallery = ({ onModalChange }) => {
    const { user } = useFirebase();
    const isAdmin = user?.email === ADMIN_EMAIL;

    // ── State ─────────────────────────────────────────────────────────────────
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastDoc, setLastDoc] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [filter, setFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [showUpload, setShowUpload] = useState(false);
    const [editItem, setEditItem] = useState(null);

    useEffect(() => {
        if (onModalChange) onModalChange(!!selectedItem || showUpload || !!editItem);
    }, [selectedItem, showUpload, editItem, onModalChange]);

    const containerRef = useRef(null);
    const loaderRef = useRef(null);

    const { scrollYProgress } = useScroll({ container: containerRef });
    const headerY = useTransform(scrollYProgress, [0, 0.12], [0, -25]);
    const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);


    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!db || !appId) {
                setItems([]);
                setLoading(false);
                setHasMore(false);
                return;
            }
            try {
                const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'gallery');
                const q = query(colRef, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
                const snap = await getDocs(q);
                if (!cancelled) {
                    const docs = snap.docs.map((d, i) => ({
                        id: d.id,
                        ...d.data(),
                        accentColor: d.data().accentColor || getAccentColor(i),
                    }));
                    setItems(docs);
                    setLastDoc(snap.docs[snap.docs.length - 1] || null);
                    setHasMore(snap.docs.length === PAGE_SIZE);
                }
            } catch (err) {
                console.warn('Gallery: Firestore load failed.', err);
                if (!cancelled) {
                    setItems([]);
                    setHasMore(false);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    // ── 더 불러오기 ───────────────────────────────────────────────────────────
    const loadMore = useCallback(async () => {
        if (!db || !appId || !lastDoc || loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'gallery');
            const q = query(colRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
            const snap = await getDocs(q);
            const newDocs = snap.docs.map((d, i) => ({
                id: d.id, ...d.data(),
                accentColor: d.data().accentColor || getAccentColor(items.length + i),
            }));
            setItems(prev => {
                const ids = new Set(prev.map(x => x.id));
                return [...prev, ...newDocs.filter(x => !ids.has(x.id))];
            });
            setLastDoc(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === PAGE_SIZE);
        } catch (err) {
            console.warn('loadMore failed', err);
        } finally {
            setLoadingMore(false);
        }
    }, [db, appId, lastDoc, loadingMore, hasMore, items.length]);

    // ── Infinite scroll (IntersectionObserver) ────────────────────────────────
    useEffect(() => {
        if (!loaderRef.current) return;
        const obs = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) loadMore();
        }, { threshold: 0.2 });
        obs.observe(loaderRef.current);
        return () => obs.disconnect();
    }, [loadMore]);

    // ── 추가 ─────────────────────────────────────────────────────────────────
    const handleSave = useCallback(async (data) => {
        if (!db || !appId) return;
        try {
            const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'gallery');
            const { id, ...rest } = data;

            if (id) {
                // 수정 모드
                const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'gallery', id);
                await updateDoc(docRef, { ...rest, updatedAt: serverTimestamp() });
                alert('작품 정보가 수정되었습니다.');
            } else {
                // 추가 모드
                const docData = {
                    ...rest,
                    authorId: user?.uid || 'anonymous',
                    authorEmail: user?.email || '',
                    createdAt: serverTimestamp()
                };
                await addDoc(colRef, docData);
                alert('새 작품이 등록되었습니다.');
            }

            // 새 항목 추가 후 목록 다시 로드
            const q = query(colRef, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
            const snap = await getDocs(q);
            setItems(snap.docs.map((d, i) => ({ id: d.id, ...d.data(), accentColor: d.data().accentColor || getAccentColor(i) })));
            setLastDoc(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === PAGE_SIZE);
        } catch (err) {
            console.error('handleSave error', err);
            alert('Firestore 저장에 실패했습니다: ' + err.message);
        }
    }, [db, appId, user]);

    // ── 삭제 ─────────────────────────────────────────────────────────────────
    const handleDelete = useCallback(async (item) => {
        if (!db || !appId) return;

        if (!confirm(`"${item.title}" 을(를) 삭제하시겠습니까?`)) return;

        try {
            // 1. Firebase Storage 이미지 삭제 (있는 경우)
            const storage = getStorage();
            const targets = item.images?.length ? item.images : (item.imageUrl ? [item.imageUrl] : []);

            for (const url of targets) {
                // 저장소 URL인 경우만 삭제 시도 (외부 링크일 가능성 대비)
                if (url.includes('firebasestorage.googleapis.com')) {
                    try {
                        const fileRef = storageRef(storage, url);
                        await deleteObject(fileRef);
                    } catch (e) {
                        console.warn('Storage image delete failed:', e);
                    }
                }
            }

            // 2. Firestore 문서 삭제
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gallery', item.id));
            setItems(prev => prev.filter(x => x.id !== item.id));
            alert('기록이 성공적으로 삭제되었습니다.');
        } catch (err) {
            console.error('handleDelete error', err);
            alert(`삭제 중 오류가 발생했습니다: ${err.message}`);
        }
    }, [db, appId]);

    // ── 다운로드 ─────────────────────────────────────────────────────────────
    const handleDownload = useCallback(async (url, title) => {
        if (!url) return alert('⚠️ 이미지가 아직 준비 중입니다.');

        try {
            // 1. 이미지와 워터마크 동시 로드
            const [img, watermark] = await Promise.all([
                new Promise((resolve, reject) => {
                    const i = new Image();
                    i.crossOrigin = 'anonymous';
                    i.onload = () => resolve(i);
                    i.onerror = () => reject(new Error('이미지 로드 실패'));
                    i.src = url;
                }),
                loadWatermark()
            ]);

            // 2. 캔버스 작업
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // 본래 이미지 그리기
            ctx.drawImage(img, 0, 0);

            // 워터마크 그리기 (배경색에 따라 반전)
            if (watermark) {
                const padding = canvas.width * 0.04;
                const wWidth = canvas.width * 0.15;
                const wHeight = (watermark.height / watermark.width) * wWidth;
                const wx = canvas.width - wWidth - padding;
                const wy = canvas.height - wHeight - padding;

                const brightness = checkBrightness(ctx, wx, wy, wWidth, wHeight);
                const isLight = brightness > 180;

                ctx.save();
                ctx.globalAlpha = 0.95;

                if (isLight) {
                    ctx.filter = 'invert(1) brightness(0.1)';
                    ctx.shadowColor = 'rgba(255,255,255,0.4)';
                    ctx.shadowBlur = 6;
                } else {
                    ctx.shadowColor = 'rgba(0,0,0,0.6)';
                    ctx.shadowBlur = 10;
                }

                ctx.drawImage(watermark, wx, wy, wWidth, wHeight);
                ctx.restore();
            }

            // 3. 다운로드 트리거
            canvas.toBlob((blob) => {
                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `${(title || 'design').replace(/\s+/g, '_')}_HyzenCollection.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);
            }, 'image/jpeg', 0.95);

        } catch (err) {
            console.error('Download error:', err);
            // 에러 시 (CORS 등) 원본 파일이라도 다운로드 시도
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(title || 'design').replace(/\s+/g, '_')}_HyzenCollection.jpg`;
            a.click();
        }
    }, []);

    // ── 필터 & 검색 ──────────────────────────────────────────────────────────
    const years = useMemo(() => {
        const ys = [...new Set(items.map(x => x.year))].sort((a, b) => b - a);
        return ['ALL', ...ys, 'Limited'];
    }, [items]);

    const displayed = useMemo(() => {
        let out = items;
        if (filter !== 'ALL') {
            out = out.filter(item =>
                item.year === filter || item.tags?.some(t => t.toLowerCase().includes(filter.toLowerCase()))
            );
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            out = out.filter(item =>
                item.title?.toLowerCase().includes(q) ||
                item.subtitle?.toLowerCase().includes(q) ||
                item.tags?.some(t => t.toLowerCase().includes(q))
            );
        }
        return out;
    }, [items, filter, searchQuery]);

    // ── 렌더 ─────────────────────────────────────────────────────────────────
    return (
        <div ref={containerRef} className="h-full overflow-y-auto overflow-x-hidden" style={{ background: '#080808' }}>

            {/* ── Hero ──────────────────────────────────────────────────── */}
            <motion.div
                style={{ y: headerY, opacity: headerOpacity, minHeight: '220px' }}
                className="relative pt-20 pb-8 px-6 md:px-16 overflow-hidden">
                {/* 은하수 파티클 배경 */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <GalaxyCanvas />
                    {/* 하단 페이드아웃 */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
                        style={{ background: 'linear-gradient(to bottom, transparent, #080808)' }} />
                </div>

                <div className="relative z-10 max-w-[1400px] mx-auto">
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 mb-4">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full"
                            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                            <Sparkles size={10} className="text-indigo-400" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-400">Running Shoe Gallery</span>
                        </div>
                    </motion.div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
                        <div>
                            <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
                                className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none mb-2">
                                HYZEN
                                <span className="block" style={{
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    backgroundImage: 'linear-gradient(135deg, #6366f1, #0ea5e9, #22d3ee)',
                                    backgroundClip: 'text',
                                }}>COLLECTION</span>
                            </motion.h1>
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}
                                className="text-white/35 text-sm max-w-xs leading-relaxed">
                                AI로 시각화한 Hyzen의 디자인 비전.
                                <br /><span className="text-white/18 text-xs">Innovation in every detail.</span>
                            </motion.p>
                        </div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}
                            className="flex gap-6 items-end">
                            {[
                                { label: 'Total Works', value: items.length },
                                { label: 'AI Tools', value: '4+' },
                                { label: 'Displayed', value: displayed.length },
                            ].map(stat => (
                                <div key={stat.label} className="text-center">
                                    <div className="text-2xl font-black text-white tabular-nums">{stat.value}</div>
                                    <div className="text-[8px] uppercase tracking-[0.18em] text-white/25 font-bold">{stat.label}</div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            {/* ── Toolbar ───────────────────────────────────────────────── */}
            <div className="sticky top-0 z-30 px-6 md:px-16"
                style={{ background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="max-w-[1400px] mx-auto">
                    {/* Row 1: Filter pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {years.map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className="flex-shrink-0 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all duration-300"
                                style={filter === f ? {
                                    background: 'linear-gradient(135deg, #6366f1, #0ea5e9)', color: '#fff',
                                    boxShadow: '0 2px 10px rgba(99,102,241,0.3)',
                                } : {
                                    background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.38)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                }}>
                                {f}
                            </button>
                        ))}
                    </div>
                    {/* Row 2: Search + Controls */}
                    <div className="flex items-center gap-2 py-2">
                        <div className="relative flex-1 max-w-xs">
                            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
                            <input
                                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                placeholder="디자인 검색..."
                                className="w-full bg-white/5 border border-white/8 rounded-full pl-7 pr-3 py-1.5 text-[10px] text-white/70 outline-none focus:border-indigo-500/40 placeholder-white/20"
                            />
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-[9px] text-white/22 font-mono">{displayed.length}/{items.length}</span>
                            <div className="flex items-center gap-1"
                                style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '999px', padding: '2px' }}>
                                {[['grid', LayoutGrid], ['list', LayoutList]].map(([mode, Icon]) => (
                                    <button key={mode} onClick={() => setViewMode(mode)}
                                        className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                                        style={{ background: viewMode === mode ? 'rgba(255,255,255,0.12)' : 'transparent' }}>
                                        <Icon size={13} color={viewMode === mode ? 'white' : 'rgba(255,255,255,0.3)'} />
                                    </button>
                                ))}
                            </div>
                            {isAdmin && (
                                <button onClick={() => setShowUpload(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all"
                                    style={{ background: 'rgba(99,102,241,0.18)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                                    <Plus size={11} /> 추가
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Gallery Grid ──────────────────────────────────────────── */}
            <div className="px-6 md:px-16 py-6 max-w-[1400px] mx-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-3">
                        <Loader2 size={28} className="animate-spin text-indigo-400" />
                        <p className="text-white/25 text-xs font-mono uppercase tracking-widest">Loading gallery...</p>
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center bg-white/4 border border-white/8">
                            <Search size={18} className="text-white/20" />
                        </div>
                        <p className="text-white/25 text-xs font-mono uppercase tracking-widest">작품을 찾을 수 없습니다</p>
                        <button onClick={() => { setFilter('ALL'); setSearchQuery(''); }}
                            className="flex items-center gap-1.5 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">
                            <RefreshCw size={11} /> 필터 초기화
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                        gap: '32px',
                        alignItems: 'start',
                    }}>
                        {displayed.map((item, i) => (
                            <GalleryCard key={item.id} item={item} index={i} onOpen={setSelectedItem} viewMode="grid" />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {displayed.map((item, i) => (
                            <GalleryCard key={item.id} item={item} index={i} onOpen={setSelectedItem} viewMode="list" />
                        ))}
                    </div>
                )}

                {/* ── Infinite Scroll Loader ─────────────────────────────── */}
                <div ref={loaderRef} className="py-10 flex flex-col items-center gap-3">
                    {loadingMore && (
                        <>
                            <Loader2 size={20} className="animate-spin text-indigo-400/60" />
                            <p className="text-white/20 text-[10px] font-mono uppercase tracking-widest">Loading more...</p>
                        </>
                    )}
                    {!hasMore && items.length > 0 && !loading && (
                        <div className="flex flex-col items-center gap-2 py-4 rounded-2xl w-full"
                            style={{ border: '1px dashed rgba(255,255,255,0.07)' }}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <Sparkles size={16} className="text-indigo-400" />
                            </div>
                            <p className="text-white/25 text-[10px] font-bold uppercase tracking-[0.25em]">
                                총 {items.length}개 · 모두 표시됨
                            </p>
                            <p className="text-white/12 text-[9px] tracking-widest">AI로 계속 그려나가는 중</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Lightbox ──────────────────────────────────────────────── */}
            <AnimatePresence>
                {selectedItem && (
                    <LightBox
                        item={selectedItem}
                        allItems={displayed}
                        onClose={() => setSelectedItem(null)}
                        onDownload={handleDownload}
                        isAdmin={isAdmin}
                        onDelete={handleDelete}
                        onEdit={setEditItem}
                    />
                )}
            </AnimatePresence>

            {/* ── Upload / Edit Modal ─────────────────────────────────────── */}
            <AnimatePresence>
                {(showUpload || editItem) && (
                    <UploadModal
                        editItem={editItem}
                        onClose={() => { setShowUpload(false); setEditItem(null); }}
                        onSave={handleSave}
                        totalCount={items.length}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// ── 메인 컴포넌트 내보내기 ──────────────────────────────────────────────────
export default ShoesGallery;
