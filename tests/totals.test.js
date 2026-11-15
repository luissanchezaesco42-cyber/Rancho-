import { describe, it, expect } from 'vitest';
import { calcLine, calcTotals, toNumber } from '../src/lib/totals.js';

const item = (o = {}) => ({ ref: '', description: '', unit: 'UND', qty: 1, unitPrice: 0, discountPct: 0, ivaPct: 0, ...o });

describe('totals', () => {
  it('calcula una línea con descuento e IVA', () => {
    expect(calcLine(item({ qty: 2, unitPrice: 10000, discountPct: 10, ivaPct: 19 }))).toEqual({
      gross: 20000, discount: 2000, iva: 3420, total: 21420,
    });
  });
  it('cantidades decimales', () => {
    expect(calcLine(item({ qty: 2.5, unitPrice: 9850 })).gross).toBe(24625);
  });
  it('limita el descuento a 0-100', () => {
    const a = calcLine(item({ qty: 1, unitPrice: 1000, discountPct: 150 }));
    expect(a.discount).toBe(a.gross);
    expect(calcLine(item({ qty: 1, unitPrice: 1000, discountPct: -20 })).discount).toBe(0);
  });
  it('valores vacíos o inválidos dan 0', () => {
    expect(calcLine(item({ qty: NaN, unitPrice: '' }))).toEqual({ gross: 0, discount: 0, iva: 0, total: 0 });
  });
  it('suma totales', () => {
    expect(calcTotals([])).toEqual({ gross: 0, discount: 0, iva: 0, total: 0 });
    const t = calcTotals([item({ qty: 2, unitPrice: 10000, discountPct: 10, ivaPct: 19 }), item({ qty: 1, unitPrice: 5000, ivaPct: 19 })]);
    expect(t.total).toBe(t.gross - t.discount + t.iva);
    expect(t).toEqual({ gross: 25000, discount: 2000, iva: 4370, total: 27370 });
  });
  it('toNumber', () => {
    expect(toNumber('2,5')).toBe(2.5);
    expect(toNumber('abc')).toBe(0);
    expect(toNumber(-3)).toBe(0);
  });
});
