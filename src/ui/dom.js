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
