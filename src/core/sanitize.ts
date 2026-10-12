/**
 * Minimal allowlist-based HTML sanitizer (no dependencies).
 *
 * Why it exists: the editor assigns user-controlled strings to `innerHTML`
 * (initial `<textarea>` value, `localStorage` restore, live preview).
 * Without sanitizing, `<img onerror=...>`, `<a href="javascript:...">`,
 * `<script>/<iframe>/<object>/<embed>` execute in the host page — stored XSS.
 *
 * Strategy:
 * - parse via `DOMParser` (scripts don't execute on parse),
 * - remove blocked elements entirely,
 * - drop elements whose tag is not allowlisted (unwrap, keep children),
 * - strip `on*` handlers, `style` with `javascript:`/`expression(`,
 *   and URL attributes with dangerous protocols,
 * - live editing (`contentEditable`) is NOT rewritten on every keystroke
 *   (would lose caret); instead callers sanitize the *output copy*
 *   stored to `value` / `localStorage` / preview element.
 */

const BLOCK_TAGS = new Set(['script', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form']);

const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'poster', 'cite', 'action']);

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'data:']);

function isSafeUrl(value: string, tag: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') return true;
  if (trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.startsWith('?')) return true;
  // protocol-relative
  if (trimmed.startsWith('//')) return true;
  try {
    const url = new URL(trimmed, 'https://sanitizer.local/');
    if (url.protocol === 'data:') {
      // only allow images/audio/video/fonts, never text/html
      return /^(image|audio|video|font)\//.test(url.pathname) || /^data:image\//.test(trimmed);
    }
    return SAFE_PROTOCOLS.has(url.protocol);
  } catch {
    // relative URL without scheme (e.g. `page.html`, `img.png`)
    return !/^\s*\w+\s*:/.test(trimmed);
  }
}

function cleanAttributes(element: Element): void {
  for (const attr of Array.from(element.attributes)) {
    const name = attr.name.toLowerCase();
    const value = attr.value;
    // event handlers: onclick, onerror, ...
    if (name.startsWith('on')) {
      element.removeAttribute(attr.name);
      continue;
    }
    if (URL_ATTRS.has(name) && !isSafeUrl(value, element.tagName)) {
      element.removeAttribute(attr.name);
      continue;
    }
    if (name === 'style' && /javascript\s*:|expression\s*\(|vbscript\s*:/i.test(value)) {
      element.removeAttribute(attr.name);
      continue;
    }
    if (name === 'srcdoc') {
      element.removeAttribute(attr.name);
    }
  }
}

export interface SanitizeOptions {
  /** Extra tags to strip even if allowlisted (maps to `filtertags` attr). */
  blockTags?: string[];
  /** Tags allowed to remain as elements; everything else is unwrapped. Null = keep structure, strip only danger. */
  allowTags?: string[] | null;
}

/**
 * Sanitize an HTML string and return a safe HTML string.
 * Never throws — on parser failure returns `''`.
 */
export function sanitizeHTML(dirty: string, options: SanitizeOptions = {}): string {
  if (typeof dirty !== 'string' || dirty === '') return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${dirty}</div>`, 'text/html');
    const root = doc.body.firstElementChild;
    if (!root) return '';

    const blocked = new Set<string>([...BLOCK_TAGS]);
    for (const tag of options.blockTags ?? []) {
      const normalized = tag.trim().toLowerCase();
      if (normalized) blocked.add(normalized);
    }
    const allow = options.allowTags ? new Set(options.allowTags.map((tag) => tag.trim().toLowerCase())) : null;

    const walk = (node: Element): void => {
      for (const child of Array.from(node.children)) walk(child);
      const tag = node.tagName.toLowerCase();
      if (blocked.has(tag)) {
        node.remove();
        return;
      }
      if (allow && !allow.has(tag)) {
        // unwrap: keep text/children, drop the element itself
        node.replaceWith(...Array.from(node.childNodes));
        return;
      }
      cleanAttributes(node);
    };

    walk(root);
    return root.innerHTML;
  } catch {
    return '';
  }
}

/** Parse `filtertags`-style comma list into a clean lowercased array. */
export function parseTagList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}
