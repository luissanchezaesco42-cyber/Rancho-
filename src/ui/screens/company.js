import { h, field, formData, soon, soonField } from '../dom.js';
import { loadCompany, saveCompany } from '../../lib/store.js';

function readLogo(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(fr.result);
      img.onload = () => {
        const max = 400;
        const scale = Math.min(1, max / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

export function render() {
  const c = loadCompany();
  let logo = c.logoDataUrl;
  const preview = h('div', { class: 'logo-preview' });
  const paint = () => {
    preview.replaceChildren(logo ? h('img', { src: logo, alt: 'Logo' }) : h('span', { class: 'muted' }, 'Sin logo'));
  };
  paint();
  const status = h('p', { class: 'muted', role: 'status' });
  const form = h(
    'form',
    {
      class: 'card form',
      onSubmit: (e) => {
        e.preventDefault();
        const d = formData(form);
        saveCompany({ ...c, ...d, defaultIva: Number(d.defaultIva) || 0, logoDataUrl: logo });
        status.textContent = 'Datos guardados';
      },
    },
    h('p', { class: 'muted' }, 'Aparecen en el encabezado de cada cotización.'),
    field('Nombre o razón social', 'name', c.name),
    field('NIT', 'nit', c.nit),
    field('Dirección', 'address', c.address),
    field('Ciudad', 'city', c.city),
    field('Teléfono', 'phone', c.phone, { inputmode: 'tel' }),
    field('Correo', 'email', c.email, { inputmode: 'email' }),
    field('IVA por defecto (%)', 'defaultIva', c.defaultIva, { inputmode: 'decimal' }),
    soonField('Prefijo de cotización', 'prefix', 'COT'),
    soonField('Prefijo de remisión', 'prefixRemision', 'REM'),
    soonField('Prefijo de factura', 'prefixFactura', 'FAC'),
    h(
      'div',
      { class: 'field' },
      h('span', {}, 'Logo'),
      preview,
      h('input', {
        type: 'file',
        accept: 'image/*',
        onChange: async (e) => {
          const f = e.target.files[0];
          if (f) {
            logo = await readLogo(f);
            paint();
          }
        },
      }),
      h('button', { type: 'button', class: 'btn ghost', onClick: () => { logo = null; paint(); } }, 'Quitar logo'),
    ),
    h('div', {}, soon('Firma y sello')),
    h('button', { class: 'btn primary', type: 'submit' }, 'Guardar'),
    status,
  );
  return form;
}
