/** Crea un elemento. attrs: class, on<Evento>, y atributos/propiedades normales. */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Campo de formulario con etiqueta. */
export function field(label, name, value = '', attrs = {}) {
  return h('label', { class: 'field' }, h('span', {}, label), h('input', { name, value: value ?? '', ...attrs }));
}

export function formData(form) {
  const out = {};
  for (const el of form.elements) if (el.name && !el.disabled) out[el.name] = el.value;
  return out;
}

/** Botón de una función que todavía no existe: visible pero inhabilitado. */
export function soon(label, extra = '') {
  return h('button', { type: 'button', class: `btn ghost soon ${extra}`.trim(), disabled: true, title: 'Próximamente', 'aria-disabled': 'true', 'data-soon': '' }, label);
}

/** Campo deshabilitado para funciones futuras. */
export function soonField(label, name, value = '') {
  return h('label', { class: 'field soon' }, h('span', {}, label, ' ', h('em', { class: 'pill' }, 'Pronto')), h('input', { name, value, disabled: true, title: 'Próximamente' }));
}

const ICONS = {
  home: ['M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  quotes: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5', 'M9 13h6', 'M9 17h6'],
  clients: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  products: ['M21 8l-9-5-9 5v8l9 5 9-5z', 'M3 8l9 5 9-5', 'M12 13v8'],
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  back: ['M15 18l-6-6 6-6'],
  plus: ['M12 5v14', 'M5 12h14'],
  company: ['M3 21h18', 'M5 21V7l7-4 7 4v14', 'M9 21v-6h6v6'],
  truck: ['M1 3h15v13H1z', 'M16 8h4l3 3v5h-7z', 'M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  receipt: ['M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2z', 'M8 7h8', 'M8 11h8'],
  chart: ['M18 20V10', 'M12 20V4', 'M6 20v-6'],
  chevron: ['M9 18l6-6-6-6'],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M5 21h14'],
  upload: ['M12 15V3', 'M7 8l5-5 5 5', 'M5 21h14'],
};

/** Icono SVG en línea (trazos fijos del propio código, sin datos del usuario). */
export function icon(name) {
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  const paths = (ICONS[name] || []).map((d) => `<path d="${d}"/>`).join('');
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return span;
}
