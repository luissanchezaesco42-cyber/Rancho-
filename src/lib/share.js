import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { buildQuotePdf, quotePdfFileName } from './pdf.js';

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

export async function shareQuotePdf(quote, company) {
  const doc = buildQuotePdf(quote, company);
  const name = quotePdfFileName(quote);
  if (Capacitor.isNativePlatform()) {
    const data = doc.output('datauristring').split(',')[1];
    const { uri } = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache });
    await Share.share({ title: quote.number, text: `Cotización ${quote.number}`, url: uri, dialogTitle: 'Compartir cotización' });
    return;
  }
  const blob = doc.output('blob');
  const file = new File([blob], name, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: quote.number });
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
  }
  download(blob, name);
}

export function viewQuotePdf(quote, company) {
  const blob = buildQuotePdf(quote, company).output('blob');
  const url = URL.createObjectURL(blob);
  if (Capacitor.isNativePlatform()) return shareQuotePdf(quote, company);
  window.open(url, '_blank');
}
