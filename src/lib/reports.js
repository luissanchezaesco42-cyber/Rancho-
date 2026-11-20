import { calcQuote, calcLine, toNumber } from './totals.js';

export const PERIODS = [['month', 'Este mes'], ['lastMonth', 'Mes anterior'], ['quarter', 'Últimos 3 meses'], ['year', 'Este año'], ['all', 'Todo']];

const pad = (n) => String(n).padStart(2, '0');
const monthKey = (y, m) => `${y}-${pad(m)}`; // m: 1-12
const lastDayOfMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Rango de fechas ISO [from, to] (ambos incluidos) de un periodo; null = sin límite. */
export function periodRange(period, today) {
  const [y, m] = today.split('-').map(Number);
  const range = (fy, fm, ty, tm) => ({ from: `${monthKey(fy, fm)}-01`, to: `${monthKey(ty, tm)}-${pad(lastDayOfMonth(ty, tm))}` });
  switch (period) {
    case 'month': return range(y, m, y, m);
    case 'lastMonth': return m === 1 ? range(y - 1, 12, y - 1, 12) : range(y, m - 1, y, m - 1);
    case 'quarter': {
      const start = new Date(Date.UTC(y, m - 3, 1)); // este mes y los dos anteriores
      return range(start.getUTCFullYear(), start.getUTCMonth() + 1, y, m);
    }
    case 'year': return { from: `${y}-01-01`, to: `${y}-12-31` };
    default: return { from: null, to: null };
  }
}

const inRange = (date, { from, to }) => (!from || date >= from) && (!to || date <= to);

/** Últimos n meses (el actual incluido), del más antiguo al más reciente. */
export function lastMonths(today, n = 6) {
  const [y, m] = today.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return monthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
  });
}

const top = (map, n) => [...map.values()].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)).slice(0, n);

/**
 * Resumen de cotizaciones y remisiones de un periodo.
 * Tasa de aprobación = aprobadas ÷ (enviadas + aprobadas + rechazadas); null si no hay base.
 */
export function buildReport({ quotes, remisiones, period, today }) {
  const range = periodRange(period, today);
  const qs = quotes.filter((q) => inRange(q.date, range));
  const rs = remisiones.filter((r) => inRange(r.date, range));

  const byStatus = { draft: { count: 0, value: 0 }, sent: { count: 0, value: 0 }, approved: { count: 0, value: 0 }, rejected: { count: 0, value: 0 } };
  const clients = new Map();
  const products = new Map();
  let value = 0;
  for (const q of qs) {
    const total = calcQuote(q).total;
    value += total;
    const s = byStatus[q.status] || byStatus.draft;
    s.count += 1;
    s.value += total;
    const cname = (q.client?.name || 'Sin cliente').trim() || 'Sin cliente';
    const ck = cname.toLowerCase();
    const c = clients.get(ck) || { name: cname, value: 0, count: 0 };
    c.value += total; c.count += 1; clients.set(ck, c);
    for (const it of q.items || []) {
      const pname = (it.description || it.ref || 'Sin descripción').trim() || 'Sin descripción';
      const pk = pname.toLowerCase();
      const p = products.get(pk) || { name: pname, value: 0, qty: 0 };
      p.value += calcLine(it).total; p.qty += toNumber(it.qty); products.set(pk, p);
    }
  }
  const decided = byStatus.sent.count + byStatus.approved.count + byStatus.rejected.count;

  // Tendencia de los últimos 6 meses (no depende del periodo elegido)
  const months = lastMonths(today, 6);
  const trend = months.map((month) => {
    const inMonth = quotes.filter((q) => q.date.startsWith(month));
    return { month, count: inMonth.length, value: inMonth.reduce((a, q) => a + calcQuote(q).total, 0) };
  });

  const remByStatus = { pending: 0, delivered: 0, cancelled: 0 };
  for (const r of rs) remByStatus[r.status in remByStatus ? r.status : 'pending'] += 1;

  return {
    range,
    quotes: { count: qs.length, value, byStatus, approvalRate: decided ? byStatus.approved.count / decided : null },
    topClients: top(clients, 5),
    topProducts: top(products, 5),
    trend,
    remisiones: { count: rs.length, byStatus: remByStatus },
  };
}
