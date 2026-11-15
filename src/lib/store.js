import { todayISO } from './format.js';

const P = 'cotizador.';

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
  name: '', nit: '', address: '', city: '', phone: '', email: '', logoDataUrl: null, defaultIva: 19,
});

export function loadCompany() {
  const c = read('company', {});
  return { ...defaultCompany(), ...(typeof c === 'object' && !Array.isArray(c) ? c : {}) };
}
export function saveCompany(c) {
  write('company', c);
}

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

export function listQuotes() {
  return readList('quotes').sort((a, b) => b.number.localeCompare(a.number));
}
export const getQuote = (id) => readList('quotes').find((q) => q.id === id);

function nextNumber() {
  const n = (Number(read('counter', 0)) || 0) + 1;
  write('counter', n);
  return `COT-${String(n).padStart(4, '0')}`;
}

export function saveQuote(q) {
  const toSave = { ...q };
  if (!toSave.id) toSave.id = newId();
  if (!toSave.number) toSave.number = nextNumber();
  return upsert('quotes', toSave);
}
export const deleteQuote = (id) => remove('quotes', id);

export function duplicateQuote(id) {
  const q = getQuote(id);
  if (!q) throw new Error('Cotización no encontrada');
  const copy = structuredClone(q);
  delete copy.id;
  delete copy.number;
  copy.date = todayISO();
  return saveQuote(copy);
}
