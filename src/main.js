import './styles.css';
import { h, icon } from './ui/dom.js';
import { matchRoute } from './ui/router.js';
import { navigate, goBack, setGuard, installBackHandler } from './ui/nav.js';
import { closeSheet } from './ui/sheet.js';
import { loadCompany } from './lib/store.js';
import * as home from './ui/screens/home.js';
import * as quotes from './ui/screens/quotes.js';
import * as quote from './ui/screens/quoteEditor.js';
import * as clients from './ui/screens/clients.js';
import * as products from './ui/screens/products.js';
import * as company from './ui/screens/company.js';
import * as more from './ui/screens/more.js';

const screens = { home, quotes, quote, clients, products, company, more };

// Barra de pestañas (celular): [ruta, etiqueta, icono]
const TABS = [['home', 'Inicio', 'home'], ['quotes', 'Cotizaciones', 'quotes'], ['clients', 'Clientes', 'clients'], ['products', 'Productos', 'products'], ['more', 'Más', 'more']];
// Menú lateral (PC): [ruta, etiqueta, icono, disponible]
const SIDEBAR = [
  ['home', 'Inicio', 'home', true], ['quotes', 'Cotizaciones', 'quotes', true], ['remisiones', 'Remisiones', 'truck', false],
  ['facturas', 'Facturas', 'receipt', false], ['clients', 'Clientes', 'clients', true], ['products', 'Productos', 'products', true],
  ['reportes', 'Reportes', 'chart', false], ['company', 'Empresa', 'company', true],
];
const TITLES = { home: 'Cotizador', quotes: 'Cotizaciones', clients: 'Clientes', products: 'Productos', company: 'Mi empresa', more: 'Más' };

const titleFor = ({ name, params }) => (name === 'quote' ? (params.id === 'new' ? 'Nueva cotización' : 'Editar cotización') : TITLES[name]);
const link = (hash, cls, ...children) => h('a', { href: hash, class: cls, onClick: (e) => { e.preventDefault(); navigate(hash); } }, ...children);

function mount() {
  const route = matchRoute(location.hash);
  const { name, params } = route;
  setGuard(null);
  closeSheet();
  const activeTab = { quote: 'quotes', company: 'more' }[name] || name;
  const showBack = name === 'quote' || name === 'company';
  const brand = loadCompany().name;

  document.getElementById('app').replaceChildren(
    h('div', { class: `shell${name === 'quote' ? ' editing' : ''}` },
      h('aside', { class: 'sidebar' },
        h('div', { class: 'brand' }, 'Cotizador'),
        SIDEBAR.map(([key, label, ic, enabled]) => enabled
          ? link(`#/${key}`, key === activeTab || (key === 'company' && name === 'company') ? 'side-item active' : 'side-item', icon(ic), h('span', {}, label))
          : h('span', { class: 'side-item disabled', 'aria-disabled': 'true', title: 'Próximamente' }, icon(ic), h('span', {}, label), h('em', { class: 'pill' }, 'Pronto'))),
        h('div', { class: 'side-foot muted' }, brand, h('div', {}, typeof __BUILD__ === 'undefined' ? 'desarrollo' : __BUILD__))),
      h('div', { class: 'content' },
        h('header', { class: 'appbar' },
          showBack && h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Atrás', onClick: () => goBack(name) }, icon('back')),
          h('h1', {}, titleFor(route))),
        h('main', { class: 'main' }, screens[name].render(params))),
      h('nav', { class: 'tabbar', 'aria-label': 'Secciones' },
        TABS.map(([key, label, ic]) => link(`#/${key}`, key === activeTab ? 'tab active' : 'tab', icon(ic), h('span', {}, label)))),
    ),
  );
  window.scrollTo?.(0, 0);
}

window.addEventListener('hashchange', mount);
installBackHandler(() => matchRoute(location.hash).name);
mount();
