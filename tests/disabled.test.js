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
    expect(labels).toEqual(expect.arrayContaining(['Nueva remisión', 'Nueva factura']));
    expect(soonButtons(root).every((b) => b.disabled)).toBe(true);
    expect(root.querySelector('a[href="#/quote/new"]')).not.toBeNull();
  });
  it('inicio muestra el resumen del mes', () => {
    mk();
    const root = mount(home.render());
    expect(root.textContent).toContain('$ 2.000');
    expect(root.textContent).toContain('COT-0001');
    expect(root.textContent).toContain('1 cotización ·');
    mk();
    expect(mount(home.render()).textContent).toContain('2 cotizaciones ·');
    expect(document.body.textContent).not.toContain('cotizaciónes');
  });
  it('lista: convertir y enviar por correo deshabilitados en la hoja de acciones', () => {
    mk();
    const root = mount(quotes.render());
    root.querySelector('li.qitem button').click();
    const sheet = document.querySelector('.sheet');
    const soons = soonButtons(sheet);
    expect(soons.map((b) => b.dataset.action)).toEqual(['to-remision', 'to-factura']);
    expect(soons.every((b) => b.disabled && b.title === 'Próximamente')).toBe(true);
    expect(sheet.querySelector('[data-action="share"]').disabled).toBe(false);
    sheet.querySelector('[data-action="to-factura"]').click();
    expect(document.querySelector('.sheet')).not.toBeNull(); // no hace nada
  });
  it('editor: solo conversiones y adjuntos siguen apagados', () => {
    const root = mount(editor.render({ id: 'new' }));
    expect(soonButtons(root).map((b) => b.textContent)).toEqual(['Convertir en remisión', 'Convertir en factura', 'Adjuntar archivo']);
    expect(soonButtons(root).every((b) => b.disabled)).toBe(true);
    for (const n of ['status', 'retefuentePct', 'reteivaPct', 'reteicaPct']) expect(root.querySelector(`[name="${n}"]`).disabled).toBe(false);
  });
  it('empresa: prefijos de remisión y factura apagados y no se guardan', () => {
    const root = mount(company.render());
    expect(root.querySelector('[name="prefixRemision"]').disabled).toBe(true);
    expect(root.querySelector('[name="prefixFactura"]').disabled).toBe(true);
    root.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(loadCompany()).not.toHaveProperty('prefixRemision');
  });
});
