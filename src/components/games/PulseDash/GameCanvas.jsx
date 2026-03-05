import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const GameCanvas = forwardRef(({ onGameOver, onScoreUpdate, onLevelChange, gameAudio }, ref) => {
    const canvasRef = useRef(null);
    const frameRef = useRef(0);
    const scoreRef = useRef(0);
    const startTimeRef = useRef(Date.now());

    // Physics & State
    const laneRef = useRef(1);
    const targetLaneRef = useRef(1);
    const obstaclesRef = useRef([]);
    const sceneryRef = useRef([]);
    const levelRef = useRef(1);

    // Perspective Params
    const roadWidth = useRef(0);
    const centerX = useRef(0);
    const centerY = useRef(0);
    const animationFrameRef = useRef(null);

    // Swipe / Touch State
    const touchStartXRef = useRef(null);
    const touchStartYRef = useRef(null);
    const isDragging = useRef(false);
    const SWIPE_THRESHOLD = 35; // px — minimum horizontal delta to trigger snap

    const pastelColors = [
        '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA', '#D4F0F0',
    ];

    useImperativeHandle(ref, () => ({
        setLane: (lane) => { targetLaneRef.current = lane; }
    }));

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const setCanvasSize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.scale(dpr, dpr);
            centerX.current = window.innerWidth / 2;
            centerY.current = window.innerHeight * 0.3;
            roadWidth.current = Math.min(window.innerWidth * 0.8, 600);
        };
        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        // ─── Device diffScale helper ───────────────────────────────────────
        // Returns scaling factors based on viewport width
        const getDiffScale = () => {
            const w = window.innerWidth;
            if (w < 480) {
                // Phone portrait  ← hardest relative area per screen: reduce density
                return { spawnRate: 0.65, baseSpeedMult: 0.72, obstacleCountMult: 0.6 };
            } else if (w < 768) {
                // Phone landscape / small tablet
                return { spawnRate: 0.78, baseSpeedMult: 0.82, obstacleCountMult: 0.75 };
            } else if (w < 1100) {
                // Tablet  ← medium — balanced
                return { spawnRate: 0.88, baseSpeedMult: 0.92, obstacleCountMult: 0.88 };
            } else {
                // Desktop ← full speed
                return { spawnRate: 1.0, baseSpeedMult: 1.0, obstacleCountMult: 1.0 };
            }
        };

        // ─── Snap-lane helper ──────────────────────────────────────────────
        const snapLane = (direction) => {
            // direction: -1 (left), +1 (right)
            const next = Math.max(0, Math.min(2, targetLaneRef.current + direction));
            if (next !== targetLaneRef.current) {
                targetLaneRef.current = next;
                gameAudio?.playSFX('click');
            }
        };

        // ─── Mouse controls (PC drag — position-based) ─────────────────────
        const handleMouseMove = (x) => {
            if (!isDragging.current) return;
            const width = window.innerWidth;
            const third = width / 3;
            let newLane = x < third ? 0 : x < third * 2 ? 1 : 2;
            if (newLane !== targetLaneRef.current) {
                targetLaneRef.current = newLane;
                gameAudio?.playSFX('click');
            }
        };
        const onMouseDown = (e) => { isDragging.current = true; handleMouseMove(e.clientX); };
        const onMouseMove = (e) => { if (isDragging.current) handleMouseMove(e.clientX); };
        const onMouseUp = () => { isDragging.current = false; };

        // ─── Touch controls (mobile snap-swipe) ────────────────────────────
        const onTouchStart = (e) => {
            e.preventDefault();
            const t = e.touches[0];
            touchStartXRef.current = t.clientX;
            touchStartYRef.current = t.clientY;
            isDragging.current = true;
        };

        const onTouchMove = (e) => {
            e.preventDefault();
            if (!isDragging.current || touchStartXRef.current === null) return;
            const t = e.touches[0];
            const dx = t.clientX - touchStartXRef.current;
            const dy = t.clientY - touchStartYRef.current;

            // Only act if horizontal movement dominates and threshold exceeded
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
                snapLane(dx > 0 ? 1 : -1);
                // Reset anchor so continuous slow drag triggers per-lane
                touchStartXRef.current = t.clientX;
                touchStartYRef.current = t.clientY;
            }
        };

        const onTouchEnd = (e) => {
            e.preventDefault();
            isDragging.current = false;
            touchStartXRef.current = null;
            touchStartYRef.current = null;
        };

        // Keyboard
        const onKeyDown = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') snapLane(-1);
            if (e.key === 'ArrowRight' || e.key === 'd') snapLane(1);
        };

        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd, { passive: false });
        window.addEventListener('keydown', onKeyDown);

        const spawnObstacle = () => {
            const ds = getDiffScale();
            // On mobile, sometimes skip a spawn to reduce density
            if (Math.random() > ds.obstacleCountMult) return;
            const lane = Math.floor(Math.random() * 3);
            const color = pastelColors[Math.floor(Math.random() * pastelColors.length)];
            obstaclesRef.current.push({ z: 2000, lane, passed: false, color });
        };

        const spawnScenery = () => {
            const side = Math.random() > 0.5 ? 1 : -1;
            const type = Math.random() > 0.7 ? 'pillar' : 'rect';
            sceneryRef.current.push({
                z: 2000, side, type,
                h: 100 + Math.random() * 200,
                color: Math.random() > 0.5 ? '#22d3ee' : '#6366f1'
            });
        };

        const loop = () => {
            frameRef.current++;
            const width = window.innerWidth;
            const height = window.innerHeight;
            const now = Date.now();
            const elapsed = (now - startTimeRef.current) / 1000;
            const ds = getDiffScale();

            // Level Logic (20s per level)
            const newLevel = Math.floor(elapsed / 20) + 1;
            if (newLevel !== levelRef.current) {
                levelRef.current = newLevel;
                onLevelChange?.(newLevel);
            }

            // Speed — scaled by device
            const baseSpeed = (2 + levelRef.current * 1.5) * ds.baseSpeedMult;
            const currentSpeed = baseSpeed + (scoreRef.current / 3000);

            // Smooth lane movement
            laneRef.current += (targetLaneRef.current - laneRef.current) * 0.2;

            // Spawn rate scaled by device
            const baseSpawnRate = Math.max(12, 40 - levelRef.current * 3);
            const spawnRate = Math.round(baseSpawnRate / ds.spawnRate);
            if (frameRef.current % spawnRate === 0) spawnObstacle();

            // Update
            obstaclesRef.current.forEach(obs => { obs.z -= currentSpeed * 4; });
            sceneryRef.current.forEach(s => { s.z -= currentSpeed * 4; });
            sceneryRef.current = sceneryRef.current.filter(s => s.z > -100);
            if (frameRef.current % 5 === 0) spawnScenery();

            // Collision
            const collisionZ = 150;
            obstaclesRef.current = obstaclesRef.current.filter(obs => {
                if (!obs.passed && obs.z < collisionZ + 40 && obs.z > collisionZ - 20) {
                    if (Math.abs(obs.lane - targetLaneRef.current) < 0.5) {
                        onGameOver(Math.floor(scoreRef.current / 10));
                        return false;
                    }
                }
                if (!obs.passed && obs.z < collisionZ) {
                    obs.passed = true;
                    scoreRef.current += 100;
                    onScoreUpdate(Math.floor(scoreRef.current / 10));
                }
                return obs.z > -100;
            });

            // ── Render ──────────────────────────────────────────────────────
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, width, height);

            const rW = roadWidth.current;
            const cX = centerX.current;
            const cY = centerY.current;

            // Road
            ctx.fillStyle = '#0a0a15';
            ctx.beginPath();
            ctx.moveTo(cX - rW * 0.025, cY);
            ctx.lineTo(cX + rW * 0.025, cY);
            ctx.lineTo(cX + rW / 2, height);
            ctx.lineTo(cX - rW / 2, height);
            ctx.fill();

            // Lane markers
            ctx.strokeStyle = '#22d3ee33';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([40, 40]);
            ctx.lineDashOffset = -frameRef.current * currentSpeed;
            const topW = rW * 0.05;
            for (let l = 0; l <= 3; l++) {
                const lxBottom = cX - rW / 2 + (l * rW / 3);
                const lxTop = cX - topW + (l * topW * 2 / 3);
                ctx.beginPath();
                ctx.moveTo(lxTop, cY);
                ctx.lineTo(lxBottom, height);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Scenery
            sceneryRef.current.sort((a, b) => b.z - a.z).forEach(s => {
                const scale = 400 / (s.z + 400);
                if (s.z <= -350) return;
                const w = 20 * scale;
                const h = s.h * scale;
                const xOff = s.side * (rW / 2 + 100);
                const drawX = cX + xOff * scale;
                const drawY = cY + (height - cY) * scale;
                ctx.globalAlpha = 0.3 * scale;
                ctx.fillStyle = s.color;
                if (s.type === 'pillar') ctx.fillRect(drawX - w / 2, drawY - h, w, h);
                else ctx.strokeRect(drawX - w / 2, drawY - h, w, h);
                ctx.globalAlpha = 1;
            });

            // Obstacles
            obstaclesRef.current.sort((a, b) => b.z - a.z).forEach(obs => {
                const scale = 400 / (obs.z + 400);
                if (obs.z <= -350) return;
                const laneWidth = (rW / 3) * scale;
                const obsW = laneWidth * 0.95;
                const obsH = 40 * scale;
                const xOff = (obs.lane - 1) * (rW / 3);
                const drawX = cX + xOff * scale;
                const drawY = cY + (height - cY) * scale;
                if (drawY > height + 50) return;
                ctx.shadowBlur = 15 * scale;
                ctx.shadowColor = obs.color;
                ctx.fillStyle = obs.color;
                const padding = 5 * scale;
                ctx.beginPath();
                ctx.roundRect(drawX - obsW / 2 + padding, drawY - obsH, obsW - padding * 2, obsH, 15 * scale);
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            // Player Car
            const carVisualZ = 150;
            const carScale = 400 / (carVisualZ + 400);
            const carY = cY + (height - cY) * carScale;
            const carLOffset = (laneRef.current - 1) * (rW / 3);
            const carX = cX + carLOffset * carScale;
            const carW = 70 * carScale;
            const carH = 100 * carScale;
            const tiltAngle = (laneRef.current - 1) * 0.25;

            ctx.save();
            ctx.translate(carX, carY);
            ctx.rotate(tiltAngle);
            ctx.scale(1, 0.9);
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#22d3ee';
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.roundRect(-carW / 2, -carH / 2, carW, carH, 15);
            ctx.fill();
            ctx.fillStyle = '#0ea5e9';
            ctx.beginPath();
            ctx.roundRect(-carW / 3, -carH / 4, carW * 2 / 3, carH / 2, 10);
            ctx.fill();
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#fff';
            ctx.fillStyle = '#fff';
            ctx.fillRect(-carW / 2 + 8, -carH / 2 + 5, 15, 6);
            ctx.fillRect(carW / 2 - 23, -carH / 2 + 5, 15, 6);
            ctx.restore();

            // Swipe hint (mobile only, first 10s)
            if (width < 768 && elapsed < 10) {
                ctx.globalAlpha = Math.max(0, 1 - elapsed / 8) * 0.4;
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 11px "Courier New"';
                ctx.textAlign = 'center';
                ctx.fillText('← swipe to change lane →', width / 2, height - 30);
                ctx.globalAlpha = 1;
            }

            // HUD
            ctx.font = 'bold 12px "Orbitron"';
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.textAlign = 'center';
            ctx.fillText(`LV. ${levelRef.current} | ${Math.max(0, 20 - (elapsed % 20)).toFixed(0)}s TO NEXT`, width / 2, height - 35);

            animationFrameRef.current = requestAnimationFrame(loop);
        };
        loop();

        return () => {
            cancelAnimationFrame(animationFrameRef.current);
            window.removeEventListener('resize', setCanvasSize);
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [onGameOver, onScoreUpdate]);

    return (
        <canvas ref={canvasRef} className="fixed inset-0 z-0 touch-none active:cursor-grabbing" />
    );
});

export default GameCanvas;
