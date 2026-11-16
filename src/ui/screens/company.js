import { h, field, formData, soonField } from '../dom.js';
import { loadCompany, saveCompany, sanitizePrefix, getNextNumber, setNextNumber } from '../../lib/store.js';

/** Lee una imagen y la reduce (máx. 400 px de ancho) conservando la transparencia. */
function readImage(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(fr.result);
      img.onload = () => {
        const scale = Math.min(1, 400 / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/** Selector de imagen con vista previa. get/set leen y guardan el valor en el estado del formulario. */
function imagePicker(label, get, set, removeLabel) {
  const preview = h('div', { class: 'logo-preview' });
  const paint = () => preview.replaceChildren(get() ? h('img', { src: get(), alt: label }) : h('span', { class: 'muted' }, 'Sin imagen'));
  paint();
  return h('div', { class: 'field' },
    h('span', {}, label), preview,
    h('input', { type: 'file', accept: 'image/*', onChange: async (e) => { const f = e.target.files[0]; if (f) { set(await readImage(f)); paint(); } } }),
    h('button', { type: 'button', class: 'btn ghost', onClick: () => { set(null); paint(); } }, removeLabel));
}

export function render() {
  const c = loadCompany();
  let logo = c.logoDataUrl;
  let signature = c.signatureDataUrl;
  const status = h('p', { class: 'muted', role: 'status' });
  const form = h(
    'form',
    {
      class: 'card form',
      onSubmit: (e) => {
        e.preventDefault();
        const { nextNumber, ...d } = formData(form);
        saveCompany({ ...c, ...d, quotePrefix: sanitizePrefix(d.quotePrefix), defaultIva: Number(String(d.defaultIva).replace(',', '.')) || 0, logoDataUrl: logo, signatureDataUrl: signature });
        if (String(nextNumber).trim() !== '') setNextNumber(nextNumber);
        status.textContent = 'Datos guardados';
      },
    },
    h('p', { class: 'muted' }, 'Aparecen en el encabezado de cada cotización.'),
    field('Nombre o razón social', 'name', c.name),
    field('NIT', 'nit', c.nit),
    field('Dirección', 'address', c.address),
    field('Ciudad', 'city', c.city),
    field('Teléfono', 'phone', c.phone, { inputmode: 'tel' }),
    field('Correo', 'email', c.email, { inputmode: 'email', autocapitalize: 'none' }),
    field('IVA por defecto (%)', 'defaultIva', c.defaultIva, { inputmode: 'decimal' }),
    h('h3', {}, 'Numeración'),
    field('Prefijo de cotización (hasta 6 letras o números)', 'quotePrefix', c.quotePrefix, { maxlength: 6, autocapitalize: 'characters' }),
    field('Número de la próxima cotización', 'nextNumber', getNextNumber(), { inputmode: 'numeric' }),
    h('p', { class: 'muted' }, 'Cambiar esto no modifica las cotizaciones que ya creaste.'),
    soonField('Prefijo de remisión', 'prefixRemision', 'REM'),
    soonField('Prefijo de factura', 'prefixFactura', 'FAC'),
    h('h3', {}, 'Imagen'),
    imagePicker('Logo', () => logo, (v) => { logo = v; }, 'Quitar logo'),
    imagePicker('Firma y sello (sale al pie de la cotización)', () => signature, (v) => { signature = v; }, 'Quitar firma'),
    h('button', { class: 'btn primary', type: 'submit' }, 'Guardar'),
    status,
  );
  return form;
}
