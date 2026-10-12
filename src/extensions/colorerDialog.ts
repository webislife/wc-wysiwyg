import { el } from '../core/el.js';
import { createTranslator } from '../core/i18n.js';
import { registerExtension } from '../core/extensions.js';
import { safeJsonParse } from '../core/storage.js';
import type WCWYSIWYG from '../wc-wysiwyg.js';

const t = {
  ru: { bg: 'Фон', text: 'Текст', bgColor: 'Цвет фона', textColor: 'Цвет текста' },
  en: { bg: 'Background', text: 'Text', bgColor: 'Background color', textColor: 'Text color' },
};
const _t = createTranslator(t);

const Colors: Record<string, string[]> = {
  red: ['FFEBEE', 'FFCDD2', 'EF9A9A', 'E57373', 'EF5350', 'F44336', 'E53935', 'D32F2F', 'C62828', 'B71C1C'],
  pink: ['FCE4EC', 'F8BBD0', 'F48FB1', 'F06292', 'EC407A', 'E91E63', 'D81B60', 'C2185B', 'AD1457', '880E4F'],
  purple: ['F3E5F5', 'E1BEE7', 'CE93D8', 'BA68C8', 'AB47BC', '9C27B0', '8E24AA', '7B1FA2', '6A1B9A', '4A148C'],
  indigo: ['E8EAF6', 'C5CAE9', '9FA8DA', '7986CB', '5C6BC0', '3F51B5', '3949AB', '303F9F', '283593', '1A237E'],
  blue: ['E3F2FD', 'BBDEFB', '90CAF9', '64B5F6', '42A5F5', '2196F3', '1E88E5', '1976D2', '1565C0', '0D47A1'],
  cyan: ['E0F7FA', 'B2EBF2', '80DEEA', '4DD0E1', '26C6DA', '00BCD4', '00ACC1', '0097A7', '00838F', '006064'],
  teal: ['E0F2F1', 'B2DFDB', '80CBC4', '4DB6AC', '26A69A', '009688', '00897B', '00796B', '00695C', '004D40'],
  green: ['E8F5E9', 'C8E6C9', 'A5D6A7', '81C784', '66BB6A', '4CAF50', '43A047', '388E3C', '2E7D32', '1B5E20'],
  lime: ['FFFDE7', 'FFF9C4', 'FFF59D', 'FFF176', 'FFEE58', 'FFEB3B', 'FDD835', 'FBC02D', 'F9A825', 'F57F17'],
  yellow: ['FFF8E1', 'FFECB3', 'FFE082', 'FFD54F', 'FFCA28', 'FFC107', 'FFB300', 'FFA000', 'FF8F00', 'FF6F00'],
  orange: ['FBE9E7', 'FFCCBC', 'FFAB91', 'FF8A65', 'FF7043', 'FF5722', 'F4511E', 'E64A19', 'D84315', 'BF360C'],
  brown: ['EFEBE9', 'D7CCC8', 'BCAAA4', 'A1887F', '8D6E63', '795548', '6D4C41', '5D4037', '4E342E', '3E2723'],
  grey: ['FAFAFA', 'F5F5F5', 'EEEEEE', 'E0E0E0', 'BDBDBD', '9E9E9E', '757575', '616161', '424242', '212121'],
  blueGrey: ['ECEFF1', 'CFD8DC', 'B0BEC5', '90A4AE', '78909C', '607D8B', '546E7A', '455A64', '37474F', '263238'],
};

