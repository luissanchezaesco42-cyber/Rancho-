import './styles.css';
import { h, icon } from './ui/dom.js';
import { matchRoute } from './ui/router.js';
import { navigate, goBack, setGuard, installBackHandler } from './ui/nav.js';
import { closeSheet } from './ui/sheet.js';
import { loadCompany } from './lib/store.js';
import * as home from './ui/screens/home.js';
import * as quotes from './ui/screens/quotes.js';
import * as quote from './ui/screens/quoteEditor.js';
import * as remisiones from './ui/screens/remisiones.js';
import * as remision from './ui/screens/remisionEditor.js';
import * as reports from './ui/screens/reports.js';
import * as clients from './ui/screens/clients.js';
import * as products from './ui/screens/products.js';
import * as company from './ui/screens/company.js';
import * as more from './ui/screens/more.js';

const screens = { home, quotes, quote, remisiones, remision, clients, products, company, more, reports };

// Barra de pestañas (celular): [ruta, etiqueta, icono]
const TABS = [['home', 'Inicio', 'home'], ['quotes', 'Cotizaciones', 'quotes'], ['remisiones', 'Remisiones', 'truck'], ['clients', 'Clientes', 'clients'], ['more', 'Más', 'more']];
// Menú lateral (PC): [ruta, etiqueta, icono]
const SIDEBAR = [
  ['home', 'Inicio', 'home'], ['quotes', 'Cotizaciones', 'quotes'], ['remisiones', 'Remisiones', 'truck'], ['clients', 'Clientes', 'clients'],
  ['products', 'Productos', 'products'], ['reports', 'Reportes', 'chart'], ['company', 'Empresa', 'company'],
];
const TITLES = { home: 'Cotizador', quotes: 'Cotizaciones', remisiones: 'Remisiones', clients: 'Clientes', products: 'Productos', company: 'Mi empresa', more: 'Más', reports: 'Reportes' };
// Pantallas que muestran la flecha "atrás" (las de la barra de pestañas no)
const BACK = ['quote', 'remision', 'company', 'products', 'reports'];
// Qué pestaña se ilumina en cada pantalla
const TAB_OF = { quote: 'quotes', remision: 'remisiones', company: 'more', products: 'more', reports: 'more' };
// Qué entrada se ilumina en el menú lateral (PC)
const SIDE_OF = { quote: 'quotes', remision: 'remisiones' };

const titleFor = ({ name, params }) => {
  if (name === 'quote') return params.id === 'new' ? 'Nueva cotización' : 'Editar cotización';
  if (name === 'remision') return params.id === 'new' ? 'Nueva remisión' : 'Editar remisión';
  return TITLES[name];
};
const link = (hash, cls, ...children) => h('a', { href: hash, class: cls, onClick: (e) => { e.preventDefault(); navigate(hash); } }, ...children);

function mount() {
  const route = matchRoute(location.hash);
  const { name, params } = route;
  setGuard(null);
  closeSheet();
  const activeTab = TAB_OF[name] || name;
  const showBack = BACK.includes(name);
  const brand = loadCompany().name;

  document.getElementById('app').replaceChildren(
    h('div', { class: `shell${name === 'quote' || name === 'remision' ? ' editing' : ''}` },
      h('aside', { class: 'sidebar' },
        h('div', { class: 'brand' }, 'Cotizador'),
        SIDEBAR.map(([key, label, ic]) => link(`#/${key}`, key === (SIDE_OF[name] || name) ? 'side-item active' : 'side-item', icon(ic), h('span', {}, label))),
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
