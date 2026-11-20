import { h, icon } from '../dom.js';
import { listQuotes, duplicateQuote, deleteQuote, setQuoteStatus, loadCompany, STATUSES, statusLabel } from '../../lib/store.js';
import { calcQuote } from '../../lib/totals.js';
import { formatCOP, todayISO } from '../../lib/format.js';
import { quotesToCsv } from '../../lib/csv.js';
import { shareQuotePdf, viewQuotePdf, emailQuote, shareCsv } from '../../lib/share.js';
import { openSheet } from '../sheet.js';
import { navigate } from '../nav.js';
import { qcard } from '../cards.js';

export function render() {
  const root = h('div', { class: 'stack' });
  let query = '';
  let statusFilter = 'all';

  const chooseStatus = (x, draw) => openSheet('Cambiar estado', STATUSES.map(([key, label]) => ({
    label: key === x.status ? `${label} ✓` : label, action: `status-${key}`, primary: key === x.status,
    onClick: () => { setQuoteStatus(x.id, key); draw(); },
  })));

  const actionsFor = (x, draw) => openSheet(`${x.number} · ${x.client?.name || 'Sin cliente'}`, [
    { label: 'Compartir PDF', action: 'share', primary: true, onClick: () => shareQuotePdf(x, loadCompany()) },
    { label: 'Ver PDF', action: 'view', onClick: () => viewQuotePdf(x, loadCompany()) },
    { label: 'Enviar por correo', action: 'email', onClick: () => emailQuote(x, loadCompany()) },
    { label: `Estado: ${statusLabel(x.status)}`, action: 'status', onClick: () => chooseStatus(x, draw) },
    { label: 'Editar', action: 'edit', onClick: () => navigate(`#/quote/${x.id}`) },
    { label: 'Duplicar', action: 'duplicate', onClick: () => { duplicateQuote(x.id); draw(); } },
    { label: 'Eliminar', action: 'delete', danger: true, onClick: () => { if (confirm(`¿Eliminar ${x.number}?`)) { deleteQuote(x.id); draw(); } } },
    'divider',
    { label: 'Convertir en remisión', action: 'to-remision', onClick: () => navigate(`#/remision/from/${x.id}`) },
  ]);

  const draw = () => {
    const all = listQuotes();
    const q = query.toLowerCase();
    const quotes = all.filter((x) => (statusFilter === 'all' || x.status === statusFilter) && `${x.number} ${x.client?.name || ''}`.toLowerCase().includes(q));
    const sum = quotes.reduce((a, x) => a + calcQuote(x).total, 0);
    const count = (key) => (key === 'all' ? all.length : all.filter((x) => x.status === key).length);
    root.replaceChildren(
      h('div', { class: 'row wrap filters' },
        h('input', { class: 'search grow', type: 'search', placeholder: 'Buscar por número o cliente…', value: query,
          onInput: (e) => { query = e.target.value; const pos = e.target.selectionStart; draw(); const s = root.querySelector('.search'); s.focus(); s.setSelectionRange(pos, pos); } })),
      h('div', { class: 'chips', role: 'tablist' }, [['all', 'Todas'], ...STATUSES].map(([key, label]) =>
        h('button', { type: 'button', class: `chip${statusFilter === key ? ' active' : ''}`, 'data-status': key, onClick: () => { statusFilter = key; draw(); } }, `${label} ${count(key)}`))),
      h('div', { class: 'row between' },
        h('p', { class: 'muted summary' }, `${quotes.length === 1 ? '1 cotización' : `${quotes.length} cotizaciones`} · ${formatCOP(sum)}`),
        h('button', { type: 'button', class: 'btn ghost', 'data-action': 'export', disabled: !quotes.length, onClick: () => shareCsv(quotesToCsv(quotes), `cotizaciones-${todayISO()}.csv`) }, icon('download'), 'Exportar')),
      h('ul', { class: 'list' }, quotes.length
        ? quotes.map((x) => h('li', { class: 'qitem' }, qcard(x, 'button', { type: 'button', onClick: () => actionsFor(x, draw) })))
        : h('li', { class: 'empty' }, h('b', {}, all.length ? 'Nada coincide con el filtro' : 'Aún no hay cotizaciones'), h('span', { class: 'muted' }, all.length ? 'Prueba con otro estado o búsqueda.' : 'Crea la primera con el botón “Nueva”.'))),
      h('a', { class: 'fab', href: '#/quote/new', 'aria-label': 'Nueva cotización' }, icon('plus'), h('span', {}, 'Nueva')),
    );
  };
  draw();
  return root;
}
