import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const PortfolioItem = ({ id, title, category, year }) => (
    <motion.div
        className="group relative flex items-center justify-between py-8 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors px-4 md:px-8"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
    >
        <div className="flex items-baseline gap-4 md:gap-12">
            <span className="font-tech text-xs text-gray-400">0{id}</span>
            <h3 className="text-xl md:text-3xl font-brand font-bold text-black uppercase group-hover:translate-x-4 transition-transform duration-300">
                {title}
            </h3>
        </div>

        <div className="flex items-center gap-4 md:gap-12">
            <span className="hidden md:block font-tech text-xs tracking-widest uppercase text-gray-500">{category}</span>
            <span className="font-tech text-xs text-gray-400">{year}</span>
            <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-black group-hover:rotate-45 transition-all" />
        </div>
    </motion.div>
);

const Portfolio = () => {
    const works = [
        { id: 1, title: "Coming Soon", category: "Interactive Web", year: "2026" },
        { id: 2, title: "Project Alpha", category: "Brand Identity", year: "2025" },
        { id: 3, title: "Neon Genesis", category: "3D Motion", year: "2025" },
        { id: 4, title: "Zero Gravity", category: "UI/UX Design", year: "2025" },
    ];

    return (
        <section className="w-full max-w-[1400px] mx-auto px-6 py-24 min-h-[50vh]">
            <div className="flex flex-col mb-16">
                <motion.h2
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="text-sm font-tech font-bold uppercase tracking-widest text-gray-400 mb-2"
                >
                    Selected Works
                </motion.h2>
                <div className="h-[1px] w-full bg-black/10"></div>
            </div>

            <div className="flex flex-col">
                {works.map((work) => (
                    <PortfolioItem key={work.id} {...work} />
                ))}
            </div>

            <div className="mt-16 text-center">
                <p className="font-tech text-xs text-gray-400 uppercase tracking-widest">More projects loading...</p>
            </div>
        </section>
    );
};

export default Portfolio;
