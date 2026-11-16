import { h, icon } from '../dom.js';
import { loadCompany, listQuotes, statusLabel } from '../../lib/store.js';
import { calcQuote } from '../../lib/totals.js';
import { formatCOP, formatDate, todayISO } from '../../lib/format.js';

const totalOf = (q) => calcQuote(q).total;
export const initials = (name) => (String(name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '#');
export const statusPill = (status) => h('span', { class: `status s-${status}` }, statusLabel(status));

const miniStat = (label, value) => h('div', { class: 'card stat' }, h('span', { class: 'muted' }, label), h('b', {}, value));
const soonStat = (label) => h('div', { class: 'card stat soon' }, h('span', { class: 'muted' }, label), h('b', {}, '—'), h('em', { class: 'pill' }, 'Pronto'));
const soonTile = (ic, label) => h('button', { type: 'button', class: 'tile soon', disabled: true, 'data-soon': '', title: 'Próximamente' }, icon(ic), h('span', {}, label));

export function qcard(q, tag, attrs) {
  return h(tag, { class: 'qcard', 'data-number': q.number, ...attrs },
    h('span', { class: 'avatar' }, initials(q.client?.name)),
    h('span', { class: 'qinfo' },
      h('strong', {}, q.client?.name || 'Sin cliente'),
      h('span', { class: 'qmeta muted' }, `${q.number} · ${formatDate(q.date)}`, statusPill(q.status))),
    h('b', { class: 'qamount' }, formatCOP(totalOf(q))));
}

const plural = (n, one, many) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

export function render() {
  const company = loadCompany();
  const quotes = listQuotes();
  const month = todayISO().slice(0, 7);
  const monthQuotes = quotes.filter((q) => q.date.startsWith(month));
  const monthValue = monthQuotes.reduce((a, q) => a + totalOf(q), 0);
  const approvedValue = monthQuotes.filter((q) => q.status === 'approved').reduce((a, q) => a + totalOf(q), 0);
  const waiting = quotes.filter((q) => q.status === 'sent').length;

  return h('div', { class: 'stack' },
    !company.name && h('a', { class: 'card notice', href: '#/company' }, h('b', {}, 'Completa los datos de tu empresa'), h('span', { class: 'muted' }, 'Aparecerán en el encabezado de tus cotizaciones.')),
    h('section', { class: 'card hero' },
      h('span', { class: 'hero-label' }, 'Cotizado este mes'),
      h('b', { class: 'hero-value' }, formatCOP(monthValue)),
      h('span', { class: 'hero-sub' }, `${plural(monthQuotes.length, 'cotización', 'cotizaciones')} · ${quotes.length} en total`)),
    h('section', { class: 'stats two' },
      miniStat('Aprobado este mes', formatCOP(approvedValue)),
      miniStat('Esperando respuesta', plural(waiting, 'enviada', 'enviadas'))),
    h('section', { class: 'tiles' },
      h('a', { class: 'tile primary', href: '#/quote/new' }, icon('plus'), h('span', {}, 'Nueva cotización')),
      soonTile('truck', 'Nueva remisión'),
      soonTile('receipt', 'Nueva factura')),
    h('section', { class: 'stats' }, soonStat('Remisiones del mes'), soonStat('Facturado del mes'), soonStat('Por cobrar')),
    h('div', { class: 'row between' }, h('h3', {}, 'Últimas cotizaciones'), h('a', { href: '#/quotes' }, 'Ver todas')),
    h('ul', { class: 'list' }, quotes.length ? quotes.slice(0, 5).map((q) => h('li', {}, qcard(q, 'a', { href: `#/quote/${q.id}` }))) : h('li', { class: 'muted' }, 'Aún no hay cotizaciones.')),
  );
}
