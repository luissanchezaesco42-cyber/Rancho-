import { describe, it, expect, beforeEach } from 'vitest';
import { saveQuote, loadCompany, listQuotes } from '../src/lib/store.js';
import * as home from '../src/ui/screens/home.js';
import * as quotes from '../src/ui/screens/quotes.js';
import * as editor from '../src/ui/screens/quoteEditor.js';
import * as company from '../src/ui/screens/company.js';

const mount = (el) => { document.body.replaceChildren(el); return el; };
const soonButtons = (root) => [...root.querySelectorAll('[data-soon]')];
beforeEach(() => localStorage.clear());

const mk = () => saveQuote({ date: new Date().toISOString().slice(0, 10), validDays: 15, paymentTerms: '', seller: '', notes: '',
  client: { name: 'ACME', nit: '', city: '', address: '', phone: '', email: '' },
  items: [{ ref: '', description: 'x', unit: 'UND', qty: 2, unitPrice: 1000, discountPct: 0, ivaPct: 0 }] });

describe('funciones futuras inhabilitadas', () => {
  it('inicio: crear remisión y factura están deshabilitados, cotización no', () => {
    const root = mount(home.render());
    const labels = soonButtons(root).map((b) => b.textContent);
    expect(labels).toEqual(expect.arrayContaining(['+ Nueva remisión', '+ Nueva factura']));
    expect(soonButtons(root).every((b) => b.disabled)).toBe(true);
    expect(root.querySelector('a[href="#/quote/new"]')).not.toBeNull();
  });
  it('inicio muestra el resumen del mes', () => {
    mk();
    const root = mount(home.render());
    expect(root.textContent).toContain('$ 2.000');
    expect(root.textContent).toContain('COT-0001');
  });
  it('lista: convertir y enviar por correo deshabilitados en cada cotización', () => {
    mk();
    const root = mount(quotes.render());
    const li = root.querySelector('li.item');
    const labels = soonButtons(li).map((b) => b.textContent);
    expect(labels).toEqual(['Convertir en remisión', 'Convertir en factura', 'Enviar por correo']);
    expect(soonButtons(li).every((b) => b.disabled && b.title === 'Próximamente')).toBe(true);
    expect(li.querySelector('[data-action="share"]').disabled).toBe(false);
  });
  it('editor: estado y retenciones deshabilitados y no se guardan', () => {
    const root = mount(editor.render({ id: 'new' }));
    for (const n of ['status', 'retefuente', 'reteiva', 'reteica']) expect(root.querySelector(`[name="${n}"]`).disabled).toBe(true);
    expect(soonButtons(root).length).toBeGreaterThanOrEqual(3);
    root.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(Object.keys(listQuotes()[0])).not.toContain('retefuente');
  });
  it('empresa: prefijos deshabilitados y no se guardan', () => {
    const root = mount(company.render());
    expect(root.querySelector('[name="prefix"]').disabled).toBe(true);
    root.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(loadCompany()).not.toHaveProperty('prefix');
  });
});
