/** Renders a 1080x1920 dark/orange share card for a finished workout or run, then shares or downloads it. */
export interface ShareCard {
  /** Small caps label, e.g. "WORKOUT" or "RUN". */
  kind: string;
  title: string;
  subtitle: string;
  heroLabel: string;
  heroValue: string;
  stats: { label: string; value: string }[];
  /** PR lines, at most three are drawn. */
  badges?: string[];
  route?: { lat: number; lng: number }[];
}

export const SHARE_W = 1080;
export const SHARE_H = 1920;

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Shrinks the font until the text fits the width. */
function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxW: number, font: string, min = 28): number {
  let s = size;
  for (; s > min; s -= 4) {
    ctx.font = `${weight} ${s}px ${font}`;
    if (ctx.measureText(text).width <= maxW) break;
  }
  ctx.font = `${weight} ${s}px ${font}`;
  return s;
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

export function drawShareCard(ctx: CanvasRenderingContext2D, card: ShareCard, accent: string, font: string) {
  const W = SHARE_W;
  const H = SHARE_H;
  const M = 90;

  ctx.fillStyle = '#0B0B0F';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.9, H * 0.08, 0, W * 0.9, H * 0.08, 1100);
  glow.addColorStop(0, `${accent}66`);
  glow.addColorStop(1, `${accent}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // wordmark
  setSpacing(ctx, 14);
  ctx.fillStyle = accent;
  ctx.font = `800 54px ${font}`;
  ctx.fillText('FORGE', M, 180);
  setSpacing(ctx, 6);
  ctx.fillStyle = '#8B8B98';
  ctx.font = `700 34px ${font}`;
  ctx.fillText(card.kind.toUpperCase(), M, 330);
  setSpacing(ctx, 0);

  // title
  ctx.fillStyle = '#F5F5F7';
  fit(ctx, card.title, 800, 96, W - 2 * M, font);
  ctx.fillText(card.title, M, 430);
  ctx.fillStyle = '#8B8B98';
  fit(ctx, card.subtitle, 500, 40, W - 2 * M, font);
  ctx.fillText(card.subtitle, M, 495);

  // route
  const pts = card.route && card.route.length >= 2 ? card.route : null;
  let y0 = 700;
  if (pts) {
    const bx = M;
    const by = 570;
    const bw = W - 2 * M;
    const bh = 520;
    ctx.fillStyle = '#16161D';
    rr(ctx, bx, by, bw, bh, 40);
    ctx.fill();
    const lat0 = pts.reduce((a, p) => a + p.lat, 0) / pts.length;
    const kx = Math.cos((lat0 * Math.PI) / 180);
    const xs = pts.map((p) => p.lng * kx);
    const ys = pts.map((p) => -p.lat);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = Math.max(1e-9, maxX - minX), spanY = Math.max(1e-9, maxY - minY);
    const pad = 60;
    const s = Math.min((bw - 2 * pad) / spanX, (bh - 2 * pad) / spanY);
    const ox = bx + (bw - spanX * s) / 2;
    const oy = by + (bh - spanY * s) / 2;
    const X = (i: number) => ox + (xs[i]! - minX) * s;
    const Y = (i: number) => oy + (ys[i]! - minY) * s;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((_, i) => (i === 0 ? ctx.moveTo(X(i), Y(i)) : ctx.lineTo(X(i), Y(i))));
    ctx.stroke();
    ctx.fillStyle = '#34C759';
    ctx.beginPath(); ctx.arc(X(0), Y(0), 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F5F5F7';
    ctx.beginPath(); ctx.arc(X(pts.length - 1), Y(pts.length - 1), 16, 0, Math.PI * 2); ctx.fill();
    y0 = 1190;
  }

  // hero
  setSpacing(ctx, 6);
  ctx.fillStyle = '#8B8B98';
  ctx.font = `700 36px ${font}`;
  ctx.fillText(card.heroLabel.toUpperCase(), M, y0);
  setSpacing(ctx, -4);
  ctx.fillStyle = '#F5F5F7';
  fit(ctx, card.heroValue, 800, pts ? 220 : 300, W - 2 * M, font, 80);
  ctx.fillText(card.heroValue, M, y0 + (pts ? 210 : 290));
  setSpacing(ctx, 0);

  // stats
  const stats = card.stats.slice(0, 3);
  const sy = y0 + (pts ? 290 : 400);
  const gap = 24;
  const cw = (W - 2 * M - gap * (stats.length - 1)) / Math.max(1, stats.length);
  stats.forEach((s, i) => {
    const x = M + i * (cw + gap);
    ctx.fillStyle = '#16161D';
    rr(ctx, x, sy, cw, 190, 32);
    ctx.fill();
    ctx.fillStyle = '#F5F5F7';
    fit(ctx, s.value, 800, 72, cw - 48, font, 36);
    ctx.fillText(s.value, x + 28, sy + 100);
    ctx.fillStyle = '#8B8B98';
    ctx.font = `700 30px ${font}`;
    ctx.fillText(s.label.toUpperCase(), x + 28, sy + 152);
  });

  // personal records
  const badges = (card.badges ?? []).slice(0, 3);
  badges.forEach((b, i) => {
    const by = sy + 190 + 44 + i * 100;
    ctx.fillStyle = `${accent}26`;
    rr(ctx, M, by, W - 2 * M, 80, 40);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.font = `800 34px ${font}`;
    ctx.fillText('PR', M + 36, by + 53);
    ctx.fillStyle = '#F5F5F7';
    fit(ctx, b, 700, 36, W - 2 * M - 150, font, 24);
    ctx.fillText(b, M + 112, by + 53);
  });

  // footer
  setSpacing(ctx, 8);
  ctx.fillStyle = '#5A5A66';
  ctx.font = `700 30px ${font}`;
  ctx.fillText('TRACKED WITH FORGE', M, H - 100);
  setSpacing(ctx, 0);
}

export async function renderShareImage(card: ShareCard): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#FC4C02';
  const font = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
  try { await document.fonts?.ready; } catch { /* draw with whatever is loaded */ }
  drawShareCard(ctx, card, /^#[0-9a-f]{6}$/i.test(accent) ? accent : '#FC4C02', font);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'));
}

export type ShareResult = 'shared' | 'saved' | 'cancelled';

/** Opens the phone's share sheet with the image when possible, otherwise downloads the PNG. */
export async function shareCard(card: ShareCard, text: string, filename: string): Promise<ShareResult> {
  const blob = await renderShareImage(card);
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: 'Forge' });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // fall through to a download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}
