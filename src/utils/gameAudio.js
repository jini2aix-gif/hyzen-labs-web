export class GameAudio {
    constructor() {
        this.ctx = null;
        this.bgmOscillators = [];
        this.bgmGain = null;
        this.masterGain = null;
        this.isMuted = false;
        this.isPlaying = false;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.setMute(this.isMuted);
        }
    }

    setMute(muted) {
        this.isMuted = muted;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(muted ? 0 : 0.3, this.ctx.currentTime);
        }
        if (this.ctx && this.ctx.state === 'suspended' && !muted) {
            this.ctx.resume();
        }
    }

    playBGM() {
        this.init();
        if (this.isPlaying) return;
        this.isPlaying = true;

        // Simple Cyberpunk/Space Arpeggio Loop
        const notes = [110, 130.81, 146.83, 164.81, 130.81, 110, 98, 110]; // A2, C3, D3, E3...
        let noteIndex = 0;

        const playNote = () => {
            if (!this.isPlaying) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(notes[noteIndex], this.ctx.currentTime);

            // Lowpass filter for "muffled" space sound
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, this.ctx.currentTime);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.2);

            this.bgmOscillators.push(osc);

            noteIndex = (noteIndex + 1) % notes.length;
            setTimeout(playNote, 250); // 120 beats approx
        };

        playNote();

        // Add a deep drone
        const drone = this.ctx.createOscillator();
        const droneGain = this.ctx.createGain();
        drone.type = 'sine';
        drone.frequency.setValueAtTime(55, this.ctx.currentTime); // A1
        droneGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        drone.connect(droneGain);
        droneGain.connect(this.masterGain);
        drone.start();
        this.bgmOscillators.push(drone);
    }

    stopBGM() {
        this.isPlaying = false;
        this.bgmOscillators.forEach(osc => {
            try { osc.stop(); } catch (e) { }
        });
        this.bgmOscillators = [];
    }

    playSFX(type) {
        if (this.isMuted) return;
        this.init();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        const now = this.ctx.currentTime;

        switch (type) {
            case 'click':
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;

            case 'collect': // Item pickup
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.linearRampToValueAtTime(2000, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;

            case 'crash': // Game Over
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
        }
    }
}

export const gameAudio = new GameAudio();
