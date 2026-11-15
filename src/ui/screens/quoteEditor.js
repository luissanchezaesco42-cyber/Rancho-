import { h, soon, soonField } from '../dom.js';
import { calcLine, calcTotals, toNumber } from '../../lib/totals.js';
import { formatCOP } from '../../lib/format.js';
import { todayISO } from '../../lib/format.js';
import { setGuard } from '../nav.js';
import { saveQuote, getQuote, listClients, listProducts, loadCompany } from '../../lib/store.js';

const emptyItem = (iva) => ({ ref: '', description: '', unit: 'UND', qty: 1, unitPrice: 0, discountPct: 0, ivaPct: iva });

export function render({ id } = {}) {
  const company = loadCompany();
  const existing = id && id !== 'new' ? getQuote(id) : null;
  const q = existing
    ? structuredClone(existing)
    : {
        date: todayISO(), validDays: 15, paymentTerms: 'Contado', seller: '', notes: '',
        client: { name: '', nit: '', city: '', address: '', phone: '', email: '' },
        items: [emptyItem(company.defaultIva)],
      };
  const clients = listClients();
  const products = listProducts();

  let dirty = false;
  setGuard(() => !dirty || confirm('¿Descartar los cambios sin guardar?'));
  const barTotal = h('b', { 'data-t': 'bar-total' });
  const totalsBox = h('div', { class: 'card totals', 'data-testid': 'totals' });
  const itemsBox = h('div', { class: 'items' });

  const paintTotals = () => {
    const t = calcTotals(q.items);
    barTotal.textContent = formatCOP(t.total);
    totalsBox.replaceChildren(
      h('div', { class: 'trow' }, h('span', {}, 'Total bruto'), h('b', { 'data-t': 'gross' }, formatCOP(t.gross))),
      h('div', { class: 'trow' }, h('span', {}, 'Descuento'), h('b', { 'data-t': 'discount' }, formatCOP(t.discount))),
      h('div', { class: 'trow' }, h('span', {}, 'IVA'), h('b', { 'data-t': 'iva' }, formatCOP(t.iva))),
      h('div', { class: 'trow big' }, h('span', {}, 'Total a pagar'), h('b', { 'data-t': 'total' }, formatCOP(t.total))),
    );
  };

  const numInput = (item, key, label, extra = {}) =>
    h('label', { class: 'field small' }, h('span', {}, label),
      h('input', {
        name: key, inputmode: 'decimal', value: item[key],
        onInput: (e) => { item[key] = e.target.value; paintTotals(); lineTotal(item); },
        ...extra,
      }));

  const lineTotals = new Map();
  const lineTotal = (item) => { const el = lineTotals.get(item); if (el) el.textContent = formatCOP(calcLine(item).total); };

  const paintItems = () => {
    lineTotals.clear();
    itemsBox.replaceChildren(
      ...q.items.map((item, i) => {
        const total = h('b', {}, formatCOP(calcLine(item).total));
        lineTotals.set(item, total);
        const picker = products.length
          ? h('select', {
              class: 'picker',
              onChange: (e) => {
                const p = products.find((x) => x.id === e.target.value);
                if (!p) return;
                Object.assign(item, { ref: p.ref, description: p.description, unit: p.unit, unitPrice: p.unitPrice, ivaPct: p.ivaPct });
                paintItems(); paintTotals();
              },
            }, h('option', { value: '' }, '— Producto guardado —'), products.map((p) => h('option', { value: p.id }, `${p.ref} ${p.description}`)))
          : null;
        return h('div', { class: 'card item-row' },
          h('div', { class: 'row between' }, h('b', {}, `Ítem ${i + 1}`),
            h('button', { type: 'button', class: 'btn ghost', onClick: () => { q.items.splice(i, 1); paintItems(); paintTotals(); } }, 'Quitar')),
          picker,
          h('label', { class: 'field' }, h('span', {}, 'Referencia'), h('input', { name: 'ref', value: item.ref, onInput: (e) => { item.ref = e.target.value; } })),
          h('label', { class: 'field' }, h('span', {}, 'Descripción'), h('input', { name: 'description', value: item.description, onInput: (e) => { item.description = e.target.value; } })),
          h('div', { class: 'grid4' },
            h('label', { class: 'field small' }, h('span', {}, 'Unidad'), h('input', { name: 'unit', value: item.unit, onInput: (e) => { item.unit = e.target.value; } })),
            numInput(item, 'qty', 'Cantidad'),
            numInput(item, 'unitPrice', 'Valor unitario'),
            numInput(item, 'discountPct', '% Dcto'),
            numInput(item, 'ivaPct', '% IVA')),
          h('div', { class: 'row between' }, h('span', { class: 'muted' }, 'Total del ítem'), total));
      }),
    );
  };

  const clientPicker = h('select', {
    class: 'picker',
    onChange: (e) => {
      const c = clients.find((x) => x.id === e.target.value);
      if (!c) return;
      const { id: _id, ...rest } = c;
      q.client = rest;
      for (const [k, v] of Object.entries(rest)) {
        const input = form.querySelector(`[data-client="${k}"]`);
        if (input) input.value = v;
      }
    },
  }, h('option', { value: '' }, '— Cliente guardado —'), clients.map((c) => h('option', { value: c.id }, c.name)));

  const clientField = (label, key, attrs = {}) =>
    h('label', { class: 'field' }, h('span', {}, label),
      h('input', { name: `client_${key}`, 'data-client': key, value: q.client[key] || '', onInput: (e) => { q.client[key] = e.target.value; }, ...attrs }));

  const form = h('form', {
    class: 'quote-form',
    onSubmit: (e) => {
      e.preventDefault();
      q.validDays = toNumber(q.validDays);
      q.items = q.items.map((it) => ({
        ...it, qty: toNumber(it.qty), unitPrice: toNumber(it.unitPrice), discountPct: Math.min(100, toNumber(it.discountPct)), ivaPct: toNumber(it.ivaPct),
      }));
      saveQuote(q);
      dirty = false;
      setGuard(null);
      location.hash = '#/quotes';
    },
  },
    existing && h('p', { class: 'muted' }, existing.number),
    h('div', { class: 'row wrap' }, soon('Enviar por correo'), soon('Convertir en factura')),
    h('section', { class: 'card form' }, h('h3', {}, 'Cliente'), clients.length ? clientPicker : null,
      clientField('Nombre o razón social', 'name'), clientField('NIT / Cédula', 'nit'), clientField('Ciudad', 'city'),
      clientField('Dirección', 'address'), clientField('Teléfono', 'phone', { inputmode: 'tel' })),
    h('section', { class: 'card form' }, h('h3', {}, 'Condiciones'),
      h('label', { class: 'field' }, h('span', {}, 'Fecha'), h('input', { type: 'date', name: 'date', value: q.date, onInput: (e) => { q.date = e.target.value || todayISO(); } })),
      h('label', { class: 'field' }, h('span', {}, 'Validez (días)'), h('input', { name: 'validDays', inputmode: 'numeric', value: q.validDays, onInput: (e) => { q.validDays = e.target.value; } })),
      h('label', { class: 'field' }, h('span', {}, 'Forma de pago'), h('input', { name: 'paymentTerms', value: q.paymentTerms, onInput: (e) => { q.paymentTerms = e.target.value; } })),
      h('label', { class: 'field' }, h('span', {}, 'Vendedor'), h('input', { name: 'seller', value: q.seller, onInput: (e) => { q.seller = e.target.value; } })),
      soonField('Estado', 'status', 'Borrador')),
    h('h3', {}, 'Ítems'),
    itemsBox,
    h('button', { type: 'button', class: 'btn ghost', 'data-action': 'add-item', onClick: () => { q.items.push(emptyItem(company.defaultIva)); paintItems(); paintTotals(); } }, '+ Añadir ítem'),
    h('label', { class: 'field' }, h('span', {}, 'Observaciones'), h('textarea', { name: 'notes', rows: 3, onInput: (e) => { q.notes = e.target.value; } }, q.notes)),
    totalsBox,
    h('section', { class: 'card form' }, h('h3', {}, 'Retenciones'),
      soonField('Retención en la fuente', 'retefuente', '0'), soonField('Retención de IVA', 'reteiva', '0'), soonField('Retención de ICA', 'reteica', '0'),
      h('div', {}, soon('Adjuntar archivo'))),
    h('div', { class: 'savebar' },
      h('div', { class: 'savetotal' }, h('span', { class: 'muted' }, 'Total'), barTotal),
      h('button', { class: 'btn primary', type: 'submit' }, 'Guardar')),
  );
  form.addEventListener('input', () => { dirty = true; });
  paintItems();
  paintTotals();
  return form;
}
