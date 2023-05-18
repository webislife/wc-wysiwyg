import { el } from '../core/el.js';
import WCWYSIWYG from '../wc-wysiwyg.js';
//Extnesion translates
const t = {
    ru: {
        bg: 'Фон',
        text: 'Текст',
        bgColor: 'Цвет фона',
        textColor: 'Цвет текста',
    },
    en: {
        bg: 'Background',
        text: 'Text',
        bgColor: 'Background color',
        textColor: 'Text color',
    }
};
const _t = (key:string, lang = navigator.language):string => t[lang] ? t[lang][key] || "-" : t["en"][key];
const Colors = {
    red: ['FFEBEE', 'FFCDD2', 'EF9A9A', 'E57373', 'EF5350', 'F44336', 'E53935', 'D32F2F', 'C62828', 'B71C1C'],
    pink: ['FCE4EC', 'F8BBD0', 'F48FB1', 'F06292', 'EC407A', 'E91E63', 'D81B60', 'C2185B', 'AD1457', '880E4F'],
    purple: ['F3E5F5', 'E1BEE7', 'CE93D8', 'BA68C8', 'AB47BC', '9C27B0', '8E24AA', '7B1FA2', '6A1B9A', '4A148C'],
    // deepPurple: ['EDE7F6', 'D1C4E9', 'B39DDB', '9575CD', '7E57C2', '673AB7', '5E35B1', '512DA8', '4527A0', '311B92'],
    indigo: ['E8EAF6', 'C5CAE9', '9FA8DA', '7986CB', '5C6BC0', '3F51B5', '3949AB', '303F9F', '283593', '1A237E'],
    blue: ['E3F2FD', 'BBDEFB', '90CAF9', '64B5F6', '42A5F5', '2196F3', '1E88E5', '1976D2', '1565C0', '0D47A1'],
    // lightBlue: ['E1F5FE', 'B3E5FC', '81D4FA', '4FC3F7', '29B6F6', '03A9F4', '039BE5', '0288D1', '0277BD', '01579B'],
    cyan: ['E0F7FA', 'B2EBF2', '80DEEA', '4DD0E1', '26C6DA', '00BCD4', '00ACC1', '0097A7', '00838F', '006064'],
    teal: ['E0F2F1', 'B2DFDB', '80CBC4', '4DB6AC', '26A69A', '009688', '00897B', '00796B', '00695C', '004D40'],
    green: ['E8F5E9', 'C8E6C9', 'A5D6A7', '81C784', '66BB6A', '4CAF50', '43A047', '388E3C', '2E7D32', '1B5E20'],
    // lightGreen: ['F1F8E9', 'DCEDC8', 'C5E1A5', 'AED581', '9CCC65', '8BC34A', '7CB342', '689F38', '558B2F', '33691E'],
    lime: ['FFFDE7', 'FFF9C4', 'FFF59D', 'FFF176', 'FFEE58', 'FFEB3B', 'FDD835', 'FBC02D', 'F9A825', 'F57F17'],
    yellow: ['FFF8E1', 'FFECB3', 'FFE082', 'FFD54F', 'FFCA28', 'FFC107', 'FFB300', 'FFA000', 'FF8F00', 'FF6F00'],
    // amber: ['FFF3E0', 'FFE0B2', 'FFCC80', 'FFB74D', 'FFA726', 'FF9800', 'FB8C00', 'F57C00', 'EF6C00', 'E65100'],
    orange: ['FBE9E7', 'FFCCBC', 'FFAB91', 'FF8A65', 'FF7043', 'FF5722', 'F4511E', 'E64A19', 'D84315', 'BF360C'],
    // deepOrange: ['EFEBE9', 'D7CCC8', 'BCAAA4', 'A1887F', '8D6E63', '795548', '6D4C41', '5D4037', '4E342E', '3E2723'],
    brown: ['EFEBE9', 'D7CCC8', 'BCAAA4', 'A1887F', '8D6E63', '795548', '6D4C41', '5D4037', '4E342E', '3E2723'],
    grey:['FAFAFA', 'F5F5F5', 'EEEEEE', 'E0E0E0', 'BDBDBD', '9E9E9E', '757575', '616161', '424242', '212121'],
    blueGrey: ['ECEFF1', 'CFD8DC', 'B0BEC5', '90A4AE', '78909C', '607D8B', '546E7A', '455A64', '37474F', '263238'],
};

