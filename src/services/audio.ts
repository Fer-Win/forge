/** Web Audio beeps. Safe everywhere: does nothing if audio is unavailable or has not been unlocked. */
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Call from a tap (browsers only allow audio after a gesture). */
export function unlockAudio(): void {
  const c = context();
  if (c && c.state === 'suspended') void c.resume().catch(() => undefined);
}

function beep(freq: number, ms: number, volume = 0.25): void {
  const c = context();
  if (!c || c.state !== 'running') return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const t = c.currentTime;
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + ms / 1000 + 0.02);
}

/** n = 3, 2, 1 -> short tick; 0 -> longer, higher "go". */
export function countdownBeep(n: number): void {
  if (n > 0) beep(660, 110);
  else beep(1040, 380, 0.3);
}

export function doneChime(): void {
  beep(784, 160);
  setTimeout(() => beep(1175, 320), 170);
}
