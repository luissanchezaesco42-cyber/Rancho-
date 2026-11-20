import { h } from './dom.js';
import { statusLabel, remisionStatusLabel } from '../lib/store.js';
import { calcQuote } from '../lib/totals.js';
import { formatCOP, formatDate } from '../lib/format.js';

export const initials = (name) => (String(name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '#');
export const statusPill = (status) => h('span', { class: `status s-${status}` }, statusLabel(status));
export const remisionPill = (status) => h('span', { class: `status r-${status}` }, remisionStatusLabel(status));

const card = (tag, attrs, name, meta, pill, amount) => h(tag, { class: 'qcard', ...attrs },
  h('span', { class: 'avatar' }, initials(name)),
  h('span', { class: 'qinfo' }, h('strong', {}, name || 'Sin cliente'), h('span', { class: 'qmeta muted' }, meta, pill)),
  h('b', { class: 'qamount' }, amount));

export const qcard = (q, tag, attrs) =>
  card(tag, { 'data-number': q.number, ...attrs }, q.client?.name, `${q.number} · ${formatDate(q.date)}`, statusPill(q.status), formatCOP(calcQuote(q).total));

export function rcard(r, tag, attrs) {
  const n = (r.items || []).length;
  return card(tag, { 'data-number': r.number, ...attrs }, r.client?.name, `${r.number} · ${formatDate(r.date)}`, remisionPill(r.status),
    r.showPrices ? formatCOP(calcQuote(r).total) : `${n} ítem${n === 1 ? '' : 's'}`);
}
