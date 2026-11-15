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
