import { useCallback } from 'react';

export const useSystemSound = () => {
    const playSystemSound = useCallback(async (type) => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') await audioCtx.resume();

            if (type === 'quantumBreath') {
                const masterGain = audioCtx.createGain();
                masterGain.connect(audioCtx.destination);
                masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
                masterGain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 1.2);
                masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3.0);
                const subOsc = audioCtx.createOscillator();
                subOsc.type = 'sine'; subOsc.frequency.setValueAtTime(40, audioCtx.currentTime);
                const mainOsc = audioCtx.createOscillator();
                mainOsc.type = 'sawtooth'; mainOsc.frequency.setValueAtTime(55, audioCtx.currentTime);
                const filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass'; filter.frequency.setValueAtTime(50, audioCtx.currentTime);
                filter.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 1.2);
                filter.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 2.8);
                subOsc.connect(masterGain); mainOsc.connect(filter); filter.connect(masterGain);
                subOsc.start(); mainOsc.start();
                subOsc.stop(audioCtx.currentTime + 3.0); mainOsc.stop(audioCtx.currentTime + 3.0);
            }
            else if (type === 'glassSweep') {
                const masterGain = audioCtx.createGain();
                masterGain.connect(audioCtx.destination);
                masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
                masterGain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1);
                masterGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.5);
                const osc = audioCtx.createOscillator();
                const filter = audioCtx.createBiquadFilter();
                osc.type = 'triangle'; osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(2400, audioCtx.currentTime + 1.5);
                filter.type = 'highpass'; filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
                filter.Q.setValueAtTime(20, audioCtx.currentTime);
                osc.connect(filter); filter.connect(masterGain);
                osc.start(); osc.stop(audioCtx.currentTime + 2.5);
            }
            else if (type === 'start') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.type = 'sine'; osc.frequency.setValueAtTime(440, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.08, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
                osc.start(); osc.stop(audioCtx.currentTime + 0.8);
            } else if (type === 'popup') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.type = 'triangle'; osc.frequency.setValueAtTime(660, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
                osc.start(); osc.stop(audioCtx.currentTime + 0.15);
            } else if (type === 'dismiss') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.type = 'sine'; osc.frequency.setValueAtTime(110, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
                osc.start(); osc.stop(audioCtx.currentTime + 0.5);
            } else if (type === 'click') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.type = 'square'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
                osc.start(); osc.stop(audioCtx.currentTime + 0.05);
            } else if (type === 'swipe') {
                const bufferSize = audioCtx.sampleRate * 0.3;
                const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
                const noise = audioCtx.createBufferSource();
                noise.buffer = buffer;
                const filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.Q.value = 1;
                filter.frequency.setValueAtTime(1200, audioCtx.currentTime);
                filter.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.2);
                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
                noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
                noise.start();
            }
        } catch (e) { }
    }, []);

    return { playSystemSound };
};
