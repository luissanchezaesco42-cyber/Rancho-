import './styles.css';
import { h } from './ui/dom.js';
import { matchRoute } from './ui/router.js';
import * as quotes from './ui/screens/quotes.js';
import * as quote from './ui/screens/quoteEditor.js';
import * as clients from './ui/screens/clients.js';
import * as products from './ui/screens/products.js';
import * as company from './ui/screens/company.js';

const screens = { quotes, quote, clients, products, company };
const NAV = [['quotes', 'Cotizaciones'], ['clients', 'Clientes'], ['products', 'Productos'], ['company', 'Empresa']];

function mount() {
  const app = document.getElementById('app');
  const { name, params } = matchRoute(location.hash);
  const active = name === 'quote' ? 'quotes' : name;
  app.replaceChildren(
    h('nav', { class: 'nav' }, h('div', { class: 'brand' }, 'Cotizador'),
      NAV.map(([key, label]) => h('a', { href: `#/${key}`, class: key === active ? 'active' : '' }, label))),
    h('main', { class: 'main' }, screens[name].render(params)),
  );
  window.scrollTo?.(0, 0);
}

window.addEventListener('hashchange', mount);
mount();
