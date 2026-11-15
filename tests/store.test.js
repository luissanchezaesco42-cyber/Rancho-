import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadCompany, saveQuote, deleteQuote, listQuotes, duplicateQuote, saveClient, listClients, deleteClient,
} from '../src/lib/store.js';
import { todayISO } from '../src/lib/format.js';

const base = () => ({
  date: '2026-11-15', validDays: 15, paymentTerms: 'Contado', seller: '', notes: '',
  client: { name: 'ACME', nit: '1', city: '', address: '', phone: '', email: '' },
  items: [{ ref: 'A', description: 'Algo', unit: 'UND', qty: 1, unitPrice: 100, discountPct: 0, ivaPct: 19 }],
});

beforeEach(() => localStorage.clear());

describe('store', () => {
  it('empresa por defecto', () => {
    const c = loadCompany();
    expect(c.defaultIva).toBe(19);
    expect(c.logoDataUrl).toBeNull();
  });
  it('consecutivo y no reutiliza números', () => {
    expect(saveQuote(base()).number).toBe('COT-0001');
    const second = saveQuote(base());
    expect(second.number).toBe('COT-0002');
    deleteQuote(second.id);
    expect(saveQuote(base()).number).toBe('COT-0003');
  });
  it('actualiza sin cambiar el número', () => {
    const q = saveQuote(base());
    saveQuote({ ...q, notes: 'hola' });
    expect(listQuotes()).toHaveLength(1);
    expect(listQuotes()[0].number).toBe('COT-0001');
    expect(listQuotes()[0].notes).toBe('hola');
  });
  it('duplica con número nuevo y fecha de hoy', () => {
    const q = saveQuote(base());
    const d = duplicateQuote(q.id);
    expect(d.number).toBe('COT-0002');
    expect(d.date).toBe(todayISO());
    expect(d.items).toEqual(q.items);
  });
  it('JSON dañado no rompe', () => {
    localStorage.setItem('cotizador.quotes', '{no es json');
    localStorage.setItem('cotizador.company', '[[');
    expect(listQuotes()).toEqual([]);
    expect(loadCompany().defaultIva).toBe(19);
  });
  it('clientes', () => {
    const c = saveClient({ name: 'X', nit: '2', city: '', address: '', phone: '', email: '' });
    expect(c.id).toBeTruthy();
    expect(listClients()).toHaveLength(1);
    deleteClient(c.id);
    expect(listClients()).toHaveLength(0);
  });
});
