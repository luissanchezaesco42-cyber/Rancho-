import { h, field, formData } from '../dom.js';
import { readImage } from '../image.js';
import { loadCompany, saveCompany, sanitizePrefix, getNextNumber, setNextNumber, getNextRemisionNumber, setNextRemisionNumber } from '../../lib/store.js';

/** Selector de imagen con vista previa. get/set leen y guardan el valor en el estado del formulario. */
function imagePicker(label, get, set, removeLabel) {
  const preview = h('div', { class: 'logo-preview' });
  const paint = () => preview.replaceChildren(get() ? h('img', { src: get(), alt: label }) : h('span', { class: 'muted' }, 'Sin imagen'));
  paint();
  return h('div', { class: 'field' },
    h('span', {}, label), preview,
    h('input', { type: 'file', accept: 'image/*', onChange: async (e) => { const f = e.target.files[0]; if (f) { try { set(await readImage(f)); paint(); } catch (err) { alert(err.message); } } } }),
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
        const { nextNumber, nextRemision, ...d } = formData(form);
        try {
          saveCompany({
            ...c, ...d, quotePrefix: sanitizePrefix(d.quotePrefix), remisionPrefix: sanitizePrefix(d.remisionPrefix, 'REM'),
            defaultIva: Number(String(d.defaultIva).replace(',', '.')) || 0, logoDataUrl: logo, signatureDataUrl: signature,
          });
          if (String(nextNumber).trim() !== '') setNextNumber(nextNumber);
          if (String(nextRemision).trim() !== '') setNextRemisionNumber(nextRemision);
          status.textContent = 'Datos guardados';
        } catch (err) {
          status.textContent = err.message;
        }
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
    field('Prefijo de remisión', 'remisionPrefix', c.remisionPrefix, { maxlength: 6, autocapitalize: 'characters' }),
    field('Número de la próxima remisión', 'nextRemision', getNextRemisionNumber(), { inputmode: 'numeric' }),
    h('h3', {}, 'Imagen'),
    imagePicker('Logo', () => logo, (v) => { logo = v; }, 'Quitar logo'),
    imagePicker('Firma y sello (sale al pie de la cotización)', () => signature, (v) => { signature = v; }, 'Quitar firma'),
    h('button', { class: 'btn primary', type: 'submit' }, 'Guardar'),
    status,
  );
  return form;
}
