/**
 * Short for document.createElement with enhanced typing and performance
 * @param tagName - Element tag name (supports custom elements)
 * @param params - Configuration object for element initialization
 * @returns Configured HTMLElement or custom element
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
  }: ElementParams<T> = {}
): T extends keyof HTMLElementTagNameMap 
  ? HTMLElementTagNameMap[T] 
  : HTMLElement => {
  
  if (!tagName) {
    throw new Error(`Undefined tag name: ${tagName}`);
  }

  // Create el with support custom elements
  const element = document.createElement(
    tagName, 
    options?.is ? { is: options.is } : undefined
  ) as T extends keyof HTMLElementTagNameMap 
    ? HTMLElementTagNameMap[T] 
    : HTMLElement;

  // classList: batch-add use add(...items)
  if (classList?.length) {
    element.classList.add(...classList.filter(Boolean));
  }

  //styles: safety add with type check
  if (styles) {
    for (const [prop, value] of Object.entries(styles)) {
      if (value != null && prop in element.style) {
        (element.style as any)[prop] = value;
      }
    }
  }

  // props: apply props
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key in element) {
        (element as any)[key] = value;
      }
    }
  }

  // ✅attrs: setAttribute with filter  null/undefined
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value != null) {
        element.setAttribute(key, String(value));
      }
    }
  }

  // dataset: support data-* attrs
  if (dataset) {
    for (const [key, value] of Object.entries(dataset)) {
      if (value != null) {
        element.dataset[key] = String(value);
      }
    }
  }

  // events
  if (events) {
    for (const [event, handler] of Object.entries(events)) {
      if (typeof handler === 'function') {
        element.addEventListener(event, handler as EventListener);
      }
    }
  }

  // append: support Node[] and fragments for perfomance
  if (append?.length) {
    const fragment = append.length > 3 
      ? document.createDocumentFragment() 
      : null;
    
    if (fragment) {
      fragment.append(...append.filter((n): n is Node => n != null));
      element.append(fragment);
    } else {
      element.append(...append.filter((n): n is Node => n != null));
    }
  }

  return element;
};

export interface ElementParams<T extends string> {
  classList?: Array<string | undefined | null>;
  styles?: Partial<CSSStyleDeclaration>;
  props?: Partial<T extends keyof HTMLElementTagNameMap 
    ? HTMLElementTagNameMap[T] 
    : HTMLElement>;
  attrs?: Record<string, string | number | boolean | null | undefined>;
  dataset?: Record<string, string | number | null | undefined>;
  events?: Record<string, EventListener | EventListenerObject | null>;
  options?: { is?: string };
  append?: Array<Node | null | undefined>;
}