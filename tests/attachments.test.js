import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/ui/image.js', () => ({ readImage: vi.fn(async (file) => `data:image/jpeg;base64,${file.name}`) }));

import * as quoteEditor from '../src/ui/screens/quoteEditor.js';
import { listQuotes, saveQuote, MAX_ATTACHMENTS } from '../src/lib/store.js';
import { readImage } from '../src/ui/image.js';
import { setGuard } from '../src/ui/nav.js';

const mount = (el) => { document.body.replaceChildren(el); return el; };
const submit = (form) => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
const attach = async (root, name) => {
  const input = root.querySelector('[data-action="attach"]');
  Object.defineProperty(input, 'files', { value: [new File(['x'], name, { type: 'image/png' })], configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 0));
};
const info = (root) => root.querySelector('[data-testid="attach-info"]').textContent;

beforeEach(() => { localStorage.clear(); setGuard(null); readImage.mockClear(); });

describe('anexos de la cotización', () => {
  it('adjunta, muestra la miniatura y el contador, y se guarda con la cotización', async () => {
    const root = mount(quoteEditor.render({ id: 'new' }));
    expect(info(root)).toContain(`0 de ${MAX_ATTACHMENTS}`);
    await attach(root, 'orden.png');
    expect(root.querySelectorAll('.thumb')).toHaveLength(1);
    expect(info(root)).toContain(`1 de ${MAX_ATTACHMENTS}`);
    submit(root);
    expect(listQuotes()[0].attachments).toEqual([{ name: 'orden.png', dataUrl: 'data:image/jpeg;base64,orden.png' }]);
  });
  it('se puede quitar un anexo', async () => {
    const root = mount(quoteEditor.render({ id: 'new' }));
    await attach(root, 'a.png'); await attach(root, 'b.png');
    root.querySelector('[data-action="remove-attach"]').click();
    expect(root.querySelectorAll('.thumb')).toHaveLength(1);
    expect(root.querySelector('.thumb img').alt).toBe('b.png');
  });
  it('al llegar al máximo se bloquea y no acepta más', async () => {
    const root = mount(quoteEditor.render({ id: 'new' }));
    for (let i = 0; i < MAX_ATTACHMENTS; i++) await attach(root, `f${i}.png`);
    expect(root.querySelector('[data-action="attach"]').disabled).toBe(true);
    await attach(root, 'extra.png');
    expect(root.querySelectorAll('.thumb')).toHaveLength(MAX_ATTACHMENTS);
    expect(readImage).toHaveBeenCalledTimes(MAX_ATTACHMENTS);
  });
  it('conserva los anexos al editar una cotización existente', () => {
    const q = saveQuote({ date: '2026-11-20', validDays: 15, paymentTerms: '', seller: '', notes: '', client: { name: 'A' }, items: [],
      attachments: [{ name: 'x.jpg', dataUrl: 'data:image/jpeg;base64,AA' }] });
    const root = mount(quoteEditor.render({ id: q.id }));
    expect(root.querySelectorAll('.thumb')).toHaveLength(1);
    submit(root);
    expect(listQuotes()[0].attachments).toHaveLength(1);
  });
  it('si la imagen no se puede leer avisa y no agrega nada', async () => {
    readImage.mockRejectedValueOnce(new Error('No se pudo leer la imagen.'));
    const alertSpy = vi.fn(); vi.stubGlobal('alert', alertSpy);
    const root = mount(quoteEditor.render({ id: 'new' }));
    await attach(root, 'rota.png');
    expect(alertSpy).toHaveBeenCalledWith('No se pudo leer la imagen.');
    expect(root.querySelectorAll('.thumb')).toHaveLength(0);
  });
});
