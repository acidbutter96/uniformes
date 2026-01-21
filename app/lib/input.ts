export function sanitizeIntegerInput(value: string): string {
  return value.replace(/\D+/g, '');
}

export function sanitizeDecimalInput(value: string, decimals = 2): string {
  if (!value) return '';

  // Normalize comma to dot and keep only digits + dot.
  const normalized = value.replace(/,/g, '.').replace(/[^0-9.]/g, '');

  const [rawInteger = '', ...rest] = normalized.split('.');
  const integerPart = rawInteger;

  if (rest.length === 0) {
    return integerPart;
  }

  const fractionRaw = rest.join('');
  const fractionPart = fractionRaw.slice(0, Math.max(0, decimals));

  return `${integerPart}.${fractionPart}`;
}
