import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

const ROUTES = ['', '#/quotes', '#/quote/new', '#/remisiones', '#/remision/new', '#/clients', '#/products', '#/company', '#/more', '#/reports'];
const go = (hash) => { location.hash = hash; window.dispatchEvent(new Event('hashchange')); };
const text = () => document.getElementById('app').textContent;

beforeAll(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  await import('../src/main.js');
});
beforeEach(() => localStorage.clear());

describe('navegación de la app', () => {
  it('la barra inferior tiene Inicio, Cotizaciones, Remisiones, Clientes y Más', () => {
    go('#/home');
    const tabs = [...document.querySelectorAll('.tabbar .tab')].map((a) => a.textContent);
    expect(tabs).toEqual(['Inicio', 'Cotizaciones', 'Remisiones', 'Clientes', 'Más']);
  });
  it('el menú lateral trae Productos, Reportes y Empresa, y ninguna entrada está apagada', () => {
    go('#/home');
    const side = [...document.querySelectorAll('.sidebar .side-item')].map((a) => a.textContent);
    expect(side).toEqual(['Inicio', 'Cotizaciones', 'Remisiones', 'Clientes', 'Productos', 'Reportes', 'Empresa']);
    expect(document.querySelectorAll('.side-item.disabled')).toHaveLength(0);
  });
  it('ninguna pantalla muestra "Pronto", "Próximamente" ni facturas', () => {
    for (const r of ROUTES) {
      go(r);
      expect(text(), r).not.toMatch(/pronto|próximamente|factura/i);
      expect(document.querySelectorAll('[data-soon]'), r).toHaveLength(0);
    }
  });
  it('cada ruta muestra su título y la flecha atrás solo en pantallas internas', () => {
    const titles = { '#/home': 'Cotizador', '#/quotes': 'Cotizaciones', '#/remisiones': 'Remisiones', '#/reports': 'Reportes', '#/quote/new': 'Nueva cotización', '#/remision/new': 'Nueva remisión' };
    for (const [hash, title] of Object.entries(titles)) { go(hash); expect(document.querySelector('.appbar h1').textContent).toBe(title); }
    for (const hash of ['#/quotes', '#/remisiones', '#/home', '#/clients', '#/more']) { go(hash); expect(document.querySelector('.appbar .iconbtn'), hash).toBeNull(); }
    for (const hash of ['#/quote/new', '#/remision/new', '#/products', '#/reports', '#/company']) { go(hash); expect(document.querySelector('.appbar .iconbtn'), hash).not.toBeNull(); }
  });
  it('en Productos y Reportes la pestaña "Más" queda iluminada y en el menú lateral su propia entrada', () => {
    go('#/reports');
    expect(document.querySelector('.tabbar .tab.active').textContent).toBe('Más');
    expect(document.querySelector('.sidebar .side-item.active').textContent).toBe('Reportes');
    go('#/remision/new');
    expect(document.querySelector('.tabbar .tab.active').textContent).toBe('Remisiones'); // el editor oculta la barra con CSS, pero marca la sección
    expect(document.querySelector('.shell').classList.contains('editing')).toBe(true);
    expect(document.querySelector('.sidebar .side-item.active').textContent).toBe('Remisiones');
  });
});
