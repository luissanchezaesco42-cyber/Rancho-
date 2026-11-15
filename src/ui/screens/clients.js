import { h } from '../dom.js';
import { crudScreen } from './crud.js';
import { listClients, saveClient, deleteClient } from '../../lib/store.js';

export function render() {
  return crudScreen({
    title: 'Clientes',
    fields: [
      { name: 'name', label: 'Nombre o razón social' },
      { name: 'nit', label: 'NIT / Cédula' },
      { name: 'city', label: 'Ciudad' },
      { name: 'address', label: 'Dirección' },
      { name: 'phone', label: 'Teléfono', attrs: { inputmode: 'tel' } },
      { name: 'email', label: 'Correo', attrs: { inputmode: 'email' } },
    ],
    defaults: () => ({ name: '', nit: '', city: '', address: '', phone: '', email: '' }),
    list: listClients,
    save: saveClient,
    remove: deleteClient,
    searchText: (c) => `${c.name} ${c.nit}`,
    summary: (c) => [h('strong', {}, c.name), h('div', { class: 'muted' }, [c.nit, c.city, c.phone].filter(Boolean).join(' · '))],
  });
}
