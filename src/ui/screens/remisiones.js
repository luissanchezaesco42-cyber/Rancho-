import { h, icon } from '../dom.js';
import { listRemisiones, deleteRemision, duplicateRemision, setRemisionStatus, loadCompany, REMISION_STATUSES, remisionStatusLabel } from '../../lib/store.js';
import { todayISO } from '../../lib/format.js';
import { remisionesToCsv } from '../../lib/csv.js';
import { shareRemisionPdf, viewRemisionPdf, shareCsv } from '../../lib/share.js';
import { openSheet } from '../sheet.js';
import { navigate } from '../nav.js';
import { rcard } from '../cards.js';

export function render() {
  const root = h('div', { class: 'stack' });
  let query = '';
  let statusFilter = 'all';

  const chooseStatus = (x, draw) => openSheet('Cambiar estado', REMISION_STATUSES.map(([key, label]) => ({
    label: key === x.status ? `${label} ✓` : label, action: `status-${key}`, primary: key === x.status,
    onClick: () => { setRemisionStatus(x.id, key); draw(); },
  })));

  const actionsFor = (x, draw) => openSheet(`${x.number} · ${x.client?.name || 'Sin cliente'}`, [
    { label: 'Compartir PDF', action: 'share', primary: true, onClick: () => shareRemisionPdf(x, loadCompany()) },
    { label: 'Ver PDF', action: 'view', onClick: () => viewRemisionPdf(x, loadCompany()) },
    { label: `Estado: ${remisionStatusLabel(x.status)}`, action: 'status', onClick: () => chooseStatus(x, draw) },
    { label: 'Editar', action: 'edit', onClick: () => navigate(`#/remision/${x.id}`) },
    { label: 'Duplicar', action: 'duplicate', onClick: () => { duplicateRemision(x.id); draw(); } },
    { label: 'Eliminar', action: 'delete', danger: true, onClick: () => { if (confirm(`¿Eliminar ${x.number}?`)) { deleteRemision(x.id); draw(); } } },
  ]);

  const draw = () => {
    const all = listRemisiones();
    const q = query.toLowerCase();
    const items = all.filter((x) => (statusFilter === 'all' || x.status === statusFilter)
      && `${x.number} ${x.client?.name || ''} ${x.purchaseOrder || ''} ${x.quoteNumber || ''}`.toLowerCase().includes(q));
    const count = (key) => (key === 'all' ? all.length : all.filter((x) => x.status === key).length);
    root.replaceChildren(
      h('div', { class: 'row wrap filters' },
        h('input', { class: 'search grow', type: 'search', placeholder: 'Buscar por número, cliente u orden de compra…', value: query,
          onInput: (e) => { query = e.target.value; const pos = e.target.selectionStart; draw(); const s = root.querySelector('.search'); s.focus(); s.setSelectionRange(pos, pos); } })),
      h('div', { class: 'chips' }, [['all', 'Todas'], ...REMISION_STATUSES].map(([key, label]) =>
        h('button', { type: 'button', class: `chip${statusFilter === key ? ' active' : ''}`, 'data-status': key, onClick: () => { statusFilter = key; draw(); } }, `${label} ${count(key)}`))),
      h('div', { class: 'row between' },
        h('p', { class: 'muted summary' }, items.length === 1 ? '1 remisión' : `${items.length} remisiones`),
        h('button', { type: 'button', class: 'btn ghost', 'data-action': 'export', disabled: !items.length, onClick: () => shareCsv(remisionesToCsv(items), `remisiones-${todayISO()}.csv`) }, icon('download'), 'Exportar')),
      h('ul', { class: 'list' }, items.length
        ? items.map((x) => h('li', { class: 'qitem' }, rcard(x, 'button', { type: 'button', onClick: () => actionsFor(x, draw) })))
        : h('li', { class: 'empty' }, h('b', {}, all.length ? 'Nada coincide con el filtro' : 'Aún no hay remisiones'),
            h('span', { class: 'muted' }, all.length ? 'Prueba con otro estado o búsqueda.' : 'Crea una con “Nueva” o convierte una cotización.'))),
      h('a', { class: 'fab', href: '#/remision/new', 'aria-label': 'Nueva remisión' }, icon('plus'), h('span', {}, 'Nueva')),
    );
  };
  draw();
  return root;
}
