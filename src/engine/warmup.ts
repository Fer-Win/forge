import type { Load } from '../data/types';

/** Ids from the seed library, in order. Missing ids are skipped, so a custom library never breaks a workout. */
export const WARMUP_IDS = ['wu-jacks', 'wu-arm-circles', 'wu-hip-circles', 'wu-inchworm'];
export const COOLDOWN_IDS = ['cd-quad', 'cd-ham', 'cd-child'];
/** Used when a timed warm-up or cooldown exercise has no duration of its own. */
export const DEFAULT_EXTRA_SEC = 30;

/** Total kilograms moved per rep for a load. 2x5kg is two dumbbells, so 10 kg. Bodyweight is 0. */
export function loadKg(l: Load): number {
  switch (l) {
    case 'BW': return 0;
    case '5kg': return 5;
    case '2x5kg': return 10;
    case '10kg': return 10;
    case '10+5kg': return 15;
  }
}
