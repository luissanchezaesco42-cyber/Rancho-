import { h } from './dom.js';
import { setSheetCloser } from './nav.js';

let current = null;

export function closeSheet() {
  if (!current) return;
  current.remove();
  current = null;
  setSheetCloser(null);
}

/** Hoja de acciones desde abajo. actions: {label, action, onClick, danger, primary} o 'divider'. */
export function openSheet(title, actions) {
  closeSheet();
  const items = actions.map((a) => a === 'divider'
    ? h('hr', { class: 'sheet-div' })
    : h('button', {
        type: 'button',
        class: ['sheet-item', a.danger && 'danger', a.primary && 'primary'].filter(Boolean).join(' '),
        'data-action': a.action,
        onClick: () => { closeSheet(); if (a.onClick) a.onClick(); },
      }, h('span', {}, a.label)));
  const overlay = h('div', { class: 'sheet-overlay', onClick: (e) => { if (e.target === overlay) closeSheet(); } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-label': title },
      h('div', { class: 'sheet-grip' }), h('div', { class: 'sheet-title' }, title), ...items));
  document.body.append(overlay);
  current = overlay;
  setSheetCloser(closeSheet);
  return closeSheet;
}
