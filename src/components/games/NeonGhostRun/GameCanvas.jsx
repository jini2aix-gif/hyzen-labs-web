import React, { useRef, useEffect, useCallback } from 'react';

// ── Constants ───────────────────────────────────────────────────────────────
const GRAVITY = 0.42;
const JUMP_V = -12.5;
const DJ_V = -10.5;   // double-jump
const SLIDE_MS = 650;
const COYOTE_FRAMES = 8;
const JUMP_BUFFER_F = 10;      // frames of jump-input buffering
const PLAYER_W = 28;
const PH_STAND = 52;
const PH_SLIDE = 20;
const GROUND_RATIO = 0.80;
const INITIAL_SPEED = 3.0;
const MAX_SPEED = 7.5;

// Biomes
const BIOMES = [
    { name: 'NEON CITY', bg: '#06030F', sky1: '#0d0621', sky2: '#120830', grid: '#3b1f6e', accent: '#c026d3', glow: '192,38,211', obst: '#c026d3', trail: '#e879f9' },
    { name: 'DATA STREAM', bg: '#030A10', sky1: '#031220', sky2: '#041a2e', grid: '#0c4a6e', accent: '#0ea5e9', glow: '14,165,233', obst: '#0ea5e9', trail: '#7dd3fc' },
    { name: 'VOID SECTOR', bg: '#0F0305', sky1: '#1a0309', sky2: '#220410', grid: '#7f1d1d', accent: '#f43f5e', glow: '244,63,94', obst: '#f43f5e', trail: '#fb7185' },
    { name: 'HYZEN ZONE', bg: '#030A05', sky1: '#041208', sky2: '#051a0a', grid: '#14532d', accent: '#22c55e', glow: '34,197,94', obst: '#22c55e', trail: '#86efac' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const setGlow = (ctx, color, blur) => { ctx.shadowColor = color; ctx.shadowBlur = blur; };
const clearGlow = ctx => { ctx.shadowBlur = 0; };
const lerp = (a, b, t) => a + (b - a) * t;

// ── Character drawing ────────────────────────────────────────────────────────
const drawRunner = (ctx, x, y, isSliding, isAir, frame, biome, alpha = 1) => {
    const b = biome;
    const a = Math.min(alpha, 1);
    ctx.save();
    ctx.globalAlpha = a;

    const ph = isSliding ? PH_SLIDE : PH_STAND;
    const slideY = isSliding ? PH_STAND - PH_SLIDE : 0;
    const cx = x + PLAYER_W / 2;
    const fy = y + slideY; // feet y = y + ph
    const sw = a < 1 ? 0 : 10; // ghost no glow

    // -- Glow aura --
    if (sw > 0) {
        setGlow(ctx, `rgba(${b.glow},0.9)`, 22);
    }

    if (isSliding) {
        // Sliding: flat elongated body
        ctx.fillStyle = b.accent;
        ctx.beginPath();
        ctx.roundRect(x - 6, fy + ph - 14, PLAYER_W + 12, 14, 6);
        ctx.fill();
        // Head (tuck)
        ctx.beginPath();
        ctx.arc(cx + 8, fy + ph - 18, 9, 0, Math.PI * 2);
        ctx.fill();
    } else {
        const lean = isAir ? -0.12 : 0.06; // lean back in air, forward on run
        ctx.translate(cx, y);
        ctx.rotate(lean);

        // Body
        ctx.fillStyle = b.accent;
        ctx.beginPath();
        ctx.roundRect(-7, 10, 14, 26, 4);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(0, 6, 9, 0, Math.PI * 2);
        ctx.fill();

        // Visor
        clearGlow(ctx);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(-5, 2, 10, 5);
        setGlow(ctx, `rgba(${b.glow},0.9)`, 8);
        ctx.fillStyle = `rgba(${b.glow},0.9)`;
        ctx.fillRect(-5, 2, 10, 3);

        // Legs animation
        const cycle = (frame % 16) / 16 * Math.PI * 2;
        const legSwing = isAir ? 0 : Math.sin(cycle) * 14;
        ctx.strokeStyle = b.accent;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        setGlow(ctx, `rgba(${b.glow},0.7)`, 10);

        // Left leg
        ctx.beginPath();
        ctx.moveTo(-3, 36);
        ctx.lineTo(-3 - legSwing * 0.5, 36 + 14);
        ctx.stroke();
        // Right leg
        ctx.beginPath();
        ctx.moveTo(3, 36);
        ctx.lineTo(3 + legSwing * 0.5, 36 + 14);
        ctx.stroke();

        // Arms
        const armSwing = isAir ? 0 : Math.sin(cycle + Math.PI) * 10;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-7, 18);
        ctx.lineTo(-7 - armSwing, 28);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(7, 18);
        ctx.lineTo(7 + armSwing, 28);
        ctx.stroke();
    }

    clearGlow(ctx);
    ctx.restore();
};

// ── Obstacle drawing ─────────────────────────────────────────────────────────
const drawObstacle = (ctx, obs, biome) => {
    const { x, y, w, h, type } = obs;
    ctx.save();
    setGlow(ctx, biome.accent, 18);
    ctx.strokeStyle = biome.obst;
    ctx.lineWidth = 2.5;
    ctx.fillStyle = `rgba(${biome.glow},0.12)`;

    if (type === 'aerial') {
        // Aerial: floating bar with spikes pointing down
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 4);
        ctx.fill();
        ctx.stroke();
        // Arrow indicators (slide cue)
        ctx.fillStyle = biome.obst;
        ctx.font = `bold 11px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('▼ SLIDE', x + w / 2, y + h + 16);
    } else if (type === 'ground') {
        // Ground: solid neon block
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 5);
        ctx.fill();
        ctx.stroke();
        // Scanline
        ctx.fillStyle = `rgba(${biome.glow},0.4)`;
        ctx.fillRect(x + 4, y + 4, w - 8, 4);
        // Jump indicator (early levels)
        if (obs.showHint) {
            ctx.fillStyle = biome.obst;
            ctx.font = `bold 10px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('▲ JUMP', x + w / 2, y - 10);
        }
    } else if (type === 'moving') {
        // Moving: rounded diamond
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.roundRect(-w * 0.45, -h * 0.45, w * 0.9, h * 0.9, 4);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    clearGlow(ctx);
    ctx.restore();
};

