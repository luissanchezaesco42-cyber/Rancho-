import './styles.css';
import { h } from './ui/dom.js';
import { matchRoute } from './ui/router.js';
import * as home from './ui/screens/home.js';
import * as quotes from './ui/screens/quotes.js';
import * as quote from './ui/screens/quoteEditor.js';
import * as clients from './ui/screens/clients.js';
import * as products from './ui/screens/products.js';
import * as company from './ui/screens/company.js';

const screens = { home, quotes, quote, clients, products, company };
// [ruta, etiqueta, disponible]
const NAV = [
  ['home', 'Inicio', true], ['quotes', 'Cotizaciones', true], ['remisiones', 'Remisiones', false], ['facturas', 'Facturas', false],
  ['clients', 'Clientes', true], ['products', 'Productos', true], ['reportes', 'Reportes', false], ['company', 'Empresa', true],
];

function mount() {
  const app = document.getElementById('app');
  const { name, params } = matchRoute(location.hash);
  const active = name === 'quote' ? 'quotes' : name;
  app.replaceChildren(
    h('nav', { class: 'nav' }, h('div', { class: 'brand' }, 'Cotizador'),
      NAV.map(([key, label, enabled]) => enabled
        ? h('a', { href: `#/${key}`, class: key === active ? 'active' : '' }, label)
        : h('span', { class: 'nav-item disabled', 'aria-disabled': 'true', title: 'Próximamente' }, label, h('em', { class: 'pill' }, 'Pronto')))),
    h('main', { class: 'main' }, screens[name].render(params)),
  );
  window.scrollTo?.(0, 0);
}

window.addEventListener('hashchange', mount);
mount();
