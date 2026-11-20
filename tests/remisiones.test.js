import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveQuote, saveRemision, listRemisiones, getRemision, getQuote, loadCompany } from '../src/lib/store.js';
import * as list from '../src/ui/screens/remisiones.js';
import * as editor from '../src/ui/screens/remisionEditor.js';
import * as quoteEditor from '../src/ui/screens/quoteEditor.js';
import * as quotes from '../src/ui/screens/quotes.js';
import * as home from '../src/ui/screens/home.js';
import * as company from '../src/ui/screens/company.js';
import { closeSheet } from '../src/ui/sheet.js';
import { setGuard } from '../src/ui/nav.js';

const mount = (el) => { document.body.replaceChildren(el); return el; };
const type = (root, name, value) => { const el = root.querySelector(`[name="${name}"]`); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); };
const submit = (form) => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
const today = () => new Date().toISOString().slice(0, 10);
const act = (name) => document.querySelector(`.sheet [data-action="${name}"]`);
const rem = (name, extra = {}) => saveRemision({ date: today(), client: { name, nit: '', city: '', address: '', phone: '', email: '' },
  items: [{ ref: 'A', description: 'x', unit: 'UND', qty: 3, unitPrice: 1000, discountPct: 0, ivaPct: 0 }], ...extra });
const quote = (name = 'ACME') => saveQuote({ date: today(), validDays: 15, paymentTerms: '', seller: 'Osvaldo', notes: '',
  client: { name, nit: '9', city: 'BAQ', address: 'Calle 1', phone: '', email: '' },
  items: [{ ref: 'A', description: 'Cable', unit: 'UND', qty: 2, unitPrice: 10000, discountPct: 0, ivaPct: 19 }] });

beforeEach(() => { localStorage.clear(); closeSheet(); setGuard(null); location.hash = '#/start'; });

describe('lista de remisiones', () => {
  it('estado inicial vacío y filtros con contadores', () => {
    expect(mount(list.render()).textContent).toContain('Aún no hay remisiones');
    rem('A'); rem('B', { status: 'delivered' });
    const root = mount(list.render());
    expect(root.querySelector('[data-status="all"]').textContent).toBe('Todas 2');
    expect(root.querySelector('[data-status="delivered"]').textContent).toBe('Entregada 1');
    root.querySelector('[data-status="delivered"]').click();
    expect(root.querySelectorAll('li.qitem')).toHaveLength(1);
  });
  it('busca por número, cliente, orden de compra y cotización', () => {
    rem('ACME', { purchaseOrder: 'OC-99' }); rem('GLOBEX', { quoteNumber: 'COT-0042' });
    const root = mount(list.render());
    const s = root.querySelector('.search');
    for (const [term, n] of [['acme', 1], ['oc-99', 1], ['cot-0042', 1], ['rem-0001', 1], ['zzz', 0]]) {
      s.value = term; s.dispatchEvent(new Event('input', { bubbles: true }));
      expect(root.querySelectorAll('li.qitem'), term).toHaveLength(n);
    }
  });
  it('cambia estado, duplica y elimina desde la hoja de acciones', () => {
    const r = rem('A');
    const root = mount(list.render());
    root.querySelector('li.qitem button').click();
    act('status').click();
    act('status-delivered').click();
    expect(getRemision(r.id).status).toBe('delivered');
    root.querySelector('li.qitem button').click();
    act('duplicate').click();
    expect(listRemisiones()).toHaveLength(2);
    expect(listRemisiones()[0]).toMatchObject({ number: 'REM-0002', status: 'pending' });
    vi.stubGlobal('confirm', () => true);
    root.querySelector('li.qitem button').click();
    act('delete').click();
    expect(listRemisiones()).toHaveLength(1);
  });
  it('exportar está apagado sin remisiones', () => {
    expect(mount(list.render()).querySelector('[data-action="export"]').disabled).toBe(true);
  });
});

