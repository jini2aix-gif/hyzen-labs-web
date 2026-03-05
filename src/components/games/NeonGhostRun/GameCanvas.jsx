import React, { useRef, useEffect, useCallback } from 'react';

const GRAVITY = 0.42, JUMP_V = -12.5, DJ_V = -10.5, SLIDE_MS = 650, COYOTE_F = 8, JUMP_BUF_F = 10;
const PLAYER_W = 28, PH_STAND = 52, PH_SLIDE = 20, GROUND_RATIO = 0.80, INIT_SPEED = 3.2, MAX_SPEED = 8.0;

const BIOMES = [
    { name: '네온 시티', bg: '#06030F', sky1: '#0d0621', sky2: '#120830', grid: '#3b1f6e', accent: '#c026d3', glow: '192,38,211', trail: '#e879f9' },
    { name: '데이터 스트림', bg: '#030A10', sky1: '#031220', sky2: '#041a2e', grid: '#0c4a6e', accent: '#0ea5e9', glow: '14,165,233', trail: '#7dd3fc' },
    { name: '보이드 섹터', bg: '#0F0305', sky1: '#1a0309', sky2: '#220410', grid: '#7f1d1d', accent: '#f43f5e', glow: '244,63,94', trail: '#fb7185' },
    { name: '하이젠 존', bg: '#030A05', sky1: '#041208', sky2: '#051a0a', grid: '#14532d', accent: '#22c55e', glow: '34,197,94', trail: '#86efac' },
];

const ITEMS = {
    shield: { color: '#f43f5e', glow: '244,63,94', emoji: '♥' },
    ghost: { color: '#a78bfa', glow: '167,139,250', emoji: '◈' },
    boost: { color: '#fbbf24', glow: '251,191,36', emoji: '✦' },
};

const setGlow = (ctx, c, b) => { ctx.shadowColor = c; ctx.shadowBlur = b; };
const clearGlow = ctx => { ctx.shadowBlur = 0; };

// ─── Obstacle factories ───────────────────────────────────────────────────────
// GROUND  (보라): 지면 블록 → 점프로 회피
// AERIAL  (청록): 천장형 바. y=0, h=gy-25 (충돌). 슬라이드만 통과 가능.
//   슬라이드 pr.t=gy-16  vs  or.b=gy-28  → gy-16 < gy-28? NO → 통과 ✓
//   점프 후  pr.t=gy-225 vs  or.b=gy-28  → gy-225 < gy-28? YES → 충돌 ✓
// DJUMP   (황금): 공중 플랫폼. y=gy-240, h=50.
//   지면러닝 pr.t=gy-48  vs  or.b=gy-193 → gy-48 < gy-193? NO → 아래 통과 ✓
//   단순점프 pr.b=gy-175  vs  or.t=gy-237 → gy-175>gy-237? YES(충돌) ✓
//   이단점프 pr.b=gy-305  vs  or.t=gy-237 → gy-305>gy-237? NO → 위로 통과 ✓
const makeGround = (x, gy) => ({ type: 'ground', x, y: gy - 52, w: 42, h: 52 });
const makeAerial = (x, gy) => ({ type: 'aerial', x, y: 0, h: gy - 25, w: 60, visY: gy - 95, visH: 70 });
const makeDJump = (x, gy) => ({ type: 'djump', x, y: gy - 240, w: 55, h: 50 });
const makeMoving = (x, gy) => ({ type: 'moving', x, y: gy - 120, baseY: gy - 120, w: 32, h: 32, amp: 65, phase: Math.random() * Math.PI * 2 });

