import React, { useRef, useEffect, useCallback } from 'react';

// ─── NEON GHOST RUN — GameCanvas v1.0 ─────────────────────────────────────
// Side-scrolling parkour runner with:
//   · AI Ghost (your best run replayed as a competing ghost)
//   · Kyle-AI adaptive difficulty (analyzes death zones, adjusts patterns)
//   · Combo multiplier system
//   · Biome transitions (City → DataStream → Void → Neon City)
//   · Rhythm-synced spawns (BPM-locked obstacle generation)
//   · 4-tier device difficulty scaling

const GRAVITY = 0.55;
const JUMP_FORCE = -13.5;
const DOUBLE_JUMP_FORCE = -11;
const SLIDE_DURATION = 600; // ms
const GROUND_Y_RATIO = 0.78; // ground line at 78% of screen height
const PLAYER_W = 28;
const PLAYER_H_NORMAL = 46;
const PLAYER_H_SLIDE = 22;
const BPM = 128; // rhythmic spawn base
const BEAT_MS = (60 / BPM) * 1000;

const BIOMES = [
    {
        name: 'NEON CITY',
        sky: ['#050510', '#0a0520'],
        accent: '#c026d3',
        ground: '#1a0030',
        grid: '#6d28d9',
        obstacleColor: '#c026d3',
        glowColor: 'rgba(192,38,211,',
        particleColor: '#e879f9',
    },
    {
        name: 'DATA STREAM',
        sky: ['#001520', '#002535'],
        accent: '#00d1ff',
        ground: '#002040',
        grid: '#0ea5e9',
        obstacleColor: '#00d1ff',
        glowColor: 'rgba(0,209,255,',
        particleColor: '#7dd3fc',
    },
    {
        name: 'VOID SECTOR',
        sky: ['#040408', '#080812'],
        accent: '#f43f5e',
        ground: '#1a0010',
        grid: '#be123c',
        obstacleColor: '#f43f5e',
        glowColor: 'rgba(244,63,94,',
        particleColor: '#fb7185',
    },
    {
        name: 'HYZEN ZONE',
        sky: ['#041208', '#081a10'],
        accent: '#4ade80',
        ground: '#041208',
        grid: '#16a34a',
        obstacleColor: '#4ade80',
        glowColor: 'rgba(74,222,128,',
        particleColor: '#86efac',
    },
];

