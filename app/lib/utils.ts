type ClassDictionary = Record<string, boolean | null | undefined>;
type ClassValue = string | number | ClassDictionary | ClassValue[] | null | undefined | false;

export function cn(...inputs: ClassValue[]): string {
  const tokens: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (Array.isArray(input)) {
      const value = cn(...input);
      if (value) {
        tokens.push(value);
      }
      continue;
    }

    if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) {
          tokens.push(key);
        }
      }
      continue;
    }

    tokens.push(String(input));
  }

  return tokens.join(' ').trim();
}
