import { describe, it, expect } from 'vitest';
import { distanceValue, fmtDistance, fmtPRValue, fmtWeight, paceValue, toKg, weightValue } from './units';

describe('units', () => {
  it('formats weights', () => {
    expect(fmtWeight(10, 'metric')).toBe('10 kg');
    expect(fmtWeight(10, 'imperial')).toBe('22 lb');
    expect(fmtWeight(0, 'imperial')).toBe('BW');
    expect(weightValue(5, 'imperial')).toBeCloseTo(11, 1);
    expect(weightValue(5, 'metric')).toBe(5);
  });
  it('formats distance and pace', () => {
    expect(fmtDistance(5000, 'metric')).toBe('5.00 km');
    expect(fmtDistance(1609.344, 'imperial')).toBe('1.00 mi');
    expect(distanceValue(10000, 'metric')).toBe(10);
    expect(paceValue(300, 'metric')).toBe(300);
    expect(paceValue(300, 'imperial')).toBeCloseTo(482.8, 0);
  });
  it('converts back to kg and formats records', () => {
    expect(toKg(22.046, 'imperial')).toBeCloseTo(10, 2);
    expect(toKg(10, 'metric')).toBe(10);
    expect(fmtPRValue('weight', 12.5, 'metric')).toBe('12.5 kg');
    expect(fmtPRValue('volume', 100, 'metric')).toBe('100 kg set volume');
    expect(fmtPRValue('reps', 20, 'imperial')).toBe('20 reps');
    expect(fmtPRValue('hold', 45, 'metric')).toBe('45s hold');
  });
});
