import { describe, it, expect, beforeEach, vi } from 'vitest';
import { goBack, navigate, setGuard } from '../src/ui/nav.js';
import { openSheet, closeSheet } from '../src/ui/sheet.js';

beforeEach(() => { closeSheet(); setGuard(null); location.hash = '#/start'; });

describe('atrás', () => {
  it('desde una cotización vuelve a la lista', () => {
    expect(goBack('quote')).toBe(true);
    expect(location.hash).toBe('#/quotes');
  });
  it('desde una sección vuelve al inicio, y desde Empresa a Más', () => {
    goBack('clients'); expect(location.hash).toBe('#/home');
    goBack('company'); expect(location.hash).toBe('#/more');
  });
  it('en el inicio no navega (en Android sale de la app)', () => {
    expect(goBack('home')).toBe(false);
    expect(location.hash).toBe('#/start');
  });
  it('si hay una hoja abierta, atrás solo la cierra', () => {
    openSheet('t', [{ label: 'X', action: 'x' }]);
    expect(goBack('quote')).toBe(true);
    expect(document.querySelector('.sheet')).toBeNull();
    expect(location.hash).toBe('#/start');
  });
  it('con cambios sin guardar pide confirmación y puede cancelar', () => {
    setGuard(() => confirm('¿Descartar?'));
    vi.stubGlobal('confirm', () => false);
    expect(navigate('#/quotes')).toBe(false);
    expect(location.hash).toBe('#/start');
    vi.stubGlobal('confirm', () => true);
    expect(navigate('#/quotes')).toBe(true);
    expect(location.hash).toBe('#/quotes');
  });
});

describe('hoja de acciones', () => {
  it('se cierra al tocar fuera y al elegir una acción', () => {
    const fn = vi.fn();
    openSheet('t', [{ label: 'A', action: 'a', onClick: fn }]);
    document.querySelector('.sheet-overlay').click();
    expect(document.querySelector('.sheet')).toBeNull();
    openSheet('t', [{ label: 'A', action: 'a', onClick: fn }]);
    document.querySelector('[data-action="a"]').click();
    expect(fn).toHaveBeenCalledOnce();
    expect(document.querySelector('.sheet')).toBeNull();
  });
});