// ── Background ────────────────────────────────────────────────────────────────
const buildingCache = Array.from({ length: 18 }, (_, i) => ({
    xRatio: (i / 18) + Math.random() * 0.06,
    h: 60 + Math.random() * 180,
    w: 38 + Math.random() * 52,
    layer: i % 3,
    wSeed: Math.random(),
}));
const stars = Array.from({ length: 60 }, () => ({
    xr: Math.random(), yr: Math.random() * 0.75,
    r: Math.random() * 1.3 + 0.3, speed: Math.random() * 0.4 + 0.1,
}));

const drawBackground = (ctx, w, h, gy, scrollDist, biome, beatPulse) => {
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, biome.sky1);
    sky.addColorStop(1, biome.sky2);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Stars
    stars.forEach(s => {
        const sx = ((s.xr * w - scrollDist * s.speed * 0.08) % w + w) % w;
        const sy = s.yr * gy;
        ctx.fillStyle = `rgba(255,255,255,${0.35 + s.r * 0.12})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r * beatPulse, 0, Math.PI * 2);
        ctx.fill();
    });

    // Build parallax layers
    buildingCache.forEach(b => {
        const parallax = [0.08, 0.14, 0.22][b.layer];
        const alpha = [0.15, 0.25, 0.38][b.layer];
        const bx = ((b.xRatio * w * 1.6 - scrollDist * parallax) % (w * 1.6) + w * 1.6) % (w * 1.6) - 80;
        const top = gy - b.h;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = biome.bg;
        ctx.strokeStyle = biome.grid;
        ctx.lineWidth = 1;
        ctx.fillRect(bx, top, b.w, b.h);
        ctx.strokeRect(bx, top, b.w, b.h);
        // windows
        ctx.fillStyle = biome.accent;
        for (let wr = 0; wr < Math.floor(b.h / 20); wr++) {
            for (let wc = 0; wc < Math.floor(b.w / 16); wc++) {
                if (Math.sin(b.wSeed * 7 + wr * 3.1 + wc * 1.7) > 0.5)
                    ctx.fillRect(bx + wc * 16 + 4, top + wr * 20 + 5, 7, 8);
            }
        }
        ctx.restore();
    });

    // Perspective grid on floor
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = biome.grid;
    const gridOff = scrollDist % 80;
    for (let gx = -gridOff; gx < w + 80; gx += 80) {
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 40, h * 1.1); ctx.stroke();
    }
    for (let gr = 0; gr < 5; gr++) {
        const ly = gy + (h - gy) * (gr / 5);
        ctx.lineWidth = 0.4 - gr * 0.06;
        ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(w, ly); ctx.stroke();
    }
    ctx.restore();

    // Ground glow line
    setGlow(ctx, biome.accent, 20);
    const gg = ctx.createLinearGradient(0, gy, 0, gy + 6);
    gg.addColorStop(0, biome.accent);
    gg.addColorStop(1, 'transparent');
    ctx.fillStyle = gg;
    ctx.fillRect(0, gy, w, 4);
    ctx.fillStyle = biome.bg;
    ctx.fillRect(0, gy + 4, w, h - gy - 4);
    clearGlow(ctx);
};

// ── Main Component ───────────────────────────────────────────────────────────
const GameCanvas = ({ onGameOver, onScoreUpdate, onLevelChange, onComboUpdate, gameAudio, ghostData }) => {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);

    // All mutable game state in one ref (no re-renders during play)
    const G = useRef({});

    const getDiff = useCallback(() => {
        const w = window.innerWidth;
        if (w < 480) return { speedMul: 0.80, gapBase: 380 };
        if (w < 768) return { speedMul: 0.90, gapBase: 340 };
        if (w < 1100) return { speedMul: 1.10, gapBase: 280 };
        return { speedMul: 1.28, gapBase: 240 };
    }, []);

    const doJump = useCallback(() => {
        const p = G.current.player;
        if (!p) return;
        if (p.onGround || p.coyoteFrames > 0) {
            p.vy = JUMP_V; p.jumpCount = 1; p.onGround = false; p.coyoteFrames = 0;
            gameAudio?.playSFX('click');
        } else if (p.jumpCount === 1) {
            p.vy = DJ_V; p.jumpCount = 2;
            gameAudio?.playSFX('click');
            // double-jump burst particles
            G.current.particles.push(...Array.from({ length: 8 }, () => ({
                x: p.x + PLAYER_W / 2, y: p.y + PH_STAND / 2,
                vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
                life: 1, color: BIOMES[G.current.biomeIdx].trail, size: 3,
            })));
        } else {
            p.jumpBuffer = JUMP_BUFFER_F; // buffer for landing
        }
    }, [gameAudio]);

    const doSlide = useCallback(() => {
        const p = G.current.player;
        if (!p) return;
        if (p.onGround && !p.isSliding) {
            p.isSliding = true; p.slideTimer = SLIDE_MS;
            gameAudio?.playSFX('click');
        }
    }, [gameAudio]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            ctx.scale(dpr, dpr);
        };
        resize();
        window.addEventListener('resize', resize);

        const W = () => window.innerWidth;
        const H = () => window.innerHeight;
        const GY = () => H() * GROUND_RATIO;

        // ── Init state ───────────────────────────────────────────────────────
        const initState = () => ({
            player: {
                x: W() * 0.15, y: GY() - PH_STAND,
                vy: 0, onGround: true, jumpCount: 0,
                isSliding: false, slideTimer: 0,
                coyoteFrames: 0, jumpBuffer: 0,
                isInvul: false, invulTimer: 0,
                animFrame: 0,
            },
            speed: INITIAL_SPEED,
            score: 0,
            distance: 0,
            level: 1,
            combo: 0,
            maxCombo: 0,
            biomeIdx: 0,
            obstacles: [],
            particles: [],
            floatTexts: [],
            nextSpawnAt: 300,  // spawn first obstacle at 300px distance
            frameCount: 0,
            startTime: performance.now(),
            ghostFrame: 0,
            ghostData: ghostData || null,
            ghostFrames: [],   // recording current run
            screenShake: 0,
            beatPhase: 0,
        });

        G.current = initState();

        // ── Obstacle factory (y-position pre-calculated) ──────────────────────
        const makeObstacle = (type, gy, showHint) => {
            const x = W() + 40;
            if (type === 'ground') return { type, x, y: gy - 52, w: 38, h: 52, showHint };
            if (type === 'aerial') {
                // aerial: floating, player must slide under
                // obsBottom = gy-40 → hits standing (top=gy-52) since gy-52 < gy-40 ✓
                //                    → misses sliding  (top=gy-20) since gy-20 > gy-40 ✓
                return { type, x, y: gy - 90, w: 50, h: 50, showHint };
            }
            if (type === 'moving') return {
                type, x, baseY: gy - 100, y: gy - 100, w: 32, h: 32,
                amp: 55, phase: Math.random() * Math.PI * 2, showHint,
            };
            return null;
        };

        const spawnObstacle = (g, gy) => {
            const lv = g.level;
            const roll = Math.random();
            // Level 1: only ground; Level 2+: aerial; Level 4+: moving
            let type;
            if (lv === 1 || roll < 0.55) type = 'ground';
            else if (lv < 4 || roll < 0.78) type = 'aerial';
            else type = 'moving';
            const showHint = lv <= 2; // show hints in early levels
            g.obstacles.push(makeObstacle(type, gy, showHint));

            // Occasionally add a second obstacle separated by ~200px (combos at lv3+)
            if (lv >= 3 && Math.random() < 0.3) {
                const second = type === 'ground' ? 'aerial' : 'ground';
                const obs = makeObstacle(second, gy, false);
                if (obs) { obs.x += 200; g.obstacles.push(obs); }
            }
        };

        // ── Main loop ─────────────────────────────────────────────────────────
        let lastT = performance.now();

        const loop = (now) => {
            const dt = Math.min(now - lastT, 50);
            lastT = now;
            const g = G.current;
            const p = g.player;
            const width = W(); const height = H(); const gy = GY();
            const diff = getDiff();
            const elapsed = (now - g.startTime) / 1000;
            g.frameCount++;
            g.beatPhase = (now / 400) * Math.PI * 2;

            // ── Level (every 25s) ─────────────────────────────────────────────
            const newLv = Math.floor(elapsed / 25) + 1;
            if (newLv > g.level) {
                g.level = newLv;
                onLevelChange?.(newLv);
                g.biomeIdx = Math.floor((newLv - 1) / 2) % BIOMES.length;
            }
            const biome = BIOMES[g.biomeIdx];

            // ── Speed (smooth ramp) ────────────────────────────────────────────
            const targetSpeed = Math.min(
                INITIAL_SPEED + (g.level - 1) * 0.5 + elapsed * 0.025,
                MAX_SPEED
            ) * diff.speedMul;
            g.speed += (targetSpeed - g.speed) * 0.008;

            // ── Distance & Score ───────────────────────────────────────────────
            g.distance += g.speed * (dt / 16);
            g.score = Math.floor(g.distance * 0.12 + g.combo * 8);
            onScoreUpdate?.(g.score);

            // ── Player physics ─────────────────────────────────────────────────
            p.vy += GRAVITY;
            p.y += p.vy * (dt / 16);
            p.animFrame += dt / 16;

            // Landing
            if (p.y >= gy - PH_STAND) {
                p.y = gy - PH_STAND; p.vy = 0;
                p.onGround = true; p.jumpCount = 0; p.coyoteFrames = COYOTE_FRAMES;
                // Buffered jump landing
                if (p.jumpBuffer > 0) { p.jumpBuffer = 0; doJump(); }
            } else {
                p.onGround = false;
                if (p.coyoteFrames > 0) p.coyoteFrames--;
            }
            if (p.jumpBuffer > 0) p.jumpBuffer--;

            // Slide timer
            if (p.isSliding) {
                p.slideTimer -= dt;
                if (p.slideTimer <= 0) p.isSliding = false;
            }

            // Invulnerability
            if (p.isInvul) { p.invulTimer -= dt; if (p.invulTimer <= 0) p.isInvul = false; }

            // ── Spawn obstacles (distance-based) ──────────────────────────────
            if (g.distance >= g.nextSpawnAt) {
                spawnObstacle(g, gy);
                const gap = Math.max(diff.gapBase - g.level * 15, 160);
                g.nextSpawnAt += gap + Math.random() * 80;
            }

            // ── Update obstacles ───────────────────────────────────────────────
            g.obstacles.forEach(o => {
                o.x -= g.speed * (dt / 16);
                if (o.type === 'moving') {
                    o.y = o.baseY + Math.sin(now / 700 + o.phase) * o.amp;
                }
            });
            g.obstacles = g.obstacles.filter(o => o.x + (o.w || 50) > -60);

            // ── Collision ──────────────────────────────────────────────────────
            const ph = p.isSliding ? PH_SLIDE : PH_STAND;
            const slideOff = p.isSliding ? (PH_STAND - PH_SLIDE) : 0;
            const pr = { x: p.x + 4, y: p.y + slideOff + 4, r: p.x + PLAYER_W - 4, b: p.y + slideOff + ph - 4 };

            for (let i = g.obstacles.length - 1; i >= 0; i--) {
                const o = g.obstacles[i];
                const or = { x: o.x + 3, y: o.y + 3, r: o.x + o.w - 3, b: o.y + o.h - 3 };
                const hit = pr.x < or.r && pr.r > or.x && pr.y < or.b && pr.b > or.y;
                if (!o.passed && hit && !p.isInvul) {
                    // game over
                    gameAudio?.playSFX('crash');
                    for (let k = 0; k < 16; k++) g.particles.push({
                        x: p.x + PLAYER_W / 2, y: p.y + ph / 2,
                        vx: (Math.random() - 0.5) * 9, vy: (Math.random() - 0.5) * 9,
                        life: 1, color: '#ff4444', size: 4,
                    });
                    // render one last frame then call gameover
                    renderFrame(g, p, biome, width, height, gy, now);
                    onGameOver(g.score, g.maxCombo, g.ghostFrames);
                    cancelAnimationFrame(rafRef.current);
                    return;
                }
                if (!o.passed && o.x + o.w < p.x) {
                    o.passed = true;
                    g.combo++; if (g.combo > g.maxCombo) g.maxCombo = g.combo;
                    onComboUpdate?.(g.combo);
                    if (g.combo > 0 && g.combo % 5 === 0) {
                        g.floatTexts.push({ x: p.x, y: p.y - 20, text: `✕${g.combo} COMBO!`, life: 1.5, color: biome.accent, size: 15 });
                        gameAudio?.playSFX('collect');
                    }
                }
            }

            // ── Ghost frame record (every 2 frames) ───────────────────────────
            if (g.frameCount % 2 === 0) g.ghostFrames.push({ py: p.y, isSliding: p.isSliding });

            // ── Particles ──────────────────────────────────────────────────────
            // Trail
            if (g.frameCount % 4 === 0) g.particles.push({
                x: p.x + PLAYER_W / 2 - g.speed * 2,
                y: p.y + (p.isSliding ? PH_SLIDE : PH_STAND) - 4,
                vx: -g.speed * 0.4 - Math.random(),
                vy: (Math.random() - 0.5) * 1.5,
                life: 0.7, color: biome.trail, size: 2.5,
            });
            g.particles = g.particles.filter(par => {
                par.x += par.vx; par.y += par.vy; par.life -= 0.035;
                return par.life > 0;
            });
            g.floatTexts = g.floatTexts.filter(ft => { ft.y -= 0.8; ft.life -= 0.025; return ft.life > 0; });

            if (g.screenShake > 0) g.screenShake -= dt / 16;

            renderFrame(g, p, biome, width, height, gy, now);
            rafRef.current = requestAnimationFrame(loop);
        };

        // ── Render ─────────────────────────────────────────────────────────────
        const renderFrame = (g, p, biome, width, height, gy, now) => {
            const beatPulse = 1 + Math.sin(g.beatPhase) * 0.04;
            ctx.save();
            if (g.screenShake > 0) {
                const s = g.screenShake * 3;
                ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
            }

            // Background
            drawBackground(ctx, width, height, gy, g.distance, biome, beatPulse);

            // Ghost
            if (g.ghostData) {
                const gIdx = Math.floor(g.frameCount / 2);
                if (gIdx < g.ghostData.length) {
                    const gf = g.ghostData[gIdx];
                    ctx.save(); ctx.globalAlpha = 0.35;
                    drawRunner(ctx, p.x - 50, gf.py, gf.isSliding, gf.py < gy - PH_STAND - 2, g.frameCount, biome, 0.35);
                    ctx.restore();
                }
            }

            // Obstacles
            g.obstacles.forEach(o => drawObstacle(ctx, o, biome));

            // Particles
            g.particles.forEach(par => {
                ctx.save();
                ctx.globalAlpha = par.life;
                setGlow(ctx, par.color, 8);
                ctx.fillStyle = par.color;
                ctx.beginPath(); ctx.arc(par.x, par.y, par.size, 0, Math.PI * 2); ctx.fill();
                clearGlow(ctx); ctx.restore();
            });

            // Player
            const ph = p.isSliding ? PH_SLIDE : PH_STAND;
            const invulBlink = p.isInvul && Math.floor(now / 80) % 2 === 0;
            if (!invulBlink) {
                drawRunner(ctx, p.x, p.y, p.isSliding, !p.onGround, g.frameCount, biome, 1);
            }

            // Float texts
            g.floatTexts.forEach(ft => {
                ctx.save();
                ctx.globalAlpha = Math.min(ft.life, 1);
                setGlow(ctx, ft.color, 10);
                ctx.fillStyle = ft.color;
                ctx.font = `bold ${ft.size}px "Orbitron", monospace`;
                ctx.textAlign = 'left';
                ctx.fillText(ft.text, ft.x, ft.y);
                clearGlow(ctx); ctx.restore();
            });

            // Mobile control hint zones (subtle, always touchable)
            if (width < 768) {
                ctx.save();
                ctx.globalAlpha = 0.07;
                ctx.fillStyle = '#ffffff';
                // Left zone = slide
                ctx.fillRect(0, height * 0.5, width * 0.5, height * 0.5);
                // Right zone = jump (nothing, just conceptual)
                ctx.globalAlpha = 0.04;
                ctx.fillRect(width * 0.5, 0, width * 0.5, height);
                ctx.restore();
                // Labels
                ctx.save();
                ctx.globalAlpha = 0.18;
                ctx.fillStyle = biome.accent;
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('▼ SLIDE', width * 0.25, height - 20);
                ctx.fillText('▲ JUMP', width * 0.75, height - 20);
                ctx.restore();
            }

            // Distance progress bar
            const nextMilestone = Math.ceil(g.distance / 2000) * 2000;
            const prog = (g.distance % 2000) / 2000;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(width / 2 - 90, height - 24, 180, 5);
            setGlow(ctx, biome.accent, 6);
            ctx.fillStyle = biome.accent;
            ctx.fillRect(width / 2 - 90, height - 24, prog * 180, 5);
            clearGlow(ctx);

            // Level indicator (bottom center)
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = biome.accent;
            ctx.font = '9px "Orbitron", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`LV.${g.level} · ${biome.name} · ${g.speed.toFixed(1)}x`, width / 2, height - 30);
            ctx.restore();

            ctx.restore(); // screen-shake restore
        };

        rafRef.current = requestAnimationFrame(loop);

        // ── Input ──────────────────────────────────────────────────────────────
        const touchRef = { startX: 0, startY: 0, t: 0 };

        const onKey = (e) => {
            if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) { e.preventDefault(); doJump(); }
            if (['ArrowDown', 's', 'S', 'Control'].includes(e.key)) { e.preventDefault(); doSlide(); }
        };

        const onTouchStart = (e) => {
            e.preventDefault();
            const t = e.touches[0];
            Object.assign(touchRef, { startX: t.clientX, startY: t.clientY, t: Date.now() });
        };

        const onTouchEnd = (e) => {
            e.preventDefault();
            const t = e.changedTouches[0];
            const dx = t.clientX - touchRef.startX;
            const dy = t.clientY - touchRef.startY;
            const duration = Date.now() - touchRef.t;
            const isSwipe = Math.max(Math.abs(dx), Math.abs(dy)) > 30;

            if (!isSwipe) {
                // Tap: left half → slide, right half → jump
                if (t.clientX < W() * 0.5) doSlide();
                else doJump();
            } else {
                // Swipe
                if (Math.abs(dy) > Math.abs(dx)) {
                    if (dy < -20) doJump();
                    else doSlide();
                } else {
                    doJump(); // horizontal swipe → jump
                }
            }
        };

        const onMouseDown = (e) => {
            if (e.clientX < W() * 0.4) doSlide(); else doJump();
        };

        window.addEventListener('keydown', onKey);
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd, { passive: false });
        canvas.addEventListener('mousedown', onMouseDown);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', onKey);
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchend', onTouchEnd);
            canvas.removeEventListener('mousedown', onMouseDown);
        };
    }, [doJump, doSlide, getDiff, ghostData, onGameOver, onScoreUpdate, onLevelChange, onComboUpdate, gameAudio]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0"
            style={{ touchAction: 'none', cursor: 'none', userSelect: 'none' }}
        />
    );
};

export default GameCanvas;
