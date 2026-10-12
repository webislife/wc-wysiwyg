/**
 * Shared extension registry.
 *
 * Extensions self-register here instead of pushing directly to
 * `window._WCWYSIWYG.extensions` with ad-hoc inline expressions.
 * The editor drains the queue in its constructor, so load order
 * (extension files before/after the editor) no longer matters and
 * every extension connects consistently.
 */

export interface WYSIWYGExtension {
  connectedCallback?: (editor: unknown) => void;
  disconnectedCallback?: (editor: unknown) => void;
}

export type ExtensionCtor = new (editor: unknown) => WYSIWYGExtension;

function globalQueue(): ExtensionCtor[] {
  if (typeof window === 'undefined') return [];
  const w = window as unknown as { _WCWYSIWYG?: { extensions?: ExtensionCtor[] } };
  if (!w._WCWYSIWYG) w._WCWYSIWYG = { extensions: [] };
  if (!Array.isArray(w._WCWYSIWYG.extensions)) w._WCWYSIWYG.extensions = [];
  return w._WCWYSIWYG.extensions as ExtensionCtor[];
}

/** Called by every extension module at import time. Idempotent. */
export function registerExtension(ctor: ExtensionCtor): void {
  if (typeof ctor !== 'function') return;
  const queue = globalQueue();
  if (!queue.includes(ctor)) queue.push(ctor);
}

/** Called by the editor to take ownership of pending extensions. */
export function drainExtensions(): ExtensionCtor[] {
  const queue = globalQueue();
  if (queue.length === 0) return [];
  const taken = [...queue];
  queue.length = 0;
  return taken;
}
