import React, { useRef, useEffect } from 'react';

const GameCanvas = ({ onGameOver, onScoreUpdate, gameAudio, onLevelChange, onCollision, onHeartCollect }) => {
    const canvasRef = useRef(null);
    const startTimeRef = useRef(Date.now());

    // Game State Refs
    const playerRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, size: 12, angle: 0 });
    const enemiesRef = useRef([]);
    const particlesRef = useRef([]);
    const itemsRef = useRef([]);
    const starsRef = useRef([]); // Background Stars

    // Logic Refs
    const scoreRef = useRef(0);
    const scoreOffsetRef = useRef(0);
    const levelRef = useRef(1);
    const speedMultiplierRef = useRef(1);
    const slowMoEndTimeRef = useRef(0);
    const invulnerableUntilRef = useRef(0); // Add invulnerability state

    // UI Refs
    const notificationRef = useRef({ text: "레벨 1", alpha: 2.0, color: "#fff" });
    const floatTextsRef = useRef([]);

    // Joystick State
    const joystickRef = useRef({
        active: false,
        baseX: 0, baseY: 0,
        stickX: 0, stickY: 0,
        angle: 0, intensity: 0
    });

    // --- Helper: Draw Spaceship ---
    const drawSpaceship = (ctx, x, y, angle, color, isInvulnerable) => {
        // Blinking effect when invulnerable
        if (isInvulnerable && Math.floor(Date.now() / 100) % 2 === 0) return;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // --- 3D / Neon Effect ---
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, -10);
        ctx.closePath();
        ctx.stroke();

        const gradient = ctx.createLinearGradient(-10, 0, 15, 0);
        gradient.addColorStop(0, '#042f2e');
        gradient.addColorStop(1, color);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(13, 0);
        ctx.lineTo(-8, 8);
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    };

    // --- Helper: Draw Enemy (Circles) ---
    const drawEnemy = (ctx, enemy) => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        ctx.fillStyle = enemy.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = enemy.color;

        ctx.beginPath();
        ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();
    };

    // --- Helper: Draw Item ---
    const drawItem = (ctx, item) => {
        ctx.save();
        ctx.translate(item.x, item.y);

        const pulse = 1 + Math.sin(Date.now() / 200) * 0.2;
        ctx.scale(pulse, pulse);

        if (item.type !== 'HEART') ctx.rotate(Date.now() / 200);

        ctx.shadowBlur = 20 + Math.sin(Date.now() / 100) * 10;
        ctx.shadowColor = item.color;
        ctx.fillStyle = item.color;

        if (item.type === 'TIME') {
            ctx.beginPath();
            ctx.moveTo(0, -8); ctx.lineTo(0, 8);
            ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 2;
            ctx.stroke();

        } else if (item.type === 'PAUSE') {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                ctx.lineTo(10 * Math.cos(i * Math.PI / 3), 10 * Math.sin(i * Math.PI / 3));
            }
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
        } else if (item.type === 'HEART') {
            const size = 10;
            ctx.beginPath();
            ctx.moveTo(0, size * 0.7);
            ctx.bezierCurveTo(-size, 0, -size, -size * 1.2, 0, -size * 0.5);
            ctx.bezierCurveTo(size, -size * 1.2, size, 0, 0, size * 0.7);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 5]);
            ctx.stroke();
        }
        ctx.restore();
    };

    // --- Helper: Draw Joystick ---
    const drawJoystick = (ctx) => {
        if (!joystickRef.current.active && joystickRef.current.baseX === 0) return;

        const baseX = joystickRef.current.active ? joystickRef.current.baseX : window.innerWidth / 2;
        const baseY = joystickRef.current.active ? joystickRef.current.baseY : window.innerHeight - 100;
        const stickX = joystickRef.current.active ? joystickRef.current.stickX : baseX;
        const stickY = joystickRef.current.active ? joystickRef.current.stickY : baseY;
        const opacity = joystickRef.current.active ? 0.5 : 0.2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(baseX, baseY, 60, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(stickX, stickY, 30, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${opacity + 0.3})`;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(stickX, stickY);
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const setCanvasSize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.scale(dpr, dpr);
            if (playerRef.current.x === 0) {
                playerRef.current.x = window.innerWidth / 2;
                playerRef.current.y = window.innerHeight / 2;
            }
        };
        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        const handleStart = (x, y) => {
            if (y > window.innerHeight * 0.3) {
                joystickRef.current = {
                    active: true,
                    baseX: x, baseY: y,
                    stickX: x, stickY: y,
                    angle: 0, intensity: 0
                };
            }
        };

        const handleMove = (x, y) => {
            if (!joystickRef.current.active) return;
            const dx = x - joystickRef.current.baseX;
            const dy = y - joystickRef.current.baseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 60;
            const angle = Math.atan2(dy, dx);
            const intensity = Math.min(dist, maxDist) / maxDist;
            const limitedDist = Math.min(dist, maxDist);
            const stickX = joystickRef.current.baseX + Math.cos(angle) * limitedDist;
            const stickY = joystickRef.current.baseY + Math.sin(angle) * limitedDist;
            joystickRef.current.stickX = stickX;
            joystickRef.current.stickY = stickY;
            joystickRef.current.angle = angle;
            joystickRef.current.intensity = intensity;
        };

        const handleEnd = () => {
            if (joystickRef.current.active) {
                joystickRef.current.active = false;
                joystickRef.current.intensity = 0;
                joystickRef.current.stickX = joystickRef.current.baseX;
                joystickRef.current.stickY = joystickRef.current.baseY;
            }
        };

        const onMouseMove = (e) => handleMove(e.clientX, e.clientY);
        const onMouseDown = (e) => handleStart(e.clientX, e.clientY);
        const onMouseUp = handleEnd;
        const onTouchMove = (e) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); };
        const onTouchStart = (e) => { e.preventDefault(); handleStart(e.touches[0].clientX, e.touches[0].clientY); };
        const onTouchEnd = handleEnd;

        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd);

        const loop = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const now = Date.now();

            const rawElapsed = (now - startTimeRef.current) / 1000;
            const currentScore = rawElapsed + scoreOffsetRef.current;
            scoreRef.current = currentScore;
            if (onScoreUpdate) onScoreUpdate(currentScore);

            const newLevel = Math.floor(rawElapsed / 20) + 1;
            if (newLevel > levelRef.current) {
                levelRef.current = newLevel;
                onLevelChange?.(newLevel);
            }

            const isPaused = now < slowMoEndTimeRef.current;
            const timeScale = isPaused ? 0.0 : 1.0;
            const isInvulnerable = now < invulnerableUntilRef.current;

            // Base speed increases with level, more aggressive after Level 5
            const baseMultiplier = 1.2 + (levelRef.current * 0.1);
            const extraScaling = levelRef.current > 5 ? (levelRef.current - 5) * 0.15 : 0;
            speedMultiplierRef.current = baseMultiplier + extraScaling;

            const maxSpeed = 6;
            const friction = 0.95;

            if (joystickRef.current.active) {
                const force = joystickRef.current.intensity * 0.5;
                playerRef.current.vx += Math.cos(joystickRef.current.angle) * force;
                playerRef.current.vy += Math.sin(joystickRef.current.angle) * force;
                playerRef.current.angle = joystickRef.current.angle;
            }

            playerRef.current.vx *= friction;
            playerRef.current.vy *= friction;

            const currentSpeed = Math.sqrt(playerRef.current.vx ** 2 + playerRef.current.vy ** 2);
            if (currentSpeed > maxSpeed) {
                playerRef.current.vx = (playerRef.current.vx / currentSpeed) * maxSpeed;
                playerRef.current.vy = (playerRef.current.vy / currentSpeed) * maxSpeed;
            }

            playerRef.current.x += playerRef.current.vx;
            playerRef.current.y += playerRef.current.vy;

            if (playerRef.current.x < 10) { playerRef.current.x = 10; playerRef.current.vx *= -0.5; }
            if (playerRef.current.x > width - 10) { playerRef.current.x = width - 10; playerRef.current.vx *= -0.5; }
            if (playerRef.current.y < 10) { playerRef.current.y = 10; playerRef.current.vy *= -0.5; }
            if (playerRef.current.y > height - 10) { playerRef.current.y = height - 10; playerRef.current.vy *= -0.5; }

            if (currentSpeed > 1 && Math.random() < 0.5) {
                particlesRef.current.push({
                    x: playerRef.current.x - Math.cos(playerRef.current.angle) * 10,
                    y: playerRef.current.y - Math.sin(playerRef.current.angle) * 10,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    life: 1.0, color: '#06b6d4'
                });
            }

            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                const p = particlesRef.current[i];
                p.x += p.vx; p.y += p.vy; p.life -= 0.05;
                if (p.life <= 0) particlesRef.current.splice(i, 1);
            }

            const itemSpawnChance = itemsRef.current.length === 0 ? 0.0025 : 0.0008;
            if (Math.random() < itemSpawnChance) {
                const rand = Math.random();
                let type = 'TIME';
                if (rand > 0.7) type = 'PAUSE';
                if (rand > 0.9) type = 'HEART'; // Add Heart item spawn

                itemsRef.current.push({
                    x: Math.random() * (width - 100) + 50,
                    y: Math.random() * (height - 100) + 50,
                    type,
                    color: type === 'TIME' ? '#4ade80' : (type === 'HEART' ? '#ff4d4d' : '#60a5fa'),
                    size: 15,
                    life: 10.0
                });
            }

            for (let i = itemsRef.current.length - 1; i >= 0; i--) {
                const item = itemsRef.current[i];
                item.life -= 0.01;
                if (item.life <= 0) {
                    itemsRef.current.splice(i, 1);
                    continue;
                }

                const dist = Math.hypot(playerRef.current.x - item.x, playerRef.current.y - item.y);
                if (dist < playerRef.current.size + item.size + 10) {
                    gameAudio?.playSFX('collect');
                    if (item.type === 'TIME') {
                        scoreOffsetRef.current += 5;
                        floatTextsRef.current.push({ x: item.x, y: item.y, text: "+5초", life: 1.0, color: "#4ade80" });
                    } else if (item.type === 'PAUSE') {
                        slowMoEndTimeRef.current = Date.now() + 5000;
                        notificationRef.current = { text: "일시 정지!", alpha: 2.0, color: "#60a5fa" };
                        floatTextsRef.current.push({ x: item.x, y: item.y, text: "PAUSE!", life: 1.0, color: "#60a5fa" });
                    } else if (item.type === 'HEART') {
                        onHeartCollect?.();
                        floatTextsRef.current.push({ x: item.x, y: item.y, text: "HEART!", life: 1.0, color: "#ff4d4d" });
                    }
                    itemsRef.current.splice(i, 1);
                }
            }

            // Target enemy count increases with level, more aggressive after Level 5
            const baseEnemies = 2 + levelRef.current;
            const extraEnemies = levelRef.current > 5 ? (levelRef.current - 5) * 2 : 0;
            const maxEnemies = baseEnemies + extraEnemies;
            if (enemiesRef.current.length < maxEnemies && Math.random() < 0.02) {
                const side = Math.floor(Math.random() * 4);
                let ex, ey, vx, vy;
                const speed = (1.0 + Math.random() * 1.5) * speedMultiplierRef.current;

                if (side === 0) { ex = Math.random() * width; ey = -20; vx = (Math.random() - 0.5) * 2; vy = speed; }
                else if (side === 1) { ex = width + 20; ey = Math.random() * height; vx = -speed; vy = (Math.random() - 0.5) * 2; }
                else if (side === 2) { ex = Math.random() * width; ey = height + 20; vx = (Math.random() - 0.5) * 2; vy = -speed; }
                else { ex = -20; ey = Math.random() * height; vx = speed; vy = (Math.random() - 0.5) * 2; }

                // Enemy size increases progressively if level > 5
                const sizeBase = 10 + Math.random() * 15;
                const sizeFactor = levelRef.current > 5 ? 1.0 + (levelRef.current - 5) * 0.12 : 1.0;

                enemiesRef.current.push({
                    x: ex, y: ey, vx, vy,
                    size: sizeBase * sizeFactor,
                    color: `hsl(${Math.random() * 360}, 70%, 70%)`
                });
            }

            for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
                const e = enemiesRef.current[i];
                e.x += e.vx * timeScale;
                e.y += e.vy * timeScale;

                if (e.x < -100 || e.x > width + 100 || e.y < -100 || e.y > height + 100) {
                    enemiesRef.current.splice(i, 1);
                    continue;
                }
                const dist = Math.hypot(playerRef.current.x - e.x, playerRef.current.y - e.y);
                if (!isInvulnerable && dist < playerRef.current.size + e.size) {
                    gameAudio?.playSFX('crash');
                    invulnerableUntilRef.current = Date.now() + 2000; // 2 seconds invulnerability

                    // Call onCollision callback from index.jsx
                    const isGameOver = onCollision?.(scoreRef.current);
                    if (isGameOver) return;
                }
            }

            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            drawJoystick(ctx);
            itemsRef.current.forEach(item => drawItem(ctx, item));

            particlesRef.current.forEach(p => {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;

            enemiesRef.current.forEach(e => {
                ctx.fillStyle = isPaused ? '#60a5fa' : e.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = e.color;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            drawSpaceship(ctx, playerRef.current.x, playerRef.current.y, playerRef.current.angle, '#06b6d4', isInvulnerable);

            for (let i = floatTextsRef.current.length - 1; i >= 0; i--) {
                const ft = floatTextsRef.current[i];
                ctx.save();
                ctx.globalAlpha = ft.life;
                ctx.font = 'bold 20px "Pretendard", "Arial"';
                ctx.fillStyle = ft.color;
                ctx.fillText(ft.text, ft.x, ft.y);
                ctx.restore();
                ft.y -= 1;
                ft.life -= 0.02;
                if (ft.life <= 0) floatTextsRef.current.splice(i, 1);
            }

            ctx.font = 'bold 20px "Courier New"';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.textAlign = "center";
            ctx.fillText(`생존 시간: ${currentScore.toFixed(2)}초`, width / 2, 50);

            ctx.font = '14px "Courier New"';
            ctx.textAlign = "left";
            ctx.fillText(`레벨 ${levelRef.current}`, 20, 40);
            if (isPaused) {
                ctx.fillStyle = '#60a5fa';
                ctx.fillText(`시간 정지!`, 20, 60);
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        loop();

        return () => {
            window.removeEventListener('resize', setCanvasSize);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
            cancelAnimationFrame(animationFrameId);
        };
    }, [onGameOver, onCollision, onHeartCollect]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 touch-none cursor-crosshair active:cursor-grabbing"
            style={{ touchAction: 'none' }}
        />
    );
};

export default GameCanvas;
