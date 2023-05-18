import { el } from '../core/el.js';

//Extnesion translates
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
        dingbats: 'Dsingbats',
        map: 'Transport and map',
        additional: 'Other additional',
    }
};
const _t = (key:string, lang = navigator.language):string => t[lang] ? t[lang][key] || "-" : t["en"][key];
/**
 * Emoji dialog with list of emoji buttons
 */
class WCWYSIWYGExtensionEmojiDialog {
    Dialog: HTMLDialogElement|null = null
    WCWYSIWYG:any
    constructor(WCWYSIWYG:any) {
        this.WCWYSIWYG = WCWYSIWYG;
    }
    connectedCallback() {       
        this.WCWYSIWYG.EditorActionsSection.append(el('button', {
            classList: ['wc-wysiwyg_btn'],
            props: {
                innerHTML: '😃',
                onpointerup: () => this.#showDialog(),
            },
            attrs: {
                "data-hint": _t('emoji')
            }
        }));
    }
    #showDialog() {
        //Check if first show dialog
        if(this.Dialog === null) {
            const emojiRanges = {
                emoticons: [128513, 128591],
                dingbats: [9986,10160],
                map: [128640,128704],
                additional: [127757,128359],
            };
            this.Dialog = el('dialog', {
                classList: ['wc-wysiwyg_dialog', '-modal'],
                styles: {
                    maxWidth: '90vw',
                },
                props: {
                    onpointerup: event => {
                        const target = event.target;
                        if(target.tagName === 'BUTTON') {
                            const emojiCode = target.innerHTML;
                            const data = [
                                new ClipboardItem({ "text/html": new Blob([emojiCode], { type:"text/html" }) }),
                            ];
                            navigator.clipboard.write(data).then(
                                () => {
                                    console.log('writed');
                                    this.Dialog.close();
                                },
                                (err) => { throw new Error("WC-WYSIWYG: Copy emoji to clipboard failed", err); }
                            );
                        }
                    },
                    innerHTML: (() => {
                        let html = '';
                        let showFirst = false;
                        for (let range in emojiRanges) {
                            html += `<details class="wc-wysiwyg_ed" ${showFirst === false ? 'open': ''}><summary>${_t(range)}</summary>`;
                            for (let emojiCode = emojiRanges[range][0]; emojiCode < emojiRanges[range][1]; emojiCode++) {
                                html += '<button class="wc-wysiwyg_btn -emoji" data-hint="' + _t('action') + '">&#'+emojiCode+';</button>';
                            }
                            html += '</details>';
                            showFirst = true;
                        }
                        return html;                        
                    })()
                }
            });
            this.WCWYSIWYG.append(this.Dialog);
        }
        this.Dialog.showModal();
    }
    
}

//Put extension in global view
(window._WCWYSIWYG !== undefined) ? window._WCWYSIWYG.extensions.push(WCWYSIWYGExtensionEmojiDialog) : window._WCWYSIWYG = {extensions:[WCWYSIWYGExtensionEmojiDialog]};

export default WCWYSIWYGExtensionEmojiDialog;