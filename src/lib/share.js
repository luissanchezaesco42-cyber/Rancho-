import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FileOpener } from '@capacitor-community/file-opener';
import { buildQuotePdf, quotePdfFileName } from './pdf.js';
import { buildRemisionPdf, remisionPdfFileName } from './pdfRemision.js';

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const fr = new FileReader();
  fr.onerror = () => reject(fr.error);
  fr.onload = () => resolve(String(fr.result).split(',')[1]);
  fr.readAsDataURL(blob);
});

/** Comparte un archivo: hoja "Compartir" de Android, o de la web, o descarga directa. */
export async function shareFile(blob, name, { title = name, text = '' } = {}) {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({ path: name, data: await blobToBase64(blob), directory: Directory.Cache });
    await Share.share({ title, text, url: uri, dialogTitle: 'Compartir' });
    return;
  }
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
  }
  download(blob, name);
}

/**
 * Ver un PDF. En Android se guarda en la caché y se abre con el lector de PDF del teléfono;
 * en el navegador se abre en una pestaña nueva. (Compartir/enviar es otra acción: shareFile.)
 */
export async function viewPdf(blob, name) {
  if (!Capacitor.isNativePlatform()) {
    window.open(URL.createObjectURL(blob), '_blank');
    return;
  }
  try {
    const { uri } = await Filesystem.writeFile({ path: name, data: await blobToBase64(blob), directory: Directory.Cache });
    await FileOpener.open({ filePath: uri, contentType: 'application/pdf', openWithDefault: true });
  } catch {
    alert('No se pudo abrir el PDF. Instala un lector de PDF (por ejemplo Google Drive) o usa «Compartir PDF».');
  }
}

const subjectOf = (quote, company) => `Cotización ${quote.number}${company.name ? ` - ${company.name}` : ''}`;

export function shareQuotePdf(quote, company) {
  const blob = buildQuotePdf(quote, company).output('blob');
  return shareFile(blob, quotePdfFileName(quote), { title: subjectOf(quote, company), text: `Adjunto la cotización ${quote.number}.` });
}

export const viewQuotePdf = (quote, company) => viewPdf(buildQuotePdf(quote, company).output('blob'), quotePdfFileName(quote));

export function shareRemisionPdf(remision, company) {
  const blob = buildRemisionPdf(remision, company).output('blob');
  const subject = `Remisión ${remision.number}${company.name ? ` - ${company.name}` : ''}`;
  return shareFile(blob, remisionPdfFileName(remision), { title: subject, text: `Adjunto la remisión ${remision.number}.` });
}

export const viewRemisionPdf = (remision, company) => viewPdf(buildRemisionPdf(remision, company).output('blob'), remisionPdfFileName(remision));

/** Correo: en el celular abre "Compartir" con asunto (elige Gmail u otra app); en PC descarga el PDF y abre el correo. */
export async function emailQuote(quote, company) {
  if (Capacitor.isNativePlatform()) return shareQuotePdf(quote, company);
  download(buildQuotePdf(quote, company).output('blob'), quotePdfFileName(quote));
  const body = `Hola,\n\nAdjunto la cotización ${quote.number}.\n\n${company.name || ''}`;
  window.location.href = `mailto:${quote.client?.email || ''}?subject=${encodeURIComponent(subjectOf(quote, company))}&body=${encodeURIComponent(body)}`;
}

export const shareCsv = (text, name) => shareFile(new Blob([text], { type: 'text/csv;charset=utf-8' }), name, { title: name });
export const shareBackup = (json, name) => shareFile(new Blob([json], { type: 'application/json' }), name, { title: name });
