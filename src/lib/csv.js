import { calcQuote } from './totals.js';
import { formatDate } from './format.js';
import { statusLabel, remisionStatusLabel } from './store.js';
import { toNumber } from './totals.js';

const esc = (v) => {
  const s = String(v ?? '');
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV para Excel en español (separador ;, con BOM para las tildes). */
export function quotesToCsv(quotes) {
  const head = ['Número', 'Fecha', 'Cliente', 'NIT', 'Estado', 'Bruto', 'Descuento', 'IVA', 'Retenciones', 'Total'];
  const rows = quotes.map((q) => {
    const t = calcQuote(q);
    return [q.number, formatDate(q.date), q.client?.name, q.client?.nit, statusLabel(q.status), t.gross, t.discount, t.iva, t.retefuente + t.reteiva + t.reteica, t.total];
  });
  return '﻿' + [head, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
}

export function remisionesToCsv(remisiones) {
  const head = ['Número', 'Fecha', 'Cliente', 'NIT', 'Estado', 'Cotización', 'Orden de compra', 'Ítems', 'Unidades'];
  const rows = remisiones.map((r) => [
    r.number, formatDate(r.date), r.client?.name, r.client?.nit, remisionStatusLabel(r.status), r.quoteNumber, r.purchaseOrder,
    (r.items || []).length, (r.items || []).reduce((a, it) => a + toNumber(it.qty), 0),
  ]);
  return '\uFEFF' + [head, ...rows].map((row) => row.map(esc).join(';')).join('\r\n');
}
