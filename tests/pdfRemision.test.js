import { describe, it, expect } from 'vitest';
import { buildRemisionPdf, remisionPdfFileName } from '../src/lib/pdfRemision.js';
import { buildQuotePdf } from '../src/lib/pdf.js';
import { defaultCompany } from '../src/lib/store.js';

const item = (i, extra = {}) => ({ ref: `R${i}`, description: `Producto ${i}`, unit: 'UND', qty: 2, unitPrice: 10000, discountPct: 0, ivaPct: 19, ...extra });
const rem = (items, extra = {}) => ({
  id: 'r', number: 'REM-0001', date: '2026-11-20', status: 'pending', showPrices: false, purchaseOrder: 'OC-77', quoteNumber: 'COT-0003', vehicle: 'ABC123',
  deliveryAddress: 'Bodega 4', dispatchedBy: 'Osvaldo', notes: 'Entregar en portería', client: { name: 'LOVAZ LOGISTICA', nit: '901747177', city: 'BARRANQUILLA', address: 'CR 44', phone: '313', email: '' },
  items, ...extra,
});
const company = { ...defaultCompany(), name: 'CYTECH' };
const raw = (doc) => doc.output();
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('pdf de remisión', () => {
  it('trae los datos de entrega, las firmas y no muestra precios por defecto', () => {
    const doc = buildRemisionPdf(rem([item(1), item(2)]), company, { compress: false });
    const out = raw(doc);
    expect(out.startsWith('%PDF')).toBe(true);
    for (const t of ['REMISIÓN', 'REM-0001', 'LOVAZ LOGISTICA', 'OC-77', 'COT-0003', 'ABC123', 'Bodega 4', 'ENTREGADO POR', 'RECIBIDO POR', 'Osvaldo', '2 ítems']) expect(out).toContain(t);
    expect(out).not.toContain('VR. UNIDAD');
    expect(out).not.toContain('$ 10.000');
    expect(doc.getNumberOfPages()).toBe(1);
  });
  it('con "mostrar valores" agrega precios y totales', () => {
    const out = raw(buildRemisionPdf(rem([item(1)], { showPrices: true }), company, { compress: false }));
    expect(out).toContain('VR. UNIDAD');
    expect(out).toContain('$ 10.000');
    expect(out).toContain('TOTAL BRUTO');
  });
  it('sin ítems genera un PDF válido', () => {
    const out = raw(buildRemisionPdf(rem([]), company, { compress: false }));
    expect(out.startsWith('%PDF')).toBe(true);
    expect(out).toContain('0 ítems');
  });
  it('un solo ítem usa singular', () => {
    expect(raw(buildRemisionPdf(rem([item(1)]), company, { compress: false }))).toContain('1 ítem ');
  });
  it('muchos ítems paginan y las firmas no se cortan', () => {
    const doc = buildRemisionPdf(rem(Array.from({ length: 60 }, (_, i) => item(i + 1))), company);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });
  it('sin dirección de entrega usa la del cliente', () => {
    expect(raw(buildRemisionPdf(rem([item(1)], { deliveryAddress: '' }), company, { compress: false }))).toContain('CR 44');
  });
  it('nombre de archivo', () => {
    expect(remisionPdfFileName(rem([]))).toBe('REM-0001.pdf');
  });
});

describe('anexos en la cotización', () => {
  const q = (attachments) => ({ id: 'q', number: 'COT-0001', date: '2026-11-20', validDays: 15, status: 'draft', paymentTerms: '', seller: '', notes: '', client: { name: 'X' }, items: [item(1)], attachments });
  it('cada imagen válida agrega una página con su título', () => {
    const doc = buildQuotePdf(q([{ name: 'orden.jpg', dataUrl: png }, { name: 'foto.png', dataUrl: png }]), company, { compress: false });
    expect(doc.getNumberOfPages()).toBe(3);
    expect(raw(doc)).toContain('ANEXO 2 de 2');
    expect(raw(doc)).toContain('orden.jpg');
  });
  it('anexos inválidos o ausentes se ignoran', () => {
    expect(buildQuotePdf(q([{ name: 'mala', dataUrl: 'data:text/plain;base64,AAAA' }, null]), company).getNumberOfPages()).toBe(1);
    expect(buildQuotePdf(q(undefined), company).getNumberOfPages()).toBe(1);
  });
});
