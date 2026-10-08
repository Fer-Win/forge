/** Vibration, feature-detected. Desktop and iOS browsers simply do nothing. */
function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

/** One short tick per logged set. */
export const hapticTick = () => vibrate(12);
/** Countdown cue (3-2-1). */
export const hapticCue = () => vibrate(25);
/** Go / rest finished. */
export const hapticGo = () => vibrate([60, 40, 60]);
/** Workout complete. */
export const hapticDone = () => vibrate([80, 60, 80, 60, 160]);
