/**
 * `document.createElement` shorthand with batched init.
 *
 * Notes:
 * - `props` are assigned unconditionally (old version silently dropped
 *   unknown keys via `key in element`, which broke e.g. `value` on some
 *   elements and custom-element fields). A `style` *string* in `props`
 *   is applied via `cssText` so callers can pass preset styles.
 * - Prefer the `events` map (`{ click: fn }`) over `on*` props:
 *   `addEventListener('click', …)` keeps native keyboard activation
 *   (Enter/Space) while `onpointerup` breaks keyboard/screen readers.
 * - This helper does NOT sanitize strings — callers must sanitize any
 *   user-controlled HTML before passing `innerHTML`.
 */
export const el = <T extends keyof HTMLElementTagNameMap | string>(
  tagName: T,
  {
    classList,
    styles,
    props,
    attrs,
    dataset,
    events,
    options,
    append,
  }: ElementParams<T> = {},
): T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : HTMLElement => {
  if (!tagName || typeof tagName !== 'string') {
    throw new Error(`Undefined tag name: ${String(tagName)}`);
  }

  const element = document.createElement(
    tagName,
    options?.is ? { is: options.is } : undefined,
  ) as T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : HTMLElement;

  if (classList?.length) {
    const names = classList.filter((name): name is string => typeof name === 'string' && name !== '');
    if (names.length > 0) element.classList.add(...names);
  }

  if (styles) {
    for (const [prop, value] of Object.entries(styles)) {
      if (value != null && value !== '') {
        try {
          (element.style as unknown as Record<string, unknown>)[prop] = value;
        } catch {
          /* ignore invalid style props */
        }
      }
    }
  }

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined) continue;
      try {
        if (key === 'style' && typeof value === 'string') {
          (element as HTMLElement).style.cssText = value;
        } else {
          (element as unknown as Record<string, unknown>)[key] = value;
        }
      } catch {
        /* ignore read-only props */
      }
    }
  }

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      try {
        element.setAttribute(key, value === true ? '' : String(value));
      } catch {
        /* ignore invalid attribute names */
      }
    }
  }

  if (dataset) {
    for (const [key, value] of Object.entries(dataset)) {
      if (value !== null && value !== undefined) {
        try {
          element.dataset[key] = String(value);
        } catch {
          /* ignore */
        }
      }
    }
  }

  if (events) {
    for (const [event, handler] of Object.entries(events)) {
      if (typeof handler === 'function') {
        element.addEventListener(event, handler as EventListener);
      } else if (handler && typeof (handler as EventListenerObject).handleEvent === 'function') {
        element.addEventListener(event, handler as EventListenerObject);
      }
    }
  }

  if (append?.length) {
    const nodes = append.filter((n): n is Node => n instanceof Node);
    if (nodes.length > 0) {
      if (nodes.length > 3) {
        const fragment = document.createDocumentFragment();
        fragment.append(...nodes);
        element.append(fragment);
      } else {
        element.append(...nodes);
      }
    }
  }

  return element;
};

export interface ElementParams<T extends string> {
  classList?: Array<string | undefined | null | false>;
  styles?: Partial<CSSStyleDeclaration>;
  props?: Record<string, unknown> &
    Partial<T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : HTMLElement>;
  attrs?: Record<string, string | number | boolean | null | undefined>;
  dataset?: Record<string, string | number | null | undefined>;
  events?: Record<string, EventListener | EventListenerObject | null | undefined>;
  options?: { is?: string };
  append?: Array<Node | null | undefined>;
}
