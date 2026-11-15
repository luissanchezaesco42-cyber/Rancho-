import { describe, it, expect } from 'vitest';
import { matchRoute } from '../src/ui/router.js';

describe('matchRoute', () => {
  it('rutas', () => {
    expect(matchRoute('').name).toBe('home');
    expect(matchRoute('#/').name).toBe('home');
    expect(matchRoute('#/home').name).toBe('home');
    expect(matchRoute('#/quotes').name).toBe('quotes');
    expect(matchRoute('#/quote/new')).toEqual({ name: 'quote', params: { id: 'new' } });
    expect(matchRoute('#/quote/abc')).toEqual({ name: 'quote', params: { id: 'abc' } });
    expect(matchRoute('#/clients').name).toBe('clients');
    expect(matchRoute('#/products').name).toBe('products');
    expect(matchRoute('#/company').name).toBe('company');
    expect(matchRoute('#/xyz').name).toBe('home');
  });
});
