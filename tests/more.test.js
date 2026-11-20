import { describe, it, expect } from 'vitest';
import * as more from '../src/ui/screens/more.js';

describe('pantalla Más', () => {
  it('trae productos, reportes, empresa, copia de seguridad y la compilación', () => {
    const root = more.render();
    expect(root.querySelector('[data-testid="build"]').textContent).toContain('versión de pruebas');
    for (const href of ['#/products', '#/reports', '#/company']) expect(root.querySelector(`a[href="${href}"]`)).not.toBeNull();
    expect(root.querySelector('[data-action="backup"]')).not.toBeNull();
    expect(root.querySelector('[data-action="restore"]')).not.toBeNull();
  });
});
