import { jsPDF } from 'jspdf';
import { formatCOP } from './format.js';

export const INK = [31, 41, 55];
export const ACCENT = [180, 83, 9];
export const LINE = [156, 163, 175];
export const M = 12; // margen

export function logoFormat(dataUrl) {
  const m = /^data:image\/(png|jpe?g|webp)/i.exec(dataUrl || '');
  if (!m) return null;
  return m[1].toLowerCase() === 'png' ? 'PNG' : m[1].toLowerCase() === 'webp' ? 'WEBP' : 'JPEG';
}

export function newDoc(options = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', ...options });
  doc.setTextColor(...INK);
  doc.setDrawColor(...LINE);
  return doc;
}

/** Encabezado: logo y datos de la empresa a la izquierda; recuadro con el tipo de documento y su número a la derecha. */
export function drawHeader(doc, company, label, number) {
  const W = doc.internal.pageSize.getWidth();
  let textX = M;
  const fmt = logoFormat(company.logoDataUrl);
  if (fmt) {
    try {
      const props = doc.getImageProperties(company.logoDataUrl);
      const maxH = 22;
      const w = Math.min(40, (props.width / props.height) * maxH);
      const hh = (props.height / props.width) * w;
      doc.addImage(company.logoDataUrl, fmt, M, 10, w, hh > maxH ? maxH : hh);
      textX = M + w + 5;
    } catch {
      /* logo inválido: se omite */
    }
  }
  doc.setFont('helvetica', 'bold').setFontSize(13);
  doc.text(company.name || 'Mi empresa', textX, 14, { maxWidth: 100 });
  doc.setFont('helvetica', 'normal').setFontSize(9);
  [
    company.nit && `Nit: ${company.nit}`,
    [company.address, company.city].filter(Boolean).join(' - '),
    [company.phone && `Tel. ${company.phone}`, company.email].filter(Boolean).join('   '),
  ].filter(Boolean).forEach((l, i) => doc.text(l, textX, 19.5 + i * 4.5, { maxWidth: 100 }));

  const bx = W - M - 62;
  doc.setLineWidth(0.4).rect(bx, 10, 62, 20);
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...ACCENT);
  doc.text(label, bx + 31, 17.5, { align: 'center' });
  doc.setFontSize(14).setTextColor(...INK);
  doc.text(number, bx + 31, 25.5, { align: 'center' });
}

/** Recuadro de datos del cliente (5 filas). Devuelve la y donde termina. */
export function drawClientBlock(doc, rows, y) {
  const W = doc.internal.pageSize.getWidth();
  doc.setLineWidth(0.3).rect(M, y, W - 2 * M, 26);
  doc.setFontSize(9);
  rows.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'bold').text(k, M + 3, y + 5 + i * 4.2);
    doc.setFont('helvetica', 'normal').text(String(v || ''), M + 34, y + 5 + i * 4.2, { maxWidth: W - 2 * M - 38 });
  });
  return y + 26;
}

/** Fila de casillas (FECHA, VENDEDOR, …). Devuelve la y donde termina. */
export function drawMetaRow(doc, y, meta) {
  const W = doc.internal.pageSize.getWidth();
  const cw = (W - 2 * M) / meta.length;
  meta.forEach(([k, v], i) => {
    const x = M + i * cw;
    doc.setLineWidth(0.3).rect(x, y, cw, 11);
    doc.setFont('helvetica', 'bold').setFontSize(7).text(k, x + 2, y + 4);
    doc.setFont('helvetica', 'normal').setFontSize(9).text(String(v || ''), x + 2, y + 9, { maxWidth: cw - 4 });
  });
  return y + 11;
}

/** Bloque de totales a la derecha: filas [etiqueta, valor]; la última va resaltada. Devuelve la y donde termina. */
export function drawTotals(doc, rows, y) {
  const W = doc.internal.pageSize.getWidth();
  if (y + rows.length * 7 + 40 > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    y = 16;
  }
  const tx = W - M - 70;
  rows.forEach(([k, v], i) => {
    const last = i === rows.length - 1;
    const yy = y + i * 7;
    doc.setLineWidth(0.3);
    if (last) doc.setFillColor(...INK).rect(tx, yy, 70, 7, 'F');
    else doc.rect(tx, yy, 70, 7);
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...(last ? [255, 255, 255] : INK));
    doc.text(k, tx + 2, yy + 4.8);
    doc.text(formatCOP(v), tx + 68, yy + 4.8, { align: 'right' });
  });
  doc.setTextColor(...INK);
  return y + rows.length * 7;
}

/** Texto con título (OBSERVACIONES…). Devuelve la y donde termina. */
export function drawNotes(doc, title, text, y) {
  const W = doc.internal.pageSize.getWidth();
  if (!text) return y;
  doc.setFont('helvetica', 'bold').setFontSize(9).text(title, M, y);
  const lines = doc.splitTextToSize(text, W - 2 * M);
  doc.setFont('helvetica', 'normal').text(lines, M, y + 4.5);
  return y + 4.5 * lines.length + 4;
}

/** Firma y sello de la empresa al pie del contenido. Devuelve la y donde termina. */
export function drawSignature(doc, company, y) {
  const fmt = logoFormat(company.signatureDataUrl);
  if (!fmt) return y;
  try {
    const props = doc.getImageProperties(company.signatureDataUrl);
    const k = Math.min(50 / props.width, 24 / props.height);
    const sw = props.width * k;
    const sh = props.height * k;
    let fy = y + 4;
    if (fy + sh + 8 > doc.internal.pageSize.getHeight() - 14) { doc.addPage(); fy = 20; }
    doc.addImage(company.signatureDataUrl, fmt, M, fy, sw, sh);
    doc.setLineWidth(0.3).line(M, fy + sh + 1, M + 60, fy + sh + 1);
    doc.setFont('helvetica', 'normal').setFontSize(7.5).text('FIRMA AUTORIZADA', M, fy + sh + 5);
    return fy + sh + 8;
  } catch {
    return y; /* firma inválida: se omite */
  }
}

/** Una página por imagen adjunta, ajustada a la hoja. */
export function drawAttachments(doc, attachments) {
  const list = (attachments || []).filter((a) => logoFormat(a?.dataUrl));
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  list.forEach((a, i) => {
    try {
      const props = doc.getImageProperties(a.dataUrl);
      doc.addPage();
      doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...INK);
      doc.text(`ANEXO ${i + 1} de ${list.length}${a.name ? ` · ${a.name}` : ''}`, M, 16, { maxWidth: W - 2 * M });
      const k = Math.min((W - 2 * M) / props.width, (H - 46) / props.height);
      doc.addImage(a.dataUrl, logoFormat(a.dataUrl), M, 22, props.width * k, props.height * k);
    } catch {
      /* imagen inválida: se omite */
    }
  });
}

/** Pie en todas las páginas: aviso legal y número de documento con paginación. */
export function drawFooters(doc, note, number) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'italic').setFontSize(7.5).setTextColor(107, 114, 128);
    doc.text(note, W / 2, H - 8, { align: 'center' });
    doc.text(`${number} · Página ${p} de ${pages}`, W / 2, H - 4.5, { align: 'center' });
  }
}
