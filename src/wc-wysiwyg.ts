import { t } from './core/translates.js';
import { el } from './core/el.js';
import { createTranslator, resolveLang } from './core/i18n.js';
import { sanitizeHTML, parseTagList } from './core/sanitize.js';
import { safeStorageGet, safeStorageSet } from './core/storage.js';
import { safeJsonParse } from './core/storage.js';
import { drainExtensions } from './core/extensions.js';
import type { ExtensionCtor } from './core/extensions.js';

import './sass/wc-wysiwyg.scss';
import './sass/content.scss';

interface Extension {
  connectedCallback?(editor: WCWYSIWYG): void;
  disconnectedCallback?(editor: WCWYSIWYG): void;
  [key: string]: unknown;
}

/** Bound translator: normalizes `ru-RU` -> `ru`, falls back to `en`, then to the key itself. */
const _t = (() => {
  const translate = createTranslator(t as unknown as Record<string, Record<string, string>>);
  return (key: string, lang?: string): string => translate(key, lang ?? resolveLang());
})();

// All semantic HTML5 tags known to the editor
const allTags = [
  { tag: 'h1' },
  { tag: 'h2' },
  { tag: 'h3' },
  { tag: 'h4' },
  { tag: 'h5' },
  { tag: 'h6' },
  { tag: 'span' },
  { tag: 'mark' },
  { tag: 'small' },
  { tag: 'dfn' },
  { tag: 'a' },
  { tag: 'q' },
  { tag: 'b' },
  { tag: 'i' },
  { tag: 'u' },
  { tag: 's' },
  { tag: 'sup' },
  { tag: 'sub' },
  { tag: 'kbd' },
  { tag: 'abbr' },
  { tag: 'strong' },
  { tag: 'code' },
  { tag: 'samp' },
  { tag: 'del' },
  { tag: 'ins' },
  { tag: 'var' },
  { tag: 'ul' },
  { tag: 'ol' },
  { tag: 'pre' },
  { tag: 'time' },
  { tag: 'img' },
  { tag: 'audio' },
  { tag: 'video' },
  { tag: 'blockquote' },
  { tag: 'details' },
] as WCWYSIWYGTag[];

export interface ScopedSelection {
  selection: Selection | null;
  element: HTMLElement | null;
  text: string | null;
  node: Node | null;
}

/**
 * `wc-wysiwyg` — lightweight contentEditable WYSIWYG custom element.
 *
 * NOTE: intentionally **no Shadow DOM**. Host-page CSS can still cascade into
 * the editor, while built-in content styles are scoped to `.wc-wysiwyg_content`
 * so they do not affect matching elements elsewhere on the page.
 */
class WCWYSIWYG extends HTMLElement {
  /** Tags included in the action bar. */
  public EditorTags: WCWYSIWYGTag[] = [];
  /** Custom tags included in the action bar. */
  public EditorCustomTags: WCWYSIWYGTag[] = [];
  /** Main contentEditable element. */
  public EditorNode: HTMLElement | null = null;
  /** Editor actions block with EditorTags buttons. */
  public EditorActionsSection: HTMLElement | null = null;
  /** Custom web-components buttons <fieldset>. */
  public EditorCustomTagsForm?: HTMLElement;
  // Inline edits
  public EditorInlineActions: WCWYSIWYGTag[] = [];
  // Editor props
  public EditorPropertyForm?: HTMLElement;
  // Clear btn
  public EditorClearFormatBtn: HTMLButtonElement | null = null;
  // Autocomplete area
  public EditorAutoCompleteForm?: HTMLElement;
  // Bottom actions
  public EditorBottomForm?: HTMLElement;
  public EditorBottomFormNewP?: HTMLElement;
  public EditorBottomFormViewToggle?: HTMLElement;

  public EditorPreviewText: HTMLTextAreaElement | null = null;
  public EditorTagsMethods: WCWYSIWYGActions | null = null;
  public EditorAllowTags: string[] = [];
  public EditorFullScreenButton?: HTMLElement;
  public lang = 'ru';
  public value = '';

