export interface GeoSample { lat: number; lng: number; t: number; acc?: number }
export interface Track { points: GeoSample[]; distanceM: number }

export const emptyTrack = (): Track => ({ points: [], distanceM: 0 });

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const MAX_ACCURACY_M = 35; // worse fixes are ignored
export const MAX_SPEED_MS = 12; // ~43 km/h: faster than any runner means a GPS jump
export const MIN_STEP_M = 4; // smaller moves are jitter while standing still

/** Adds a GPS fix if it looks real; returns the same Track object when the fix is rejected. */
export function addSample(track: Track, s: GeoSample): Track {
  if (s.acc !== undefined && s.acc > MAX_ACCURACY_M) return track;
  const last = track.points[track.points.length - 1];
  if (!last) return { points: [s], distanceM: 0 };
  const dt = (s.t - last.t) / 1000;
  if (dt <= 0) return track;
  const d = haversine(last, s);
  if (d / dt > MAX_SPEED_MS) return track;
  if (d < MIN_STEP_M) return track;
  return { points: [...track.points, s], distanceM: track.distanceM + d };
}

/** Seconds per kilometre, or null when there is not enough to go on. */
export function paceOf(distanceM: number, ms: number): number | null {
  if (distanceM < 10 || ms <= 0) return null;
  return ms / 1000 / (distanceM / 1000);
}

/** Smoothed current pace over the last `windowSec` seconds of the track. */
export function recentPace(track: Track, windowSec = 30): number | null {
  const pts = track.points;
  const last = pts[pts.length - 1];
  if (!last || pts.length < 2) return null;
  const from = last.t - windowSec * 1000;
  let i = pts.length - 1;
  while (i > 0 && pts[i - 1]!.t >= from) i--;
  if (i === pts.length - 1) i = pts.length - 2; // always use at least the latest step
  let d = 0;
  for (let k = i + 1; k < pts.length; k++) d += haversine(pts[k - 1]!, pts[k]!);
  return paceOf(d, last.t - pts[i]!.t);
}

export interface RoutePath {
  d: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
}

/** Fits the route inside a w x h box (aspect preserved) and returns an SVG path. */
export function routePath(points: { lat: number; lng: number }[], w: number, h: number, pad = 12): RoutePath | null {
  if (points.length < 2) return null;
  const step = Math.max(1, Math.ceil(points.length / 300));
  const pts = points.filter((_, i) => i % step === 0 || i === points.length - 1);
  const lat0 = pts.reduce((a, p) => a + p.lat, 0) / pts.length;
  const kx = Math.cos(rad(lat0));
  const xs = pts.map((p) => p.lng * kx);
  const ys = pts.map((p) => -p.lat);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX || 1e-9;
  const spanY = maxY - minY || 1e-9;
  const scale = Math.min((w - 2 * pad) / spanX, (h - 2 * pad) / spanY);
  const offX = (w - spanX * scale) / 2;
  const offY = (h - spanY * scale) / 2;
  const xy = pts.map((_, i) => ({ x: offX + (xs[i]! - minX) * scale, y: offY + (ys[i]! - minY) * scale }));
  const d = xy.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return { d, start: xy[0]!, end: xy[xy.length - 1]! };
}

// ---- display helpers

/** 332 -> "5:32" */
export function fmtPace(secPerKm: number | null): string {
  if (secPerKm === null || !isFinite(secPerKm) || secPerKm <= 0) return '–:––';
  const total = Math.round(secPerKm);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}

export const fmtKm = (m: number): string => (m / 1000).toFixed(2);

/** 3725 -> "1:02:05", 605 -> "10:05" */
export function fmtDuration(sec: number): string {
  const t = Math.max(0, Math.round(sec));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
