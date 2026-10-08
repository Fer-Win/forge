import { describe, expect, it } from 'vitest';
import {
  addSample, emptyTrack, fmtDuration, fmtKm, fmtPace, haversine, paceOf, recentPace, routePath, type GeoSample, type Track,
} from './geo';

// 0.001 degrees of latitude is about 111.2 m
const at = (i: number, tSec: number, acc = 5): GeoSample => ({ lat: 12.9 + i * 0.0001, lng: 77.6, t: tSec * 1000, acc });
const track = (samples: GeoSample[]): Track => samples.reduce(addSample, emptyTrack());

describe('haversine', () => {
  it('is about 111 km per degree of latitude and zero for the same point', () => {
    expect(Math.round(haversine({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }) / 1000)).toBe(111);
    expect(haversine({ lat: 12, lng: 77 }, { lat: 12, lng: 77 })).toBe(0);
  });
  it('shrinks east-west distances away from the equator', () => {
    const eq = haversine({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    const hi = haversine({ lat: 60, lng: 0 }, { lat: 60, lng: 1 });
    expect(Math.abs(hi / eq - 0.5) < 0.01).toBe(true);
  });
});

describe('addSample', () => {
  it('accumulates distance along a steady run', () => {
    const t = track([at(0, 0), at(1, 3), at(2, 6), at(3, 9)]); // 11 m every 3 s
    expect(t.points).toHaveLength(4);
    expect(Math.abs(t.distanceM - 33.4) < 0.5).toBe(true);
  });
  it('ignores poor-accuracy fixes', () => {
    const t = track([at(0, 0), at(1, 3, 80), at(2, 6)]);
    expect(t.points).toHaveLength(2);
  });
  it('ignores jitter while standing still', () => {
    const t = track([at(0, 0), { ...at(0, 3), lat: 12.9 + 0.00001 }, { ...at(0, 6), lat: 12.9 - 0.00001 }]);
    expect(t.points).toHaveLength(1);
    expect(t.distanceM).toBe(0);
  });
  it('rejects an impossible jump', () => {
    const t = track([at(0, 0), at(100, 3)]); // 1.1 km in 3 s
    expect(t.points).toHaveLength(1);
  });
  it('rejects out-of-order fixes and returns the same object', () => {
    const t = track([at(0, 10), at(1, 13)]);
    expect(addSample(t, at(2, 12))).toBe(t);
  });
});

describe('pace', () => {
  it('computes seconds per km and refuses tiny distances', () => {
    expect(paceOf(1000, 330_000)).toBe(330);
    expect(paceOf(5, 60_000)).toBeNull();
    expect(paceOf(1000, 0)).toBeNull();
  });
  it('recentPace reflects the last 30 seconds, not the whole run', () => {
    const slow = Array.from({ length: 10 }, (_, i) => at(i * 0.5, i * 6)); // ~9 m / 6 s... slow start
    const fast = Array.from({ length: 11 }, (_, i) => at(5 + i * 2, 60 + i * 3)); // ~22 m / 3 s
    const t = track([...slow, ...fast]);
    const p = recentPace(t, 30)!;
    expect(p < 200).toBe(true); // well under 3:20/km
    expect(recentPace(emptyTrack())).toBeNull();
  });
});

describe('routePath', () => {
  it('needs two points, then fits inside the box', () => {
    expect(routePath([{ lat: 1, lng: 1 }], 100, 100)).toBeNull();
    const r = routePath([{ lat: 12.9, lng: 77.6 }, { lat: 12.91, lng: 77.6 }, { lat: 12.91, lng: 77.61 }], 200, 120, 10)!;
    expect(r.d.startsWith('M')).toBe(true);
    const nums = [...r.d.matchAll(/(-?\d+\.\d) (-?\d+\.\d)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    for (const [x, y] of nums) {
      expect(x! >= 9.9 && x! <= 190.1).toBe(true);
      expect(y! >= 9.9 && y! <= 110.1).toBe(true);
    }
  });
});

describe('formatting', () => {
  it('formats pace, distance and duration', () => {
    expect(fmtPace(332)).toBe('5:32');
    expect(fmtPace(null)).toBe('–:––');
    expect(fmtKm(5234)).toBe('5.23');
    expect(fmtDuration(605)).toBe('10:05');
    expect(fmtDuration(3725)).toBe('1:02:05');
  });
});
