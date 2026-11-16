import { describe, it, expect } from 'vitest';
import { quotesToCsv } from '../src/lib/csv.js';

const q = (o = {}) => ({ number: 'COT-0001', date: '2026-11-15', status: 'approved', client: { name: 'ACME; "Ltda"', nit: '1' },
  items: [{ qty: 2, unitPrice: 10000, discountPct: 10, ivaPct: 19 }], retefuentePct: 2.5, ...o });

describe('quotesToCsv', () => {
  it('encabezado, BOM, separador ; y escape de comillas', () => {
    const csv = quotesToCsv([q()]);
    const [head, row] = csv.split('\r\n');
    expect(head).toBe('﻿Número;Fecha;Cliente;NIT;Estado;Bruto;Descuento;IVA;Retenciones;Total');
    expect(row).toBe('COT-0001;15/11/2026;"ACME; ""Ltda""";1;Aprobada;20000;2000;3420;450;20970');
  });
  it('lista vacía solo trae el encabezado', () => {
    expect(quotesToCsv([]).split('\r\n')).toHaveLength(1);
  });
});
