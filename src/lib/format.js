const withDots = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function formatCOP(n) {
  const v = Math.round(Number.isFinite(n) ? n : 0);
  return `${v < 0 ? '-' : ''}$ ${withDots(Math.abs(v))}`;
}

export function formatNumber(n) {
  const v = Number.isFinite(n) ? n : 0;
  if (Number.isInteger(v)) return withDots(v);
  const [int, dec] = (Math.round(v * 100) / 100).toString().split('.');
  return dec ? `${withDots(int)},${dec}` : withDots(int);
}

export function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function todayISO() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
