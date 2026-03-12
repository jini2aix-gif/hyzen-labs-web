// Like a Dino! - v1.0.0
// Phaser 3 · Web Audio API · Haptic Feedback
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, RotateCcw, LogOut, AlertTriangle } from 'lucide-react';
import { doc, addDoc, collection, serverTimestamp, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../../hooks/useFirebase';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────
//  PHASER GAME ENGINE (lazy-loaded via CDN)
// ─────────────────────────────────────────────
const PHASER_CDN = 'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js';

function loadPhaser() {
    return new Promise((resolve, reject) => {
        if (window.Phaser) { resolve(window.Phaser); return; }
        const s = document.createElement('script');
        s.src = PHASER_CDN;
        s.onload = () => resolve(window.Phaser);
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

// ─────────────────────────────────────────────
//  WEB AUDIO ENGINE
// ─────────────────────────────────────────────
class DinoAudio {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    _ensure() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    playNote(freq, duration = 0.12, type = 'triangle', gain = 0.18) {
        if (this.muted) return;
        this._ensure();
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(g); g.connect(this.ctx.destination);
        osc.type = type; osc.frequency.value = freq;
        const t = this.ctx.currentTime;
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.start(t); osc.stop(t + duration);
    }

    playCatch() {
        this.playNote(523, 0.08, 'triangle', 0.2);
        setTimeout(() => this.playNote(659, 0.12, 'sine', 0.18), 60);
        if (navigator.vibrate) navigator.vibrate(40);
    }

    playMiss() { this.playNote(150, 0.25, 'sawtooth', 0.15); }
    playLevelUp() {
        [523, 659, 784, 1047].forEach((f, i) =>
            setTimeout(() => this.playNote(f, 0.14, 'triangle', 0.22), i * 80));
    }
    playGameOver() {
        [440, 392, 349, 294].forEach((f, i) =>
            setTimeout(() => this.playNote(f, 0.3, 'sawtooth', 0.2), i * 120));
    }

    // Beat-sync BGM — called from Phaser update() at exact beat tick
    // beatIdx drives an 8-step pattern: bass kick on 0&4, melody on all, hi-hat accent on 2&6
    playBGMBeat(beatIdx, bpm) {
        if (this.muted) return;
        const b = beatIdx % 8;
        const beatDur = (60 / bpm) * 0.45;
        const MELODY = [261, 329, 392, 329, 261, 392, 329, 196];
        const GAINS  = [0.10, 0.07, 0.09, 0.07, 0.10, 0.08, 0.07, 0.06];
        // Melody (every beat)
        this.playNote(MELODY[b], beatDur, 'triangle', GAINS[b]);
        // Bass kick on downbeats 0 & 4
        if (b === 0 || b === 4) this.playNote(65, beatDur * 0.6, 'sine', 0.18);
        // Hi-hat accent on 2 & 6
        if (b === 2 || b === 6) this.playNote(1400, 0.035, 'sawtooth', 0.025);
    }

    setMute(v) { this.muted = v; }
}

const dinoAudio = new DinoAudio();

// ─────────────────────────────────────────────
//  PHASER SCENE
// ─────────────────────────────────────────────
function createScene({ onScore, onGameOver, onCatch, onMiss }) {
    // ── palette ──────────────────────────────
    const BG        = 0xF0EAD6;
    const DINO_BODY = 0x8AB87A; // sage green
    const DINO_EYE  = 0x4A7C59;
    const SEG_COLS  = [0xFFB7CE, 0xB5EAD7, 0xC7CEEA, 0xFFDBAC, 0xE2B6CF, 0xAEE6E6];
    const NOTE_COLS = [0xFF9AA2, 0xFFB7CE, 0xB5EAD7, 0xC7CEEA, 0xFFDBAC, 0xFBDFB1];

    return class GameScene extends window.Phaser.Scene {
        constructor() { super({ key: 'GameScene' }); }

        create() {
            const W = this.scale.width, H = this.scale.height;
            this.W = W; this.H = H;

            // State
            this.score = 0;
            this.level = 1;
            this.bpm   = 80;
            this.beatMs = (60 / this.bpm) * 1000;
            this.segments = [];
            this.notes    = [];
            this.particles= [];
            this.gameRunning = true;
            this.catchAnim = 0;
            // Beat-sync tracking (note spawn + BGM fired together)
            this.gameClock  = 0;
            this.nextBeatAt = this.beatMs; // first beat after 1 full beat interval
            this.bgmBeatIdx = 0;

            // Background — gradient
            this._bg = this.add.graphics();
            this._drawBg(0);

            // Parallax stars/dots
            this._dots = [];
            for (let i = 0; i < 22; i++) {
                const dot = this.add.graphics();
                const r   = Phaser.Math.Between(2, 5);
                const col = NOTE_COLS[i % NOTE_COLS.length];
                dot.fillStyle(col, 0.25);
                dot.fillCircle(0, 0, r);
                dot.x = Phaser.Math.Between(0, W);
                dot.y = Phaser.Math.Between(0, H);
                dot._spd = 0.1 + Math.random() * 0.2;
                this._dots.push(dot);
            }

            // Score text
            this._scoreTxt = this.add.text(W / 2, 28, '0', {
                fontFamily: "'Inter', sans-serif",
                fontSize: `${Math.round(W * 0.072)}px`,
                color: '#4A5568',
                fontStyle: 'bold',
            }).setOrigin(0.5, 0).setDepth(10);

            this._levelTxt = this.add.text(W - 16, 16, 'LV.1', {
                fontFamily: "'Inter', sans-serif",
                fontSize: `${Math.round(W * 0.038)}px`,
                color: '#8AB87A',
                fontStyle: 'bold 900',
            }).setOrigin(1, 0).setDepth(10);

            // Instruction fade text
            this._instrTxt = this.add.text(W / 2, H - 36, 'MOVE  ←  →  to  catch  notes', {
                fontFamily: "'Inter', sans-serif",
                fontSize: `${Math.round(W * 0.028)}px`,
                color: '#B0A090',
                fontStyle: 'italic',
            }).setOrigin(0.5).setDepth(10).setAlpha(1);
            this.tweens.add({ targets: this._instrTxt, alpha: 0, delay: 2800, duration: 800 });

            // Dino body container
            this._dinoGfx = this.add.graphics();
            this._dinoHead = this.add.graphics();

            // Dino X target / current
            this.dinoX = W / 2;
            this.dinoTargetX = W / 2;
            this.dinoY = H - 155; // raised so finger doesn't obscure dino on mobile
            this.DINO_HALF = Math.round(W * 0.055);

            // Input — pointer / touch
            this.input.on('pointermove', (p) => {
                this.dinoTargetX = Phaser.Math.Clamp(p.x, this.DINO_HALF + 4, W - this.DINO_HALF - 4);
            });
            this.input.on('pointerdown', (p) => {
                this.dinoTargetX = Phaser.Math.Clamp(p.x, this.DINO_HALF + 4, W - this.DINO_HALF - 4);
            });

            // Keyboard
            this._cursors = this.input.keyboard?.createCursorKeys();
            this._wasd = this.input.keyboard?.addKeys('A,D');

            // Draw initial dino
            this._drawDino(0);
        }

        _drawBg(hueShift) {
            const W = this.W, H = this.H;
            this._bg.clear();
            // Soft pastel background — static for perf, hue-shift on score
            const base = Phaser.Display.Color.HSLToColor(
                (0.09 + hueShift * 0.0003) % 1, 0.32, 0.92
            ).color;
            this._bg.fillGradientStyle(base, base,
                Phaser.Display.Color.HSLToColor((0.13 + hueShift * 0.0002) % 1, 0.25, 0.88).color,
                Phaser.Display.Color.HSLToColor((0.13 + hueShift * 0.0002) % 1, 0.25, 0.88).color,
                1);
            this._bg.fillRect(0, 0, W, H);
        }



        _spawnNote() {
            if (!this.gameRunning) return;
            const W = this.W, H = this.H;
            const size   = Math.round(W * 0.055);
            const x      = Phaser.Math.Between(size + 4, W - size - 4);
            const col    = Phaser.Utils.Array.GetRandom(NOTE_COLS);
            const speed  = 90 + this.score * 0.35 + this.level * 18;
            const gfx    = this.add.graphics();
            this._drawNote(gfx, 0, 0, size, col);
            gfx.x = x; gfx.y = -size;
            gfx._size  = size;
            gfx._col   = col;
            gfx._speed = speed;
            this.notes.push(gfx);
        }

        _drawNote(gfx, x, y, r, col) {
            gfx.clear();
            gfx.fillStyle(col, 1);
            // Rounded diamond note shape
            gfx.fillCircle(x, y, r * 0.82);
            // Inner highlight
            gfx.fillStyle(0xFFFFFF, 0.35);
            gfx.fillCircle(x - r * 0.22, y - r * 0.22, r * 0.28);
            // Stem
            gfx.fillStyle(col, 0.9);
            gfx.fillRect(x + r * 0.55, y - r * 0.9, r * 0.18, r * 1.1);
        }

        _drawSegment(gfx, x, y, r, col, idx) {
            gfx.clear();
            // Segment main circle
            gfx.fillStyle(col, 1);
            gfx.fillCircle(x, y, r);
            // Shine
            gfx.fillStyle(0xFFFFFF, 0.28);
            gfx.fillCircle(x - r * 0.25, y - r * 0.25, r * 0.35);
        }

        _drawDino(squashStretch) {
            const W = this.W;
            const x = this.dinoX;
            const y = this.dinoY;
            const R = this.DINO_HALF;

            // Squash & Stretch: scale Y for body
            const sy = 1 + Math.sin(squashStretch * Math.PI) * 0.22;
            const sx = 1 - Math.sin(squashStretch * Math.PI) * 0.12;

            const gfx = this._dinoGfx;
            gfx.clear();

            // Body — oval
            gfx.fillStyle(DINO_BODY, 1);
            gfx.fillEllipse(x, y, R * 2.2 * sx, R * 1.6 * sy);

            // Tail
            gfx.fillStyle(DINO_BODY, 0.85);
            gfx.fillTriangle(
                x - R * 1.0 * sx, y,
                x - R * 1.8 * sx, y + R * 0.5 * sy,
                x - R * 0.6 * sx, y + R * 0.4 * sy
            );

            // Tiny legs
            gfx.fillStyle(DINO_BODY, 0.9);
            gfx.fillEllipse(x - R * 0.35, y + R * 0.75 * sy, R * 0.32, R * 0.48);
            gfx.fillEllipse(x + R * 0.35, y + R * 0.75 * sy, R * 0.32, R * 0.48);

            // Tiny arms
            gfx.fillStyle(DINO_BODY, 0.8);
            gfx.fillEllipse(x + R * 0.85 * sx, y - R * 0.05, R * 0.22, R * 0.32);
            gfx.fillEllipse(x - R * 0.85 * sx, y - R * 0.05, R * 0.22, R * 0.32);

            // Head (separate layer, above body)
            const head = this._dinoHead;
            head.clear();

            // Draw neck first (from head pos to body)
            const neckBaseX = x;
            const neckBaseY = y - R * 0.7 * sy;
            const headY     = neckBaseY - (this.segments.length > 0 ? 0 : R * 1.0 * sy);
            // Head oval
            head.fillStyle(DINO_BODY, 1);
            head.fillEllipse(x, neckBaseY - R * 0.95 * sy, R * 1.5 * sx, R * 1.1 * sy);
            // Snout
            head.fillStyle(DINO_BODY, 0.95);
            head.fillEllipse(x + R * 0.65 * sx, neckBaseY - R * 0.85 * sy, R * 0.7 * sx, R * 0.5 * sy);

            // Eye
            head.fillStyle(DINO_EYE, 1);
            head.fillCircle(x + R * 0.42 * sx, neckBaseY - R * 1.08 * sy, R * 0.2);
            head.fillStyle(0xFFFFFF, 1);
            head.fillCircle(x + R * 0.46 * sx, neckBaseY - R * 1.1 * sy, R * 0.08);

            // Nostril
            head.fillStyle(DINO_EYE, 0.6);
            head.fillCircle(x + R * 0.82 * sx, neckBaseY - R * 0.82 * sy, R * 0.07);
        }

        _spawnCatchParticles(x, y, col) {
            for (let i = 0; i < 9; i++) {
                const p = {
                    gfx: this.add.graphics(),
                    x, y,
                    vx: (Math.random() - 0.5) * 5.5,
                    vy: -(Math.random() * 4 + 1.5),
                    life: 1,
                    col,
                    r: Math.random() * 5 + 2,
                };
                this.particles.push(p);
            }
        }

        _addSegment(col) {
            const seg = this.add.graphics();
            seg._col = col;
            // Place segment at dino head pos initially
            seg.x = this.dinoX;
            seg.y = this.dinoY - this.DINO_HALF * 1.5;
            this.segments.unshift(seg); // newest at front (closest to head)
        }

        _getLevelBPM(lvl) { return Math.min(200, 80 + (lvl - 1) * 12); }

        update(time, delta) {
            if (!this.gameRunning) return;
            const dt = delta / 1000;
            const W = this.W, H = this.H;
            const R = this.DINO_HALF;

            // ── Beat-sync: note spawn + BGM at same tick ───
            this.gameClock += delta;
            if (this.gameClock >= this.nextBeatAt) {
                this.nextBeatAt += this.beatMs;
                this._spawnNote();
                dinoAudio.playBGMBeat(this.bgmBeatIdx, this.bpm);
                this.bgmBeatIdx++;
            }

            // ── Background parallax shift ──────
            if (this.score % 80 < 2) this._drawBg(this.score);

            // ── Parallax dots ──────────────────
            for (const d of this._dots) {
                d.y += d._spd * delta * 0.04;
                if (d.y > H + 8) d.y = -8;
            }

            // ── Keyboard input ─────────────────
            const kbSpeed = 420 * dt;
            if (this._cursors) {
                if (this._cursors.left.isDown || this._wasd?.A.isDown) {
                    this.dinoTargetX = Math.max(R + 4, this.dinoTargetX - kbSpeed);
                }
                if (this._cursors.right.isDown || this._wasd?.D.isDown) {
                    this.dinoTargetX = Math.min(W - R - 4, this.dinoTargetX + kbSpeed);
                }
            }

            // ── Smooth dino X easing ───────────
            this.dinoX += (this.dinoTargetX - this.dinoX) * Math.min(1, dt * 9);

            // ── Squash & Stretch anim ──────────
            if (this.catchAnim > 0) {
                this.catchAnim = Math.max(0, this.catchAnim - dt * 2.4);
            }
            this._drawDino(this.catchAnim);

            // ── Segment follow logic ───────────
            const SEG_R = R * 0.6;
            const SEG_GAP = SEG_R * 1.3;
            let prevX = this.dinoX;
            let prevY = this.dinoY - R * 1.4 - SEG_GAP * 0.1;

            for (let i = 0; i < this.segments.length; i++) {
                const seg = this.segments[i];
                const dx = prevX - seg.x, dy = prevY - seg.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > SEG_GAP) {
                    seg.x += (dx / dist) * (dist - SEG_GAP);
                    seg.y += (dy / dist) * (dist - SEG_GAP);
                }
                const col = SEG_COLS[i % SEG_COLS.length];
                this._drawSegment(seg, 0, 0, SEG_R, col, i);
                prevX = seg.x;
                prevY = seg.y;
            }

            // ── Update falling notes ───────────
            const catchRadius = R * 1.15 + (this.segments.length > 0 ? 6 : 0);
            const catchY = this.dinoY - R * 1.35;
            const toRemove = [];

            for (const note of this.notes) {
                note.y += note._speed * dt;

                // Catch check
                const dx = note.x - this.dinoX;
                const dy = note.y - catchY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < catchRadius + note._size * 0.7) {
                    // CAUGHT!
                    toRemove.push(note);
                    this.score++;
                    this._scoreTxt.setText(this.score.toString());
                    onScore(this.score);
                    this.catchAnim = 1;
                    this._addSegment(note._col);
                    this._spawnCatchParticles(note.x, note.y, note._col);
                    onCatch();
                    dinoAudio.playCatch();

                    // Score pop anim
                    const pop = this.add.text(note.x, note.y - 10, '+1', {
                        fontFamily: "'Inter', sans-serif",
                        fontSize: `${Math.round(W * 0.042)}px`,
                        color: '#FFFFFF',
                        fontStyle: 'bold',
                        stroke: '#00000033',
                        strokeThickness: 3,
                    }).setOrigin(0.5).setDepth(20);
                    this.tweens.add({
                        targets: pop,
                        y: pop.y - 45,
                        alpha: 0,
                        duration: 680,
                        ease: 'Power2',
                        onComplete: () => pop.destroy(),
                    });

                    // Level up
                    const newLevel = Math.floor(this.score / 10) + 1;
                    if (newLevel > this.level) {
                        this.level = newLevel;
                        this.bpm = this._getLevelBPM(newLevel);
                        this.beatMs = (60 / this.bpm) * 1000;
                        this._levelTxt.setText(`LV.${newLevel}`);
                        dinoAudio.playLevelUp();
                        // Level text bounce
                        this.tweens.add({
                            targets: this._levelTxt,
                            scaleX: 1.6, scaleY: 1.6,
                            duration: 140,
                            yoyo: true,
                            ease: 'Back.easeOut',
                        });
                    }
                }

                // Miss (fell off bottom)
                if (note.y > H + note._size * 2) {
                    toRemove.push(note);
                    onMiss();
                    dinoAudio.playMiss();
                }
            }

            for (const n of toRemove) {
                this.notes = this.notes.filter(x => x !== n);
                n.destroy();
            }

            // ── Particle update ────────────────
            const deadParticles = [];
            for (const p of this.particles) {
                p.x += p.vx * dt * 60;
                p.y += p.vy * dt * 60;
                p.vy += 6 * dt;
                p.life -= dt * 2.2;
                if (p.life <= 0) { deadParticles.push(p); continue; }
                p.gfx.clear();
                p.gfx.fillStyle(p.col, p.life * 0.9);
                p.gfx.fillCircle(p.x, p.y, p.r * p.life);
            }
            for (const p of deadParticles) {
                p.gfx.destroy();
                this.particles = this.particles.filter(x => x !== p);
            }
        }

        destroy() {
            this.gameRunning = false;
        }
    };
}

// ─────────────────────────────────────────────
//  LEADERBOARD SUBCOMPONENT
// ─────────────────────────────────────────────
const LAD_COLLECTION = (db, appId) =>
    collection(db, 'artifacts', appId, 'public', 'data', 'games', 'like-a-dino', 'scores');

const Leaderboard = ({ currentUserScore }) => {
    const [ranks, setRanks] = useState([]);

    useEffect(() => {
        if (!db || !appId) return;
        const q = query(LAD_COLLECTION(db, appId), orderBy('score', 'desc'), limit(5));
        const unsub = onSnapshot(q, (snap) =>
            setRanks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return unsub;
    }, []);

    const medals = ['🥇', '🥈', '🥉', '4', '5'];

    return (
        <div className="w-full mt-2">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-400 mb-3 text-center">
                Top Scores
            </p>
            {ranks.length === 0 && (
                <p className="text-[10px] text-center text-gray-400 font-mono">첫 번째 기록을 세워보세요!</p>
            )}
            {ranks.map((r, i) => (
                <div key={r.id}
                    className={`flex items-center gap-2 py-1.5 px-3 rounded-xl mb-1.5 ${r.uid === currentUserScore?.uid ? 'bg-[#8AB87A]/20 border border-[#8AB87A]/30' : 'bg-white/5'}`}>
                    <span className="w-5 text-sm">{medals[i] ?? i + 1}</span>
                    <span className="flex-1 text-sm font-medium text-gray-700 truncate">{r.displayName || 'Anonymous'}</span>
                    <span className="font-mono text-sm font-bold text-[#8AB87A]">{r.score} PTS</span>
                </div>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────
//  PHASER CANVAS CONTAINER
// ─────────────────────────────────────────────
const DinoCanvas = ({ onScore, onGameOver, onCatch, onMiss, gameKey }) => {
    const containerRef = useRef(null);
    const gameRef = useRef(null);

    useEffect(() => {
        let game;
        loadPhaser().then((Phaser) => {
            if (!containerRef.current) return;
            const W = containerRef.current.offsetWidth;
            const H = containerRef.current.offsetHeight;
            const SceneClass = createScene({ onScore, onGameOver, onCatch, onMiss });

            game = new Phaser.Game({
                type: Phaser.AUTO,
                width: W,
                height: H,
                backgroundColor: '#F0EAD6',
                parent: containerRef.current,
                scene: [SceneClass],
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                },
                audio: { noAudio: true }, // we use Web Audio API directly
                banner: false,
            });
            gameRef.current = game;
        });

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, [gameKey]);

    return <div ref={containerRef} className="w-full h-full" style={{ touchAction: 'none' }} />;
};

// ─────────────────────────────────────────────
//  MAIN MODAL COMPONENT
// ─────────────────────────────────────────────
const LikeADino = ({ isOpen, onClose, user }) => {
    const [gameState, setGameState] = useState('start');
    const [score, setScore] = useState(0);
    const [gameKey, setGameKey] = useState(0);
    const [showConfirmQuit, setShowConfirmQuit] = useState(false);
    const [missCount, setMissCount] = useState(0);
    const MAX_MISS = 5;

    // Ref tracks latest score to avoid stale closure in handleMiss
    const scoreRef = useRef(0);
    const gameOverFiredRef = useRef(false);

    // Lock scroll when open
    useEffect(() => {
        if (isOpen) {
            setGameState('start');
            setScore(0);
            scoreRef.current = 0;
            setMissCount(0);
            gameOverFiredRef.current = false;
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleScore = useCallback((s) => {
        setScore(s);
        scoreRef.current = s; // keep ref in sync for callbacks
    }, []);

    const handleCatch = useCallback(() => {}, []);

    // handleGameOver defined first so handleMiss can reference it via ref
    const handleGameOver = useCallback(async (finalScore) => {
        if (gameOverFiredRef.current) return;
        gameOverFiredRef.current = true;
        dinoAudio.playGameOver();
        setGameState('gameover');
        setScore(finalScore);

        if (user && db && appId) {
            try {
                await addDoc(LAD_COLLECTION(db, appId), {
                    uid: user.uid,
                    displayName: user.displayName || 'Anonymous',
                    photoURL: user.photoURL,
                    score: finalScore,
                    timestamp: serverTimestamp(),
                });
            } catch (e) { console.error('Score save error', e); }
        }
    }, [user]);

    // Keep a stable ref to handleGameOver so handleMiss never captures stale version
    const handleGameOverRef = useRef(handleGameOver);
    useEffect(() => { handleGameOverRef.current = handleGameOver; }, [handleGameOver]);

    const handleMiss = useCallback(() => {
        setMissCount(prev => {
            const next = prev + 1;
            if (next >= MAX_MISS) {
                handleGameOverRef.current(scoreRef.current); // always latest score
            }
            return next;
        });
    }, []);

    const startGame = () => {
        setScore(0);
        scoreRef.current = 0;
        setMissCount(0);
        gameOverFiredRef.current = false;
        setGameKey(k => k + 1);
        setGameState('playing');
    };

    const requestQuit = () => {
        gameOverFiredRef.current = false;
        setGameState('start');
        setScore(0);
        scoreRef.current = 0;
        setMissCount(0);
        setGameKey(k => k + 1);
    };

    const handleExitClick = () => setShowConfirmQuit(true);
    const confirmExit = () => { setShowConfirmQuit(false); onClose(); };
    const cancelExit = () => setShowConfirmQuit(false);

    if (!isOpen) return null;

    const missBarPct = (missCount / MAX_MISS) * 100;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden touch-none"
            style={{ background: 'rgba(240,234,214,0.96)', backdropFilter: 'blur(12px)' }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
        >
            {/* Game canvas */}
            {gameState === 'playing' && (
                <>
                    <div className="absolute inset-0">
                        <DinoCanvas
                            key={gameKey}
                            onScore={handleScore}
                            onGameOver={handleGameOver}
                            onCatch={handleCatch}
                            onMiss={handleMiss}
                            gameKey={gameKey}
                        />
                    </div>

                    {/* In-game HUD */}
                    <div className="absolute top-5 left-5 z-50 flex flex-col gap-2">
                        {/* Miss meter */}
                        <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#8AB87A]/20">
                            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">MISS</span>
                            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                        width: `${missBarPct}%`,
                                        background: missBarPct > 70 ? '#FF7C7C' : '#8AB87A'
                                    }}
                                />
                            </div>
                            <span className="text-[9px] font-mono text-gray-400">{missCount}/{MAX_MISS}</span>
                        </div>
                    </div>

                    {/* Quit button */}
                    <button
                        onClick={requestQuit}
                        className="absolute top-4 right-4 z-50 p-2 bg-white/70 backdrop-blur-md rounded-full text-gray-400 hover:text-gray-800 hover:bg-white transition-all border border-gray-200/60 shadow-sm"
                        title="Quit to Menu"
                    >
                        <X size={20} />
                    </button>
                </>
            )}

            {/* UI overlays */}
            <AnimatePresence>
                {gameState !== 'playing' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6"
                    >
                        {/* Confirm Quit overlay */}
                        {showConfirmQuit && (
                            <div className="absolute inset-0 z-20 bg-[#F0EAD6]/95 flex items-center justify-center">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-white border border-gray-200 p-8 rounded-3xl flex flex-col items-center text-center max-w-sm shadow-xl"
                                >
                                    <AlertTriangle size={40} className="text-amber-400 mb-4" />
                                    <h3 className="text-gray-800 text-lg font-bold mb-6">게임을 종료하시겠습니까?</h3>
                                    <div className="flex gap-3 w-full">
                                        <button onClick={cancelExit}
                                            className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-sm transition-colors">
                                            취소
                                        </button>
                                        <button onClick={confirmExit}
                                            className="flex-1 py-3 rounded-2xl bg-[#8AB87A] text-white hover:bg-[#72a562] font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-md">
                                            <LogOut size={14} /> 종료
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        {/* Start / Game Over Screen */}
                        <div className="max-w-sm w-full flex flex-col items-center text-center gap-6">
                            {/* Title */}
                            <div>
                                <motion.h1
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ type: 'spring', damping: 12 }}
                                    className="text-5xl md:text-6xl font-black tracking-tight"
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        color: '#3D5A3E',
                                        letterSpacing: '-0.03em',
                                    }}
                                >
                                    Like a Dino!
                                </motion.h1>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-[11px] tracking-[0.28em] text-gray-400 uppercase mt-1 font-mono"
                                >
                                    {gameState === 'start' ? 'Catch the notes · Grow your neck' : 'GAME OVER'}
                                </motion.p>
                            </div>

                            {/* Decorative dino SVG illustration */}
                            <motion.svg
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', delay: 0.1 }}
                                width="90" height="90" viewBox="0 0 90 90" fill="none"
                            >
                                <ellipse cx="45" cy="62" rx="20" ry="14" fill="#8AB87A" />
                                <ellipse cx="45" cy="38" rx="15" ry="13" fill="#8AB87A" />
                                <ellipse cx="54" cy="34" rx="8" ry="6" fill="#8AB87A" />
                                <circle cx="57" cy="31" r="3.5" fill="#4A7C59" />
                                <circle cx="58.2" cy="30.2" r="1.2" fill="white" />
                                <ellipse cx="36" cy="72" rx="5" ry="7" fill="#8AB87A" />
                                <ellipse cx="54" cy="72" rx="5" ry="7" fill="#8AB87A" />
                                {[0, 1, 2, 3].map(i => (
                                    <circle key={i} cx={30 + i * 12} cy={20 - i * 3} r="4.5"
                                        fill={['#FFB7CE', '#B5EAD7', '#C7CEEA', '#FFB7CE'][i]} />
                                ))}
                            </motion.svg>

                            {/* Score display (game over) */}
                            {gameState === 'gameover' && (
                                <motion.div
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', damping: 10 }}
                                    className="flex flex-col items-center"
                                >
                                    <span className="text-6xl font-black text-[#3D5A3E]" style={{ fontFamily: 'Inter, sans-serif' }}>
                                        {score}
                                    </span>
                                    <span className="text-xs font-mono text-gray-400 uppercase tracking-widest mt-1">points</span>
                                </motion.div>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-col gap-3 w-full">
                                <button
                                    onClick={startGame}
                                    className="group relative px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest overflow-hidden shadow-lg transition-all hover:scale-[1.03] active:scale-[0.97]"
                                    style={{ background: 'linear-gradient(135deg, #8AB87A, #6A9E5A)', color: '#fff' }}
                                >
                                    <span className="relative flex items-center justify-center gap-2">
                                        {gameState === 'start' ? <Play size={16} fill="white" /> : <RotateCcw size={16} />}
                                        {gameState === 'start' ? '게임 시작' : '다시 도전'}
                                    </span>
                                </button>

                                <button
                                    onClick={handleExitClick}
                                    className="px-8 py-3.5 rounded-2xl text-gray-400 border border-gray-200 hover:border-gray-300 hover:text-gray-600 font-medium text-sm flex items-center justify-center gap-2 transition-all bg-white/60"
                                >
                                    <LogOut size={14} /> 게임 종료
                                </button>
                            </div>

                            {/* Leaderboard */}
                            <div className="w-full bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/60">
                                <Leaderboard currentUserScore={gameState === 'gameover' ? { uid: user?.uid, score } : null} />
                            </div>

                            {!user && (
                                <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                                    * 기록 저장은 로그인 후 가능합니다
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LikeADino;
