let audioCtx: AudioContext | null = null;
let loopInterval: number | null = null;

export const playBlinkSound = () => {
  // We'll keep the same sound as the user's "radar beep"
  playRadarBeep();
};

const playRadarBeep = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    
    const startTime = audioCtx.currentTime;
    osc.frequency.setValueAtTime(1200, startTime);
    osc.frequency.exponentialRampToValueAtTime(400, startTime + 0.1);

    gainNode.gain.setValueAtTime(0.15, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.15);

  } catch (err) {
    console.warn('Failed to play radar beep:', err);
  }
};

export const startRadarLoop = (intervalMs = 2000) => {
  if (loopInterval !== null) {
    clearInterval(loopInterval);
  }
  playRadarBeep();
  loopInterval = window.setInterval(() => {
    playRadarBeep();
  }, intervalMs);
};

export const stopRadarLoop = () => {
  if (loopInterval !== null) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
};