const spawnPattern = (level, x, gy) => {
    const r = Math.random();
    if (level === 1) return [makeGround(x, gy)];
    if (level === 2) return r < 0.5 ? [makeGround(x, gy)] : [makeAerial(x, gy)];
    if (level === 3) {
        if (r < 0.30) return [makeGround(x, gy)];
        if (r < 0.60) return [makeAerial(x, gy)];
        return [makeGround(x, gy), makeAerial(x + 210, gy)]; // 점프→슬라이드
    }
    if (level === 4) {
        if (r < 0.18) return [makeGround(x, gy)];
        if (r < 0.35) return [makeAerial(x, gy)];
        if (r < 0.52) return [makeGround(x, gy), makeAerial(x + 210, gy)];  // 점프+슬라이드
        if (r < 0.68) return [makeAerial(x, gy), makeGround(x + 190, gy)];  // 슬라이드+점프
        if (r < 0.84) return [makeGround(x, gy), makeDJump(x + 95, gy)];    // 점프→이단점프!
        return [makeMoving(x, gy)];
    }
    // 레벨 5+
    if (r < 0.14) return [makeGround(x, gy)];
    if (r < 0.27) return [makeAerial(x, gy)];
    if (r < 0.40) return [makeGround(x, gy), makeDJump(x + 95, gy)];
    if (r < 0.52) return [makeGround(x, gy), makeAerial(x + 195, gy)];
    if (r < 0.64) return [makeAerial(x, gy), makeGround(x + 190, gy)];
    if (r < 0.74) return [makeMoving(x, gy)];
    if (r < 0.86) return [makeGround(x, gy), makeDJump(x + 90, gy), makeAerial(x + 330, gy)]; // 점프+이단점프+슬라이드
    return [makeAerial(x, gy), makeGround(x + 210, gy), makeDJump(x + 320, gy)];
};

