
const W = 320;
const PAD = { l: 8, r: 8, t: 14, b: 22 };

export interface ChartPoint { label: string; value: number }

function scale(values: number[], zeroBased: boolean): { min: number; max: number } {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (zeroBased) min = Math.min(0, min);
  if (min === max) { min -= 1; max += 1; }
  const pad = zeroBased ? 0 : (max - min) * 0.15;
  return { min: zeroBased ? min : min - pad, max: max + pad };
}

/** Themed SVG line chart. The last point is highlighted and labelled. */
export function LineChart({
  points, format, label, height = 150, testId,
}: { points: ChartPoint[]; format: (v: number) => string; label: string; height?: number; testId?: string }) {
  if (points.length === 0) return null;
  const { min, max } = scale(points.map((p) => p.value), false);
  const iw = W - PAD.l - PAD.r;
  const ih = height - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => PAD.t + ih - ((v - min) / (max - min)) * ih;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const last = points[points.length - 1]!;
  const lx = x(points.length - 1);
  const anchor = lx > W - 60 ? 'end' : 'middle';
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="block w-full" role="img" aria-label={label} data-testid={testId}>
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + ih * f} y2={PAD.t + ih * f} stroke="rgba(255,255,255,0.06)" />
      ))}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4.5 : 2.5} fill={i === points.length - 1 ? 'var(--accent)' : 'var(--card)'} stroke="var(--accent)" strokeWidth="1.5" />
      ))}
      <text x={lx} y={Math.max(10, y(last.value) - 9)} textAnchor={anchor} fontSize="11" fontWeight="700" fill="var(--fg)" className="num">{format(last.value)}</text>
      <text x={PAD.l} y={height - 6} fontSize="10" fill="var(--muted)">{points[0]!.label}</text>
      {points.length > 1 && <text x={W - PAD.r} y={height - 6} textAnchor="end" fontSize="10" fill="var(--muted)">{last.label}</text>}
    </svg>
  );
}

/** Themed SVG bar chart; the final bar (the current period) is accented. */
export function BarChart({
  bars, format, label, height = 140, testId,
}: { bars: ChartPoint[]; format: (v: number) => string; label: string; height?: number; testId?: string }) {
  if (bars.length === 0) return null;
  const max = Math.max(1e-9, ...bars.map((b) => b.value));
  const ih = height - PAD.t - PAD.b;
  const slot = (W - PAD.l - PAD.r) / bars.length;
  const bw = Math.min(26, slot * 0.62);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="block w-full" role="img" aria-label={label} data-testid={testId}>
      <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + ih} y2={PAD.t + ih} stroke="rgba(255,255,255,0.1)" />
      {bars.map((b, i) => {
        const h = (b.value / max) * ih;
        const cx = PAD.l + slot * i + slot / 2;
        const cur = i === bars.length - 1;
        return (
          <g key={i}>
            <rect x={cx - bw / 2} y={PAD.t + ih - Math.max(h, b.value > 0 ? 2 : 0)} width={bw} height={Math.max(h, b.value > 0 ? 2 : 0)} rx="5" fill={cur ? 'var(--accent)' : 'rgba(255,255,255,0.22)'} />
            {b.value > 0 && (
              <text x={cx} y={PAD.t + ih - h - 4} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={cur ? 'var(--fg)' : 'var(--muted)'} className="num">{format(b.value)}</text>
            )}
            <text x={cx} y={height - 6} textAnchor="middle" fontSize="9.5" fill="var(--muted)">{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
