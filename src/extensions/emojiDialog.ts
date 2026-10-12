import { el } from '../core/el.js';
import { createTranslator } from '../core/i18n.js';
import { registerExtension } from '../core/extensions.js';
import type WCWYSIWYG from '../wc-wysiwyg.js';

const t = {
  ru: {
    emoji: 'Смайлики',
    action: 'Нажмите чтобы скопировать',
    emoticons: 'Эмоции',
    dingbats: 'Значки',
    map: 'Транспорт и карты',
    additional: 'Дополнительные',
  },
  en: {
    emoji: 'Emoji',
    action: 'Click to copy',
    emoticons: 'Emoticons',
    dingbats: 'Dingbats',
    map: 'Transport and map',
    additional: 'Other additional',
  },
};
const _t = createTranslator(t);

/** Copy text with HTTPS Clipboard API, falling back to legacy `execCommand` (HTTP/old browsers). */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Emoji dialog with a lazily-built list of emoji buttons. */
class WCWYSIWYGExtensionEmojiDialog {
  Dialog: HTMLDialogElement | null = null;
  WCWYSIWYG: WCWYSIWYG;
  constructor(WCWYSIWYG: WCWYSIWYG) {
    this.WCWYSIWYG = WCWYSIWYG;
  }

  connectedCallback(): void {
    const section = (this.WCWYSIWYG as unknown as { EditorActionsSection?: HTMLElement | null }).EditorActionsSection;
    if (!section) return;
    section.append(
      el('button', {
        classList: ['wc-wysiwyg_btn'],
        props: { type: 'button', textContent: '😃' },
        attrs: { 'data-hint': _t('emoji'), 'aria-label': _t('emoji') },
        events: { click: () => this.#showDialog() },
      }),
    );
  }

  disconnectedCallback(): void {
    this.Dialog?.remove();
    this.Dialog = null;
  }

  #showDialog(): void {
    if (this.Dialog === null) {
      const emojiRanges: Record<string, [number, number]> = {
        emoticons: [128513, 128591],
        dingbats: [9986, 10160],
        map: [128640, 128704],
        additional: [127757, 128359],
      };
      this.Dialog = el('dialog', {
        classList: ['wc-wysiwyg_dialog', '-modal'],
        styles: { maxWidth: '90vw' },
      });
      // Build with DOM nodes (not one giant innerHTML string): cheaper parse,
      // no HTML-injection surface, and sections stay collapsible.
      for (const [index, range] of Object.keys(emojiRanges).entries()) {
        const [from, to] = emojiRanges[range];
        const details = el('details', {
          classList: ['wc-wysiwyg_ed'],
          props: { open: index === 0 },
          append: [el('summary', { props: { textContent: _t(range) } })],
        });
        const fragment = document.createDocumentFragment();
        for (let code = from; code < to; code++) {
          const emoji = String.fromCodePoint(code);
          fragment.append(
            el('button', {
              classList: ['wc-wysiwyg_btn', '-emoji'],
              props: { type: 'button', textContent: emoji },
              attrs: { 'data-hint': _t('action'), 'aria-label': `${emoji}. ${_t('action')}` },
            }),
          );
        }
        details.append(fragment);
        this.Dialog.append(details);
      }
      this.Dialog.addEventListener('click', (event: Event) => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement) || !target.classList.contains('-emoji')) return;
        const emoji = target.textContent ?? '';
        if (!emoji) return;
        void copyText(emoji).then((ok) => {
          if (ok) this.Dialog?.close();
          else target.setAttribute('data-hint', 'copy failed');
        });
      });
      (this.WCWYSIWYG as unknown as HTMLElement).append(this.Dialog);
    }
    if (!this.Dialog.open) this.Dialog.showModal();
  }
}

registerExtension(WCWYSIWYGExtensionEmojiDialog as unknown as import('../core/extensions.js').ExtensionCtor);

export default WCWYSIWYGExtensionEmojiDialog;
