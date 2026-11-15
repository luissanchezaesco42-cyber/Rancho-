import { h } from '../dom.js';
import { listQuotes, duplicateQuote, deleteQuote, loadCompany } from '../../lib/store.js';
import { calcTotals } from '../../lib/totals.js';
import { formatCOP, formatDate } from '../../lib/format.js';
import { shareQuotePdf, viewQuotePdf } from '../../lib/share.js';

export function render() {
  const root = h('div');
  let query = '';
  const draw = () => {
    const q = query.toLowerCase();
    const quotes = listQuotes().filter((x) => `${x.number} ${x.client?.name || ''}`.toLowerCase().includes(q));
    root.replaceChildren(
      h('div', { class: 'row between' }, h('h2', {}, 'Cotizaciones'), h('a', { class: 'btn primary', href: '#/quote/new' }, '+ Nueva')),
      h('input', { class: 'search', type: 'search', placeholder: 'Buscar por número o cliente…', value: query,
        onInput: (e) => { query = e.target.value; const pos = e.target.selectionStart; draw(); const s = root.querySelector('.search'); s.focus(); s.setSelectionRange(pos, pos); } }),
      h('ul', { class: 'list' }, quotes.length ? quotes.map((x) =>
        h('li', { class: 'card item col', 'data-number': x.number },
          h('div', { class: 'row between' }, h('strong', {}, x.number), h('b', {}, formatCOP(calcTotals(x.items).total))),
          h('div', { class: 'muted' }, `${x.client?.name || 'Sin cliente'} · ${formatDate(x.date)}`),
          h('div', { class: 'row wrap' },
            h('button', { class: 'btn primary', 'data-action': 'share', onClick: () => shareQuotePdf(x, loadCompany()) }, 'Compartir PDF'),
            h('button', { class: 'btn ghost', 'data-action': 'view', onClick: () => viewQuotePdf(x, loadCompany()) }, 'Ver PDF'),
            h('a', { class: 'btn ghost', href: `#/quote/${x.id}` }, 'Editar'),
            h('button', { class: 'btn ghost', 'data-action': 'duplicate', onClick: () => { duplicateQuote(x.id); draw(); } }, 'Duplicar'),
            h('button', { class: 'btn danger', 'data-action': 'delete', onClick: () => { if (confirm(`¿Eliminar ${x.number}?`)) { deleteQuote(x.id); draw(); } } }, 'Eliminar'),
          ),
        )) : h('li', { class: 'muted' }, 'Aún no hay cotizaciones. Crea la primera con “+ Nueva”.')),
    );
  };
  draw();
  return root;
}
