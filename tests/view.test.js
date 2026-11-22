import { describe, it, expect, beforeEach, vi } from 'vitest';

const native = { value: true };
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }));
vi.mock('@capacitor/filesystem', () => ({ Filesystem: { writeFile: vi.fn(async ({ path }) => ({ uri: `file:///data/cache/${path}` })) }, Directory: { Cache: 'CACHE' } }));
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn(async () => {}) } }));
vi.mock('@capacitor-community/file-opener', () => ({ FileOpener: { open: vi.fn(async () => {}) } }));

import { viewQuotePdf, viewRemisionPdf, shareQuotePdf } from '../src/lib/share.js';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FileOpener } from '@capacitor-community/file-opener';
import { defaultCompany } from '../src/lib/store.js';

const quote = { id: 'q', number: 'COT-0001', date: '2026-11-20', validDays: 15, status: 'draft', paymentTerms: '', seller: '', notes: '', client: { name: 'X' }, items: [] };
const remision = { id: 'r', number: 'REM-0001', date: '2026-11-20', status: 'pending', showPrices: false, client: { name: 'X' }, items: [] };
const company = defaultCompany();

beforeEach(() => { native.value = true; vi.clearAllMocks(); });

describe('Ver PDF en Android', () => {
  it('abre la cotización en el lector de PDF y NO abre la hoja de enviar', async () => {
    await viewQuotePdf(quote, company);
    expect(Filesystem.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'COT-0001.pdf', directory: 'CACHE' }));
    expect(FileOpener.open).toHaveBeenCalledWith({ filePath: 'file:///data/cache/COT-0001.pdf', contentType: 'application/pdf', openWithDefault: true });
    expect(Share.share).not.toHaveBeenCalled();
  });
  it('lo mismo con una remisión', async () => {
    await viewRemisionPdf(remision, company);
    expect(FileOpener.open).toHaveBeenCalledWith(expect.objectContaining({ filePath: 'file:///data/cache/REM-0001.pdf' }));
    expect(Share.share).not.toHaveBeenCalled();
  });
  it('el archivo guardado es un PDF real en base64', async () => {
    await viewQuotePdf(quote, company);
    const { data } = Filesystem.writeFile.mock.calls[0][0];
    expect(atob(data).startsWith('%PDF')).toBe(true);
  });
  it('si no hay lector de PDF avisa con un mensaje claro y no falla', async () => {
    FileOpener.open.mockRejectedValueOnce(new Error('Activity not found'));
    const alertSpy = vi.fn(); vi.stubGlobal('alert', alertSpy);
    await expect(viewQuotePdf(quote, company)).resolves.toBeUndefined();
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('lector de PDF'));
    expect(Share.share).not.toHaveBeenCalled();
  });
  it('si no se puede guardar el archivo también avisa', async () => {
    Filesystem.writeFile.mockRejectedValueOnce(new Error('disco lleno'));
    const alertSpy = vi.fn(); vi.stubGlobal('alert', alertSpy);
    await viewQuotePdf(quote, company);
    expect(FileOpener.open).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalled();
  });
});

describe('Compartir sigue siendo la hoja de enviar', () => {
  it('shareQuotePdf usa Share y no el lector', async () => {
    await shareQuotePdf(quote, company);
    expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({ url: 'file:///data/cache/COT-0001.pdf' }));
    expect(FileOpener.open).not.toHaveBeenCalled();
  });
});

describe('Ver PDF en el navegador', () => {
  it('abre una pestaña nueva con el PDF', async () => {
    native.value = false;
    URL.createObjectURL = vi.fn(() => 'blob:pdf');
    const open = vi.fn(); vi.stubGlobal('open', open);
    await viewQuotePdf(quote, company);
    expect(open).toHaveBeenCalledWith('blob:pdf', '_blank');
    expect(FileOpener.open).not.toHaveBeenCalled();
    expect(Filesystem.writeFile).not.toHaveBeenCalled();
  });
});
