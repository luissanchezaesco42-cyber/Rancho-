import { h } from '../dom.js';
import { crudScreen } from './crud.js';
import { listProducts, saveProduct, deleteProduct, loadCompany } from '../../lib/store.js';
import { formatCOP } from '../../lib/format.js';

export function render() {
  return crudScreen({
    title: 'Productos',
    fields: [
      { name: 'ref', label: 'Referencia' },
      { name: 'description', label: 'Descripción' },
      { name: 'unit', label: 'Unidad (UND, Lm…)' },
      { name: 'unitPrice', label: 'Valor unitario', number: true, attrs: { inputmode: 'decimal' } },
      { name: 'ivaPct', label: 'IVA (%)', number: true, attrs: { inputmode: 'decimal' } },
    ],
    defaults: () => ({ ref: '', description: '', unit: 'UND', unitPrice: '', ivaPct: loadCompany().defaultIva }),
    list: listProducts,
    save: saveProduct,
    remove: deleteProduct,
    searchText: (p) => `${p.ref} ${p.description}`,
    summary: (p) => [h('strong', {}, p.description), h('div', { class: 'muted' }, `${p.ref} · ${p.unit} · ${formatCOP(p.unitPrice)} · IVA ${p.ivaPct}%`)],
  });
}
