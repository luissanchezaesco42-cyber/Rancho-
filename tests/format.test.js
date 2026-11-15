import { describe, it, expect } from 'vitest';
import { formatCOP, formatDate, addDays, formatNumber, todayISO } from '../src/lib/format.js';

describe('format', () => {
  it('formatCOP', () => {
    expect(formatCOP(1234567)).toBe('$ 1.234.567');
    expect(formatCOP(0)).toBe('$ 0');
    expect(formatCOP(-1000)).toBe('-$ 1.000');
    expect(formatCOP(NaN)).toBe('$ 0');
  });
  it('fechas', () => {
    expect(formatDate('2026-11-15')).toBe('15/11/2026');
    expect(addDays('2026-11-30', 15)).toBe('2026-12-15');
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('formatNumber', () => {
    expect(formatNumber(20)).toBe('20');
    expect(formatNumber(2.5)).toBe('2,5');
    expect(formatNumber(1500)).toBe('1.500');
  });
});
