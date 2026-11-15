import { describe, it, expect } from 'vitest';
import * as more from '../src/ui/screens/more.js';

describe('pantalla Más', () => {
  it('muestra la compilación y deja Empresa activa y lo demás apagado', () => {
    const root = more.render();
    expect(root.querySelector('[data-testid="build"]').textContent).toContain('versión de pruebas');
    expect(root.querySelector('a[href="#/company"]')).not.toBeNull();
    expect(root.querySelectorAll('[data-soon]')).toHaveLength(3);
  });
});
