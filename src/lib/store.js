import { todayISO } from './format.js';

const P = 'cotizador.';

export const STATUSES = [['draft', 'Borrador'], ['sent', 'Enviada'], ['approved', 'Aprobada'], ['rejected', 'Rechazada']];
export const statusLabel = (s) => (STATUSES.find(([k]) => k === s) || STATUSES[0])[1];

export const REMISION_STATUSES = [['pending', 'Pendiente'], ['delivered', 'Entregada'], ['cancelled', 'Anulada']];
export const remisionStatusLabel = (s) => (REMISION_STATUSES.find(([k]) => k === s) || REMISION_STATUSES[0])[1];

export const MAX_ATTACHMENTS = 5;

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
  try {
    localStorage.setItem(P + key, JSON.stringify(value));
  } catch (e) {
    if (e?.name === 'QuotaExceededError' || /quota/i.test(String(e?.message))) {
      throw new Error('No hay espacio para guardar. Elimina anexos o cotizaciones antiguas y vuelve a intentarlo.');
    }
    throw e;
  }
}
const newId = () => crypto.randomUUID();

export const defaultCompany = () => ({
  name: '', nit: '', address: '', city: '', phone: '', email: '',
  logoDataUrl: null, signatureDataUrl: null, defaultIva: 19, quotePrefix: 'COT', remisionPrefix: 'REM',
});

export function loadCompany() {
  const c = read('company', {});
  return { ...defaultCompany(), ...(typeof c === 'object' && !Array.isArray(c) ? c : {}) };
}
export function saveCompany(c) {
  write('company', c);
}

/** Prefijo válido: letras y números en mayúscula, máx. 6; vacío usa el valor por defecto. */
export const sanitizePrefix = (p, fallback = 'COT') => String(p ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || fallback;

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

const seqOf = (d) => d.seq ?? (parseInt(String(d.number).match(/(\d+)$/)?.[1], 10) || 0);

/** Colección de documentos numerados (cotizaciones, remisiones): contador propio, prefijo de la empresa, orden de creación. */
function docStore({ key, counterKey, prefixField, defaultPrefix, defaults }) {
  const normalize = (d) => ({ ...defaults(), ...d });
  const list = () => readList(key).map(normalize).sort((a, b) => seqOf(b) - seqOf(a));
  const peek = () => (Number(read(counterKey, 0)) || 0) + 1;
  const take = () => {
    const n = peek();
    write(counterKey, n);
    return { number: `${sanitizePrefix(loadCompany()[prefixField], defaultPrefix)}-${String(n).padStart(4, '0')}`, seq: n };
  };
  return {
    list,
    get: (id) => list().find((d) => d.id === id),
    peek,
    setNext: (n) => write(counterKey, Math.max(0, Math.floor(Number(n) || 1) - 1)),
    save: (d) => {
      const s = normalize(d);
      if (!s.id) s.id = newId();
      if (!s.number) Object.assign(s, take());
      return upsert(key, s);
    },
    remove: (id) => remove(key, id),
    raw: () => readList(key),
    counter: () => Number(read(counterKey, 0)) || 0,
    restore: (items, counter) => { write(key, items); write(counterKey, Number(counter) || 0); },
  };
}

// Las cotizaciones guardadas antes de existir estado/retenciones/anexos se completan con valores por defecto.
const quotesDb = docStore({
  key: 'quotes', counterKey: 'counter', prefixField: 'quotePrefix', defaultPrefix: 'COT',
  defaults: () => ({ status: 'draft', retefuentePct: 0, reteivaPct: 0, reteicaPct: 0, attachments: [] }),
});
export const listQuotes = quotesDb.list;
export const getQuote = quotesDb.get;
export const getNextNumber = quotesDb.peek;
export const setNextNumber = quotesDb.setNext;
export const saveQuote = quotesDb.save;
export const deleteQuote = quotesDb.remove;

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

const remisionsDb = docStore({
  key: 'remisiones', counterKey: 'remCounter', prefixField: 'remisionPrefix', defaultPrefix: 'REM',
  defaults: () => ({ status: 'pending', showPrices: false, purchaseOrder: '', deliveryAddress: '', dispatchedBy: '', vehicle: '', notes: '', quoteNumber: '', quoteId: '', items: [] }),
});
export const listRemisiones = remisionsDb.list;
export const getRemision = remisionsDb.get;
export const getNextRemisionNumber = remisionsDb.peek;
export const setNextRemisionNumber = remisionsDb.setNext;
export const saveRemision = remisionsDb.save;
export const deleteRemision = remisionsDb.remove;

export function setRemisionStatus(id, status) {
  const r = getRemision(id);
  if (!r) throw new Error('Remisión no encontrada');
  return saveRemision({ ...r, status });
}

export function duplicateRemision(id) {
  const r = getRemision(id);
  if (!r) throw new Error('Remisión no encontrada');
  const copy = structuredClone(r);
  delete copy.id;
  delete copy.number;
  delete copy.seq;
  copy.date = todayISO();
  copy.status = 'pending';
  return saveRemision(copy);
}

/** Borrador (sin guardar) de una remisión a partir de una cotización: copia cliente e ítems. */
export function remisionFromQuote(quoteId) {
  const q = getQuote(quoteId);
  if (!q) return null;
  return {
    date: todayISO(), status: 'pending', showPrices: false, quoteId: q.id, quoteNumber: q.number,
    client: structuredClone(q.client), deliveryAddress: q.client?.address || '',
    purchaseOrder: '', dispatchedBy: q.seller || '', vehicle: '', notes: '',
    items: structuredClone(q.items),
  };
}

/** Copia de seguridad de todos los datos en un solo texto JSON. */
export function exportAll() {
  return JSON.stringify({
    app: 'cotizador', version: 2, exportedAt: new Date().toISOString(),
    data: {
      company: loadCompany(), clients: listClients(), products: listProducts(),
      quotes: quotesDb.raw(), counter: quotesDb.counter(), remisiones: remisionsDb.raw(), remCounter: remisionsDb.counter(),
    },
  });
}

/** Restaura una copia de seguridad (reemplaza los datos actuales). Acepta copias de la versión 1 (sin remisiones). */
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
  const remisiones = Array.isArray(d.remisiones) ? d.remisiones : [];
  write('company', d.company && typeof d.company === 'object' ? d.company : {});
  write('clients', d.clients);
  write('products', d.products);
  quotesDb.restore(d.quotes, d.counter);
  remisionsDb.restore(remisiones, d.remCounter);
  return { quotes: d.quotes.length, clients: d.clients.length, products: d.products.length, remisiones: remisiones.length };
}
