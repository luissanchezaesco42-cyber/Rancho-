import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calcLine, calcTotals, toNumber } from './totals.js';
import { numberToWords } from './numberToWords.js';
import { formatCOP, formatDate, addDays, formatNumber } from './format.js';

const INK = [31, 41, 55];
const ACCENT = [180, 83, 9];
const LINE = [156, 163, 175];

export const quotePdfFileName = (quote) => `${quote.number}.pdf`;

function logoFormat(dataUrl) {
  const m = /^data:image\/(png|jpe?g|webp)/i.exec(dataUrl || '');
  if (!m) return null;
  return m[1].toLowerCase() === 'png' ? 'PNG' : m[1].toLowerCase() === 'webp' ? 'WEBP' : 'JPEG';
}

export function buildQuotePdf(quote, company, options = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', ...options });
  const W = doc.internal.pageSize.getWidth();
  const M = 12;
  const right = W - M;
  doc.setTextColor(...INK);
  doc.setDrawColor(...LINE);

  // 1. Encabezado: logo + datos de la empresa, recuadro con número
  let textX = M;
  const fmt = logoFormat(company.logoDataUrl);
  if (fmt) {
    try {
      const props = doc.getImageProperties(company.logoDataUrl);
      const h = 22;
      const w = Math.min(40, (props.width / props.height) * h);
      doc.addImage(company.logoDataUrl, fmt, M, 10, w, (props.height / props.width) * w > h ? h : (props.height / props.width) * w);
      textX = M + w + 5;
    } catch {
      /* logo inválido: se omite */
    }
  }
  doc.setFont('helvetica', 'bold').setFontSize(13);
  doc.text(company.name || 'Mi empresa', textX, 14, { maxWidth: 100 });
  doc.setFont('helvetica', 'normal').setFontSize(9);
  const info = [
    company.nit && `Nit: ${company.nit}`,
    [company.address, company.city].filter(Boolean).join(' - '),
    [company.phone && `Tel. ${company.phone}`, company.email].filter(Boolean).join('   '),
  ].filter(Boolean);
  info.forEach((l, i) => doc.text(l, textX, 19.5 + i * 4.5, { maxWidth: 100 }));

  const bx = W - M - 62;
  doc.setLineWidth(0.4).rect(bx, 10, 62, 20);
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...ACCENT);
  doc.text('COTIZACIÓN', bx + 31, 17.5, { align: 'center' });
  doc.setFontSize(14).setTextColor(...INK);
  doc.text(quote.number, bx + 31, 25.5, { align: 'center' });

  // 2. Cliente
  const c = quote.client || {};
  let y = 36;
  doc.setLineWidth(0.3).rect(M, y, W - 2 * M, 22);
  doc.setFontSize(9);
  const rows = [
    ['Cliente:', c.name], ['NIT/Cédula:', c.nit], ['Ciudad:', c.city], ['Dirección:', c.address], ['Teléfono:', c.phone],
  ];
  rows.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'bold').text(k, M + 3, y + 5 + i * 4.2);
    doc.setFont('helvetica', 'normal').text(String(v || ''), M + 28, y + 5 + i * 4.2, { maxWidth: W - 2 * M - 32 });
  });

  // 3. Fecha / vigencia / pago / vendedor
  y += 26;
  const meta = [
    ['FECHA', formatDate(quote.date)],
    ['VÁLIDA HASTA', formatDate(addDays(quote.date, toNumber(quote.validDays)))],
    ['FORMA DE PAGO', quote.paymentTerms || ''],
    ['VENDEDOR', quote.seller || ''],
  ];
  const cw = (W - 2 * M) / meta.length;
  meta.forEach(([k, v], i) => {
    const x = M + i * cw;
    doc.rect(x, y, cw, 11);
    doc.setFont('helvetica', 'bold').setFontSize(7).text(k, x + 2, y + 4);
    doc.setFont('helvetica', 'normal').setFontSize(9).text(v, x + 2, y + 9, { maxWidth: cw - 4 });
  });

  // 4. Tabla de ítems
  const body = quote.items.map((it, i) => [
    i + 1, it.ref, it.description, it.unit, formatNumber(toNumber(it.qty)),
    formatCOP(toNumber(it.unitPrice)), `${formatNumber(Math.min(100, toNumber(it.discountPct)))}%`, formatCOP(calcLine(it).gross - calcLine(it).discount),
  ]);
  autoTable(doc, {
    startY: y + 15,
    margin: { left: M, right: M },
    head: [['ITEM', 'REFERENCIA', 'DESCRIPCIÓN DEL PRODUCTO', 'UND', 'CANT.', 'VR. UNIDAD', '%DCTO', 'SUBTOTAL']],
    body,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.8, overflow: 'linebreak', textColor: INK, lineColor: LINE, lineWidth: 0.2 },
    headStyles: { fillColor: INK, textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 11 }, 1: { cellWidth: 24 }, 3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'right', cellWidth: 14 }, 5: { halign: 'right', cellWidth: 25 }, 6: { halign: 'right', cellWidth: 14 },
      7: { halign: 'right', cellWidth: 26 },
    },
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
  });

  // 5. Totales
  const t = calcTotals(quote.items);
  let ty = doc.lastAutoTable.finalY + 6;
  if (ty > doc.internal.pageSize.getHeight() - 70) {
    doc.addPage();
    ty = 16;
  }
  const tx = W - M - 70;
  const totals = [['TOTAL BRUTO', t.gross], ['DESCUENTO', t.discount], ['VALOR IVA', t.iva], ['TOTAL A PAGAR', t.total]];
  totals.forEach(([k, v], i) => {
    const last = i === totals.length - 1;
    const yy = ty + i * 7;
    if (last) doc.setFillColor(...INK).rect(tx, yy, 70, 7, 'F');
    else doc.rect(tx, yy, 70, 7);
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...(last ? [255, 255, 255] : INK));
    doc.text(k, tx + 2, yy + 4.8);
    doc.text(formatCOP(v), tx + 68, yy + 4.8, { align: 'right' });
  });
  doc.setTextColor(...INK);

  // 6. SON + observaciones + pie
  let sy = ty + 36;
  doc.setFont('helvetica', 'bold').setFontSize(9).text('SON:', M, sy);
  doc.setFont('helvetica', 'normal').text(numberToWords(t.total), M + 10, sy, { maxWidth: W - 2 * M - 10 });
  if (quote.notes) {
    sy += 9;
    doc.setFont('helvetica', 'bold').text('OBSERVACIONES:', M, sy);
    doc.setFont('helvetica', 'normal').text(quote.notes, M, sy + 4.5, { maxWidth: W - 2 * M });
  }
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'italic').setFontSize(7.5).setTextColor(107, 114, 128);
    const H = doc.internal.pageSize.getHeight();
    doc.text('Esta cotización no constituye factura de venta. Precios sujetos a cambio después de la fecha de vigencia.', W / 2, H - 8, { align: 'center' });
    doc.text(`${quote.number} · Página ${p} de ${pages}`, W / 2, H - 4.5, { align: 'center' });
  }
  return doc;
}