describe('editor de remisión', () => {
  it('crea una remisión con REM-0001 y vuelve a la lista', () => {
    const root = mount(editor.render({ id: 'new' }));
    type(root, 'client_name', 'ACME'); type(root, 'qty', '5'); type(root, 'description', 'Cable'); type(root, 'purchaseOrder', 'OC-1');
    expect(root.querySelector('[data-t="bar-info"]').textContent).toBe('1 ítem · 5 unidades');
    submit(root);
    expect(listRemisiones()[0]).toMatchObject({ number: 'REM-0001', purchaseOrder: 'OC-1', status: 'pending', showPrices: false });
    expect(listRemisiones()[0].items[0].qty).toBe(5);
    expect(location.hash).toBe('#/remisiones');
  });
  it('sin "mostrar valores" no hay campos de precio ni totales; al activarlo aparecen y calculan', () => {
    const root = mount(editor.render({ id: 'new' }));
    expect(root.querySelector('[name="unitPrice"]')).toBeNull();
    expect(root.querySelector('[data-testid="totals"]').hidden).toBe(true);
    const cb = root.querySelector('[name="showPrices"]'); cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true }));
    type(root, 'qty', '2'); type(root, 'unitPrice', '10000'); type(root, 'ivaPct', '19');
    expect(root.querySelector('[data-testid="totals"]').hidden).toBe(false);
    expect(root.querySelector('[data-t="total"]').textContent).toBe('$ 23.800');
  });
  it('cantidad vacía o inválida cuenta 0 y no muestra NaN', () => {
    const root = mount(editor.render({ id: 'new' }));
    type(root, 'qty', 'abc');
    expect(root.querySelector('[data-t="bar-info"]').textContent).toBe('1 ítem · 0 unidades');
    expect(root.textContent).not.toMatch(/NaN|null|undefined/);
  });
  it('desde una cotización copia cliente, ítems y muestra la cotización de origen', () => {
    const q = quote();
    const root = mount(editor.render({ id: 'new', from: q.id }));
    expect(root.querySelector('[name="client_name"]').value).toBe('ACME');
    expect(root.querySelector('[name="deliveryAddress"]').value).toBe('Calle 1');
    expect(root.querySelector('[name="dispatchedBy"]').value).toBe('Osvaldo');
    expect(root.querySelector('[name="description"]').value).toBe('Cable');
    expect(root.querySelector('[data-testid="origin"]').textContent).toContain('COT-0001');
    submit(root);
    expect(listRemisiones()[0]).toMatchObject({ quoteNumber: 'COT-0001', quoteId: q.id });
    expect(getQuote(q.id).number).toBe('COT-0001'); // la cotización no cambia
  });
  it('una cotización inexistente abre una remisión en blanco', () => {
    expect(mount(editor.render({ id: 'new', from: 'nada' })).querySelector('[name="client_name"]').value).toBe('');
  });
  it('edita una existente sin cambiar su número', () => {
    const r = rem('A');
    const root = mount(editor.render({ id: r.id }));
    type(root, 'vehicle', 'XYZ987');
    submit(root);
    expect(listRemisiones()).toHaveLength(1);
    expect(listRemisiones()[0]).toMatchObject({ number: 'REM-0001', vehicle: 'XYZ987' });
  });
  it('si no hay espacio al guardar avisa y no navega', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    const alertSpy = vi.fn(); vi.stubGlobal('alert', alertSpy);
    const root = mount(editor.render({ id: 'new' }));
    submit(root);
    spy.mockRestore();
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('No hay espacio'));
    expect(location.hash).toBe('#/start');
  });
});

describe('convertir cotización en remisión', () => {
  it('desde la hoja de acciones de la lista de cotizaciones', () => {
    const q = quote();
    mount(quotes.render()).querySelector('li.qitem button').click();
    const btn = act('to-remision');
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(location.hash).toBe(`#/remision/from/${q.id}`);
  });
  it('desde el editor de una cotización guardada; en una nueva no aparece', () => {
    const q = quote();
    const root = mount(quoteEditor.render({ id: q.id }));
    root.querySelector('[data-action="to-remision"]').click();
    expect(location.hash).toBe(`#/remision/from/${q.id}`);
    expect(mount(quoteEditor.render({ id: 'new' })).querySelector('[data-action="to-remision"]')).toBeNull();
  });
});

describe('inicio y empresa con remisiones', () => {
  it('cuenta remisiones del mes y las pendientes de entrega', () => {
    rem('A'); rem('B', { status: 'delivered' }); rem('C', { date: '2020-01-01' });
    const root = mount(home.render());
    expect(root.querySelector('[data-t="rem-month"]').textContent).toBe('2');
    expect(root.querySelector('[data-t="rem-pending"]').textContent).toBe('2');
    expect(root.querySelector('a[href="#/remision/new"]')).not.toBeNull();
    expect(root.querySelector('a[href="#/reports"]')).not.toBeNull();
    expect(root.textContent).toContain('REM-0003');
  });
  it('prefijo y próximo número de remisión desde Empresa', () => {
    const root = mount(company.render());
    expect(root.querySelector('[name="nextRemision"]').value).toBe('1');
    type(root, 'remisionPrefix', 'ent'); type(root, 'nextRemision', '30');
    submit(root);
    expect(loadCompany().remisionPrefix).toBe('ENT');
    expect(rem('A').number).toBe('ENT-0030');
  });
  it('un prefijo de remisión vacío vuelve a REM', () => {
    const root = mount(company.render());
    type(root, 'remisionPrefix', '');
    submit(root);
    expect(loadCompany().remisionPrefix).toBe('REM');
  });
});
