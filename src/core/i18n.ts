/**
 * Locale helpers shared by the editor core and extensions.
 *
 * `navigator.language` returns BCP-47 tags like `ru-RU` / `en-US`,
 * while dictionaries are keyed by bare language (`ru` / `en`).
 * Always normalize before lookup, otherwise Russian users silently
 * fall back to English.
 */

/** `ru-RU` -> `ru`, `EN_us` -> `en`, empty -> `en`. */
export function normalizeLang(lang: unknown): string {
  if (typeof lang !== 'string' || lang.length === 0) return 'en';
  return lang.split('-')[0].split('_')[0].toLowerCase();
}

/** Resolve element language: `lang` attr -> document -> navigator -> `en`. */
export function resolveLang(el?: HTMLElement | null, fallback?: string): string {
  const raw =
    el?.lang ||
    (typeof document !== 'undefined' ? document.documentElement?.lang : '') ||
    fallback ||
    (typeof navigator !== 'undefined' ? navigator.language : 'en');
  return normalizeLang(raw);
}

export type Dict = Record<string, Record<string, string>>;

/** Build a translator bound to a dictionary with proper fallback chain. */
export function createTranslator(dict: Dict, defaultLang = 'en') {
  return (key: string, lang?: string): string => {
    const normalized = normalizeLang(lang ?? (typeof navigator !== 'undefined' ? navigator.language : defaultLang));
    return dict[normalized]?.[key] ?? dict[defaultLang]?.[key] ?? key;
  };
}