// ─── Draw helpers ─────────────────────────────────────────────────────────────
const drawObstacle = (ctx, o, biome, now) => {
    const { x, w, type } = o;
    ctx.save();
    if (type === 'aerial') {
        // 시각: 아래 70px 게이트만 표시, 위쪽 반투명 위험존
        const by = o.visY, bh = o.visH;
        ctx.globalAlpha = 0.10; ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(x, 0, w, by); ctx.globalAlpha = 1;
        setGlow(ctx, '#0ea5e9', 20);
        ctx.fillStyle = 'rgba(14,165,233,0.20)'; ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.roundRect(x, by, w, bh, 5); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#0ea5e9';
        for (let s = 0; s < bh; s += 12) ctx.fillRect(x + 4, by + s, w - 8, 5);
        ctx.restore();
        ctx.fillStyle = 'rgba(14,165,233,0.55)'; ctx.fillRect(x + 4, by + 4, w - 8, 4);
        ctx.fillStyle = '#0ea5e9'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('▼ 슬라이드', x + w / 2, by + bh + 14);
    } else if (type === 'djump') {
        const col = '#f59e0b';
        setGlow(ctx, col, 22);
        ctx.fillStyle = 'rgba(245,158,11,0.20)'; ctx.strokeStyle = col; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.roundRect(x, o.y, w, o.h, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(245,158,11,0.55)'; ctx.fillRect(x + 4, o.y + 4, w - 8, 4);
        ctx.fillStyle = col; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('▲▲ 이단점프', x + w / 2, o.y - 7);
        ctx.save(); ctx.globalAlpha = 0.28; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(x + w / 2, o.y + o.h); ctx.lineTo(x + w / 2, o.y + o.h + 45); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
    } else {
        const col = biome.accent;
        setGlow(ctx, col, 18);
        ctx.fillStyle = `rgba(${biome.glow},0.15)`; ctx.strokeStyle = col; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.roundRect(x, o.y, w, o.h, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `rgba(${biome.glow},0.45)`; ctx.fillRect(x + 4, o.y + 4, w - 8, 4);
        ctx.fillStyle = col; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('▲ 점프', x + w / 2, o.y - 6);
    }
    clearGlow(ctx); ctx.restore();
};

const drawItem = (ctx, item, now) => {
    const { x, y, kind } = item; const def = ITEMS[kind];
    const pulse = 1 + Math.sin(now / 300) * 0.12; const r = 14 * pulse;
    ctx.save(); setGlow(ctx, def.color, 22);
    ctx.strokeStyle = def.color; ctx.lineWidth = 2;
    ctx.fillStyle = `rgba(${def.glow},0.2)`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = def.color; ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(def.emoji, x, y);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '7px monospace';
    ctx.fillText(kind === 'shield' ? '실드' : kind === 'ghost' ? '유령' : '부스트', x, y + r + 8);
    clearGlow(ctx); ctx.textBaseline = 'alphabetic'; ctx.restore();
};

const drawRunner = (ctx, x, y, isSliding, isAir, frame, biome, alpha) => {
    ctx.save(); ctx.globalAlpha = Math.min(alpha, 1);
    const ph = isSliding ? PH_SLIDE : PH_STAND;
    const slideOff = isSliding ? PH_STAND - PH_SLIDE : 0;
    const cx = x + PLAYER_W / 2;
    if (alpha >= 0.9) setGlow(ctx, `rgba(${biome.glow},1)`, 20);
    ctx.strokeStyle = biome.accent; ctx.fillStyle = biome.accent;
    if (isSliding) {
        ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.roundRect(x - 4, y + slideOff + ph - 16, PLAYER_W + 8, 16, 6); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 10, y + slideOff + ph - 20, 9, 0, Math.PI * 2); ctx.fill();
    } else {
        const lean = isAir ? -0.1 : 0.05;
        ctx.translate(cx, y + PH_STAND * 0.5); ctx.rotate(lean);
        ctx.fillRect(-7, -8, 14, 26);
        ctx.beginPath(); ctx.arc(0, -18, 9, 0, Math.PI * 2); ctx.fill();
        clearGlow(ctx);
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(-5, -21, 10, 5);
        setGlow(ctx, `rgba(${biome.glow},0.9)`, 8);
        ctx.fillStyle = `rgba(${biome.glow},1)`; ctx.fillRect(-5, -21, 10, 3);
        const cyc = isAir ? 0 : Math.sin((frame / 16) * Math.PI * 2) * 14;
        ctx.strokeStyle = biome.accent; ctx.lineWidth = 5; ctx.lineCap = 'round';
        setGlow(ctx, `rgba(${biome.glow},0.7)`, 8);
        ctx.beginPath(); ctx.moveTo(-3, 18); ctx.lineTo(-3 - cyc * 0.6, 18 + 14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3, 18); ctx.lineTo(3 + cyc * 0.6, 18 + 14); ctx.stroke();
        const arm = isAir ? 0 : Math.sin((frame / 16) * Math.PI * 2 + Math.PI) * 10;
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-7 - arm, 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(7 + arm, 12); ctx.stroke();
    }
    clearGlow(ctx); ctx.restore();
};

const STARS = Array.from({ length: 60 }, () => ({ xr: Math.random(), yr: Math.random() * 0.75, r: Math.random() * 1.3 + 0.3, sp: Math.random() * 0.35 + 0.1 }));
const BUILDINGS = Array.from({ length: 20 }, () => ({ xr: Math.random(), h: 60 + Math.random() * 180, w: 38 + Math.random() * 52, layer: Math.floor(Math.random() * 3), ws: Math.random() }));
const PARALLAX = [0.07, 0.13, 0.20]; const ALPHAS = [0.14, 0.22, 0.35];

const drawBg = (ctx, W, H, gy, dist, biome) => {
    const sky = ctx.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, biome.sky1); sky.addColorStop(1, biome.sky2);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    STARS.forEach(s => {
        const sx = ((s.xr * W - dist * s.sp * 0.08) % W + W) % W;
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath();
        ctx.arc(sx, s.yr * gy, s.r, 0, Math.PI * 2); ctx.fill();
    });
    BUILDINGS.forEach(b => {
        const bx = ((b.xr * W * 1.6 - dist * PARALLAX[b.layer]) % (W * 1.6) + W * 1.6) % (W * 1.6) - 80;
        const top = gy - b.h;
        ctx.save(); ctx.globalAlpha = ALPHAS[b.layer];
        ctx.fillStyle = biome.bg; ctx.strokeStyle = biome.grid; ctx.lineWidth = 1;
        ctx.fillRect(bx, top, b.w, b.h); ctx.strokeRect(bx, top, b.w, b.h);
        ctx.fillStyle = biome.accent;
        for (let r = 0; r < Math.floor(b.h / 20); r++)
            for (let c = 0; c < Math.floor(b.w / 16); c++)
                if (Math.sin(b.ws * 7 + r * 3.1 + c * 1.7) > 0.5) ctx.fillRect(bx + c * 16 + 4, top + r * 20 + 5, 7, 8);
        ctx.restore();
    });
    ctx.save(); ctx.globalAlpha = 0.2; ctx.strokeStyle = biome.grid;
    const off = dist % 80;
    for (let gx = -off; gx < W + 80; gx += 80) { ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 40, H * 1.1); ctx.stroke(); }
    for (let row = 0; row < 5; row++) { ctx.lineWidth = 0.4 - row * 0.06; ctx.beginPath(); ctx.moveTo(0, gy + (H - gy) * (row / 5)); ctx.lineTo(W, gy + (H - gy) * (row / 5)); ctx.stroke(); }
    ctx.restore();
    setGlow(ctx, biome.accent, 18);
    const gg = ctx.createLinearGradient(0, gy, 0, gy + 6);
    gg.addColorStop(0, biome.accent); gg.addColorStop(1, 'transparent');
    ctx.fillStyle = gg; ctx.fillRect(0, gy, W, 4);
    ctx.fillStyle = biome.bg; ctx.fillRect(0, gy + 4, W, H - gy - 4);
    clearGlow(ctx);
};

