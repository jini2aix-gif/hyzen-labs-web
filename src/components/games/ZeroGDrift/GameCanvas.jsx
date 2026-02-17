import React, { useRef, useEffect } from 'react';

const GameCanvas = ({ onGameOver, onScoreUpdate, gameAudio, onLevelChange }) => {
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

    // ... (Helper functions remain unchanged) ...
    // Note: I will only replace the parts that need the audio logic and score update logic.
    // However, since this is a large file and I need to insert logic deep inside the loop, 
    // I will replace the component body carefully. 

    // Actually, to avoid replacing 500 lines, I'll use a more targeted replacement 
    // if I can find a unique enough block, but the loop is one giant block. 
    // I will replace the entire GameCanvas component content to be safe and ensure all hooks are in place.

    // ... DRAW FUNCTIONS OMITTED FOR BREVITY IN PROMPT ... 
    // I'll assume the helper functions (drawSpaceship, drawEnemy, etc.) are stable 
    // and I'll focus on the useEffect loop where the logic lives.

    // Wait, the tool requires me to replace a contiguous block. 
    // I will replace the Loop logic specifically.

    // --- Helper: Draw Spaceship ---
    const drawSpaceship = (ctx, x, y, angle, color) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // --- 3D / Neon Effect ---
        // 1. Outer Glow (Neon)
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;

        // 2. Main Body Outline (Slightly larger for border effect)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, -10);
        ctx.closePath();
        ctx.stroke();

        // 3. Main Body Fill
        const gradient = ctx.createLinearGradient(-10, 0, 15, 0);
        gradient.addColorStop(0, '#042f2e'); // Deep Cyan (Dark)
        gradient.addColorStop(1, color);     // Bright Cyan
        ctx.fillStyle = gradient;
        ctx.fill();

        // 4. Highlight Detail (Stereoscopic look)
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(13, 0);
        ctx.lineTo(-8, 8);
        ctx.stroke();

        // 5. Cockpit
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

        // Circle Shape (Reverted)
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

        // Pulse Effect
        const pulse = 1 + Math.sin(Date.now() / 200) * 0.2;
        ctx.scale(pulse, pulse);

        ctx.rotate(Date.now() / 200);
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
        }
        ctx.restore();
    };

    // --- Helper: Draw Joystick ---
    const drawJoystick = (ctx) => {
        if (!joystickRef.current.active && joystickRef.current.baseX === 0) return;

        // Default position if inactive (Bottom Center Hint)
        const baseX = joystickRef.current.active ? joystickRef.current.baseX : window.innerWidth / 2;
        const baseY = joystickRef.current.active ? joystickRef.current.baseY : window.innerHeight - 100;
        const stickX = joystickRef.current.active ? joystickRef.current.stickX : baseX;
        const stickY = joystickRef.current.active ? joystickRef.current.stickY : baseY;
        const opacity = joystickRef.current.active ? 0.5 : 0.2;

        ctx.save();
        // Base
        ctx.beginPath();
        ctx.arc(baseX, baseY, 60, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Stick
        ctx.beginPath();
        ctx.arc(stickX, stickY, 30, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${opacity + 0.3})`; // Cyan
        ctx.fill();

        // Connector
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

        // Joystick Input Logic
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

        // --- Game Loop ---
        const loop = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const now = Date.now();

            // 1. Time Logic
            const rawElapsed = (now - startTimeRef.current) / 1000;
            const currentScore = rawElapsed + scoreOffsetRef.current;
            scoreRef.current = currentScore;
            if (onScoreUpdate) onScoreUpdate(currentScore); // Sync Score

            // Level Logic (Every 20 Seconds)
            const newLevel = Math.floor(rawElapsed / 20) + 1;
            if (newLevel > levelRef.current) {
                levelRef.current = newLevel;
                onLevelChange?.(newLevel);
            }

            // Pause/Slow Logic
            const isPaused = now < slowMoEndTimeRef.current;
            const timeScale = isPaused ? 0.0 : 1.0; // 0.0 for Full Pause

            // Difficulty Multiplier
            // Harder Start: Level 1 is now like old Level 3 (Base 1.2)
            speedMultiplierRef.current = 1.2 + (levelRef.current * 0.1);

            // 2. Player Logic (Physics)
            const maxSpeed = 6;
            const friction = 0.95;

            // Apply Joystick force
            if (joystickRef.current.active) {
                const force = joystickRef.current.intensity * 0.5;
                playerRef.current.vx += Math.cos(joystickRef.current.angle) * force;
                playerRef.current.vy += Math.sin(joystickRef.current.angle) * force;
                playerRef.current.angle = joystickRef.current.angle;
            }

            // Apply Friction
            playerRef.current.vx *= friction;
            playerRef.current.vy *= friction;

            // Limit Max Speed
            const currentSpeed = Math.sqrt(playerRef.current.vx ** 2 + playerRef.current.vy ** 2);
            if (currentSpeed > maxSpeed) {
                playerRef.current.vx = (playerRef.current.vx / currentSpeed) * maxSpeed;
                playerRef.current.vy = (playerRef.current.vy / currentSpeed) * maxSpeed;
            }

            // Update Position
            playerRef.current.x += playerRef.current.vx;
            playerRef.current.y += playerRef.current.vy;

            // Wall Constraints (Bounce)
            if (playerRef.current.x < 10) { playerRef.current.x = 10; playerRef.current.vx *= -0.5; }
            if (playerRef.current.x > width - 10) { playerRef.current.x = width - 10; playerRef.current.vx *= -0.5; }
            if (playerRef.current.y < 10) { playerRef.current.y = 10; playerRef.current.vy *= -0.5; }
            if (playerRef.current.y > height - 10) { playerRef.current.y = height - 10; playerRef.current.vy *= -0.5; }

            // Engine Particles
            if (currentSpeed > 1 && Math.random() < 0.5) {
                particlesRef.current.push({
                    x: playerRef.current.x - Math.cos(playerRef.current.angle) * 10,
                    y: playerRef.current.y - Math.sin(playerRef.current.angle) * 10,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    life: 1.0, color: '#06b6d4'
                });
            }

            // Update Particles
            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                const p = particlesRef.current[i];
                p.x += p.vx; p.y += p.vy; p.life -= 0.05;
                if (p.life <= 0) particlesRef.current.splice(i, 1);
            }

            // 3. Item Spawning (Reduced frequency by half)
            const itemSpawnChance = itemsRef.current.length === 0 ? 0.0025 : 0.0005;
            if (Math.random() < itemSpawnChance) {
                const type = Math.random() > 0.5 ? 'TIME' : 'PAUSE'; // Changed SLOW to PAUSE
                itemsRef.current.push({
                    x: Math.random() * (width - 100) + 50,
                    y: Math.random() * (height - 100) + 50,
                    type,
                    color: type === 'TIME' ? '#4ade80' : '#60a5fa',
                    size: 15,
                    life: 10.0
                });
            }

            // 4. Update Items & Collision
            for (let i = itemsRef.current.length - 1; i >= 0; i--) {
                const item = itemsRef.current[i];
                item.life -= 0.01;
                if (item.life <= 0) {
                    itemsRef.current.splice(i, 1);
                    continue;
                }

                const dist = Math.hypot(playerRef.current.x - item.x, playerRef.current.y - item.y);
                if (dist < playerRef.current.size + item.size + 10) {
                    gameAudio?.playSFX('collect'); // SFX Trigger
                    if (item.type === 'TIME') {
                        scoreOffsetRef.current += 5;
                        floatTextsRef.current.push({ x: item.x, y: item.y, text: "+5초", life: 1.0, color: "#4ade80" });
                    } else if (item.type === 'PAUSE') {
                        slowMoEndTimeRef.current = Date.now() + 5000;
                        notificationRef.current = { text: "일시 정지!", alpha: 2.0, color: "#60a5fa" };
                        floatTextsRef.current.push({ x: item.x, y: item.y, text: "PAUSE!", life: 1.0, color: "#60a5fa" });
                    }
                    itemsRef.current.splice(i, 1);
                }
            }

            // 5. Enemy Spawning & Logic
            // Max Enemies capped by level: 3 + Level * 2 (Level 1 = 5, Level 2 = 7...)
            // Half of previous (previous was unbounded/high logic)
            const maxEnemies = 2 + (levelRef.current);

            if (enemiesRef.current.length < maxEnemies && Math.random() < 0.02) {
                const side = Math.floor(Math.random() * 4);
                let ex, ey, vx, vy;
                // Base speed reduced for Level 1 compatibility
                const speed = (1.0 + Math.random() * 1.5) * speedMultiplierRef.current;

                if (side === 0) { ex = Math.random() * width; ey = -20; vx = (Math.random() - 0.5) * 2; vy = speed; }
                else if (side === 1) { ex = width + 20; ey = Math.random() * height; vx = -speed; vy = (Math.random() - 0.5) * 2; vy = (Math.random() - 0.5) * 2; }
                else if (side === 2) { ex = Math.random() * width; ey = height + 20; vx = (Math.random() - 0.5) * 2; vy = -speed; }
                else { ex = -20; ey = Math.random() * height; vx = speed; vy = (Math.random() - 0.5) * 2; }

                enemiesRef.current.push({
                    x: ex, y: ey, vx, vy,
                    size: 10 + Math.random() * 15,
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
                if (dist < playerRef.current.size + e.size) {
                    // Start screen doesn't need crash sound here, index.jsx handles it via onGameOver
                    // But onGameOver calls setGameState, so it's safer to play sound in index.jsx
                    // However, instant feedback is good. 
                    // Let's rely on index.jsx to handle specific gameover sound to avoid double playing if logic overlaps
                    // Actually, passing gameAudio to onGameOver in index.jsx covers it. 
                    onGameOver(scoreRef.current);
                    return;
                }
            }

            // --- Render ---
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            // Draw Joystick (Underlay)
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
                ctx.fillStyle = isPaused ? '#60a5fa' : e.color; // Blue tint when paused
                ctx.shadowBlur = 10;
                ctx.shadowColor = e.color;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            drawSpaceship(ctx, playerRef.current.x, playerRef.current.y, playerRef.current.angle, '#06b6d4');

            // --- UI Rendering ---
            // --- UI Rendering Omitted Level UI ---

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

            // HUD
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
    }, [onGameOver]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 touch-none cursor-crosshair active:cursor-grabbing"
            style={{ touchAction: 'none' }}
        />
    );
};

export default GameCanvas;