/** Normalize any CSS color (hex / rgb() / rgba() / named) to `#rrggbb`, or `''` when unknown. */
export function toHexColor(input: string): string {
  if (typeof input !== 'string') return '';
  const value = input.trim().toLowerCase();
  if (value === '' || value === 'transparent') return '';
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase();
  }
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const rgb = value.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (rgb) {
    const r = Math.min(255, Number(rgb[1]));
    const g = Math.min(255, Number(rgb[2]));
    const b = Math.min(255, Number(rgb[3]));
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  }
  try {
    const probe = document.createElement('span');
    probe.style.color = value;
    if (!probe.style.color) return '';
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    const m = computed.match(/(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
    if (!m) return '';
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  } catch {
    return '';
  }
}

type ColorKind = 'text' | 'bg';

class WCWYSIWYGExtensionColorerDialog {
  WCWYSIWYG: WCWYSIWYG;
  ColorerText!: HTMLButtonElement;
  ColorerBackground!: HTMLButtonElement;
  ColorerDialogLabel!: HTMLLabelElement;
  ColorerDialogColorInput!: HTMLInputElement;
  Dialog: HTMLDialogElement | null = null;
  ActiveColors: { text: string; bg: string } = { text: '', bg: '' };
  ColorerTarget: HTMLElement | null = null;
  #onEditProps = (event: Event): void => {
    const target = (event as CustomEvent).detail?.eventTarget;
    if (!(target instanceof HTMLElement)) return;
    this.ColorerTarget = target;
    this.setColor('text', toHexColor(target.style.color));
    this.setColor('bg', toHexColor(target.style.backgroundColor));
  };

  constructor(WYSIWYG: WCWYSIWYG) {
    this.WCWYSIWYG = WYSIWYG;
  }

  connectedCallback(): void {
    const editor = this.WCWYSIWYG as unknown as { EditorActionsSection?: HTMLElement | null };
    if (!editor.EditorActionsSection) return;
    this.ColorerText = el('button', {
      classList: ['wc-wysiwyg_btn', '-prevcolor'],
      props: { type: 'button', textContent: _t('text') },
      attrs: { 'data-hint': _t('textColor'), 'aria-label': _t('textColor') },
      events: { click: () => this.#showDialog('text') },
    });
    this.ColorerBackground = el('button', {
      classList: ['wc-wysiwyg_btn', '-prevcolor'],
      props: { type: 'button', textContent: _t('bg') },
      attrs: { 'data-hint': _t('bgColor'), 'aria-label': _t('bgColor') },
      events: { click: () => this.#showDialog('bg') },
    });
    this.ColorerDialogLabel = el('label', { props: { textContent: '' } });
    this.ColorerDialogColorInput = el('input', {
      props: { type: 'color', value: '#ffffff' },
      events: {
        input: (event: Event) => {
          const input = event.target;
          if (input instanceof HTMLInputElement && this.Dialog?.open) {
            const kind = (this.Dialog.dataset.kind ?? 'text') as ColorKind;
            this.setColor(kind, input.value);
          }
        },
      },
    });
    (this.WCWYSIWYG as unknown as HTMLElement).addEventListener('editprops', this.#onEditProps);
    editor.EditorActionsSection.append(this.ColorerText, this.ColorerBackground);
  }

  disconnectedCallback(): void {
    (this.WCWYSIWYG as unknown as HTMLElement).removeEventListener('editprops', this.#onEditProps);
    this.Dialog?.remove();
    this.Dialog = null;
  }

  setColor(kind: ColorKind, value: string): void {
    const hex = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '';
    this.ActiveColors[kind] = hex;
    if (this.ColorerDialogColorInput && hex) this.ColorerDialogColorInput.value = hex;
    if (!this.ColorerTarget) return;
    if (kind === 'text') {
      this.ColorerTarget.style.color = hex;
      if (hex) this.ColorerText.style.setProperty('--colorer', hex);
      else this.ColorerText.style.removeProperty('--colorer');
    } else {
      this.ColorerTarget.style.backgroundColor = hex;
      if (hex) this.ColorerBackground.style.setProperty('--colorer', hex);
      else this.ColorerBackground.style.removeProperty('--colorer');
    }
    (this.WCWYSIWYG as unknown as { updateContent?: () => void }).updateContent?.();
  }

  #showDialog(colorType: ColorKind): void {
    const section = (this.WCWYSIWYG as unknown as { EditorActionsSection?: HTMLElement | null }).EditorActionsSection;
    if (!section) return;
    if (this.Dialog === null) {
      const palette = el('div', {});
      const fragment = document.createDocumentFragment();
      for (const colorName of Object.keys(Colors)) {
        const fieldset = el('fieldset', { classList: ['-palette'] });
        for (const hexColor of Colors[colorName]) {
          fieldset.append(
            el('button', {
              classList: ['wc-wysiwyg_btn', '-color'],
              props: { type: 'button' },
              attrs: { 'data-color': `#${hexColor}`, 'aria-label': `#${hexColor}` },
              styles: { backgroundColor: `#${hexColor}` },
            }),
          );
        }
        fragment.append(fieldset);
      }
      palette.append(fragment);
      this.Dialog = el('dialog', {
        classList: ['wc-wysiwyg_dialog', '-modal', '-colors'],
        append: [
          palette,
          el('fieldset', {
            styles: {
              background: 'var(--color-blue-gray-50)',
              outline: '0',
              display: 'flex',
              border: '0',
              marginTop: '10px',
              borderRadius: '0.5em',
              width: '100%',
            } as Partial<CSSStyleDeclaration>,
            append: [
              this.ColorerDialogLabel,
              this.ColorerDialogColorInput,
              el('button', {
                classList: ['wc-wysiwyg_btn'],
                props: { type: 'button', textContent: 'OK' },
                events: { click: (event: Event) => (event.target as HTMLElement).closest('dialog')?.removeAttribute('open') },
              }),
              el('button', {
                classList: ['wc-wysiwyg_btn'],
                props: { type: 'button', textContent: 'Clear' },
                events: {
                  click: () => {
                    const kind = (this.Dialog?.dataset.kind ?? 'text') as ColorKind;
                    this.setColor(kind, '');
                  },
                },
              }),
            ],
          }),
        ],
      });
      this.Dialog.addEventListener('click', (event: Event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.classList.contains('-color')) {
          const kind = (this.Dialog?.dataset.kind ?? 'text') as ColorKind;
          this.setColor(kind, target.getAttribute('data-color') ?? '');
        }
      });
      section.append(this.Dialog);
    }
    this.Dialog.dataset.kind = colorType;
    this.ColorerDialogLabel.textContent = _t(colorType);
    if (!this.Dialog.open) this.Dialog.showModal();
  }
}

registerExtension(WCWYSIWYGExtensionColorerDialog as unknown as import('../core/extensions.js').ExtensionCtor);

export default WCWYSIWYGExtensionColorerDialog;
