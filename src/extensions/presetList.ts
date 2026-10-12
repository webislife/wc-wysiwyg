import { el } from '../core/el.js';
import { createTranslator } from '../core/i18n.js';
import { registerExtension } from '../core/extensions.js';
import { safeJsonParse } from '../core/storage.js';
import type WCWYSIWYG from '../wc-wysiwyg.js';

const t = {
  ru: { presets: 'Оформление', close: 'Закрыть' },
  en: { presets: 'Presets', close: 'Close' },
};
const _t = createTranslator(t);

/** Preset format. */
export interface WCWYSIWYGPreset {
  /** Preset name shown in the dropdown (rendered as text, never HTML). */
  name: string;
  /** Tag name to wrap the selection with. */
  tag: string;
  /** Set as `className`. */
  class?: string;
  /** Set as inline style. */
  style?: string;
}

function isPreset(value: unknown): value is WCWYSIWYGPreset {
  if (typeof value !== 'object' || value === null) return false;
  const preset = value as Record<string, unknown>;
  return typeof preset.name === 'string' && typeof preset.tag === 'string' && /^[a-z][a-z0-9-]*$/i.test(preset.tag);
}

class WCWYSIWYGExtensionPresetList {
  PresetList: HTMLElement | null = null;
  PresetBtn: HTMLElement;
  Presets: WCWYSIWYGPreset[] = [];
  WCWYSIWYG: WCWYSIWYG;
  constructor(WCWYSIWYG: WCWYSIWYG) {
    this.WCWYSIWYG = WCWYSIWYG;
    const raw = WCWYSIWYG.getAttribute('data-preset-list');
    const parsed = safeJsonParse<unknown>(raw, []);
    if (Array.isArray(parsed)) this.Presets = parsed.filter(isPreset);
    this.PresetBtn = el('button', {
      classList: ['wc-wysiwyg_btn'],
      props: { type: 'button', textContent: _t('presets') },
      attrs: { 'aria-label': _t('presets') },
      events: { click: () => this.#showPresetList() },
    });
  }

  connectedCallback(): void {
    const section = (this.WCWYSIWYG as unknown as { EditorActionsSection?: HTMLElement | null }).EditorActionsSection;
    if (this.Presets.length > 0 && section) section.append(this.PresetBtn);
  }

  disconnectedCallback(): void {
    this.PresetList?.remove();
    this.PresetList = null;
  }

  #showPresetList(): void {
    const editor = this.WCWYSIWYG as unknown as {
      EditorActionsSection?: HTMLElement | null;
      getSelection?: () => { selection: Selection | null; text: string | null };
      updateContent?: () => void;
    };
    if (!editor.EditorActionsSection) return;
    if (this.PresetList === null) {
      const section = el('section', {});
      for (const preset of this.Presets) {
        // `name` is user-controlled (attribute JSON) — use textContent, never innerHTML.
        const presetEl = el(preset.tag, { props: { textContent: preset.name } });
        if (preset.class) presetEl.className = preset.class;
        if (preset.style) presetEl.style.cssText = preset.style;
        section.append(
          el('button', {
            props: { type: 'button' },
            styles: {
              cursor: 'pointer',
              border: '1px solid rgba(0,0,0,0.5)',
              marginBottom: '5px',
              borderRadius: '5px',
              background: 'transparent',
              display: 'block',
            } as Partial<CSSStyleDeclaration>,
            attrs: { 'aria-label': preset.name },
            events: { click: () => this.#makePreset(preset) },
            append: [presetEl],
          }),
        );
      }
      this.PresetList = el('div', {
        append: [
          section,
          el('button', {
            classList: ['wc-wysiwyg_btn'],
            props: { type: 'button', textContent: _t('close') },
            events: {
              click: () => {
                if (this.PresetList) this.PresetList.style.display = 'none';
              },
            },
          }),
        ],
      });
      editor.EditorActionsSection.insertAdjacentElement('beforeend', this.PresetList);
    }
    this.PresetList.style.display = 'block';
  }

  #makePreset(preset: WCWYSIWYGPreset): void {
    const editor = this.WCWYSIWYG as unknown as {
      getSelection?: () => { selection: Selection | null; text: string | null };
      updateContent?: () => void;
    };
    const editorSelection = editor.getSelection?.();
    if (!editorSelection?.selection || editorSelection.selection.rangeCount === 0 || editorSelection.text === null) {
      return;
    }
    // Put the selected text INSIDE the new node first, then wrap —
    // the old order (surround, then overwrite innerText) destroyed the wrapper.
    const tagNode = el(preset.tag, { props: { textContent: editorSelection.text } });
    if (preset.style) tagNode.style.cssText = preset.style;
    if (preset.class) tagNode.className = preset.class;
    try {
      const range = editorSelection.selection.getRangeAt(0).cloneRange();
      try {
        range.surroundContents(tagNode);
      } catch {
        tagNode.appendChild(range.extractContents());
        range.insertNode(tagNode);
      }
      editorSelection.selection.removeAllRanges();
      editorSelection.selection.addRange(range);
      editor.updateContent?.();
    } catch {
      /* invalid selection state — leave content untouched */
    }
  }
}

registerExtension(WCWYSIWYGExtensionPresetList as unknown as import('../core/extensions.js').ExtensionCtor);

export default WCWYSIWYGExtensionPresetList;
