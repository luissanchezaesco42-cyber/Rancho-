export function matchRoute(hash) {
  const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  const [first, second] = parts;
  if (first === 'quote' && second) return { name: 'quote', params: { id: second } };
  if (['quotes', 'clients', 'products', 'company', 'more'].includes(first)) return { name: first, params: {} };
  return { name: 'home', params: {} };
}

/** A dónde lleva "atrás" desde cada pantalla; null = estamos en el inicio. */
export function parentHash(name) {
  switch (name) {
    case 'quote': return '#/quotes';
    case 'company': return '#/more';
    case 'quotes':
    case 'clients':
    case 'products':
    case 'more': return '#/home';
    default: return null;
  }
}
