/** Convierte cualquier valor a número >= 0. Vacío, texto o NaN -> 0. Acepta coma decimal. */
export function toNumber(v) {
  if (typeof v === 'string') v = parseFloat(v.trim().replace(',', '.'));
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
}

const clampPct = (v) => Math.min(100, toNumber(v));

export function calcLine(item) {
  const gross = Math.round(toNumber(item.qty) * toNumber(item.unitPrice));
  const discount = Math.round((gross * clampPct(item.discountPct)) / 100);
  const iva = Math.round(((gross - discount) * toNumber(item.ivaPct)) / 100);
  return { gross, discount, iva, total: gross - discount + iva };
}

export function calcTotals(items) {
  const sum = { gross: 0, discount: 0, iva: 0, total: 0 };
  for (const item of items) {
    const l = calcLine(item);
    sum.gross += l.gross;
    sum.discount += l.discount;
    sum.iva += l.iva;
    sum.total += l.total;
  }
  return sum;
}

/**
 * Totales de una cotización incluyendo retenciones.
 * Retefuente e ICA se calculan sobre la base (bruto - descuento); ReteIVA sobre el IVA.
 * total = base + IVA - retenciones.
 */
export function calcQuote(quote) {
  const t = calcTotals(quote.items || []);
  const base = t.gross - t.discount;
  const pct = (v) => Math.min(100, toNumber(v));
  const retefuente = Math.round((base * pct(quote.retefuentePct)) / 100);
  const reteiva = Math.round((t.iva * pct(quote.reteivaPct)) / 100);
  const reteica = Math.round((base * pct(quote.reteicaPct)) / 100);
  return { gross: t.gross, discount: t.discount, base, iva: t.iva, retefuente, reteiva, reteica, total: base + t.iva - retefuente - reteiva - reteica };
}
