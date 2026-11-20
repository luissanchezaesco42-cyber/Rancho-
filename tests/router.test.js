import { describe, it, expect } from 'vitest';
import { matchRoute, parentHash } from '../src/ui/router.js';

describe('matchRoute', () => {
  it('rutas', () => {
    expect(matchRoute('').name).toBe('home');
    expect(matchRoute('#/').name).toBe('home');
    expect(matchRoute('#/home').name).toBe('home');
    expect(matchRoute('#/quotes').name).toBe('quotes');
    expect(matchRoute('#/quote/new')).toEqual({ name: 'quote', params: { id: 'new' } });
    expect(matchRoute('#/quote/abc')).toEqual({ name: 'quote', params: { id: 'abc' } });
    expect(matchRoute('#/remisiones').name).toBe('remisiones');
    expect(matchRoute('#/remision/new')).toEqual({ name: 'remision', params: { id: 'new' } });
    expect(matchRoute('#/remision/abc')).toEqual({ name: 'remision', params: { id: 'abc' } });
    expect(matchRoute('#/remision/from/q1')).toEqual({ name: 'remision', params: { id: 'new', from: 'q1' } });
    for (const n of ['clients', 'products', 'company', 'more', 'reports']) expect(matchRoute(`#/${n}`).name).toBe(n);
    expect(matchRoute('#/xyz').name).toBe('home');
    expect(matchRoute('#/facturas').name).toBe('home'); // ya no existe
  });
  it('atrás sube un nivel y en el inicio no hay padre', () => {
    expect(parentHash('quote')).toBe('#/quotes');
    expect(parentHash('remision')).toBe('#/remisiones');
    for (const n of ['quotes', 'remisiones', 'clients', 'more']) expect(parentHash(n)).toBe('#/home');
    for (const n of ['products', 'company', 'reports']) expect(parentHash(n)).toBe('#/more');
    expect(parentHash('home')).toBeNull();
  });
});