// ─── Component ────────────────────────────────────────────────────────────────
const GameCanvas = ({ onGameOver, onScoreUpdate, onLevelChange, onComboUpdate, onItemCollect, gameAudio, ghostData }) => {
    const canvasRef = useRef(null); const rafRef = useRef(null); const G = useRef({});

    const getDiff = useCallback(() => {
        const w = window.innerWidth;
        if (w < 480) return { speedMul: 0.80, gapBase: 420, itemGap: 950 };
        if (w < 768) return { speedMul: 0.90, gapBase: 380, itemGap: 850 };
        if (w < 1100) return { speedMul: 1.10, gapBase: 310, itemGap: 720 };
        return { speedMul: 1.28, gapBase: 270, itemGap: 670 };
    }, []);

    const doJump = useCallback(() => {
        const p = G.current.player; if (!p) return;
        if (p.onGround || p.coyoteF > 0) {
            p.vy = JUMP_V; p.jumpCount = 1; p.onGround = false; p.coyoteF = 0;
            gameAudio?.playSFX('click');
        } else if (p.jumpCount === 1) {
            p.vy = DJ_V; p.jumpCount = 2; gameAudio?.playSFX('click');
            const b = BIOMES[G.current.biomeIdx];
            for (let k = 0; k < 10; k++) G.current.particles.push({ x: p.x + PLAYER_W / 2, y: p.y + PH_STAND / 2, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7, life: 1, color: b.trail, size: 3 });
        } else { p.jumpBuf = JUMP_BUF_F; }
    }, [gameAudio]);

    const doSlide = useCallback(() => {
        const p = G.current.player; if (!p) return;
        if (p.onGround && !p.isSliding) { p.isSliding = true; p.slideTimer = SLIDE_MS; gameAudio?.playSFX('click'); }
    }, [gameAudio]);

    useEffect(() => {
        const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + 'px'; canvas.style.height = window.innerHeight + 'px';
            ctx.scale(dpr, dpr);
        };
        resize(); window.addEventListener('resize', resize);
        const W = () => window.innerWidth; const H = () => window.innerHeight; const GY = () => H() * GROUND_RATIO;

        G.current = {
            player: { x: W() * 0.15, y: GY() - PH_STAND, vy: 0, onGround: true, jumpCount: 0, jumpBuf: 0, coyoteF: 0, isSliding: false, slideTimer: 0, isInvul: false, invulTimer: 0, shield: false, animFrame: 0 },
            speed: INIT_SPEED, score: 0, distance: 0, level: 1, combo: 0, maxCombo: 0,
            biomeIdx: 0, obstacles: [], items: [], particles: [], floatTexts: [],
            nextSpawnAt: 300, nextItemAt: 600, frameCount: 0, startTime: performance.now(),
            ghostData: ghostData || null, ghostFrames: [], scoreBoost: 1, boostTimer: 0,
        };
        let lastT = performance.now();

        const render = (g, p, biome, W, H, gy, now) => {
            drawBg(ctx, W, H, gy, g.distance, biome);
            if (g.ghostData) { const gf = g.ghostData[Math.floor(g.frameCount / 2)]; if (gf) drawRunner(ctx, p.x - 55, gf.py, gf.isSliding, gf.py < gy - PH_STAND - 2, g.frameCount, biome, 0.3); }
            g.obstacles.forEach(o => drawObstacle(ctx, o, biome, now));
            g.items.forEach(it => drawItem(ctx, it, now));
            g.particles.forEach(par => { ctx.save(); ctx.globalAlpha = par.life; setGlow(ctx, par.color, 8); ctx.fillStyle = par.color; ctx.beginPath(); ctx.arc(par.x, par.y, par.size, 0, Math.PI * 2); ctx.fill(); clearGlow(ctx); ctx.restore(); });
            const invBlink = p.isInvul && Math.floor(now / 80) % 2 === 0;
            if (!invBlink) drawRunner(ctx, p.x, p.y, p.isSliding, !p.onGround, g.frameCount, biome, 1);
            if (p.shield) { ctx.save(); setGlow(ctx, '#f43f5e', 24); ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + Math.sin(now / 200) * 0.2; ctx.beginPath(); ctx.arc(p.x + PLAYER_W / 2, p.y + PH_STAND / 2, 32, 0, Math.PI * 2); ctx.stroke(); clearGlow(ctx); ctx.restore(); }
            g.floatTexts.forEach(ft => { ctx.save(); ctx.globalAlpha = Math.min(ft.life, 1); setGlow(ctx, ft.color, 10); ctx.fillStyle = ft.color; ctx.font = `bold ${ft.size || 15}px "Orbitron",monospace`; ctx.textAlign = 'left'; ctx.fillText(ft.text, ft.x, ft.y); clearGlow(ctx); ctx.restore(); });
            if (g.boostTimer > 0) { ctx.save(); ctx.globalAlpha = 0.8; setGlow(ctx, '#fbbf24', 8); ctx.fillStyle = '#fbbf24'; ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.fillText(`✦ ×2 부스트 ${(g.boostTimer / 1000).toFixed(1)}s`, W - 16, 52); clearGlow(ctx); ctx.restore(); }
            if (W < 768) { ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = '#fff'; ctx.fillRect(0, H * 0.5, W * 0.5, H * 0.5); ctx.restore(); ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = biome.accent; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText('▼ 슬라이드', W * 0.25, H - 18); ctx.fillText('▲ 점프', W * 0.75, H - 18); ctx.restore(); }
            ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(W / 2 - 90, H - 22, 180, 4);
            setGlow(ctx, biome.accent, 5); ctx.fillStyle = biome.accent;
            ctx.fillRect(W / 2 - 90, H - 22, (g.distance % 2000) / 2000 * 180, 4); clearGlow(ctx);
            ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = biome.accent; ctx.font = '8px "Orbitron",monospace'; ctx.textAlign = 'center';
            ctx.fillText(`LV.${g.level} · ${biome.name} · ${g.speed.toFixed(1)}×`, W / 2, H - 28); ctx.restore();
        };

        const loop = (now) => {
            const dt = Math.min(now - lastT, 50); lastT = now;
            const g = G.current; const p = g.player;
            const W = window.innerWidth; const H = window.innerHeight; const gy = H * GROUND_RATIO;
            const diff = getDiff(); const elapsed = (now - g.startTime) / 1000;
            g.frameCount++;
            const newLv = Math.floor(elapsed / 25) + 1;
            if (newLv > g.level) { g.level = newLv; onLevelChange?.(newLv); g.biomeIdx = Math.floor((newLv - 1) / 2) % BIOMES.length; }
            const biome = BIOMES[g.biomeIdx];
            const tSpeed = Math.min(INIT_SPEED + (g.level - 1) * 0.55 + elapsed * 0.025, MAX_SPEED) * diff.speedMul;
            g.speed += (tSpeed - g.speed) * 0.008;
            g.distance += g.speed * (dt / 16);
            g.score = Math.floor(g.distance * 0.12 + g.combo * 8 * g.scoreBoost);
            onScoreUpdate?.(g.score);
            if (g.boostTimer > 0) { g.boostTimer -= dt; if (g.boostTimer <= 0) { g.scoreBoost = 1; g.boostTimer = 0; } }
            p.vy += GRAVITY; p.y += p.vy * (dt / 16); p.animFrame += dt / 16;
            if (p.y >= gy - PH_STAND) { p.y = gy - PH_STAND; p.vy = 0; p.onGround = true; p.jumpCount = 0; p.coyoteF = COYOTE_F; if (p.jumpBuf > 0) { p.jumpBuf = 0; doJump(); } }
            else { p.onGround = false; if (p.coyoteF > 0) p.coyoteF--; }
            if (p.jumpBuf > 0) p.jumpBuf--;
            if (p.isSliding) { p.slideTimer -= dt; if (p.slideTimer <= 0) p.isSliding = false; }
            if (p.isInvul) { p.invulTimer -= dt; if (p.invulTimer <= 0) p.isInvul = false; }

            if (g.distance >= g.nextSpawnAt) {
                g.obstacles.push(...spawnPattern(g.level, W + 50, gy));
                const gap = Math.max(diff.gapBase - (g.level - 1) * 18, 150);
                g.nextSpawnAt += gap + Math.random() * 70;
            }
            if (g.distance >= g.nextItemAt) {
                const kinds = ['shield', 'ghost', 'boost'];
                g.items.push({ kind: kinds[Math.floor(Math.random() * kinds.length)], x: W + 50, y: gy - 90, collected: false });
                g.nextItemAt += diff.itemGap + Math.random() * 400;
            }
            g.obstacles.forEach(o => { o.x -= g.speed * (dt / 16); if (o.type === 'moving') o.y = o.baseY + Math.sin(now / 700 + o.phase) * o.amp; });
            g.obstacles = g.obstacles.filter(o => o.x + (o.w || 60) > -80);
            g.items.forEach(it => { it.x -= g.speed * (dt / 16); });
            g.items = g.items.filter(it => !it.collected && it.x > -40);

            const ph = p.isSliding ? PH_SLIDE : PH_STAND;
            const slideOff = p.isSliding ? (PH_STAND - PH_SLIDE) : 0;
            const pr = { l: p.x + 4, t: p.y + slideOff + 4, r: p.x + PLAYER_W - 4, b: p.y + slideOff + ph - 4 };

            for (let i = g.obstacles.length - 1; i >= 0; i--) {
                const o = g.obstacles[i];
                const or = { l: o.x + 3, t: o.y + 3, r: o.x + o.w - 3, b: o.y + o.h - 3 };
                const hit = pr.l < or.r && pr.r > or.l && pr.t < or.b && pr.b > or.t;
                if (!o.passed && hit && !p.isInvul) {
                    o.passed = true;
                    if (p.shield) {
                        p.shield = false; p.isInvul = true; p.invulTimer = 1200; gameAudio?.playSFX('collect');
                        g.floatTexts.push({ x: p.x, y: p.y - 30, text: '실드 파괴!', life: 1.5, color: '#f43f5e', size: 14 });
                    } else {
                        for (let k = 0; k < 16; k++) g.particles.push({ x: p.x + PLAYER_W / 2, y: p.y + ph / 2, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 1, color: '#ff4444', size: 4 });
                        gameAudio?.playSFX('crash');
                        render(g, p, biome, W, H, gy, now);
                        onGameOver(g.score, g.maxCombo, g.ghostFrames);
                        cancelAnimationFrame(rafRef.current); return;
                    }
                }
                if (!o.passed && o.x + o.w < p.x) {
                    o.passed = true; g.combo++;
                    if (g.combo > g.maxCombo) g.maxCombo = g.combo;
                    onComboUpdate?.(g.combo);
                    if (g.combo > 0 && g.combo % 5 === 0) { g.floatTexts.push({ x: p.x, y: p.y - 20, text: `✕${g.combo} 연속!`, life: 1.5, color: biome.accent, size: 14 }); gameAudio?.playSFX('collect'); }
                }
            }
            g.items.forEach(it => {
                if (it.collected) return;
                const d = Math.hypot(it.x - (p.x + PLAYER_W / 2), it.y - (p.y + PH_STAND / 2));
                if (d < 36) {
                    it.collected = true; onItemCollect?.(it.kind); gameAudio?.playSFX('collect');
                    if (it.kind === 'shield') { p.shield = true; g.floatTexts.push({ x: p.x, y: p.y - 25, text: '♥ 실드 장착!', life: 2, color: '#f43f5e', size: 15 }); }
                    else if (it.kind === 'ghost') { p.isInvul = true; p.invulTimer = 4000; g.floatTexts.push({ x: p.x, y: p.y - 25, text: '◈ 유령 4초!', life: 2, color: '#a78bfa', size: 15 }); }
                    else { g.scoreBoost = 2; g.boostTimer = 8000; g.floatTexts.push({ x: p.x, y: p.y - 25, text: '✦ ×2 부스트!', life: 2, color: '#fbbf24', size: 15 }); }
                    const def = ITEMS[it.kind];
                    for (let k = 0; k < 10; k++) g.particles.push({ x: it.x, y: it.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 0.9, color: def.color, size: 3 });
                }
            });
            if (g.frameCount % 4 === 0) g.particles.push({ x: p.x + PLAYER_W / 2, y: p.y + (p.isSliding ? PH_SLIDE : PH_STAND) - 4, vx: -g.speed * 0.4 - Math.random(), vy: (Math.random() - 0.5) * 1.5, life: 0.65, color: biome.trail, size: 2.5 });
            g.particles = g.particles.filter(par => { par.x += par.vx; par.y += par.vy; par.life -= 0.03; return par.life > 0; });
            g.floatTexts = g.floatTexts.filter(ft => { ft.y -= 0.8; ft.life -= 0.025; return ft.life > 0; });
            if (g.frameCount % 2 === 0) g.ghostFrames.push({ py: p.y, isSliding: p.isSliding });
            render(g, p, biome, W, H, gy, now);
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);

        const touchRef = { sx: 0, sy: 0 };
        const onKey = e => {
            if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) { e.preventDefault(); doJump(); }
            if (['ArrowDown', 's', 'S', 'Control'].includes(e.key)) { e.preventDefault(); doSlide(); }
        };
        const onTouchStart = e => { e.preventDefault(); touchRef.sx = e.touches[0].clientX; touchRef.sy = e.touches[0].clientY; };
        const onTouchEnd = e => {
            e.preventDefault(); const t = e.changedTouches[0];
            const dx = t.clientX - touchRef.sx, dy = t.clientY - touchRef.sy;
            const isSwipe = Math.max(Math.abs(dx), Math.abs(dy)) > 28;
            if (!isSwipe) { if (t.clientX < window.innerWidth * 0.5) doSlide(); else doJump(); }
            else if (Math.abs(dy) > Math.abs(dx)) { if (dy < -20) doJump(); else doSlide(); }
            else doJump();
        };
        const onMouse = e => { if (e.clientX < window.innerWidth * 0.45) doSlide(); else doJump(); };
        window.addEventListener('keydown', onKey);
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd, { passive: false });
        canvas.addEventListener('mousedown', onMouse);
        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', onKey);
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchend', onTouchEnd);
            canvas.removeEventListener('mousedown', onMouse);
        };
    }, [doJump, doSlide, getDiff, ghostData, onGameOver, onScoreUpdate, onLevelChange, onComboUpdate, onItemCollect, gameAudio]);

    return <canvas ref={canvasRef} className="fixed inset-0 z-0" style={{ touchAction: 'none', cursor: 'none', userSelect: 'none' }} />;
};
export default GameCanvas;
