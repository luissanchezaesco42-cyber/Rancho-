import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadCompany, saveCompany, saveQuote, deleteQuote, listQuotes, duplicateQuote, saveClient, listClients, deleteClient,
  setQuoteStatus, getNextNumber, setNextNumber, exportAll, importAll, sanitizePrefix,
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

  it('estado por defecto es borrador y se puede cambiar', () => {
    const q = saveQuote(base());
    expect(q.status).toBe('draft');
    expect(setQuoteStatus(q.id, 'approved').status).toBe('approved');
    expect(listQuotes()[0].status).toBe('approved');
  });
  it('duplicar vuelve a borrador', () => {
    const q = setQuoteStatus(saveQuote(base()).id, 'approved');
    expect(duplicateQuote(q.id).status).toBe('draft');
  });
  it('cotizaciones antiguas sin estado ni retenciones se completan', () => {
    localStorage.setItem('cotizador.quotes', JSON.stringify([{ id: 'a', number: 'COT-0007', date: '2026-01-01', items: [] }]));
    expect(listQuotes()[0]).toMatchObject({ status: 'draft', retefuentePct: 0, reteivaPct: 0, reteicaPct: 0 });
  });
  it('prefijo configurable y siguiente número', () => {
    saveCompany({ ...loadCompany(), quotePrefix: 'pres-1' });
    expect(saveQuote(base()).number).toBe('PRES1-0001');
    setNextNumber(50);
    expect(getNextNumber()).toBe(50);
    expect(saveQuote(base()).number).toBe('PRES1-0050');
    expect(sanitizePrefix('')).toBe('COT');
    expect(sanitizePrefix('abcdefghij')).toBe('ABCDEF');
  });
  it('el orden sigue la creación aunque cambie el prefijo', () => {
    saveQuote(base());
    saveCompany({ ...loadCompany(), quotePrefix: 'AAA' });
    saveQuote(base());
    expect(listQuotes().map((q) => q.number)).toEqual(['AAA-0002', 'COT-0001']);
  });
  it('copia de seguridad: exportar y restaurar', () => {
    saveClient({ name: 'X', nit: '2', city: '', address: '', phone: '', email: '' });
    saveQuote(base());
    const backup = exportAll();
    localStorage.clear();
    expect(listQuotes()).toHaveLength(0);
    expect(importAll(backup)).toEqual({ quotes: 1, clients: 1, products: 0 });
    expect(listQuotes()[0].number).toBe('COT-0001');
    expect(saveQuote(base()).number).toBe('COT-0002');
  });
  it('restaurar un archivo inválido falla sin tocar los datos', () => {
    saveQuote(base());
    expect(() => importAll('no json')).toThrow('copia de seguridad');
    expect(() => importAll(JSON.stringify({ app: 'otra' }))).toThrow('Cotizador');
    expect(listQuotes()).toHaveLength(1);
  });
});
