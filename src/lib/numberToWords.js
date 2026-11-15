const UNITS = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
  'VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS',
  'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
const TENS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const HUNDREDS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

// Palabras para un número de 1 a 999.
function below1000(n) {
  if (n === 100) return 'CIEN';
  const parts = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (rest) {
    if (rest < 30) parts.push(UNITS[rest]);
    else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      parts.push(u ? `${TENS[t]} Y ${UNITS[u]}` : TENS[t]);
    }
  }
  return parts.join(' ');
}

// Palabras para un entero entre 1 y 999.999.999.999 (sin la palabra PESOS).
function integerWords(n) {
  const billions = Math.floor(n / 1e9); // "miles de millones" se dicen como MIL MILLONES
  const millions = Math.floor((n % 1e9) / 1e6);
  const thousands = Math.floor((n % 1e6) / 1e3);
  const units = n % 1e3;
  const parts = [];

  const millionsTotal = billions * 1000 + millions;
  if (millionsTotal) {
    if (millionsTotal === 1) parts.push('UN MILLÓN');
    else {
      const th = Math.floor(millionsTotal / 1000);
      const un = millionsTotal % 1000;
      const words = [];
      if (th) words.push(th === 1 ? 'MIL' : `${below1000(th)} MIL`);
      if (un) words.push(below1000(un));
      parts.push(`${words.join(' ')} MILLONES`);
    }
  }
  if (thousands) parts.push(thousands === 1 ? 'MIL' : `${below1000(thousands)} MIL`);
  if (units) parts.push(below1000(units));
  return parts.join(' ');
}

export function numberToWords(amount) {
  if (!Number.isFinite(amount) || amount < 0 || amount > 999999999999) {
    throw new RangeError('Monto fuera de rango');
  }
  const n = Math.round(amount);
  if (n === 0) return 'CERO PESOS CON 00/100 M.L.';
  if (n === 1) return 'UN PESO CON 00/100 M.L.';
  const words = integerWords(n);
  // Si el valor termina en millones exactos se dice "DE PESOS".
  const de = n % 1e6 === 0 ? ' DE' : '';
  return `${words}${de} PESOS CON 00/100 M.L.`;
}
