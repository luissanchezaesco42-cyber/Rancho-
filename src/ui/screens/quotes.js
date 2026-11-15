import { h, icon, soon } from '../dom.js';
import { listQuotes, duplicateQuote, deleteQuote, loadCompany } from '../../lib/store.js';
import { calcTotals } from '../../lib/totals.js';
import { formatCOP } from '../../lib/format.js';
import { shareQuotePdf, viewQuotePdf } from '../../lib/share.js';
import { openSheet } from '../sheet.js';
import { navigate } from '../nav.js';
import { qcard } from './home.js';

export function render() {
  const root = h('div', { class: 'stack' });
  let query = '';

  const actionsFor = (x, draw) => openSheet(`${x.number} · ${x.client?.name || 'Sin cliente'}`, [
    { label: 'Compartir PDF', action: 'share', primary: true, onClick: () => shareQuotePdf(x, loadCompany()) },
    { label: 'Ver PDF', action: 'view', onClick: () => viewQuotePdf(x, loadCompany()) },
    { label: 'Editar', action: 'edit', onClick: () => navigate(`#/quote/${x.id}`) },
    { label: 'Duplicar', action: 'duplicate', onClick: () => { duplicateQuote(x.id); draw(); } },
    { label: 'Eliminar', action: 'delete', danger: true, onClick: () => { if (confirm(`¿Eliminar ${x.number}?`)) { deleteQuote(x.id); draw(); } } },
    'divider',
    { label: 'Convertir en remisión', action: 'to-remision', soon: true },
    { label: 'Convertir en factura', action: 'to-factura', soon: true },
    { label: 'Enviar por correo', action: 'email', soon: true },
  ]);

  const draw = () => {
    const q = query.toLowerCase();
    const quotes = listQuotes().filter((x) => `${x.number} ${x.client?.name || ''}`.toLowerCase().includes(q));
    const sum = quotes.reduce((a, x) => a + calcTotals(x.items).total, 0);
    root.replaceChildren(
      h('div', { class: 'row wrap filters' },
        h('input', { class: 'search grow', type: 'search', placeholder: 'Buscar por número o cliente…', value: query,
          onInput: (e) => { query = e.target.value; const pos = e.target.selectionStart; draw(); const s = root.querySelector('.search'); s.focus(); s.setSelectionRange(pos, pos); } }),
        soon('Estado'), soon('Exportar')),
      h('p', { class: 'muted summary' }, `${quotes.length === 1 ? '1 cotización' : `${quotes.length} cotizaciones`} · ${formatCOP(sum)}`),
      h('ul', { class: 'list' }, quotes.length
        ? quotes.map((x) => h('li', { class: 'qitem' }, qcard(x, 'button', { type: 'button', onClick: () => actionsFor(x, draw) })))
        : h('li', { class: 'empty' }, h('b', {}, 'Aún no hay cotizaciones'), h('span', { class: 'muted' }, 'Crea la primera con el botón “Nueva”.'))),
      h('a', { class: 'fab', href: '#/quote/new', 'aria-label': 'Nueva cotización' }, icon('plus'), h('span', {}, 'Nueva')),
    );
  };
  draw();
  return root;
}
