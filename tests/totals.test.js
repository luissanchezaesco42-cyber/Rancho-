import { describe, it, expect } from 'vitest';
import { calcLine, calcTotals, calcQuote, toNumber } from '../src/lib/totals.js';

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


describe('calcQuote (retenciones)', () => {
  const items = [{ ref: '', description: '', unit: 'UND', qty: 2, unitPrice: 10000, discountPct: 10, ivaPct: 19 }]; // base 18.000, IVA 3.420
  it('sin retenciones el total coincide con calcTotals', () => {
    expect(calcQuote({ items })).toEqual({ gross: 20000, discount: 2000, base: 18000, iva: 3420, retefuente: 0, reteiva: 0, reteica: 0, total: 21420 });
  });
  it('retefuente 2,5 % e ICA 1 % sobre la base; ReteIVA 15 % sobre el IVA', () => {
    const t = calcQuote({ items, retefuentePct: 2.5, reteicaPct: 1, reteivaPct: 15 });
    expect(t).toMatchObject({ retefuente: 450, reteica: 180, reteiva: 513 });
    expect(t.total).toBe(18000 + 3420 - 450 - 180 - 513);
  });
  it('porcentajes inválidos o mayores a 100 se limitan', () => {
    expect(calcQuote({ items, retefuentePct: 'abc' }).retefuente).toBe(0);
    expect(calcQuote({ items, retefuentePct: 500 }).retefuente).toBe(18000);
  });
  it('cotización vacía da cero', () => {
    expect(calcQuote({ items: [] }).total).toBe(0);
  });
});
