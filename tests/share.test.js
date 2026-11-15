import { describe, it, expect, vi } from 'vitest';
import { shareQuotePdf } from '../src/lib/share.js';
import { defaultCompany } from '../src/lib/store.js';

describe('shareQuotePdf', () => {
  it('en navegador sin share, descarga COT-0001.pdf', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const names = [];
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { names.push(this.download); };
    const q = { id: '1', number: 'COT-0001', date: '2026-11-15', validDays: 15, paymentTerms: '', seller: '', notes: '',
      client: { name: 'A', nit: '', city: '', address: '', phone: '', email: '' }, items: [] };
    await shareQuotePdf(q, defaultCompany());
    HTMLAnchorElement.prototype.click = orig;
    expect(names).toEqual(['COT-0001.pdf']);
  });
});
