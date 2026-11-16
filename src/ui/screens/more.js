import { h, icon } from '../dom.js';
import { exportAll, importAll } from '../../lib/store.js';
import { todayISO } from '../../lib/format.js';
import { shareBackup } from '../../lib/share.js';
import { navigate } from '../nav.js';

const row = (ic, label, hash) => h('a', { class: 'card row-link', href: hash }, icon(ic), h('span', { class: 'grow' }, label), icon('chevron'));
const soonRow = (ic, label) => h('div', { class: 'card row-link soon', 'aria-disabled': 'true', title: 'Próximamente', 'data-soon': '' }, icon(ic), h('span', { class: 'grow' }, label), h('em', { class: 'pill' }, 'Pronto'));

export function render() {
  const status = h('p', { class: 'muted center', role: 'status' });
  const restore = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm('Esto reemplaza todos los datos actuales (empresa, clientes, productos y cotizaciones) por los de la copia. ¿Continuar?')) return;
    try {
      const r = await importAll(await file.text());
      status.textContent = `Copia restaurada: ${r.quotes} cotizaciones, ${r.clients} clientes, ${r.products} productos.`;
      navigate('#/home');
    } catch (err) {
      status.textContent = err.message;
    }
  };

  return h('div', { class: 'stack' },
    row('company', 'Mi empresa (datos, logo y firma)', '#/company'),
    h('h3', {}, 'Tus datos'),
    h('button', { type: 'button', class: 'card row-link', 'data-action': 'backup', onClick: async () => { await shareBackup(exportAll(), `cotizador-copia-${todayISO()}.json`); status.textContent = 'Copia de seguridad lista.'; } },
      icon('download'), h('span', { class: 'grow' }, 'Guardar copia de seguridad'), icon('chevron')),
    h('label', { class: 'card row-link' }, icon('upload'), h('span', { class: 'grow' }, 'Restaurar copia de seguridad'), icon('chevron'),
      h('input', { type: 'file', accept: 'application/json,.json', 'data-action': 'restore', class: 'visually-hidden', onChange: restore })),
    status,
    h('h3', {}, 'Próximamente'),
    soonRow('truck', 'Remisiones'),
    soonRow('receipt', 'Facturas'),
    soonRow('chart', 'Reportes'),
    h('p', { class: 'muted center', 'data-testid': 'build' }, `Cotizador · versión de pruebas · ${typeof __BUILD__ === 'undefined' ? 'desarrollo' : __BUILD__}`),
  );
}
