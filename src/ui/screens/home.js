import { h, icon } from '../dom.js';
import { loadCompany, listQuotes, listRemisiones } from '../../lib/store.js';
import { calcQuote } from '../../lib/totals.js';
import { formatCOP, todayISO } from '../../lib/format.js';
import { qcard, rcard } from '../cards.js';

const plural = (n, one, many) => (n === 1 ? `1 ${one}` : `${n} ${many}`);
const miniStat = (label, value, id) => h('div', { class: 'card stat' }, h('span', { class: 'muted' }, label), h('b', { 'data-t': id }, value));
const tile = (ic, label, href, primary) => h('a', { class: `tile${primary ? ' primary' : ''}`, href }, icon(ic), h('span', {}, label));

export function render() {
  const company = loadCompany();
  const quotes = listQuotes();
  const remisiones = listRemisiones();
  const month = todayISO().slice(0, 7);
  const monthQuotes = quotes.filter((q) => q.date.startsWith(month));
  const monthValue = monthQuotes.reduce((a, q) => a + calcQuote(q).total, 0);
  const approvedValue = monthQuotes.filter((q) => q.status === 'approved').reduce((a, q) => a + calcQuote(q).total, 0);
  const waiting = quotes.filter((q) => q.status === 'sent').length;
  const monthRemisiones = remisiones.filter((r) => r.date.startsWith(month)).length;
  const toDeliver = remisiones.filter((r) => r.status === 'pending').length;

  return h('div', { class: 'stack' },
    !company.name && h('a', { class: 'card notice', href: '#/company' }, h('b', {}, 'Completa los datos de tu empresa'), h('span', { class: 'muted' }, 'Aparecerán en el encabezado de tus cotizaciones y remisiones.')),
    h('section', { class: 'card hero' },
      h('span', { class: 'hero-label' }, 'Cotizado este mes'),
      h('b', { class: 'hero-value' }, formatCOP(monthValue)),
      h('span', { class: 'hero-sub' }, `${plural(monthQuotes.length, 'cotización', 'cotizaciones')} · ${quotes.length} en total`)),
    h('section', { class: 'tiles' }, tile('plus', 'Nueva cotización', '#/quote/new', true), tile('truck', 'Nueva remisión', '#/remision/new'), tile('chart', 'Reportes', '#/reports')),
    h('section', { class: 'stats two' },
      miniStat('Aprobado este mes', formatCOP(approvedValue), 'approved'),
      miniStat('Esperando respuesta', plural(waiting, 'enviada', 'enviadas'), 'waiting'),
      miniStat('Remisiones del mes', String(monthRemisiones), 'rem-month'),
      miniStat('Por entregar', String(toDeliver), 'rem-pending')),
    h('div', { class: 'row between' }, h('h3', {}, 'Últimas cotizaciones'), h('a', { href: '#/quotes' }, 'Ver todas')),
    h('ul', { class: 'list' }, quotes.length ? quotes.slice(0, 3).map((q) => h('li', {}, qcard(q, 'a', { href: `#/quote/${q.id}` }))) : h('li', { class: 'muted' }, 'Aún no hay cotizaciones.')),
    h('div', { class: 'row between' }, h('h3', {}, 'Últimas remisiones'), h('a', { href: '#/remisiones' }, 'Ver todas')),
    h('ul', { class: 'list' }, remisiones.length ? remisiones.slice(0, 3).map((r) => h('li', {}, rcard(r, 'a', { href: `#/remision/${r.id}` }))) : h('li', { class: 'muted' }, 'Aún no hay remisiones.')),
  );
}
