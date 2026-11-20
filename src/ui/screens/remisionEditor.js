import { h } from '../dom.js';
import { calcLine, calcQuote, toNumber } from '../../lib/totals.js';
import { formatCOP, formatNumber, todayISO } from '../../lib/format.js';
import { setGuard } from '../nav.js';
import { saveRemision, getRemision, remisionFromQuote, listClients, listProducts, loadCompany, REMISION_STATUSES } from '../../lib/store.js';

const emptyItem = (iva) => ({ ref: '', description: '', unit: 'UND', qty: 1, unitPrice: 0, discountPct: 0, ivaPct: iva });
const blankClient = () => ({ name: '', nit: '', city: '', address: '', phone: '', email: '' });

export function render({ id, from } = {}) {
  const company = loadCompany();
  const existing = id && id !== 'new' ? getRemision(id) : null;
  const fromQuote = !existing && from ? remisionFromQuote(from) : null;
  const r = existing
    ? structuredClone(existing)
    : fromQuote || { date: todayISO(), status: 'pending', showPrices: false, quoteNumber: '', quoteId: '', client: blankClient(), deliveryAddress: '', purchaseOrder: '', dispatchedBy: '', vehicle: '', notes: '', items: [emptyItem(company.defaultIva)] };
  const clients = listClients();
  const products = listProducts();

  let dirty = !!fromQuote; // una remisión creada desde una cotización ya tiene datos por guardar
  setGuard(() => !dirty || confirm('¿Descartar los cambios sin guardar?'));
  const barInfo = h('b', { 'data-t': 'bar-info' });
  const totalsBox = h('div', { class: 'card totals', 'data-testid': 'totals' });
  const itemsBox = h('div', { class: 'items' });

  const paintTotals = () => {
    const units = r.items.reduce((a, it) => a + toNumber(it.qty), 0);
    barInfo.textContent = `${r.items.length} ítem${r.items.length === 1 ? '' : 's'} · ${formatNumber(units)} unidades`;
    totalsBox.hidden = !r.showPrices;
    if (!r.showPrices) { totalsBox.replaceChildren(); return; }
    const t = calcQuote(r);
    const row = (label, key, value, cls = '') => h('div', { class: `trow ${cls}`.trim() }, h('span', {}, label), h('b', { 'data-t': key }, formatCOP(value)));
    totalsBox.replaceChildren(row('Total bruto', 'gross', t.gross), row('Descuento', 'discount', t.discount), row('IVA', 'iva', t.iva), row('Total', 'total', t.total, 'big'));
  };

  const textInput = (item, key, label) => h('label', { class: 'field' }, h('span', {}, label),
    h('input', { name: key, value: item[key], onInput: (e) => { item[key] = e.target.value; } }));
  const numInput = (item, key, label, onChange) => h('label', { class: 'field small' }, h('span', {}, label),
    h('input', { name: key, inputmode: 'decimal', value: item[key], onInput: (e) => { item[key] = e.target.value; paintTotals(); onChange?.(); } }));

  const paintItems = () => {
    itemsBox.replaceChildren(...r.items.map((item, i) => {
      const lineEl = h('b', {}, formatCOP(calcLine(item).total));
      const picker = products.length ? h('select', { class: 'picker', onChange: (e) => {
        const p = products.find((x) => x.id === e.target.value);
        if (!p) return;
        Object.assign(item, { ref: p.ref, description: p.description, unit: p.unit, unitPrice: p.unitPrice, ivaPct: p.ivaPct });
        paintItems(); paintTotals();
      } }, h('option', { value: '' }, '— Producto guardado —'), products.map((p) => h('option', { value: p.id }, `${p.ref} ${p.description}`))) : null;
      return h('div', { class: 'card item-row' },
        h('div', { class: 'row between' }, h('b', {}, `Ítem ${i + 1}`),
          h('button', { type: 'button', class: 'btn ghost', onClick: () => { r.items.splice(i, 1); paintItems(); paintTotals(); } }, 'Quitar')),
        picker,
        textInput(item, 'ref', 'Referencia'), textInput(item, 'description', 'Descripción'),
        h('div', { class: 'grid4' }, textInput(item, 'unit', 'Unidad'), numInput(item, 'qty', 'Cantidad', () => { lineEl.textContent = formatCOP(calcLine(item).total); }),
          ...(r.showPrices ? [numInput(item, 'unitPrice', 'Valor unitario', () => { lineEl.textContent = formatCOP(calcLine(item).total); }), numInput(item, 'discountPct', '% Dcto', () => { lineEl.textContent = formatCOP(calcLine(item).total); }), numInput(item, 'ivaPct', '% IVA', () => { lineEl.textContent = formatCOP(calcLine(item).total); })] : [])),
        r.showPrices && h('div', { class: 'row between' }, h('span', { class: 'muted' }, 'Total del ítem'), lineEl));
    }));
  };

  const clientField = (label, key, attrs = {}) => h('label', { class: 'field' }, h('span', {}, label),
    h('input', { name: `client_${key}`, 'data-client': key, value: r.client[key] || '', onInput: (e) => { r.client[key] = e.target.value; }, ...attrs }));
  const clientPicker = h('select', { class: 'picker', onChange: (e) => {
    const c = clients.find((x) => x.id === e.target.value);
    if (!c) return;
    const { id: _id, ...rest } = c;
    r.client = rest;
    for (const [k, v] of Object.entries(rest)) { const input = form.querySelector(`[data-client="${k}"]`); if (input) input.value = v; }
    if (!r.deliveryAddress) { r.deliveryAddress = rest.address || ''; form.querySelector('[name="deliveryAddress"]').value = r.deliveryAddress; }
  } }, h('option', { value: '' }, '— Cliente guardado —'), clients.map((c) => h('option', { value: c.id }, c.name)));

  const detail = (label, key, attrs = {}) => h('label', { class: 'field' }, h('span', {}, label), h('input', { name: key, value: r[key] || '', onInput: (e) => { r[key] = e.target.value; }, ...attrs }));

  const form = h('form', {
    class: 'quote-form',
    onSubmit: (e) => {
      e.preventDefault();
      r.items = r.items.map((it) => ({ ...it, qty: toNumber(it.qty), unitPrice: toNumber(it.unitPrice), discountPct: Math.min(100, toNumber(it.discountPct)), ivaPct: toNumber(it.ivaPct) }));
      try {
        saveRemision(r);
      } catch (err) {
        alert(err.message);
        return;
      }
      dirty = false;
      setGuard(null);
      location.hash = '#/remisiones';
    },
  },
    (existing?.quoteNumber || fromQuote?.quoteNumber) && h('p', { class: 'muted', 'data-testid': 'origin' }, `Cotización de origen: ${existing?.quoteNumber || fromQuote.quoteNumber}`),
    existing && h('p', { class: 'muted' }, existing.number),
    h('section', { class: 'card form' }, h('h3', {}, 'Cliente'), clients.length ? clientPicker : null,
      clientField('Nombre o razón social', 'name'), clientField('NIT / Cédula', 'nit'), clientField('Ciudad', 'city'),
      clientField('Dirección', 'address'), clientField('Teléfono', 'phone', { inputmode: 'tel' })),
    h('section', { class: 'card form' }, h('h3', {}, 'Entrega'),
      h('label', { class: 'field' }, h('span', {}, 'Fecha'), h('input', { type: 'date', name: 'date', value: r.date, onInput: (e) => { r.date = e.target.value || todayISO(); } })),
      detail('Dirección de entrega', 'deliveryAddress'), detail('Orden de compra', 'purchaseOrder'), detail('Despachado por', 'dispatchedBy'), detail('Transporte / placa', 'vehicle'),
      h('label', { class: 'field' }, h('span', {}, 'Estado'),
        h('select', { name: 'status', onChange: (e) => { r.status = e.target.value; } },
          REMISION_STATUSES.map(([key, label]) => h('option', { value: key, selected: r.status === key ? true : null }, label))))),
    h('h3', {}, 'Ítems'),
    itemsBox,
    h('button', { type: 'button', class: 'btn ghost', 'data-action': 'add-item', onClick: () => { r.items.push(emptyItem(company.defaultIva)); paintItems(); paintTotals(); } }, '+ Añadir ítem'),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'showPrices', checked: r.showPrices ? true : null, onChange: (e) => { r.showPrices = e.target.checked; paintItems(); paintTotals(); } }), h('span', {}, 'Mostrar valores en la remisión')),
    h('label', { class: 'field' }, h('span', {}, 'Observaciones'), h('textarea', { name: 'notes', rows: 3, onInput: (e) => { r.notes = e.target.value; } }, r.notes)),
    totalsBox,
    h('div', { class: 'savebar' },
      h('div', { class: 'savetotal' }, h('span', { class: 'muted' }, 'Remisión'), barInfo),
      h('button', { class: 'btn primary', type: 'submit' }, 'Guardar')),
  );
  form.addEventListener('input', () => { dirty = true; });
  form.addEventListener('change', () => { dirty = true; });
  paintItems();
  paintTotals();
  return form;
}