const GameCanvas = ({ onGameOver, onScoreUpdate, onLevelChange, onComboUpdate, gameAudio, ghostData, onFrameRecord }) => {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const stateRef = useRef({
        // Player
        px: 0, py: 0, vy: 0,
        onGround: false,
        isSliding: false,
        slideUntil: 0,
        jumpCount: 0,          // 0 = on ground, 1 = single jump, 2 = double jump
        isInvulnerable: false,
        invulUntil: 0,
        // Score / Level
        score: 0,
        distance: 0,
        level: 1,
        combo: 0,
        maxCombo: 0,
        // Speed
        baseSpeed: 5,
        scrollSpeed: 5,
        // Biome
        biomeIndex: 0,
        biomeTransition: 0,    // 0-1 transition progress
        // Obstacles
        obstacles: [],
        particles: [],
        floatTexts: [],
        bgElements: [],
        starfield: [],
        // Ghost
        ghostFrames: [],               // recorded ghost frames for next run
        ghostPlayback: null,           // ghost being replayed
        ghostFrame: 0,
        // Beat
        nextBeatTime: 0,
        beatPhase: 0,
        // Kyle-AI
        aiDeathZones: [],
        aiPatternBias: { gapFreq: 0.5, wallFreq: 0.5 },
        // Timing
        startTime: 0,
        elapsedMs: 0,
        frameCount: 0,
    });

    // ─── Device difficulty ────────────────────────────────────────────────
    const getDiff = () => {
        const w = window.innerWidth;
        if (w < 480) return { speedMult: 0.82, spawnMult: 0.78, gapMin: 260 };
        if (w < 768) return { speedMult: 0.90, spawnMult: 0.88, gapMin: 220 };
        if (w < 1100) return { speedMult: 1.15, spawnMult: 1.12, gapMin: 180 };
        return { speedMult: 1.35, spawnMult: 1.30, gapMin: 150 };
    };

    // ─── Input handlers ───────────────────────────────────────────────────
    const inputRef = useRef({ jumpPressed: false, slidePressed: false });
    const touchStartRef = useRef({ x: 0, y: 0 });

    const doJump = useCallback(() => {
        const s = stateRef.current;
        if (s.onGround || s.jumpCount < 2) {
            if (s.jumpCount === 0) {
                s.vy = JUMP_FORCE;
                s.jumpCount = 1;
                gameAudio?.playSFX('click');
            } else if (s.jumpCount === 1) {
                s.vy = DOUBLE_JUMP_FORCE;
                s.jumpCount = 2;
                gameAudio?.playSFX('click');
                // Double jump particle burst
                for (let i = 0; i < 8; i++) {
                    s.particles.push({
                        x: s.px + PLAYER_W / 2,
                        y: s.py + PLAYER_H_NORMAL / 2,
                        vx: (Math.random() - 0.5) * 5,
                        vy: (Math.random() - 0.5) * 5,
                        life: 0.8,
                        color: BIOMES[s.biomeIndex].particleColor,
                        size: 3 + Math.random() * 3,
                    });
                }
            }
            s.isSliding = false;
        }
    }, [gameAudio]);

    const doSlide = useCallback(() => {
        const s = stateRef.current;
        if (s.onGround) {
            s.isSliding = true;
            s.slideUntil = performance.now() + SLIDE_DURATION;
        }
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const s = stateRef.current;

        // ─── Canvas sizing ──────────────────────────────────────────────
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.scale(dpr, dpr);
        };
        resize();
        window.addEventListener('resize', resize);

        const W = () => window.innerWidth;
        const H = () => window.innerHeight;
        const groundY = () => H() * GROUND_Y_RATIO;

        // ─── Init player & state ────────────────────────────────────────
        s.px = W() * 0.18;
        s.py = groundY() - PLAYER_H_NORMAL;
        s.vy = 0;
        s.onGround = true;
        s.startTime = performance.now();
        s.nextBeatTime = s.startTime + BEAT_MS;
        s.scrollSpeed = getDiff().speedMult * 5;
        s.baseSpeed = s.scrollSpeed;

        // Starfield
        s.starfield = Array.from({ length: 80 }, () => ({
            x: Math.random() * W(),
            y: Math.random() * groundY() * 0.8,
            r: Math.random() * 1.5 + 0.3,
            speed: Math.random() * 0.5 + 0.2,
        }));

        // ─── Obstacle factory ───────────────────────────────────────────
        const OBSTACLE_TYPES = {
            // Ground block: player must JUMP
            ground: (x, biome) => ({ x, y: 0, w: 28, h: 48, type: 'ground', biome }),
            // Tall ground block: player must DOUBLE JUMP or avoid
            tall: (x, biome) => ({ x, y: 0, w: 24, h: 80, type: 'tall', biome }),
            // Gap: just a missing platform section (platform system)
            aerial: (x, biome) => ({ x, y: 0, w: 36, h: 30, type: 'aerial', biome }), // must SLIDE
            // Moving: up-down floating
            moving: (x, biome, amplitude) => ({
                x, y: 0, w: 26, h: 26, type: 'moving', biome,
                amplitude: amplitude || 80, phase: Math.random() * Math.PI * 2,
            }),
        };

        const spawnObstacle = (forced = false) => {
            const diff = getDiff();
            const existing = s.obstacles;
            const lastX = existing.length ? existing[existing.length - 1].x : -9999;
            const minGap = diff.gapMin + Math.max(0, 4 - s.level) * 30;
            const screenRight = W() + 80;

            if (!forced && screenRight - lastX < minGap) return;

            const biome = BIOMES[s.biomeIndex];
            const roll = Math.random();
            let obs;

            // Kyle-AI bias: if player dies to aerial a lot → reduce aerial; to ground → reduce ground
            const aerialWeight = Math.max(0.2, 0.45 - s.aiPatternBias.wallFreq * 0.2);
            const movingWeight = s.level > 3 ? 0.25 : 0;

            if (roll < aerialWeight) {
                obs = OBSTACLE_TYPES.aerial(screenRight, biome.obstacleColor);
            } else if (roll < aerialWeight + movingWeight) {
                obs = OBSTACLE_TYPES.moving(screenRight, biome.obstacleColor);
            } else if (roll < 0.85) {
                obs = OBSTACLE_TYPES.ground(screenRight, biome.obstacleColor);
            } else {
                obs = s.level > 5 ? OBSTACLE_TYPES.tall(screenRight, biome.obstacleColor) : OBSTACLE_TYPES.ground(screenRight, biome.obstacleColor);
            }

            s.obstacles.push(obs);
        };

        // ─── Ghost data init ─────────────────────────────────────────────
        if (ghostData && ghostData.length > 0) {
            s.ghostPlayback = ghostData;
            s.ghostFrame = 0;
        }
        s.ghostFrames = [];

        // ─── BG neon buildings ───────────────────────────────────────────
        const initBgElements = () => {
            s.bgElements = Array.from({ length: 14 }, (_, i) => ({
                x: (i / 14) * W() * 1.5,
                h: 60 + Math.random() * 180,
                w: 35 + Math.random() * 55,
                layer: Math.random() < 0.5 ? 0 : 1,
                windowPattern: Math.random(),
            }));
        };
        initBgElements();

        // ─── Draw helpers ────────────────────────────────────────────────
        const glow = (ctx, color, blur) => {
            ctx.shadowBlur = blur;
            ctx.shadowColor = color;
        };
        const clearGlow = (ctx) => { ctx.shadowBlur = 0; };

        const drawPlayer = (ctx, px, py, isSliding, invulnerable, biome, beatPhase, frame) => {
            if (invulnerable && Math.floor(frame / 6) % 2 === 0) return;
            const ph = isSliding ? PLAYER_H_SLIDE : PLAYER_H_NORMAL;
            const pw = PLAYER_W;
            const slideOffsetY = isSliding ? PLAYER_H_NORMAL - PLAYER_H_SLIDE : 0;
            const cy = py + slideOffsetY;
            const pulse = 1 + Math.sin(beatPhase) * 0.06;

            ctx.save();
            ctx.translate(px + pw / 2, cy + ph / 2);
            ctx.scale(pulse, pulse);

            // Body glow
            glow(ctx, biome.accent, 18);
            ctx.fillStyle = '#0f0f1a';
            ctx.beginPath();
            ctx.roundRect(-pw / 2, -ph / 2, pw, ph, isSliding ? 6 : 8);
            ctx.fill();

            // Neon outline
            ctx.strokeStyle = biome.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-pw / 2, -ph / 2, pw, ph, isSliding ? 6 : 8);
            ctx.stroke();

            // Inner neon core
            const grad = ctx.createLinearGradient(-pw / 2, -ph / 2, pw / 2, ph / 2);
            grad.addColorStop(0, biome.glowColor + '0.5)');
            grad.addColorStop(1, biome.glowColor + '0.05)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(-pw / 2 + 3, -ph / 2 + 3, pw - 6, ph - 6, 5);
            ctx.fill();

            // Eyes / visor
            if (!isSliding) {
                ctx.fillStyle = biome.accent;
                glow(ctx, biome.accent, 12);
                ctx.fillRect(pw / 6, -ph / 4, pw / 3, 4);
            }

            clearGlow(ctx);
            ctx.restore();
        };

        const drawGhost = (ctx, gx, gy, isSliding, biome) => {
            const ph = isSliding ? PLAYER_H_SLIDE : PLAYER_H_NORMAL;
            const pw = PLAYER_W;
            const slideOffsetY = isSliding ? PLAYER_H_NORMAL - PLAYER_H_SLIDE : 0;
            ctx.save();
            ctx.globalAlpha = 0.35;
            glow(ctx, '#ffffff', 12);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(gx, gy + slideOffsetY, pw, ph, 6);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fill();
            clearGlow(ctx);
            ctx.restore();
        };

        const drawObstacle = (ctx, obs, groundYVal, speed, biome) => {
            const gy = groundYVal;
            let rx = obs.x;
            let ry, rh, rw;

            if (obs.type === 'aerial') {
                ry = gy - 110;
                rh = obs.h;
                rw = obs.w;
            } else if (obs.type === 'moving') {
                const amp = obs.amplitude || 80;
                ry = gy - 100 + Math.sin(Date.now() / 600 + obs.phase) * amp * 0.5;
                rh = obs.h;
                rw = obs.w;
            } else {
                // ground or tall
                rh = obs.type === 'tall' ? 80 : 48;
                rw = obs.type === 'tall' ? 24 : 28;
                ry = gy - rh;
            }

            obs.y = ry; // store for collision

            const color = obs.biome || biome.obstacleColor;
            const bGlow = biome.glowColor;

            ctx.save();
            glow(ctx, color, 16);
            ctx.fillStyle = '#0d0d1a';
            ctx.beginPath();
            ctx.roundRect(rx, ry, rw, rh, 5);
            ctx.fill();

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(rx, ry, rw, rh, 5);
            ctx.stroke();

            // Scanline shimmer
            ctx.fillStyle = bGlow + '0.3)';
            ctx.fillRect(rx + 3, ry + 3, rw - 6, 4);
            clearGlow(ctx);
            ctx.restore();

            return { rx, ry, rw, rh };
        };

        // ─── Main loop ──────────────────────────────────────────────────
        let lastTime = performance.now();

        const loop = (timestamp) => {
            const dt = Math.min(timestamp - lastTime, 50);
            lastTime = timestamp;
            s.elapsedMs += dt;
            s.frameCount++;

            const width = W();
            const height = H();
            const gy = groundY();
            const diff = getDiff();
            const now = timestamp;
            const elapsed = s.elapsedMs / 1000;

            // ── Level progression (every 25s) ──────────────────────────
            const newLevel = Math.floor(elapsed / 25) + 1;
            if (newLevel > s.level) {
                s.level = newLevel;
                onLevelChange?.(newLevel);
                gameAudio?.playSFX('collect');
                // Biome shift every 2 levels
                if ((newLevel - 1) % 2 === 0) {
                    s.biomeIndex = Math.floor((newLevel - 1) / 2) % BIOMES.length;
                    s.biomeTransition = 1.0;
                    s.floatTexts.push({
                        x: width / 2,
                        y: height * 0.35,
                        text: `— ${BIOMES[s.biomeIndex].name} —`,
                        life: 2.0,
                        color: BIOMES[s.biomeIndex].accent,
                        size: 22,
                        centered: true,
                    });
                }
            }

            if (s.biomeTransition > 0) s.biomeTransition -= 0.02;
            const biome = BIOMES[s.biomeIndex];

            // ── Speed ──────────────────────────────────────────────────
            const targetSpeed = diff.speedMult * (5 + s.level * 0.8 + elapsed * 0.04);
            s.scrollSpeed += (targetSpeed - s.scrollSpeed) * 0.01;

            // ── Beat / Rhythm ──────────────────────────────────────────
            if (now >= s.nextBeatTime) {
                s.beatPhase = (s.beatPhase + Math.PI) % (Math.PI * 2);
                s.nextBeatTime += BEAT_MS / Math.max(1, s.scrollSpeed / 6);
                // Spawn on beat (with level gating)
                if (s.frameCount > 80) spawnObstacle(false);
            }
            const beatPulse = 1 + Math.sin(((now - s.startTime) / BEAT_MS) * Math.PI * 2) * 0.04;

            // ── Physics ────────────────────────────────────────────────
            s.vy += GRAVITY;
            s.py += s.vy;

            if (s.py >= gy - PLAYER_H_NORMAL) {
                s.py = gy - PLAYER_H_NORMAL;
                s.vy = 0;
                s.onGround = true;
                s.jumpCount = 0;
            } else {
                s.onGround = false;
            }

            if (s.isSliding && now >= s.slideUntil) {
                s.isSliding = false;
            }
            if (s.isInvulnerable && now >= s.invulUntil) {
                s.isInvulnerable = false;
            }

            // ── Score & Distance ───────────────────────────────────────
            s.distance += s.scrollSpeed * (dt / 16);
            s.score = Math.floor(s.distance * 0.1) + s.combo * 10;
            onScoreUpdate?.(s.score);

            // ── Record ghost frame ─────────────────────────────────────
            if (s.frameCount % 2 === 0) {
                s.ghostFrames.push({ py: s.py, isSliding: s.isSliding });
                if (onFrameRecord) onFrameRecord(s.ghostFrames);
            }

            // ── Ghost playback ─────────────────────────────────────────
            let ghostState = null;
            if (s.ghostPlayback) {
                const gIdx = Math.floor(s.frameCount / 2);
                if (gIdx < s.ghostPlayback.length) {
                    ghostState = s.ghostPlayback[gIdx];
                }
            }

            // ── Trail particles ────────────────────────────────────────
            if (s.frameCount % 3 === 0) {
                s.particles.push({
                    x: s.px + PLAYER_W / 2,
                    y: s.py + (s.isSliding ? PLAYER_H_SLIDE : PLAYER_H_NORMAL),
                    vx: -s.scrollSpeed * 0.3 - Math.random(),
                    vy: (Math.random() - 0.5) * 1.2,
                    life: 0.5 + Math.random() * 0.4,
                    color: biome.particleColor,
                    size: 2 + Math.random() * 2,
                });
            }

            // ── Move & update obstacles ────────────────────────────────
            s.obstacles.forEach(obs => { obs.x -= s.scrollSpeed * (dt / 16); });
            s.obstacles = s.obstacles.filter(o => o.x > -100);

            // ── Collision ─────────────────────────────────────────────
            const ph = s.isSliding ? PLAYER_H_SLIDE : PLAYER_H_NORMAL;
            const slideYOffset = s.isSliding ? (PLAYER_H_NORMAL - PLAYER_H_SLIDE) : 0;
            const prect = {
                x: s.px + 4, y: s.py + slideYOffset + 4,
                w: PLAYER_W - 8, h: ph - 8,
            };

            for (let i = s.obstacles.length - 1; i >= 0; i--) {
                const obs = s.obstacles[i];
                const orect = { x: obs.x + 3, y: obs.y + 3, w: (obs.w || 28) - 6, h: (obs.h || 48) - 6 };
                const hit = prect.x < orect.x + orect.w && prect.x + prect.w > orect.x &&
                    prect.y < orect.y + orect.h && prect.y + prect.h > orect.y;
                if (hit && !s.isInvulnerable && !obs.passed) {
                    // Kyle-AI: record death zone
                    s.aiDeathZones.push({ type: obs.type, level: s.level });
                    // Update pattern bias
                    const recentAerial = s.aiDeathZones.filter(d => d.type === 'aerial').length;
                    const recentGround = s.aiDeathZones.filter(d => d.type !== 'aerial').length;
                    const total = s.aiDeathZones.length;
                    s.aiPatternBias.wallFreq = recentAerial / Math.max(1, total);
                    s.aiPatternBias.gapFreq = recentGround / Math.max(1, total);

                    s.combo = 0;
                    onComboUpdate?.(0);

                    // Flash & invulnerability
                    s.isInvulnerable = true;
                    s.invulUntil = now + 800;
                    gameAudio?.playSFX('crash');

                    // Collision sparks
                    for (let p = 0; p < 14; p++) {
                        s.particles.push({
                            x: s.px + PLAYER_W / 2,
                            y: s.py + ph / 2,
                            vx: (Math.random() - 0.5) * 8,
                            vy: (Math.random() - 0.5) * 8,
                            life: 0.9,
                            color: '#ff4444',
                            size: 3 + Math.random() * 4,
                        });
                    }

                    obs.passed = true; // don't re-collide
                    onGameOver(s.score, s.maxCombo, s.ghostFrames);
                    cancelAnimationFrame(rafRef.current);
                    return;
                } else if (!obs.passed && obs.x + (obs.w || 28) < s.px) {
                    obs.passed = true;
                    s.combo++;
                    if (s.combo > s.maxCombo) s.maxCombo = s.combo;
                    onComboUpdate?.(s.combo);
                    // Float text
                    if (s.combo > 0 && s.combo % 5 === 0) {
                        s.floatTexts.push({
                            x: s.px + PLAYER_W / 2,
                            y: s.py - 20,
                            text: `${s.combo}× COMBO!`,
                            life: 1.2,
                            color: biome.accent,
                            size: 16,
                        });
                        gameAudio?.playSFX('collect');
                    }
                }
            }

            // ── Update particles ───────────────────────────────────────
            s.particles = s.particles.filter(p => {
                p.x += p.vx; p.y += p.vy; p.life -= 0.03;
                return p.life > 0;
            });
            s.floatTexts = s.floatTexts.filter(ft => {
                ft.y -= 0.7; ft.life -= 0.025;
                return ft.life > 0;
            });

            // ── Move bg elements ───────────────────────────────────────
            s.bgElements.forEach(b => {
                b.x -= s.scrollSpeed * (b.layer === 0 ? 0.15 : 0.08) * (dt / 16);
                if (b.x + b.w < 0) b.x = width + Math.random() * 200;
            });
            s.starfield.forEach(star => {
                star.x -= star.speed * (dt / 16);
                if (star.x < 0) star.x = width;
            });

            // ═══════════════════════════════════════════════════════════
            //  RENDER
            // ═══════════════════════════════════════════════════════════
            // Sky gradient
            const skyGrad = ctx.createLinearGradient(0, 0, 0, gy);
            skyGrad.addColorStop(0, biome.sky[0]);
            skyGrad.addColorStop(1, biome.sky[1]);
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, width, height);

            // Starfield
            s.starfield.forEach(star => {
                ctx.fillStyle = `rgba(255,255,255,${0.3 + star.r * 0.2})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.r * beatPulse, 0, Math.PI * 2);
                ctx.fill();
            });

            // BG neon buildings
            s.bgElements.forEach(b => {
                const alpha = b.layer === 0 ? 0.35 : 0.18;
                ctx.globalAlpha = alpha;
                glow(ctx, biome.accent, 8);
                ctx.fillStyle = b.layer === 0 ? '#0d0d1a' : '#080812';
                ctx.fillRect(b.x, gy - b.h, b.w, b.h);
                ctx.strokeStyle = biome.grid;
                ctx.lineWidth = 1;
                ctx.strokeRect(b.x, gy - b.h, b.w, b.h);
                // Windows
                ctx.fillStyle = biome.glowColor + '0.7)';
                for (let wr = 0; wr < Math.floor(b.h / 18); wr++) {
                    for (let wc = 0; wc < Math.floor(b.w / 14); wc++) {
                        if (Math.sin(b.windowPattern + wr * 3 + wc) > 0.3) {
                            ctx.fillRect(b.x + wc * 14 + 3, gy - b.h + wr * 18 + 4, 7, 8);
                        }
                    }
                }
                clearGlow(ctx);
                ctx.globalAlpha = 1;
            });

            // Holographic grid on ground
            ctx.save();
            ctx.globalAlpha = 0.25;
            const gridScrollOffset = (s.distance * 0.5) % 60;
            for (let gx2 = -gridScrollOffset; gx2 < width; gx2 += 60) {
                ctx.strokeStyle = biome.grid;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(gx2, gy);
                ctx.lineTo(gx2 + 60, height * 1.1);
                ctx.stroke();
            }
            // Horizontal grid lines
            for (let gr = 0; gr < 5; gr++) {
                const lineY = gy + (height - gy) * (gr / 5);
                ctx.lineWidth = 0.5 - gr * 0.08;
                ctx.beginPath();
                ctx.moveTo(0, lineY);
                ctx.lineTo(width, lineY);
                ctx.stroke();
            }
            ctx.restore();

            // Ground
            ctx.save();
            glow(ctx, biome.accent, 20);
            const groundGrad = ctx.createLinearGradient(0, gy, 0, gy + 8);
            groundGrad.addColorStop(0, biome.accent);
            groundGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = groundGrad;
            ctx.fillRect(0, gy, width, 3);
            ctx.fillStyle = biome.ground;
            ctx.fillRect(0, gy + 3, width, height - gy - 3);
            clearGlow(ctx);
            ctx.restore();

            // Obstacles
            s.obstacles.forEach(obs => drawObstacle(ctx, obs, gy, s.scrollSpeed, biome));

            // Particles
            s.particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = p.life;
                glow(ctx, p.color, 8);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                clearGlow(ctx);
                ctx.restore();
            });

            // Ghost
            if (ghostState) {
                drawGhost(ctx, s.px - 40, ghostState.py, ghostState.isSliding, biome);
            }

            // Player
            drawPlayer(ctx, s.px, s.py, s.isSliding, s.isInvulnerable, biome, s.beatPhase, s.frameCount);

            // Float texts
            s.floatTexts.forEach(ft => {
                ctx.save();
                ctx.globalAlpha = Math.min(ft.life, 1);
                glow(ctx, ft.color, 10);
                ctx.fillStyle = ft.color;
                ctx.font = `bold ${ft.size || 16}px "Orbitron", monospace`;
                ctx.textAlign = ft.centered ? 'center' : 'left';
                ctx.fillText(ft.text, ft.x, ft.y);
                clearGlow(ctx);
                ctx.restore();
            });

            // HUD distance bar
            const distPct = Math.min((s.distance % 2000) / 2000, 1);
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(width / 2 - 100, height - 28, 200, 6);
            glow(ctx, biome.accent, 8);
            ctx.fillStyle = biome.accent;
            ctx.fillRect(width / 2 - 100, height - 28, distPct * 200, 6);
            clearGlow(ctx);

            // Biome name flash
            if (s.biomeTransition > 0) {
                ctx.save();
                ctx.globalAlpha = Math.min(s.biomeTransition * 2, 0.9);
                glow(ctx, biome.accent, 30);
                ctx.fillStyle = biome.accent;
                ctx.font = 'bold 11px "Orbitron", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`ENTERING: ${biome.name}`, width / 2, 40);
                clearGlow(ctx);
                ctx.restore();
            }

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        // ─── Input listeners ─────────────────────────────────────────────
        const onKeyDown = (e) => {
            if (['ArrowUp', 'w', ' '].includes(e.key)) { e.preventDefault(); doJump(); }
            if (['ArrowDown', 's', 'Control'].includes(e.key)) { e.preventDefault(); doSlide(); }
        };

        const onTouchStart = (e) => {
            e.preventDefault();
            const t = e.touches[0];
            touchStartRef.current = { x: t.clientX, y: t.clientY };
        };

        const onTouchEnd = (e) => {
            e.preventDefault();
            const t = e.changedTouches[0];
            const dx = t.clientX - touchStartRef.current.x;
            const dy = t.clientY - touchStartRef.current.y;
            if (Math.abs(dy) > Math.abs(dx)) {
                if (dy < -20) doJump();
                else if (dy > 20) doSlide();
            } else {
                // Horizontal tap → jump (common mobile pattern)
                if (Math.abs(dx) < 30) doJump();
            }
        };

        const onMouseDown = () => doJump();

        window.addEventListener('keydown', onKeyDown);
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd, { passive: false });
        canvas.addEventListener('mousedown', onMouseDown);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', onKeyDown);
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchend', onTouchEnd);
            canvas.removeEventListener('mousedown', onMouseDown);
        };
    }, [doJump, doSlide, ghostData, onGameOver, onScoreUpdate, onLevelChange, onComboUpdate, onFrameRecord]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 touch-none"
            style={{ touchAction: 'none', cursor: 'none' }}
        />
    );
};

export default GameCanvas;
