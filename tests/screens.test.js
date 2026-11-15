import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCompany, listClients, listProducts, listQuotes, saveQuote } from '../src/lib/store.js';
import * as company from '../src/ui/screens/company.js';
import * as clients from '../src/ui/screens/clients.js';
import * as products from '../src/ui/screens/products.js';
import * as editor from '../src/ui/screens/quoteEditor.js';
import * as quotes from '../src/ui/screens/quotes.js';

const type = (root, name, value) => {
  const el = root.querySelector(`[name="${name}"]`);
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
const submit = (form) => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
const mount = (el) => { document.body.replaceChildren(el); return el; };

beforeEach(() => { localStorage.clear(); location.hash = ''; });

describe('empresa', () => {
  it('guarda los datos', () => {
    const root = mount(company.render());
    type(root, 'name', 'CYTECH'); type(root, 'nit', '900.335.944-0');
    submit(root);
    expect(loadCompany()).toMatchObject({ name: 'CYTECH', nit: '900.335.944-0', defaultIva: 19 });
  });
});

describe('clientes y productos', () => {
  it('crea un cliente', () => {
    const root = mount(clients.render());
    type(root, 'name', 'LOVAZ LOGISTICA AVANZADA S.A.S'); type(root, 'nit', '901747177');
    submit(root.querySelector('form'));
    expect(listClients()).toHaveLength(1);
    expect(root.textContent).toContain('LOVAZ LOGISTICA AVANZADA S.A.S');
  });
  it('crea un producto', () => {
    const root = mount(products.render());
    type(root, 'ref', 'PLG45'); type(root, 'description', 'PLUG RJ-45 NETLINK'); type(root, 'unitPrice', '500');
    submit(root.querySelector('form'));
    expect(listProducts()[0]).toMatchObject({ ref: 'PLG45', unitPrice: 500, ivaPct: 19, unit: 'UND' });
    expect(root.textContent).toContain('PLUG RJ-45 NETLINK');
  });
});

describe('editor de cotización', () => {
  const total = (root) => root.querySelector('[data-t="total"]').textContent;
  it('calcula totales en vivo', () => {
    const root = mount(editor.render({ id: 'new' }));
    type(root, 'qty', '2'); type(root, 'unitPrice', '10000'); type(root, 'discountPct', '10'); type(root, 'ivaPct', '19');
    expect(total(root)).toBe('$ 21.420');
  });
  it('campos vacíos o inválidos dan 0 y nunca NaN', () => {
    const root = mount(editor.render({ id: 'new' }));
    type(root, 'qty', ''); type(root, 'unitPrice', 'abc');
    expect(total(root)).toBe('$ 0');
    expect(root.textContent).not.toContain('NaN');
  });
  it('descuento mayor a 100 se limita', () => {
    const root = mount(editor.render({ id: 'new' }));
    type(root, 'qty', '1'); type(root, 'unitPrice', '1000'); type(root, 'discountPct', '150'); type(root, 'ivaPct', '0');
    expect(root.querySelector('[data-t="discount"]').textContent).toBe('$ 1.000');
  });
  it('guarda y vuelve a la lista', () => {
    const root = mount(editor.render({ id: 'new' }));
    type(root, 'client_name', 'ACME'); type(root, 'qty', '1'); type(root, 'unitPrice', '5000');
    submit(root);
    expect(listQuotes()).toHaveLength(1);
    expect(listQuotes()[0].number).toBe('COT-0001');
    expect(location.hash).toBe('#/quotes');
  });
  it('edita una existente sin cambiar el número', () => {
    const q = saveQuote({ date: '2026-11-15', validDays: 15, paymentTerms: '', seller: '', notes: '',
      client: { name: 'A', nit: '', city: '', address: '', phone: '', email: '' },
      items: [{ ref: 'R', description: 'D', unit: 'UND', qty: 3, unitPrice: 100, discountPct: 0, ivaPct: 0 }] });
    const root = mount(editor.render({ id: q.id }));
    expect(root.querySelector('[name="qty"]').value).toBe('3');
    type(root, 'seller', 'Luis');
    submit(root);
    expect(listQuotes()).toHaveLength(1);
    expect(listQuotes()[0]).toMatchObject({ number: 'COT-0001', seller: 'Luis' });
  });
});

describe('historial', () => {
  const mk = (name) => saveQuote({ date: '2026-11-15', validDays: 15, paymentTerms: '', seller: '', notes: '',
    client: { name, nit: '', city: '', address: '', phone: '', email: '' },
    items: [{ ref: '', description: 'x', unit: 'UND', qty: 1, unitPrice: 1000, discountPct: 0, ivaPct: 0 }] });
  const act = (name) => document.querySelector(`.sheet [data-action="${name}"]`);
  it('lista, busca, duplica y elimina desde la hoja de acciones', () => {
    mk('ACME'); mk('GLOBEX');
    const root = mount(quotes.render());
    expect(root.querySelectorAll('li.qitem')).toHaveLength(2);
    const s = root.querySelector('.search'); s.value = 'globex'; s.dispatchEvent(new Event('input', { bubbles: true }));
    expect(root.querySelectorAll('li.qitem')).toHaveLength(1);
    s.value = ''; root.querySelector('.search').dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('li.qitem button').click();
    expect(document.querySelector('.sheet')).not.toBeNull();
    act('duplicate').click();
    expect(document.querySelector('.sheet')).toBeNull();
    expect(listQuotes()).toHaveLength(3);
    vi.stubGlobal('confirm', () => true);
    root.querySelector('li.qitem button').click();
    act('delete').click();
    expect(listQuotes()).toHaveLength(2);
  });
});
