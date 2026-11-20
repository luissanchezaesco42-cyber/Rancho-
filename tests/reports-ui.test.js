import { describe, it, expect, beforeEach } from 'vitest';
import { saveQuote, saveRemision } from '../src/lib/store.js';
import * as reports from '../src/ui/screens/reports.js';

const mount = (el) => { document.body.replaceChildren(el); return el; };
const today = () => new Date().toISOString().slice(0, 10);
const mk = (name, status, price, date = today()) => saveQuote({ date, status, validDays: 15, paymentTerms: '', seller: '', notes: '',
  client: { name }, items: [{ description: `Prod ${name}`, qty: 1, unitPrice: price, discountPct: 0, ivaPct: 0 }] });

beforeEach(() => localStorage.clear());

describe('pantalla de reportes', () => {
  it('sin datos muestra ceros y mensajes, sin NaN', () => {
    const root = mount(reports.render());
    expect(root.querySelector('[data-t="quoted"]').textContent).toBe('$ 0');
    expect(root.querySelector('[data-t="rate"]').textContent).toBe('—');
    expect(root.textContent).toContain('No hay cotizaciones en este periodo.');
    expect(root.textContent).toContain('No hay remisiones en este periodo.');
    expect(root.textContent).not.toMatch(/NaN|null|undefined/);
    expect(root.textContent).toContain('0 cotizaciones');
    expect(root.textContent).not.toContain('ciónes');
  });
  it('totales, tasa de aprobación y principales del mes', () => {
    mk('ACME', 'approved', 10000); mk('ACME', 'rejected', 5000); mk('Beta', 'sent', 3000);
    const root = mount(reports.render());
    expect(root.querySelector('[data-t="quoted"]').textContent).toBe('$ 18.000');
    expect(root.querySelector('[data-t="approved"]').textContent).toBe('$ 10.000');
    expect(root.querySelector('[data-t="rate"]').textContent).toBe('33 %');
    expect(root.querySelector('[data-t="count"]').textContent).toBe('3');
    expect(root.textContent).toContain('ACME');
    expect(root.textContent).toContain('Prod ACME');
  });
  it('cambiar el periodo recalcula (el mes anterior no incluye lo de hoy)', () => {
    mk('ACME', 'approved', 10000);
    const root = mount(reports.render());
    root.querySelector('[data-period="lastMonth"]').click();
    expect(root.querySelector('[data-t="quoted"]').textContent).toBe('$ 0');
    root.querySelector('[data-period="all"]').click();
    expect(root.querySelector('[data-t="quoted"]').textContent).toBe('$ 10.000');
  });
  it('remisiones por estado', () => {
    saveRemision({ date: today(), status: 'delivered', client: { name: 'A' }, items: [] });
    saveRemision({ date: today(), status: 'pending', client: { name: 'B' }, items: [] });
    const root = mount(reports.render());
    expect(root.querySelector('[data-r="delivered"]').textContent).toBe('1');
    expect(root.querySelector('[data-r="pending"]').textContent).toBe('1');
    expect(root.querySelector('[data-r="cancelled"]').textContent).toBe('0');
  });
  it('siempre muestra los 6 meses de tendencia', () => {
    mk('A', 'sent', 100);
    expect(mount(reports.render()).querySelectorAll('.barrow').length).toBeGreaterThanOrEqual(6);
  });
});
