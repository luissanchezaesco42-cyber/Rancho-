import { todayISO } from './format.js';

const P = 'cotizador.';

export const STATUSES = [['draft', 'Borrador'], ['sent', 'Enviada'], ['approved', 'Aprobada'], ['rejected', 'Rechazada']];
export const statusLabel = (s) => (STATUSES.find(([k]) => k === s) || STATUSES[0])[1];

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(P + key);
    if (raw == null) return fallback;
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  localStorage.setItem(P + key, JSON.stringify(value));
}
const newId = () => crypto.randomUUID();

export const defaultCompany = () => ({
  name: '', nit: '', address: '', city: '', phone: '', email: '',
  logoDataUrl: null, signatureDataUrl: null, defaultIva: 19, quotePrefix: 'COT',
});

export function loadCompany() {
  const c = read('company', {});
  return { ...defaultCompany(), ...(typeof c === 'object' && !Array.isArray(c) ? c : {}) };
}
export function saveCompany(c) {
  write('company', c);
}

/** Prefijo válido: letras y números en mayúscula, máx. 6; vacío vuelve a COT. */
export const sanitizePrefix = (p) => String(p ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'COT';

function readList(key) {
  const v = read(key, []);
  return Array.isArray(v) ? v : [];
}
function upsert(key, obj) {
  const list = readList(key);
  const saved = { ...obj, id: obj.id || newId() };
  const i = list.findIndex((x) => x.id === saved.id);
  if (i >= 0) list[i] = saved;
  else list.push(saved);
  write(key, list);
  return saved;
}
function remove(key, id) {
  write(key, readList(key).filter((x) => x.id !== id));
}

export const listClients = () => readList('clients');
export const saveClient = (c) => upsert('clients', c);
export const deleteClient = (id) => remove('clients', id);

export const listProducts = () => readList('products');
export const saveProduct = (p) => upsert('products', p);
export const deleteProduct = (id) => remove('products', id);

// Las cotizaciones guardadas antes de existir estado/retenciones se completan con valores por defecto.
const normalizeQuote = (q) => ({ status: 'draft', retefuentePct: 0, reteivaPct: 0, reteicaPct: 0, ...q });
const seqOf = (q) => q.seq ?? (parseInt(String(q.number).match(/(\d+)$/)?.[1], 10) || 0);

export function listQuotes() {
  return readList('quotes').map(normalizeQuote).sort((a, b) => seqOf(b) - seqOf(a));
}
export const getQuote = (id) => listQuotes().find((q) => q.id === id);

/** Número que recibirá la próxima cotización nueva (sin consumirlo). */
export const getNextNumber = () => (Number(read('counter', 0)) || 0) + 1;
export function setNextNumber(n) {
  write('counter', Math.max(0, Math.floor(Number(n) || 1) - 1));
}

function takeNumber() {
  const n = getNextNumber();
  write('counter', n);
  return { number: `${sanitizePrefix(loadCompany().quotePrefix)}-${String(n).padStart(4, '0')}`, seq: n };
}

export function saveQuote(q) {
  const toSave = normalizeQuote(q);
  if (!toSave.id) toSave.id = newId();
  if (!toSave.number) Object.assign(toSave, takeNumber());
  return upsert('quotes', toSave);
}
export const deleteQuote = (id) => remove('quotes', id);

export function setQuoteStatus(id, status) {
  const q = getQuote(id);
  if (!q) throw new Error('Cotización no encontrada');
  return saveQuote({ ...q, status });
}

export function duplicateQuote(id) {
  const q = getQuote(id);
  if (!q) throw new Error('Cotización no encontrada');
  const copy = structuredClone(q);
  delete copy.id;
  delete copy.number;
  delete copy.seq;
  copy.date = todayISO();
  copy.status = 'draft';
  return saveQuote(copy);
}

/** Copia de seguridad de todos los datos en un solo texto JSON. */
export function exportAll() {
  return JSON.stringify({
    app: 'cotizador', version: 1, exportedAt: new Date().toISOString(),
    data: { company: loadCompany(), clients: listClients(), products: listProducts(), quotes: readList('quotes'), counter: Number(read('counter', 0)) || 0 },
  });
}

/** Restaura una copia de seguridad (reemplaza los datos actuales). Lanza Error con mensaje en español si no es válida. */
export function importAll(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es una copia de seguridad válida.');
  }
  const d = parsed?.data;
  if (parsed?.app !== 'cotizador' || !d || typeof d !== 'object' || !Array.isArray(d.clients) || !Array.isArray(d.products) || !Array.isArray(d.quotes)) {
    throw new Error('El archivo no es una copia de seguridad de Cotizador.');
  }
  write('company', d.company && typeof d.company === 'object' ? d.company : {});
  write('clients', d.clients);
  write('products', d.products);
  write('quotes', d.quotes);
  write('counter', Number(d.counter) || 0);
  return { quotes: d.quotes.length, clients: d.clients.length, products: d.products.length };
}