class WCWYSIWYGExtensionColorerDialog {
    WCWYSIWYG:WCWYSIWYG
    ColorerText:HTMLButtonElement
    ColorerBackground:HTMLButtonElement
    ColorerDialogLabel:HTMLLabelElement
    ColorerDialogColorInput:HTMLInputElement
    Dialog:HTMLDialogElement|null = null
    ActiveColors:{
        text:string|null,
        bg:string|null,
    }
    ColorerTarget: HTMLElement
    constructor(WYSIWYG) {
        this.WCWYSIWYG = WYSIWYG;
        this.ActiveColors = new Proxy({
            text: null,
            bg: null,
        }, {
            get(target,prop) {
                return target[prop]
            },
            set: (target, prop, value) => {
                console.log('set color', value, prop);
                this.ColorerDialogColorInput.value = value;
                target[prop] = value;
                if(prop == 'text') {
                    this.ColorerTarget.style.color = value;
                    this.ColorerText.setAttribute('style', `--colorer:${value}`);
                } else {
                    this.ColorerTarget.style.backgroundColor = value;
                    this.ColorerBackground.setAttribute('style', `--colorer:${value}`);
                }
                return true
            }
        });
        console.log('colorer constructor', this);
    }
    connectedCallback() {
        console.log('colorer connectedCallback');
        this.ColorerText = el('button', {
            classList: ['wc-wysiwyg_btn', '-prevcolor'],
            props: {
                innerHTML: _t('text'),
                onpointerup: () => this.#showDialog('text'),
            },
            attrs: {
                "data-hint": _t('textColor')
            },
        });
        this.ColorerBackground = el('button', {
            classList: ['wc-wysiwyg_btn', '-prevcolor'],
            props: {
                innerHTML: _t('bg'),
                onpointerup: () => this.#showDialog('bg'),
            },
            attrs: {
                "data-hint": _t('bgColor')
            },
        });
        this.ColorerDialogLabel = el('label', {
            props: {
                innerText: ''
            }
        });
        this.ColorerDialogColorInput = el('input', {
            props: {
                type: 'color',
                value: '#fffccc'
            }
        });
        this.WCWYSIWYG.addEventListener('editprops', (event:CustomEvent) => {
            if(event.detail.eventTarget) {
                const target = event.detail.eventTarget;
                console.log('check target', target);

                this.ColorerTarget = target;
                this.ActiveColors.text = this.#rgbToHex(target.style.color);
                this.ActiveColors.bg = this.#rgbToHex(target.style.backgroundColor);

                // this.ColorerText.setAttribute('data-color', value);
                // this.ColorerBackground.setAttribute('data-color', value);

            }
        });
        this.WCWYSIWYG.EditorActionsSection.append(
            this.ColorerText, 
            this.ColorerBackground
        );
    }
    /**
    * Converts a rgb string to hex string
    * @param {String} rgbString - A string of rgb values (e.g. "255, 0, 128")
    * @return {String} A hex string in the format of #RRGGBB (e.g. "#FF0080")
    */
    #rgbToHex(rgbString) {
        const arrRgb = rgbString.match(/([0-9]{1,3})/gm);
        if(arrRgb === null || arrRgb.length !== 3) {
            return null;
        }
        const r = +arrRgb[0];
        const g = +arrRgb[1];
        const b = +arrRgb[2];
        return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
    }
    #showDialog(colorType:string) {
        console.log('show dialog');
        if(this.Dialog === null) {
            this.Dialog = el('dialog', {
                classList: ['wc-wysiwyg_dialog', '-modal', '-colors'],
                props: {
                    innerHTML: (() => {
                        let html = '';
                        for(let colorName in Colors) {
                            html += `<fieldset class="-palette">`;
                            for (let i = 0; i < Colors[colorName].length; i++) {
                                const hexColor = Colors[colorName][i];
                                html += `<button class="wc-wysiwyg_btn -color" data-color="#${hexColor}" style="background-color: #${hexColor};"></button>`;
                            }
                            html += `</fieldset>`;
                        }
                        return html
                    })(),
                    onpointerup: event => {
                        if(event.target.classList.contains('-color')) {
                            this.ActiveColors[colorType] = event.target.getAttribute('data-color');
                        }
                    }
                },
                
                append: [
                    el('fieldset', {
                        styles: {
                            background: 'var(--color-blue-gray-50)',
                            outline: '0',
                            display: 'flex',
                            border: '0',
                            marginTop: '10px',
                            borderRadius: '0.5em',
                            width: '100%',
                        },
                        append: [
                            
                            this.ColorerDialogLabel,
                            this.ColorerDialogColorInput,
                            el('button', {
                                classList: ['wc-wysiwyg_btn'],
                                props: {
                                    type: 'button',
                                    innerText: 'OK',
                                    onpointerup: event => event.target.closest('dialog').close(),
                                }
                            }),
                            el('button', {
                                classList: ['wc-wysiwyg_btn'],
                                props: {
                                    type: 'button',
                                    innerText: 'Clear',
                                    onpointerup: event => this.ColorerDialogColorInput.value = null
                                }
                            }),
                        ]
                    })
                ]
            });
            this.WCWYSIWYG.EditorActionsSection.append(this.Dialog);

            // this.WCWYSIWYG.EditorInlineDialog.append(this.Dialog);
        }
        this.Dialog.onpointerup = event => {
            const target = event.target as HTMLElement;
            if(target.classList.contains('-color')) {
                this.ActiveColors[colorType] = target.getAttribute('data-color');
            }
        };
        this.ColorerDialogLabel.innerText = _t(colorType);
        this.Dialog.showModal();
    }
}

export default WCWYSIWYGExtensionColorerDialog;