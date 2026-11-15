import { h, icon } from '../dom.js';

const row = (ic, label, hash) => h('a', { class: 'card row-link', href: hash }, icon(ic), h('span', { class: 'grow' }, label), icon('chevron'));
const soonRow = (ic, label) => h('div', { class: 'card row-link soon', 'aria-disabled': 'true', title: 'Próximamente', 'data-soon': '' }, icon(ic), h('span', { class: 'grow' }, label), h('em', { class: 'pill' }, 'Pronto'));

export function render() {
  return h('div', { class: 'stack' },
    row('company', 'Mi empresa (datos y logo)', '#/company'),
    soonRow('truck', 'Remisiones'),
    soonRow('receipt', 'Facturas'),
    soonRow('chart', 'Reportes'),
    h('p', { class: 'muted center' }, 'Cotizador · versión de pruebas'),
  );
}
