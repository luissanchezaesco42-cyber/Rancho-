import { h } from '../dom.js';
import { listQuotes, listRemisiones, STATUSES, REMISION_STATUSES } from '../../lib/store.js';
import { buildReport, PERIODS } from '../../lib/reports.js';
import { formatCOP, formatNumber, todayISO } from '../../lib/format.js';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const monthLabel = (key) => { const [y, m] = key.split('-'); return `${MONTHS[Number(m) - 1]} ${y}`; };

const cot = (n) => (n === 1 ? '1 cotización' : `${n} cotizaciones`);
const kpi = (label, value, testid) => h('div', { class: 'card stat' }, h('span', { class: 'muted' }, label), h('b', { 'data-t': testid }, value));

/** Fila con barra proporcional al máximo de la lista. */
function barRow(label, sub, value, max, text) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return h('div', { class: 'barrow' },
    h('div', { class: 'row between' }, h('span', { class: 'barlabel' }, label), h('b', {}, text)),
    h('div', { class: 'bar', role: 'presentation' }, h('i', { style: `width:${value > 0 ? pct : 0}%` })),
    sub && h('span', { class: 'muted' }, sub));
}

const section = (title, ...children) => h('section', { class: 'card stack' }, h('h3', {}, title), ...children);
const none = (text) => h('p', { class: 'muted' }, text);

export function render() {
  const root = h('div', { class: 'stack' });
  let period = 'month';

  const draw = () => {
    const rep = buildReport({ quotes: listQuotes(), remisiones: listRemisiones(), period, today: todayISO() });
    const q = rep.quotes;
    const statusMax = Math.max(0, ...STATUSES.map(([k]) => q.byStatus[k].value));
    const clientMax = rep.topClients[0]?.value || 0;
    const productMax = rep.topProducts[0]?.value || 0;
    const trendMax = Math.max(0, ...rep.trend.map((t) => t.value));
    const empty = q.count === 0;

    root.replaceChildren(
      h('div', { class: 'chips' }, PERIODS.map(([key, label]) =>
        h('button', { type: 'button', class: `chip${period === key ? ' active' : ''}`, 'data-period': key, onClick: () => { period = key; draw(); } }, label))),
      h('div', { class: 'stats two' },
        kpi('Cotizado', formatCOP(q.value), 'quoted'),
        kpi('Aprobado', formatCOP(q.byStatus.approved.value), 'approved'),
        kpi('Tasa de aprobación', q.approvalRate == null ? '—' : `${Math.round(q.approvalRate * 100)} %`, 'rate'),
        kpi('Cotizaciones', String(q.count), 'count')),
      section('Cotizaciones por estado', empty ? none('No hay cotizaciones en este periodo.') : STATUSES.map(([key, label]) =>
        barRow(label, cot(q.byStatus[key].count), q.byStatus[key].value, statusMax, formatCOP(q.byStatus[key].value)))),
      section('Clientes principales', rep.topClients.length ? rep.topClients.map((c) =>
        barRow(c.name, cot(c.count), c.value, clientMax, formatCOP(c.value))) : none('Sin datos en este periodo.')),
      section('Productos más cotizados', rep.topProducts.length ? rep.topProducts.map((p) =>
        barRow(p.name, `${formatNumber(p.qty)} unidades`, p.value, productMax, formatCOP(p.value))) : none('Sin datos en este periodo.')),
      section('Últimos 6 meses', rep.trend.map((t) =>
        barRow(monthLabel(t.month), cot(t.count), t.value, trendMax, formatCOP(t.value)))),
      section('Remisiones', rep.remisiones.count === 0 ? none('No hay remisiones en este periodo.') : [
        h('p', { class: 'muted' }, `${rep.remisiones.count} en total`),
        ...REMISION_STATUSES.map(([key, label]) => h('div', { class: 'row between' }, h('span', {}, label), h('b', { 'data-r': key }, String(rep.remisiones.byStatus[key])))),
      ]),
    );
  };
  draw();
  return root;
}
