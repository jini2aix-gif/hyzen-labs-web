import React, { useRef, useMemo, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';

// --- Debris Component with Repulsion Physics ---
const FloatingDebris = ({ index, scrollY, mouseX, mouseY, windowSize, colors, allowedShapes }) => {
    // Random Properties
    const randomX = useMemo(() => Math.random() * 100, []); // 0-100%
    const randomY = useMemo(() => Math.random() * 100, []); // 0-100%
    const size = useMemo(() => 20 + Math.random() * 60, []); // 20px - 80px
    const depth = useMemo(() => 0.5 + Math.random() * 2, []); // Depth Multiplier
    const rotationSpeed = useMemo(() => (Math.random() - 0.5), []);

    // SHAPES: Default or Custom
    const shapes = allowedShapes || ['circle', 'square', 'cross', 'triangle'];
    const shape = useMemo(() => shapes[Math.floor(Math.random() * shapes.length)], [shapes]);

    // COLORS: Dynamic based on props or default pastel
    const puzzleColors = colors || ['#FFB5E8', '#AFF8DB', '#B28DFF', '#FFABAB', '#FFF5BA', '#85E3FF'];
    const color = useMemo(() => puzzleColors[Math.floor(Math.random() * puzzleColors.length)], [puzzleColors]);

    // VISIBILITY: Optimized for Pastel
    const opacity = useMemo(() => 0.6 + Math.random() * 0.3, []);

    // 1. Vertical Parallax (Scroll)
    const yParallax = useTransform(scrollY, [0, 1000], [0, 500 * depth]);
    const rotateScroll = useTransform(scrollY, [0, 1000], [0, 360 * rotationSpeed]);

    // 2. Mouse Repulsion (Physics)
    const xRepel = useTransform(mouseX, (x) => {
        if (!windowSize.w) return 0;
        const elementX = (randomX / 100) * windowSize.w;
        const dist = x - elementX;
        if (Math.abs(dist) < 300) {
            const force = (300 - Math.abs(dist)) / 300;
            return -dist * force * (depth * 0.8);
        }
        return 0;
    });

    const yRepel = useTransform(mouseY, (y) => {
        if (!windowSize.h) return 0;
        const elementY = (randomY / 100) * windowSize.h;
        const dist = y - elementY;
        if (Math.abs(dist) < 300) {
            const force = (300 - Math.abs(dist)) / 300;
            return -dist * force * (depth * 0.8);
        }
        return 0;
    });

    const xPhysics = useSpring(xRepel, { stiffness: 150, damping: 20 });
    const yPhysics = useSpring(yRepel, { stiffness: 150, damping: 20 });
    const rotatePhysics = useTransform(xPhysics, [-100, 100], [-45, 45]);

    const floatY = [0, -30 * depth, 0];
    const floatDuration = 4 + Math.random() * 5;

    return (
        <motion.div
            style={{
                position: 'absolute',
                top: `${randomY}%`,
                left: `${randomX}%`,
                width: size,
                height: size,
                y: yParallax,
                rotate: rotateScroll,
                opacity
            }}
            className="pointer-events-none z-0 mix-blend-multiply"
        >
            <motion.div
                style={{
                    x: xPhysics,
                    y: yPhysics,
                    rotate: rotatePhysics
                }}
                animate={{
                    y: floatY,
                }}
                transition={{
                    duration: floatDuration,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="w-full h-full"
            >
                {/* Shape Rendering */}
                {shape === 'circle' && <div className="w-full h-full rounded-full" style={{ backgroundColor: color }} />}
                {shape === 'square' && <div className="w-full h-full transform rotate-12" style={{ backgroundColor: color }} />}
                {shape === 'triangle' && (
                    <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-b-[26px] border-l-transparent border-r-transparent" style={{ width: 0, height: 0, borderBottomColor: color }} />
                )}
                {shape === 'cross' && (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className="absolute w-[120%] h-[15%] rounded-full" style={{ backgroundColor: color }} />
                        <div className="absolute h-[120%] w-[15%] rounded-full" style={{ backgroundColor: color }} />
                    </div>
                )}
                {/* Community Specific Shapes */}
                {shape === 'ring' && (
                    <div className="w-full h-full rounded-full border-[6px]" style={{ borderColor: color }} />
                )}
                {shape === 'pill' && (
                    <div className="w-full h-[60%] rounded-full top-[20%] relative" style={{ backgroundColor: color }} />
                )}
            </motion.div>
        </motion.div>
    );
};


const Hero = ({
    title = (
        <>
            Your
            <br />
            Playground
        </>
    ),
    subtitle = "Digital Experience Laboratory",
    debrisColors = null,
    debrisShapes = null, // New Prop
    scrollContainerRef = null
}) => {
    const containerRef = useRef(null);

    // Use container ref if provided, otherwise default (window)
    const { scrollY } = useScroll({
        container: scrollContainerRef || undefined
    });

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const [windowSize, setWindowSize] = React.useState({ w: 0, h: 0 });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWindowSize({ w: window.innerWidth, h: window.innerHeight });
        }

        const handleMouseMove = (e) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };

        const handleResize = () => {
            setWindowSize({ w: window.innerWidth, h: window.innerHeight });
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("resize", handleResize);
        }
    }, [mouseX, mouseY]);

    const yContent = useTransform(scrollY, [0, 500], [0, 200]);
    const opacityContent = useTransform(scrollY, [0, 300], [1, 0]);

    const smoothY = useSpring(yContent, { stiffness: 100, damping: 20 });
    const smoothOpacity = useSpring(opacityContent, { stiffness: 100, damping: 20 });

    // Debris Count
    const debrisCount = 25;
    const debrisItems = useMemo(() => Array.from({ length: debrisCount }), []);

    return (
        <section className="relative w-full h-[100vh] bg-white overflow-hidden flex items-center justify-center pt-20 pb-10 px-4 md:px-10 perspective-1000">

            {/* --- Antigravity Background Layer --- */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {debrisItems.map((_, i) => (
                    <FloatingDebris
                        key={i}
                        index={i}
                        scrollY={scrollY}
                        mouseX={mouseX}
                        mouseY={mouseY}
                        windowSize={windowSize}
                        colors={debrisColors}
                        allowedShapes={debrisShapes}
                    />
                ))}
            </div>

            {/* --- Main Content Container --- */}
            <motion.div
                ref={containerRef}
                style={{
                    y: smoothY,
                    opacity: smoothOpacity
                }}
                className="relative z-10 w-full h-full flex flex-col items-center justify-center origin-center will-change-transform"
            >
                {/* Decoration Lines */}
                <div className="flex items-center gap-4 mb-4 opacity-50">
                    <div className="h-[1px] w-12 bg-black/20"></div>
                    <span className="font-tech text-xs tracking-[0.3em] uppercase text-black/40">Architecture & Design</span>
                    <div className="h-[1px] w-12 bg-black/20"></div>
                </div>

                {/* Main Heading */}
                <h1 className="text-[13vw] md:text-[10vw] font-brand font-bold tracking-tighter leading-[0.85] text-center text-black mix-blend-darken uppercase relative">
                    {title}
                </h1>

                {/* Subtext */}
                <div className="mt-8 flex flex-col gap-2 items-center text-center">
                    <span className="font-tech text-xs md:text-sm tracking-[0.5em] text-black/40 uppercase">
                        {subtitle}
                    </span>
                </div>

                {/* Scroll Indicator */}
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
                >
                    <span className="font-tech text-[10px] tracking-[0.2em] text-black/30 uppercase">Scroll</span>
                    <div className="w-[1px] h-12 bg-gradient-to-b from-black/0 via-black/20 to-black/0"></div>
                </motion.div>
            </motion.div>
        </section>
    );
};

export default React.memo(Hero);
