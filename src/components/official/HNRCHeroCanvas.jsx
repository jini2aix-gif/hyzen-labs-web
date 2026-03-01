import React, { useRef, useEffect } from 'react';

const HNRCHeroCanvas = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const resize = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.offsetWidth;
                canvas.height = canvas.parentElement.offsetHeight;
            }
        };

        window.addEventListener('resize', resize);
        resize();

        const boids = [];
        const numBoids = 150;
        for (let i = 0; i < numBoids; i++) {
            boids.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                size: Math.random() * 2 + 1,
            });
        }

        let mouse = { x: -1000, y: -1000 };

        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };
        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        const updateBoids = () => {
            for (let i = 0; i < boids.length; i++) {
                let b = boids[i];
                let cx = 0, cy = 0;
                let ax = 0, ay = 0;
                let sx = 0, sy = 0;
                let neighborCount = 0;
                const perception = 60;

                for (let j = 0; j < boids.length; j++) {
                    if (i === j) continue;
                    let other = boids[j];
                    let d = Math.hypot(b.x - other.x, b.y - other.y);
                    if (d < perception) {
                        cx += other.x;
                        cy += other.y;
                        ax += other.vx;
                        ay += other.vy;
                        neighborCount++;

                        if (d < 20) {
                            sx += b.x - other.x;
                            sy += b.y - other.y;
                        }
                    }
                }

                if (neighborCount > 0) {
                    cx /= neighborCount;
                    cy /= neighborCount;
                    ax /= neighborCount;
                    ay /= neighborCount;

                    b.vx += (cx - b.x) * 0.005;
                    b.vy += (cy - b.y) * 0.005;
                    b.vx += ax * 0.05;
                    b.vy += ay * 0.05;
                    b.vx += sx * 0.05;
                    b.vy += sy * 0.05;
                }

                let dMouse = Math.hypot(b.x - mouse.x, b.y - mouse.y);
                if (dMouse < 150) {
                    b.vx += (b.x - mouse.x) * 0.01;
                    b.vy += (b.y - mouse.y) * 0.01;
                } else if (dMouse < 300) {
                    b.vx -= (b.x - mouse.x) * 0.001;
                    b.vy -= (b.y - mouse.y) * 0.001;
                }

                const speed = Math.hypot(b.vx, b.vy);
                const maxSpeed = 3;
                if (speed > maxSpeed) {
                    b.vx = (b.vx / speed) * maxSpeed;
                    b.vy = (b.vy / speed) * maxSpeed;
                }

                b.x += b.vx;
                b.y += b.vy;

                if (b.x < 0) b.x += canvas.width;
                if (b.x > canvas.width) b.x -= canvas.width;
                if (b.y < 0) b.y += canvas.height;
                if (b.y > canvas.height) b.y -= canvas.height;
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            updateBoids();
            ctx.fillStyle = 'rgba(79, 70, 229, 0.4)';
            for (let b of boids) {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
                ctx.fill();
            }
            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />
    );
};

export default HNRCHeroCanvas;
