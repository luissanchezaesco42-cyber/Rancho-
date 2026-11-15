import { describe, it, expect } from 'vitest';
import { buildQuotePdf, quotePdfFileName } from '../src/lib/pdf.js';
import { defaultCompany } from '../src/lib/store.js';

const item = (i, extra = {}) => ({
  ref: `R${i}`, description: `Producto ${i}`, unit: 'UND', qty: 2, unitPrice: 10000, discountPct: 0, ivaPct: 19, ...extra,
});
const quote = (items) => ({
  id: 'x', number: 'COT-0001', date: '2026-11-15', validDays: 15, paymentTerms: 'Contado', seller: 'Osvaldo', notes: 'Entrega en 3 días',
  client: { name: 'LOVAZ LOGISTICA AVANZADA S.A.S', nit: '901747177', city: 'BARRANQUILLA', address: 'CR 44', phone: '313', email: '' },
  items,
});
const company = { ...defaultCompany(), name: 'CYTECH', nit: '900.335.944-0' };
const raw = (doc) => doc.output();

describe('pdf', () => {
  it('genera un PDF de una página con los datos clave', () => {
    const doc = buildQuotePdf(quote([item(1), item(2), item(3)]), company, { compress: false });
    const out = raw(doc);
    expect(out.startsWith('%PDF')).toBe(true);
    expect(out).toContain('COT-0001');
    expect(out).toContain('LOVAZ LOGISTICA AVANZADA S.A.S');
    expect(out).toContain('SON:');
    expect(doc.getNumberOfPages()).toBe(1);
  });
  it('pagina con muchos ítems', () => {
    expect(buildQuotePdf(quote(Array.from({ length: 80 }, (_, i) => item(i + 1))), company).getNumberOfPages()).toBeGreaterThan(1);
  });
  it('descripciones largas no rompen', () => {
    const doc = buildQuotePdf(quote([item(1, { description: 'TUBO '.repeat(60) })]), company, { compress: false });
    expect(raw(doc)).toContain('TUBO TUBO');
  });
  it('sin ítems genera PDF válido', () => {
    const doc = buildQuotePdf(quote([]), company, { compress: false });
    expect(raw(doc).startsWith('%PDF')).toBe(true);
    expect(raw(doc)).toContain('CERO PESOS');
  });
  it('logo ausente o presente', () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    expect(() => buildQuotePdf(quote([item(1)]), { ...company, logoDataUrl: null })).not.toThrow();
    expect(() => buildQuotePdf(quote([item(1)]), { ...company, logoDataUrl: png })).not.toThrow();
  });
  it('nombre de archivo', () => {
    expect(quotePdfFileName(quote([]))).toBe('COT-0001.pdf');
  });
});
