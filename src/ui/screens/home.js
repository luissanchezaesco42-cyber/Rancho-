import { h } from '../dom.js';
import { soon } from '../dom.js';
import { loadCompany, listQuotes } from '../../lib/store.js';
import { calcTotals } from '../../lib/totals.js';
import { formatCOP, formatDate, todayISO } from '../../lib/format.js';

const totalOf = (q) => calcTotals(q.items).total;

function stat(label, value, hint) {
  return h('div', { class: 'card stat' }, h('span', { class: 'muted' }, label), h('b', { class: 'stat-value' }, value), hint && h('span', { class: 'muted' }, hint));
}

function soonStat(label) {
  return h('div', { class: 'card stat soon' }, h('span', { class: 'muted' }, label), h('b', { class: 'stat-value' }, '—'), h('em', { class: 'pill' }, 'Pronto'));
}

export function render() {
  const company = loadCompany();
  const quotes = listQuotes();
  const month = todayISO().slice(0, 7);
  const monthQuotes = quotes.filter((q) => q.date.startsWith(month));
  const monthValue = monthQuotes.reduce((a, q) => a + totalOf(q), 0);
  const recent = quotes.slice(0, 5);

  return h('div', {},
    h('h2', {}, company.name ? `Hola, ${company.name}` : 'Bienvenido'),
    !company.name && h('p', { class: 'muted' }, 'Empieza por completar los ', h('a', { href: '#/company' }, 'datos de tu empresa'), ' para que salgan en tus cotizaciones.'),
    h('section', { class: 'stats' },
      stat('Cotizaciones del mes', String(monthQuotes.length)),
      stat('Valor cotizado del mes', formatCOP(monthValue)),
      stat('Cotizaciones en total', String(quotes.length)),
      soonStat('Remisiones del mes'),
      soonStat('Facturado del mes'),
      soonStat('Por cobrar')),
    h('h3', {}, 'Crear'),
    h('div', { class: 'row wrap actions' },
      h('a', { class: 'btn primary', href: '#/quote/new' }, '+ Nueva cotización'),
      soon('+ Nueva remisión'),
      soon('+ Nueva factura')),
    h('div', { class: 'row between' }, h('h3', {}, 'Últimas cotizaciones'), h('a', { href: '#/quotes' }, 'Ver todas')),
    h('ul', { class: 'list' }, recent.length ? recent.map((q) =>
      h('li', { class: 'card item' },
        h('div', { class: 'grow' }, h('strong', {}, q.number), h('div', { class: 'muted' }, `${q.client?.name || 'Sin cliente'} · ${formatDate(q.date)}`)),
        h('b', {}, formatCOP(totalOf(q))),
        h('a', { class: 'btn ghost', href: `#/quote/${q.id}` }, 'Abrir'))) : h('li', { class: 'muted' }, 'Aún no hay cotizaciones.')),
  );
}