  static observedAttributes = ['value'];

  #EditProps: Record<string, string[]> | false = false;
  #Autocomplete = false;
  #ExtensionInstances: Extension[] = [];
  #PendingExtensionCtors: ExtensionCtor[] = [];
  #StorageKey: string | null = null;
  #HideBottomActions = false;
  #Connected = false;

  #onFullscreenChange = (): void => {
    this.classList.toggle('-fullscreen', document.fullscreenElement !== null);
  };

  #onRootSelectionChange = (): void => {
    const editorSelection = this.getSelection();
    if (editorSelection.selection !== null && !editorSelection.selection.isCollapsed) {
      if (this.EditorPropertyForm) {
        this.EditorPropertyForm.style.display = 'none';
      }
    }
  };

  constructor() {
    super();
    // Drain synchronously-registered extensions (import order independent).
    this.#PendingExtensionCtors = drainExtensions();
  }
  
  // ------------------------------------------------------------------ setup
  
  connectedCallback(): void {
    if (this.#Connected) return;
    this.classList.add('wc-wysiwyg');

    this.#loadAsyncExtensions();
    this.#initTextarea();
    this.#initConfig();
    this.#buildToolbar();
    this.#buildPropertyForm();
    this.#buildAutocompleteForm();
    this.#buildCustomTags();
    this.#buildEditorNode();
    this.#buildBottomBar();
    this.#restoreInitialContent();
    this.#connectExtensions();

    document.addEventListener('fullscreenchange', this.#onFullscreenChange);
    this.EditorNode?.addEventListener('keyup', this.#onRootSelectionChange);

    this.updateContent();
    this.#Connected = true;
  }

  disconnectedCallback(): void {
    document.removeEventListener('fullscreenchange', this.#onFullscreenChange);
    this.EditorNode?.removeEventListener('keyup', this.#onRootSelectionChange);
    for (const extension of this.#ExtensionInstances) {
      try {
        extension.disconnectedCallback?.(this);
      } catch {
        /* extension teardown must never break the host page */
      }
    }
    this.#ExtensionInstances = [];
    this.#Connected = false;
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name !== 'value' || !this.#Connected || oldValue === newValue) return;
    const clean = this.#sanitizedOutput(newValue ?? '');
    this.value = clean;
    if (this.EditorPreviewText && this.EditorPreviewText.value !== clean) {
      this.EditorPreviewText.value = clean;
    }
    if (this.EditorNode && this.EditorNode.innerHTML !== clean) {
      this.EditorNode.innerHTML = clean;
    }
    this.checkValidity();
  }

  // ------------------------------------------------------------ init steps

  #loadAsyncExtensions(): void {
    const asyncExtensions = this.getAttribute('data-async-extensions');
    if (!asyncExtensions) return;
    for (const extensionPath of asyncExtensions.split(',')) {
      const path = extensionPath.trim();
      if (!path) continue;
      import(/* @vite-ignore */ path)
        .then((esm: { default?: new (editor: WCWYSIWYG) => Extension }) => {
          if (typeof esm?.default !== 'function') return;
          try {
            const instance = new esm.default(this);
            this.#ExtensionInstances.push(instance);
            instance.connectedCallback?.(this);
          } catch {
            /* broken async extension must not break the editor */
          }
        })
        .catch(() => {
          /* failed import must not break the editor */
        });
    }
  }

  /** Find the bound `<textarea>`; create one if the author omitted it. */
  #initTextarea(): void {
    let textarea = this.querySelector('textarea');
    if (!(textarea instanceof HTMLTextAreaElement)) {
      textarea = el('textarea', { styles: { display: 'none' } });
      this.prepend(textarea);
    }
    this.EditorPreviewText = textarea;
    this.EditorPreviewText.classList.add('wc-wysiwyg_pr', '-display-none');
    this.EditorPreviewText.addEventListener('input', (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLTextAreaElement) || !this.EditorNode) return;
      this.EditorNode.innerHTML = this.#sanitizedOutput(target.value);
      this.value = this.EditorNode.innerHTML;
    });
  }

  #initConfig(): void {
    const allowTags = this.getAttribute('data-allow-tags') || allTags.map((tag) => tag.tag).join(',');
    this.EditorAllowTags = allowTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    this.EditorTags = allTags.filter((tag) => this.EditorAllowTags.includes(tag.tag));

    this.#EditProps = safeJsonParse<Record<string, string[]> | false>(
      this.getAttribute('data-edit-props'),
      false,
    );
    if (this.#EditProps !== false && (typeof this.#EditProps !== 'object' || this.#EditProps === null)) {
      this.#EditProps = false;
    }
    this.#Autocomplete = this.getAttribute('data-autocomplete') === '1';
    this.#HideBottomActions = this.getAttribute('data-hide-bottom-actions') === '1';

    // Allow inline actions for everything except media (no meaningful text wrap).
    this.EditorInlineActions = this.EditorTags.filter((action) => !['video', 'audio', 'img'].includes(action.tag));
  }

  #buildToolbar(): void {
    this.EditorClearFormatBtn = el('button', {
      classList: ['wc-wysiwyg_btn', '-clear'],
      attrs: { 'data-hint': _t('clearFormat'), 'aria-label': _t('clearFormat'), type: 'button' },
      props: { type: 'button', textContent: 'Ⱦ' },
      styles: { display: 'none' },
      events: { click: (event: Event) => event.stopPropagation() },
    });
    this.EditorActionsSection = el('section', { classList: ['wc-wysiwyg_ec'] });
    this.#makeActionButtons(this.EditorActionsSection, this.EditorTags);
    this.EditorActionsSection.append(this.EditorClearFormatBtn);
  }

  #buildPropertyForm(): void {
    if (!this.#EditProps || !this.EditorActionsSection) return;
    this.EditorPropertyForm = el('form', {
      styles: { display: 'none' },
      classList: ['wc-wysiwyg_pf'],
      events: {
        submit: (event: Event) => {
          event.preventDefault();
          if (this.EditorPropertyForm) this.EditorPropertyForm.style.display = 'none';
        },
        click: (event: Event) => event.stopPropagation(),
      },
    });
    this.EditorActionsSection.append(this.EditorPropertyForm);
  }

  #buildAutocompleteForm(): void {
    if (!this.#Autocomplete) return;
    this.EditorAutoCompleteForm = el('form', {
      classList: ['wc-wysiwyg_au'],
      events: {
        submit: (submitEvent: Event) => {
          submitEvent.preventDefault();
          submitEvent.stopPropagation();
          const submitter = (submitEvent as SubmitEvent).submitter;
          const tagName =
            submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement
              ? submitter.value
              : '';
          if (!/^[a-z][a-z0-9-]*$/i.test(tagName)) return;
          const newEl = el(tagName, { props: { textContent: tagName } });
          const form = submitEvent.target;
          if (form instanceof HTMLElement) form.replaceWith(newEl);
          newEl.focus();
        },
      },
    });
  }

  #buildCustomTags(): void {
    const raw = this.getAttribute('data-custom-tags');
    if (raw === null || !this.EditorActionsSection) return;
    const customTags = safeJsonParse<WCWYSIWYGTag[] | null>(raw, null);
    if (!Array.isArray(customTags)) return;
    this.EditorCustomTags = customTags.filter(
      (tag): tag is WCWYSIWYGTag => typeof tag?.tag === 'string' && tag.tag !== '',
    );
    if (this.EditorCustomTags.length === 0) return;
    this.EditorCustomTagsForm = el('fieldset', { classList: ['wc-wysiwyg_ce'] });
    this.#makeActionButtons(this.EditorCustomTagsForm, this.EditorCustomTags);
    this.EditorActionsSection.prepend(this.EditorCustomTagsForm);
  }

  #buildEditorNode(): void {
    if (!this.EditorActionsSection) return;
    this.EditorBottomForm = el('fieldset', { classList: ['wc-wysiwyg_bt'] });

    this.EditorNode = el('article', {
      classList: ['wc-wysiwyg_content', this.getAttribute('data-content-class') || ''],
      props: { contentEditable: 'true' },
      events: {
        pointerup: (event: Event) => this.#onEditorInteract(event),
        keyup: (event: Event) => this.#onEditorInteract(event),
        input: () => {
          this.updateContent();
          if (this.#Autocomplete) this.#checkAutoComplete();
        },
        keydown: (event: Event) => this.#checkKeyBindings(event as KeyboardEvent),
        paste: (event: Event) => this.#handlePaste(event as ClipboardEvent),
      },
    });

    this.append(this.EditorActionsSection, this.EditorNode);
  }

  #onEditorInteract(event: Event): void {
    this.#checkCanClearElement(event);
    if (this.#EditProps) this.#checkEditProps(event);
  }

  #buildBottomBar(): void {
    if (this.#HideBottomActions || !this.EditorBottomForm) return;

    this.EditorBottomFormViewToggle = el('button', {
      classList: ['wc-wysiwyg_btn'],
      attrs: { 'data-hint': _t('toggleViewMode'), 'aria-label': _t('toggleViewMode'), 'data-mode': 'html5' },
      props: { type: 'button', textContent: _t('viewModeLabel') },
      events: {
        click: () => {
          const toggle = this.EditorBottomFormViewToggle;
          const node = this.EditorNode;
          const preview = this.EditorPreviewText;
          if (!toggle || !node || !preview) return;
          const newMode = toggle.getAttribute('data-mode') === 'html5' ? 'text' : 'html5';
          toggle.setAttribute('data-mode', newMode);
          node.style.display = newMode === 'html5' ? '' : 'none';
          preview.classList.toggle('-display-none', newMode === 'html5');
          if (newMode === 'text') preview.value = node.innerHTML;
        },
      },
    });
    this.EditorBottomFormNewP = el('button', {
      classList: ['wc-wysiwyg_btn'],
      attrs: { 'data-hint': _t('addNewParagraph'), 'aria-label': _t('addNewParagraph') },
      props: { type: 'button', textContent: '+ ❡' },
      events: {
        click: () => {
          if (!this.EditorNode) return;
          const p = el('p', { props: { textContent: '/' } });
          this.EditorNode.appendChild(p);
          p.focus();
        },
      },
    });
    this.EditorFullScreenButton = el('button', {
      classList: ['wc-wysiwyg_btn'],
      attrs: { 'data-hint': _t('fullScreen'), 'aria-label': _t('fullScreen') },
      props: { type: 'button', textContent: '🖥️' },
      events: {
        click: () => {
          this.requestFullscreen?.()?.catch?.(() => {
            /* fullscreen denied — not fatal */
          });
        },
      },
    });

    this.EditorBottomForm.append(
      this.EditorBottomFormNewP,
      this.EditorBottomFormViewToggle,
      this.EditorFullScreenButton,
    );
    this.append(this.EditorBottomForm);
  }

  #restoreInitialContent(): void {
    if (!this.EditorNode || !this.EditorPreviewText) return;
    this.EditorNode.innerHTML = this.#sanitizedOutput(this.EditorPreviewText.value);
    this.#StorageKey = this.getAttribute('data-storage');
    if (this.#StorageKey) {
      const stored = safeStorageGet(this.#StorageKey);
      if (stored) this.EditorNode.innerHTML = this.#sanitizedOutput(stored);
    }
  }

  #connectExtensions(): void {
    for (const Ctor of this.#PendingExtensionCtors) {
      try {
        this.#ExtensionInstances.push(new Ctor(this) as Extension);
      } catch {
        /* broken extension must not break the editor */
      }
    }
    this.#PendingExtensionCtors = [];
    for (const extension of this.#ExtensionInstances) {
      try {
        extension.connectedCallback?.(this);
      } catch {
        /* ignore */
      }
    }
  }

  // ------------------------------------------------------------- public API

  /** Sync editor HTML -> `value`, textarea, preview, storage; emits `input`. */
  updateContent(): void {
    if (!this.EditorNode || !this.EditorPreviewText) return;
    const clean = this.#sanitizedOutput(this.EditorNode.innerHTML);
    this.value = clean;
    if (this.EditorPreviewText.value !== clean) this.EditorPreviewText.value = clean;
    this.checkValidity();
    // NOTE: historically emitted `oninput`, which no framework listens to.
    this.dispatchEvent(new Event('input', { bubbles: true, cancelable: false }));
    this.updatePreviewEl(this.getAttribute('data-preview-el'));
    if (this.#StorageKey) safeStorageSet(this.#StorageKey, clean);
  }

  /** Update live preview element with sanitized HTML. */
  updatePreviewEl(selector: string | null): void {
    if (!selector) return;
    let previewEl: Element | null = null;
    try {
      previewEl = window.document.querySelector(selector);
    } catch {
      return;
    }
    if (previewEl) previewEl.innerHTML = this.#sanitizedOutput(this.value);
  }

  /** Validate content; renders messages with `textContent` (no HTML injection). */
  checkValidity(): boolean {
    if (!this.EditorNode) return false;
    let hasErrors = false;
    const errors: string[] = [];
    const textLength = (this.EditorNode.textContent ?? '').length;

    if (this.getAttribute('required') !== null && textLength === 0) {
      hasErrors = true;
      errors.push(_t('required'));
    }
    const minlength = Number(this.getAttribute('minlength'));
    if (Number.isFinite(minlength) && minlength > 0 && textLength < minlength) {
      hasErrors = true;
      errors.push(`${_t('minlength')} ${this.getAttribute('minlength')}`);
    }
    const maxlength = Number(this.getAttribute('maxlength'));
    if (Number.isFinite(maxlength) && maxlength > 0 && textLength > maxlength) {
      hasErrors = true;
      errors.push(`${_t('maxlength')} ${this.getAttribute('maxlength')}`);
    }
    const blocked = parseTagList(this.getAttribute('filtertags'));
    for (const checkTag of blocked) {
      let found = false;
      try {
        found = this.EditorNode.querySelector(checkTag) !== null;
      } catch {
        found = false;
      }
      if (found) {
        hasErrors = true;
        errors.push(`${_t('filtertags')} ${checkTag}`);
        break;
      }
    }

    this.EditorNode.classList.toggle('-invalid', hasErrors);
    this.querySelector('.-errors')?.remove();
    if (hasErrors) {
      const errorsEl = el('p', { classList: ['-errors'] });
      errors.forEach((message, index) => {
        if (index > 0) errorsEl.append(document.createElement('br'));
        errorsEl.append(document.createTextNode(message));
      });
      this.append(errorsEl);
    }
    return !hasErrors;
  }

  /**
   * Scoped selection: returns the global selection ONLY when its anchor is
   * inside this editor; otherwise `selection` is `null` so callers don't act
   * on foreign selections or crash on `anchorNode === null`.
   */
  getSelection(): ScopedSelection {
    const empty: ScopedSelection = { selection: null, element: null, text: null, node: null };
    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.anchorNode === null) return empty;
    if (this.EditorNode && !this.EditorNode.contains(windowSelection.anchorNode)) return empty;
    const anchor = windowSelection.anchorNode;
    return {
      selection: windowSelection,
      node: anchor,
      element:
        anchor instanceof HTMLElement
          ? anchor
          : anchor.parentElement instanceof HTMLElement
            ? anchor.parentElement
            : null,
      text: windowSelection.toString().length > 0 ? windowSelection.toString() : null,
    };
  }

  // ---------------------------------------------------------------- helpers

  #sanitizedOutput(html: string): string {
    return sanitizeHTML(html, { blockTags: parseTagList(this.getAttribute('filtertags')) });
  }

  /** Wrap current selection; falls back when `surroundContents` throws (partial node selection). */
  #wrapInTag(tagNode: HTMLElement, placeholder: string): boolean {
    const { selection } = this.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    try {
      const range = selection.getRangeAt(0).cloneRange();
      if (range.collapsed) {
        tagNode.textContent = placeholder;
        range.insertNode(tagNode);
      } else {
        try {
          range.surroundContents(tagNode);
        } catch {
          // Selection spans partial nodes — move contents manually.
          tagNode.appendChild(range.extractContents());
          range.insertNode(tagNode);
        }
        if (tagNode.textContent === '') tagNode.textContent = placeholder;
      }
      selection.removeAllRanges();
      const after = document.createRange();
      after.selectNodeContents(tagNode);
      selection.addRange(after);
      return true;
    } catch {
      return false;
    }
  }

  #checkAutoComplete(): void {
    const editorSelection = this.getSelection();
    const form = this.EditorAutoCompleteForm;
    if (editorSelection.selection === null || editorSelection.selection.anchorNode === null || !form) return;
    const parent = editorSelection.selection.anchorNode.parentElement;
    if (
      parent === null ||
      editorSelection.text !== null ||
      parent.nodeName !== 'P' ||
      parent.parentElement !== this.EditorNode
    ) {
      return;
    }
    if (!parent.textContent?.startsWith('/')) return;
    const parsedTagName = parent.textContent.replace('/', '');
    const filteredActions = this.EditorTags.filter((action) =>
      action.tag.toLowerCase().startsWith(parsedTagName.toLowerCase()),
    );
    if (filteredActions.length === 0) {
      form.innerHTML = '';
      form.remove();
      return;
    }
    form.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (const action of filteredActions) {
      fragment.appendChild(
        el('button', {
          classList: ['wc-wysiwyg_btn', `-${action.tag}`],
          attrs: { 'data-hint': _t(action.tag), 'aria-label': _t(action.tag) },
          props: { type: 'submit', textContent: action.tag, value: action.tag },
        }),
      );
    }
    form.append(fragment);
    parent.appendChild(form);
  }

  #checkCanClearElement(event: Event): void {
    const eventTarget = event.target;
    const clearBtn = this.EditorClearFormatBtn;
    if (!(eventTarget instanceof HTMLElement) || !clearBtn || eventTarget === this.EditorNode) return;
    if (eventTarget.nodeName !== 'P' && eventTarget.nodeName !== 'SPAN') {
      clearBtn.style.display = 'inline-block';
      clearBtn.textContent = `Ⱦ ${eventTarget.nodeName}`;
      clearBtn.onclick = (clickEvent: MouseEvent) => {
        clickEvent.stopPropagation();
        eventTarget.replaceWith(document.createTextNode(eventTarget.textContent ?? ''));
        this.updateContent();
      };
    } else {
      clearBtn.style.display = 'none';
      clearBtn.onclick = null;
    }
  }

  #checkEditProps(event: Event): void {
    const eventTarget = event.target;
    if (!(eventTarget instanceof HTMLElement) || !this.#EditProps) return;
    const nodeName = eventTarget.nodeName;
    const props = this.#EditProps[nodeName];
    if (!props) return;
    event.stopPropagation();
    this.dispatchEvent(new CustomEvent('editprops', { detail: { eventTarget } }));
    const form = this.EditorPropertyForm;
    if (!form) return;
    form.style.display = 'block';
    form.setAttribute('data-tag', nodeName);
    form.innerHTML = '';
    for (const tagProp of props) {
      const isAttr = tagProp.includes('data-') || tagProp === 'class';
      const current = isAttr
        ? (eventTarget.getAttribute(tagProp) ?? '')
        : String((eventTarget as unknown as Record<string, unknown>)[tagProp] ?? '');
      form.append(
        el('label', {
          props: { textContent: `${tagProp}=` },
          append: [
            el('input', {
              attrs: { placeholder: tagProp },
              classList: ['wc-wysiwyg_inp'],
              props: {
                value: current,
              },
              events: {
                input: (eventInput: Event) => {
                  const input = eventInput.target;
                  if (!(input instanceof HTMLInputElement)) return;
                  if (tagProp === 'class') {
                    eventTarget.className = input.value;
                  } else if (isAttr || tagProp === 'datetime') {
                    eventTarget.setAttribute(tagProp, input.value);
                  } else {
                    (eventTarget as unknown as Record<string, unknown>)[tagProp] = input.value;
                  }
                  this.updateContent();
                },
              },
            }),
          ],
        }),
      );
    }
    form.append(
      el('button', {
        classList: ['wc-wysiwyg_btn'],
        props: { type: 'submit', textContent: '↵' },
        attrs: { 'aria-label': _t('close') },
      }),
    );
  }

  #checkKeyBindings(event: KeyboardEvent): void {
    if (event.altKey && event.code === 'Space') {
      const { selection } = this.getSelection();
      if (selection && selection.type === 'Caret') {
        const span = el('span');
        selection.anchorNode?.parentElement?.insertAdjacentElement('afterend', span);
        const textNode = document.createTextNode(' ');
        span.replaceWith(textNode);
        const range = document.createRange();
        range.selectNodeContents(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        event.preventDefault();
      }
    }
    // Enter without Shift inserts a plain <p> (predictable newline in custom blocks).
    if (event.code === 'Enter' && event.shiftKey === false) {
      const { selection } = this.getSelection();
      const parentTag = selection?.anchorNode?.parentElement?.tagName;
      if (!selection || (parentTag && ['LI', 'ARTICLE', 'P'].includes(parentTag))) return;
      const p = el('p', { props: { innerHTML: '&nbsp;' } });
      selection.anchorNode?.parentElement?.insertAdjacentElement('afterend', p);
      const range = document.createRange();
      range.selectNodeContents(p);
      selection.removeAllRanges();
      selection.addRange(range);
      event.stopPropagation();
      event.preventDefault();
    }
    if (event.key === 'Escape' && this.EditorPropertyForm) {
      this.EditorPropertyForm.style.display = 'none';
    }
  }

  /** Paste as sanitized HTML (fallback: plain text) so clipboard content can't inject scripts. */
  #handlePaste(event: ClipboardEvent): void {
    const data = event.clipboardData;
    if (!data) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      const html = data.getData('text/html');
      const text = data.getData('text/plain');
      if (html) {
        const clean = this.#sanitizedOutput(html);
        if (clean && document.queryCommandSupported?.('insertHTML')) {
          document.execCommand('insertHTML', false, clean);
        } else if (text) {
          document.execCommand('insertText', false, text);
        }
      } else if (text) {
        document.execCommand('insertText', false, text);
      }
    } catch {
      /* clipboard failures must not break editing */
    }
    this.updateContent();
  }

  #makeActionButtons(toEl: HTMLElement, actions: WCWYSIWYGTag[]): void {
    const fragment = document.createDocumentFragment();
    for (const action of actions) {
      fragment.appendChild(
        el('button', {
          classList: ['wc-wysiwyg_btn', `-${action.tag}`],
          props: { type: 'button', tabIndex: 0, textContent: action.is ? `${action.tag} is=${action.is}` : action.tag },
          attrs: { 'data-hint': action.hint ?? _t(action.tag), 'aria-label': action.hint ?? _t(action.tag) },
          events: {
            click: (event: Event) => {
              event.stopPropagation();
              this.#tag(action);
            },
          },
        }),
      );
    }
    toEl.appendChild(fragment);
  }

  #tag = (tag: WCWYSIWYGTag): void => {
    switch (tag.tag) {
      case 'audio':
        this.#Media('audio');
        break;
      case 'video':
        this.#Media('video');
        break;
      case 'details':
        this.#Details();
        break;
      case 'img':
        this.#Image();
        break;
      default:
        if (typeof tag.method === 'function') {
          (tag.method as (this: WCWYSIWYG, tag: WCWYSIWYGTag) => void).call(this, tag);
        } else {
          this.#wrapTag(tag, tag.is);
        }
        break;
    }
  };

  /** `prompt()` returns `null` on Cancel — treat as abort, never as content. */
  #askUser(text: string, placeholder = ''): string | null {
    const answer = window.prompt(text, placeholder);
    if (answer === null) return null;
    const trimmed = answer.trim();
    return trimmed === '' ? null : trimmed;
  }

  #isSafeMediaUrl(url: string): boolean {
    try {
      const parsed = new URL(url, window.location.href);
      return ['http:', 'https:', 'blob:', 'data:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  #Details(): void {
    const summaryTitle = this.#askUser('Title', '');
    if (summaryTitle === null || !this.EditorNode) return;
    this.EditorNode.append(
      el('details', {
        append: [el('summary', { props: { textContent: summaryTitle } }), el('p', { props: { textContent: '…' } })],
      }),
    );
    this.updateContent();
  }

  #wrapTag = (tag: WCWYSIWYGTag, is: string | false = false): void => {
    const listTag = tag.tag === 'ul' || tag.tag === 'ol' ? tag.tag : false;
    const newTag = listTag !== false ? 'li' : tag.tag;
    const tagNode = el(newTag, is ? { options: { is } } : {});
    if (listTag !== false) {
      const list = el(listTag);
      list.append(tagNode);
      this.EditorNode?.append(list);
      this.updateContent();
      return;
    }
    if (this.#wrapInTag(tagNode, tag.tag)) {
      this.updateContent();
      this.#checkEditProps({ target: tagNode, stopPropagation: () => false } as unknown as Event);
    }
  };

  #Media = (tagName: string): void => {
    const mediaSrc = this.#askUser('src', '');
    if (mediaSrc === null || !this.#isSafeMediaUrl(mediaSrc) || !this.EditorNode) return;
    this.EditorNode.append(el(tagName, { attrs: { controls: true, src: mediaSrc } }));
    this.updateContent();
  };

  #Image = (): void => {
    const src = this.#askUser('IMG URL');
    if (src === null || !this.#isSafeMediaUrl(src) || !this.EditorNode) return;
    const caption = this.#askUser('IMG caption');
    const img = new Image();
    img.src = src;
    img.alt = caption ?? src;
    if (caption !== null) {
      this.EditorNode.appendChild(
        el('figure', { append: [img, el('figcaption', { props: { textContent: caption } })] }),
      );
    } else {
      this.EditorNode.appendChild(img);
    }
    this.updateContent();
  };

  // define WCWYSIWYG as custom element
  static define(name = 'wc-wysiwyg'): void {
    if (!window.customElements.get(name)) window.customElements.define(name, WCWYSIWYG);
  }
}

export default WCWYSIWYG;
export const define = WCWYSIWYG.define;
export interface WCWYSIWYGTag {
  /** The HTML tag name. */
  tag: string;
  /** Optional method to be called when the tag is used. */
  method?: (this: WCWYSIWYG, tag: WCWYSIWYGTag) => void;
  /** Optional hint shown on the tag button. */
  hint?: string;
  /** Optional string to specify the customized built-in element. */
  is?: string;
}
export interface WCWYSIWYGActions {
  wrapTag: (tag: WCWYSIWYGTag) => void;
  insertImageBlock: () => void;
  insertAudio: () => void;
  insertVideo: () => void;
}
declare global {
  interface Window {
    _WCWYSIWYG: {
      extensions?: ExtensionCtor[];
      asyncExtensions?: string[];
    };
  }
}
