import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveQuote, listQuotes, getQuote, loadCompany, setNextNumber } from '../src/lib/store.js';
import * as quotes from '../src/ui/screens/quotes.js';
import * as editor from '../src/ui/screens/quoteEditor.js';
import * as company from '../src/ui/screens/company.js';
import * as home from '../src/ui/screens/home.js';
import { closeSheet } from '../src/ui/sheet.js';

const mount = (el) => { document.body.replaceChildren(el); return el; };
const type = (root, name, value) => { const el = root.querySelector(`[name="${name}"]`); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); };
const submit = (form) => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
const today = () => new Date().toISOString().slice(0, 10);
const mk = (name, extra = {}) => saveQuote({ date: today(), validDays: 15, paymentTerms: '', seller: '', notes: '',
  client: { name, nit: '', city: '', address: '', phone: '', email: '' },
  items: [{ ref: '', description: 'x', unit: 'UND', qty: 1, unitPrice: 10000, discountPct: 0, ivaPct: 19 }], ...extra });

beforeEach(() => { localStorage.clear(); closeSheet(); });

describe('estado de las cotizaciones', () => {
  it('filtra por estado y muestra los contadores', () => {
    mk('A'); mk('B', { status: 'sent' }); mk('C', { status: 'approved' });
    const root = mount(quotes.render());
    expect(root.querySelector('[data-status="all"]').textContent).toBe('Todas 3');
    expect(root.querySelector('[data-status="sent"]').textContent).toBe('Enviada 1');
    root.querySelector('[data-status="sent"]').click();
    expect(root.querySelectorAll('li.qitem')).toHaveLength(1);
    expect(root.querySelector('li.qitem').textContent).toContain('B');
  });
  it('cambia el estado desde la hoja de acciones', () => {
    const q = mk('A');
    const root = mount(quotes.render());
    root.querySelector('li.qitem button').click();
    document.querySelector('.sheet [data-action="status"]').click();
    document.querySelector('.sheet [data-action="status-approved"]').click();
    expect(getQuote(q.id).status).toBe('approved');
    expect(root.querySelector('.status.s-approved')).not.toBeNull();
  });
  it('mensaje distinto cuando el filtro no encuentra nada', () => {
    mk('A');
    const root = mount(quotes.render());
    root.querySelector('[data-status="rejected"]').click();
    expect(root.textContent).toContain('Nada coincide con el filtro');
  });
  it('inicio suma lo aprobado y cuenta las enviadas', () => {
    mk('A', { status: 'approved' }); mk('B', { status: 'sent' }); mk('C', { status: 'sent' });
    const text = mount(home.render()).textContent;
    expect(text).toContain('$ 11.900'); // aprobado este mes (10.000 + IVA)
    expect(text).toContain('2 enviadas');
  });
});

describe('editor: retenciones y estado', () => {
  it('las retenciones restan del total y se guardan', () => {
    const root = mount(editor.render({ id: 'new' }));
    type(root, 'unitPrice', '100000'); type(root, 'ivaPct', '19');
    type(root, 'retefuentePct', '2,5'); type(root, 'reteicaPct', '1');
    expect(root.querySelector('[data-t="retefuente"]').textContent).toBe('-$ 2.500');
    expect(root.querySelector('[data-t="reteica"]').textContent).toBe('-$ 1.000');
    expect(root.querySelector('[data-t="total"]').textContent).toBe('$ 115.500'); // 100.000 + 19.000 - 2.500 - 1.000
    expect(root.querySelector('[data-testid="totals"]').textContent).not.toMatch(/null|undefined|NaN/);
    type(root, 'retefuentePct', '');
    expect(root.querySelector('[data-testid="totals"]').textContent).not.toMatch(/null|undefined|NaN/);
    type(root, 'retefuentePct', '2,5');
    submit(root);
    expect(listQuotes()[0]).toMatchObject({ retefuentePct: 2.5, reteicaPct: 1, reteivaPct: 0 });
  });
  it('retención vacía o inválida no rompe el total', () => {
    const root = mount(editor.render({ id: 'new' }));
    type(root, 'unitPrice', '1000'); type(root, 'retefuentePct', 'abc');
    expect(root.textContent).not.toContain('NaN');
    expect(root.querySelector('[data-t="retefuente"]')).toBeNull();
  });
  it('cambia el estado y guarda el correo del cliente', () => {
    const root = mount(editor.render({ id: 'new' }));
    type(root, 'client_name', 'ACME'); type(root, 'client_email', 'compras@acme.co');
    const sel = root.querySelector('[name="status"]'); sel.value = 'sent'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    submit(root);
    expect(listQuotes()[0]).toMatchObject({ status: 'sent', client: { email: 'compras@acme.co' } });
  });
});

describe('empresa: numeración y firma', () => {
  it('guarda prefijo y siguiente número y se usan en la próxima cotización', () => {
    const root = mount(company.render());
    type(root, 'quotePrefix', 'pres'); type(root, 'nextNumber', '120');
    submit(root);
    expect(loadCompany().quotePrefix).toBe('PRES');
    expect(mk('A').number).toBe('PRES-0120');
  });
  it('muestra el siguiente número actual', () => {
    setNextNumber(7);
    expect(mount(company.render()).querySelector('[name="nextNumber"]').value).toBe('7');
  });
  it('la firma no se pierde al guardar otros datos', () => {
    localStorage.setItem('cotizador.company', JSON.stringify({ name: 'X', signatureDataUrl: 'data:image/png;base64,AAA' }));
    const root = mount(company.render());
    submit(root);
    expect(loadCompany().signatureDataUrl).toBe('data:image/png;base64,AAA');
  });
});

describe('exportar', () => {
  it('con la lista vacía el botón está deshabilitado', () => {
    expect(mount(quotes.render()).querySelector('[data-action="export"]').disabled).toBe(true);
  });
  it('exporta lo filtrado como CSV', async () => {
    mk('A'); mk('B', { status: 'sent' });
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn();
    const blobs = [];
    URL.createObjectURL = vi.fn((b) => { blobs.push(b); return 'blob:x'; });
    const orig = HTMLAnchorElement.prototype.click; const names = [];
    HTMLAnchorElement.prototype.click = function () { names.push(this.download); };
    const root = mount(quotes.render());
    root.querySelector('[data-status="sent"]').click();
    root.querySelector('[data-action="export"]').click();
    await new Promise((r) => setTimeout(r, 20));
    HTMLAnchorElement.prototype.click = orig;
    expect(names[0]).toMatch(/^cotizaciones-\d{4}-\d{2}-\d{2}\.csv$/);
    const text = await blobs[0].text();
    expect(text.split('\r\n')).toHaveLength(2); // encabezado + 1 fila
    expect(text).toContain('Enviada');
  });
});
