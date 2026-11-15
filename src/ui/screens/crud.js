import { h, field, formData } from '../dom.js';

/**
 * Pantalla genérica de lista + formulario.
 * cfg: { title, fields: [{name,label,attrs}], list, save, remove, summary(item), searchText(item), defaults() }
 */
export function crudScreen(cfg) {
  const root = h('div', { class: 'stack' });
  let editing = null;
  let query = '';

  const draw = () => {
    const items = cfg.list().filter((x) => cfg.searchText(x).toLowerCase().includes(query.toLowerCase()));
    const form = h(
      'form',
      {
        class: 'card form',
        onSubmit: (e) => {
          e.preventDefault();
          const d = formData(form);
          for (const f of cfg.fields) if (f.number) d[f.name] = Number(String(d[f.name]).replace(',', '.')) || 0;
          cfg.save({ ...(editing || {}), ...d });
          editing = null;
          draw();
        },
      },
      h('h3', {}, editing ? 'Editar' : 'Nuevo'),
      cfg.fields.map((f) => field(f.label, f.name, (editing || cfg.defaults())[f.name], f.attrs)),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn primary', type: 'submit' }, 'Guardar'),
        editing && h('button', { class: 'btn ghost', type: 'button', onClick: () => { editing = null; draw(); } }, 'Cancelar'),
      ),
    );
    const list = h(
      'ul',
      { class: 'list' },
      items.length ? items.map((it) =>
        h(
          'li',
          { class: 'card item' },
          h('div', { class: 'grow' }, cfg.summary(it)),
          h('button', { class: 'btn ghost', onClick: () => { editing = it; draw(); window.scrollTo?.(0, 0); } }, 'Editar'),
          h('button', { class: 'btn danger', onClick: () => { if (confirm('¿Eliminar?')) { cfg.remove(it.id); draw(); } } }, 'Eliminar'),
        ),
      ) : h('li', { class: 'muted' }, 'Aún no hay registros.'),
    );
    root.replaceChildren(
      form,
      h('input', { class: 'search', type: 'search', placeholder: 'Buscar…', value: query, onInput: (e) => { query = e.target.value; const pos = e.target.selectionStart; draw(); const s = root.querySelector('.search'); s.focus(); s.setSelectionRange(pos, pos); } }),
      list,
    );
  };
  draw();
  return root;
}
