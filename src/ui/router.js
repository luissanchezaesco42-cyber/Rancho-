const SIMPLE = ['quotes', 'remisiones', 'clients', 'products', 'company', 'more', 'reports'];

export function matchRoute(hash) {
  const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  const [first, second, third] = parts;
  if (first === 'quote' && second) return { name: 'quote', params: { id: second } };
  if (first === 'remision' && second === 'from' && third) return { name: 'remision', params: { id: 'new', from: third } };
  if (first === 'remision' && second) return { name: 'remision', params: { id: second } };
  if (SIMPLE.includes(first)) return { name: first, params: {} };
  return { name: 'home', params: {} };
}

/** A dónde lleva "atrás" desde cada pantalla; null = estamos en el inicio. */
export function parentHash(name) {
  switch (name) {
    case 'quote': return '#/quotes';
    case 'remision': return '#/remisiones';
    case 'products':
    case 'company':
    case 'reports': return '#/more';
    case 'quotes':
    case 'remisiones':
    case 'clients':
    case 'more': return '#/home';
    default: return null;
  }
}
