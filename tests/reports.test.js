import { describe, it, expect } from 'vitest';
import { periodRange, lastMonths, buildReport } from '../src/lib/reports.js';

const TODAY = '2026-11-20';
const q = (date, status, client, items) => ({ date, status, client: { name: client }, items });
const line = (description, qty, unitPrice) => ({ description, qty, unitPrice, discountPct: 0, ivaPct: 0 });

describe('periodRange', () => {
  it('mes, mes anterior, trimestre y año', () => {
    expect(periodRange('month', TODAY)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(periodRange('lastMonth', TODAY)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(periodRange('quarter', TODAY)).toEqual({ from: '2026-09-01', to: '2026-11-30' });
    expect(periodRange('year', TODAY)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(periodRange('all', TODAY)).toEqual({ from: null, to: null });
  });
  it('cruza el cambio de año', () => {
    expect(periodRange('lastMonth', '2026-01-15')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(periodRange('quarter', '2026-02-10')).toEqual({ from: '2025-12-01', to: '2026-02-28' });
  });
  it('fin de mes bisiesto', () => {
    expect(periodRange('month', '2028-02-10').to).toBe('2028-02-29');
  });
});

describe('lastMonths', () => {
  it('6 meses del más antiguo al actual, cruzando el año', () => {
    expect(lastMonths('2026-02-10', 6)).toEqual(['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']);
  });
});

describe('buildReport', () => {
  const quotes = [
    q('2026-11-02', 'approved', 'ACME', [line('Cable', 10, 1000), line('Plug', 5, 500)]), // 12.500
    q('2026-11-10', 'rejected', 'acme', [line('Cable', 1, 1000)]), // 1.000, mismo cliente en otro formato
    q('2026-11-15', 'sent', 'Beta', [line('plug', 2, 500)]), // 1.000
    q('2026-11-18', 'draft', 'Beta', []), // 0
    q('2026-10-05', 'approved', 'Gamma', [line('Cable', 1, 3000)]), // fuera del mes
  ];
  const remisiones = [{ date: '2026-11-03', status: 'delivered' }, { date: '2026-11-04', status: 'pending' }, { date: '2026-10-04', status: 'pending' }];

  it('totales, estados y tasa de aprobación del mes', () => {
    const r = buildReport({ quotes, remisiones, period: 'month', today: TODAY });
    expect(r.quotes.count).toBe(4);
    expect(r.quotes.value).toBe(14500);
    expect(r.quotes.byStatus.approved).toEqual({ count: 1, value: 12500 });
    expect(r.quotes.byStatus.draft.count).toBe(1);
    expect(r.quotes.approvalRate).toBeCloseTo(1 / 3); // 1 aprobada de (1 enviada + 1 aprobada + 1 rechazada)
  });
  it('agrupa clientes y productos sin distinguir mayúsculas y ordena por valor', () => {
    const r = buildReport({ quotes, remisiones, period: 'month', today: TODAY });
    expect(r.topClients).toEqual([{ name: 'ACME', value: 13500, count: 2 }, { name: 'Beta', value: 1000, count: 2 }]);
    expect(r.topProducts[0]).toEqual({ name: 'Cable', value: 11000, qty: 11 });
    expect(r.topProducts[1]).toMatchObject({ name: 'Plug', value: 3500, qty: 7 });
  });
  it('remisiones por estado dentro del periodo', () => {
    const r = buildReport({ quotes, remisiones, period: 'month', today: TODAY });
    expect(r.remisiones).toEqual({ count: 2, byStatus: { pending: 1, delivered: 1, cancelled: 0 } });
    expect(buildReport({ quotes, remisiones, period: 'all', today: TODAY }).remisiones.count).toBe(3);
  });
  it('la tendencia no depende del periodo y trae 6 meses aunque estén vacíos', () => {
    const r = buildReport({ quotes, remisiones, period: 'lastMonth', today: TODAY });
    expect(r.trend.map((t) => t.month)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    expect(r.trend[4]).toMatchObject({ month: '2026-10', count: 1, value: 3000 });
    expect(r.trend[0]).toEqual({ month: '2026-06', count: 0, value: 0 });
  });
  it('sin datos: ceros, listas vacías y tasa nula', () => {
    const r = buildReport({ quotes: [], remisiones: [], period: 'all', today: TODAY });
    expect(r.quotes).toMatchObject({ count: 0, value: 0, approvalRate: null });
    expect(r.topClients).toEqual([]);
    expect(r.topProducts).toEqual([]);
  });
  it('solo borradores: tasa nula, no 0 %', () => {
    const r = buildReport({ quotes: [q('2026-11-01', 'draft', 'X', [])], remisiones: [], period: 'month', today: TODAY });
    expect(r.quotes.approvalRate).toBeNull();
  });
  it('cotizaciones sin cliente ni descripción no rompen', () => {
    const r = buildReport({ quotes: [{ date: '2026-11-01', status: 'sent', client: {}, items: [{ qty: 1, unitPrice: 100 }] }], remisiones: [], period: 'month', today: TODAY });
    expect(r.topClients[0].name).toBe('Sin cliente');
    expect(r.topProducts[0].name).toBe('Sin descripción');
  });
});
