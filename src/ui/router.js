export function matchRoute(hash) {
  const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  const [first, second] = parts;
  if (first === 'quote' && second) return { name: 'quote', params: { id: second } };
  if (['clients', 'products', 'company'].includes(first)) return { name: first, params: {} };
  return { name: 'quotes', params: {} };
}
