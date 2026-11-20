import autoTable from 'jspdf-autotable';
import { calcLine, calcQuote, toNumber } from './totals.js';
import { numberToWords } from './numberToWords.js';
import { formatCOP, formatDate, addDays, formatNumber } from './format.js';
import { INK, LINE, M, newDoc, drawHeader, drawClientBlock, drawMetaRow, drawTotals, drawNotes, drawSignature, drawAttachments, drawFooters } from './pdfParts.js';

export const quotePdfFileName = (quote) => `${quote.number}.pdf`;

export function buildQuotePdf(quote, company, options = {}) {
  const doc = newDoc(options);
  const c = quote.client || {};

  drawHeader(doc, company, 'COTIZACIÓN', quote.number);
  let y = drawClientBlock(doc, [['Cliente:', c.name], ['NIT/Cédula:', c.nit], ['Ciudad:', c.city], ['Dirección:', c.address], ['Teléfono:', c.phone]], 36) + 4;
  y = drawMetaRow(doc, y, [
    ['FECHA', formatDate(quote.date)],
    ['VÁLIDA HASTA', formatDate(addDays(quote.date, toNumber(quote.validDays)))],
    ['FORMA DE PAGO', quote.paymentTerms || ''],
    ['VENDEDOR', quote.seller || ''],
  ]);

  autoTable(doc, {
    startY: y + 4,
    margin: { left: M, right: M },
    head: [['ITEM', 'REFERENCIA', 'DESCRIPCIÓN DEL PRODUCTO', 'UND', 'CANT.', 'VR. UNIDAD', '%DCTO', 'SUBTOTAL']],
    body: quote.items.map((it, i) => [
      i + 1, it.ref, it.description, it.unit, formatNumber(toNumber(it.qty)),
      formatCOP(toNumber(it.unitPrice)), `${formatNumber(Math.min(100, toNumber(it.discountPct)))}%`, formatCOP(calcLine(it).gross - calcLine(it).discount),
    ]),
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.8, overflow: 'linebreak', textColor: INK, lineColor: LINE, lineWidth: 0.2 },
    headStyles: { fillColor: INK, textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 11 }, 1: { cellWidth: 24 }, 3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'right', cellWidth: 14 }, 5: { halign: 'right', cellWidth: 25 }, 6: { halign: 'right', cellWidth: 17 },
      7: { halign: 'right', cellWidth: 26 },
    },
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
  });

  // Totales (las retenciones solo aparecen si tienen valor)
  const t = calcQuote(quote);
  const totalRows = [['TOTAL BRUTO', t.gross], ['DESCUENTO', t.discount], ['VALOR IVA', t.iva]];
  if (t.retefuente) totalRows.push(['RET. FUENTE', -t.retefuente]);
  if (t.reteiva) totalRows.push(['RET. IVA', -t.reteiva]);
  if (t.reteica) totalRows.push(['RET. ICA', -t.reteica]);
  totalRows.push(['TOTAL A PAGAR', t.total]);
  y = drawTotals(doc, totalRows, doc.lastAutoTable.finalY + 6) + 8;

  doc.setFont('helvetica', 'bold').setFontSize(9).text('SON:', M, y);
  doc.setFont('helvetica', 'normal').text(numberToWords(t.total), M + 10, y, { maxWidth: 170 });
  y = drawNotes(doc, 'OBSERVACIONES:', quote.notes, y + 9);
  drawSignature(doc, company, y);
  drawAttachments(doc, quote.attachments);

  drawFooters(doc, 'Esta cotización no constituye factura de venta. Precios sujetos a cambio después de la fecha de vigencia.', quote.number);
  return doc;
}
