import autoTable from 'jspdf-autotable';
import { calcLine, calcQuote, toNumber } from './totals.js';
import { formatCOP, formatDate, formatNumber } from './format.js';
import { INK, LINE, M, newDoc, drawHeader, drawClientBlock, drawMetaRow, drawTotals, drawNotes, drawFooters } from './pdfParts.js';

export const remisionPdfFileName = (r) => `${r.number}.pdf`;

/** Casillas de firma: quién entrega y quién recibe. Devuelve la y donde termina. */
function drawSignBoxes(doc, r, y) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  if (y + 40 > H - 20) { doc.addPage(); y = 20; }
  const w = (W - 2 * M - 8) / 2;
  const box = (x, title, lines) => {
    doc.setLineWidth(0.3).rect(x, y, w, 34);
    doc.setFont('helvetica', 'bold').setFontSize(8).text(title, x + 3, y + 5);
    doc.setFont('helvetica', 'normal').setFontSize(8.5);
    lines.forEach((l, i) => {
      doc.text(l, x + 3, y + 13 + i * 6.5);
      doc.setDrawColor(...LINE).line(x + 3 + doc.getTextWidth(l) + 1, y + 13 + i * 6.5, x + w - 3, y + 13 + i * 6.5);
    });
  };
  box(M, 'ENTREGADO POR', [`Nombre: ${r.dispatchedBy || ''}`, 'Firma:', 'Fecha:']);
  box(M + w + 8, 'RECIBIDO POR', ['Nombre:', 'Cédula:', 'Firma y fecha:']);
  return y + 34;
}

export function buildRemisionPdf(remision, company, options = {}) {
  const doc = newDoc(options);
  const c = remision.client || {};
  const prices = !!remision.showPrices;

  drawHeader(doc, company, 'REMISIÓN', remision.number);
  let y = drawClientBlock(doc, [
    ['Cliente:', c.name], ['NIT/Cédula:', c.nit], ['Ciudad:', c.city],
    ['Entregar en:', remision.deliveryAddress || c.address], ['Teléfono:', c.phone],
  ], 36) + 4;
  y = drawMetaRow(doc, y, [
    ['FECHA', formatDate(remision.date)],
    ['ORDEN DE COMPRA', remision.purchaseOrder],
    ['COTIZACIÓN', remision.quoteNumber],
    ['TRANSPORTE / PLACA', remision.vehicle],
  ]);

  const head = ['ITEM', 'REFERENCIA', 'DESCRIPCIÓN DEL PRODUCTO', 'UND', 'CANT.'];
  const columnStyles = { 0: { halign: 'center', cellWidth: 11 }, 1: { cellWidth: 28 }, 3: { halign: 'center', cellWidth: 14 }, 4: { halign: 'right', cellWidth: 18 } };
  if (prices) {
    head.push('VR. UNIDAD', 'SUBTOTAL');
    columnStyles[5] = { halign: 'right', cellWidth: 26 };
    columnStyles[6] = { halign: 'right', cellWidth: 28 };
  }
  autoTable(doc, {
    startY: y + 4,
    margin: { left: M, right: M },
    head: [head],
    body: remision.items.map((it, i) => {
      const row = [i + 1, it.ref, it.description, it.unit, formatNumber(toNumber(it.qty))];
      if (prices) row.push(formatCOP(toNumber(it.unitPrice)), formatCOP(calcLine(it).gross - calcLine(it).discount));
      return row;
    }),
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.8, overflow: 'linebreak', textColor: INK, lineColor: LINE, lineWidth: 0.2 },
    headStyles: { fillColor: INK, textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
  });

  y = doc.lastAutoTable.finalY + 6;
  if (prices) {
    const t = calcQuote(remision);
    y = drawTotals(doc, [['TOTAL BRUTO', t.gross], ['DESCUENTO', t.discount], ['VALOR IVA', t.iva], ['TOTAL', t.total]], y) + 8;
  } else {
    const totalQty = remision.items.reduce((a, it) => a + toNumber(it.qty), 0);
    doc.setFont('helvetica', 'bold').setFontSize(9).text(`${remision.items.length} ítem${remision.items.length === 1 ? '' : 's'} · ${formatNumber(totalQty)} unidades`, M, y + 2);
    y += 10;
  }
  y = drawNotes(doc, 'OBSERVACIONES:', remision.notes, y);
  drawSignBoxes(doc, remision, y + 4);

  drawFooters(doc, 'Esta remisión es un comprobante de entrega y no constituye factura de venta.', remision.number);
  return doc;
}
