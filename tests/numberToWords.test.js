import { describe, it, expect } from 'vitest';
import { numberToWords } from '../src/lib/numberToWords.js';

describe('numberToWords', () => {
  it('total real de la factura de referencia', () => {
    expect(numberToWords(864443)).toBe(
      'OCHOCIENTOS SESENTA Y CUATRO MIL CUATROCIENTOS CUARENTA Y TRES PESOS CON 00/100 M.L.',
    );
  });
  it('casos especiales', () => {
    expect(numberToWords(0)).toBe('CERO PESOS CON 00/100 M.L.');
    expect(numberToWords(1)).toBe('UN PESO CON 00/100 M.L.');
    expect(numberToWords(21)).toBe('VEINTIÚN PESOS CON 00/100 M.L.');
    expect(numberToWords(100)).toBe('CIEN PESOS CON 00/100 M.L.');
    expect(numberToWords(1000)).toBe('MIL PESOS CON 00/100 M.L.');
    expect(numberToWords(1000000)).toBe('UN MILLÓN DE PESOS CON 00/100 M.L.');
    expect(numberToWords(2500000)).toBe('DOS MILLONES QUINIENTOS MIL PESOS CON 00/100 M.L.');
  });
  it('rechaza negativos y no finitos', () => {
    expect(() => numberToWords(-5)).toThrow(RangeError);
    expect(() => numberToWords(NaN)).toThrow(RangeError);
  });
});
