import { el } from '../core/el.js';

/**
 * Presets format
 */
interface WCWYSIWYGPreset {
    /**
     * Preset name on drop down
     */
    name:string,
    /**
     * tag name
     */
    tag:string,
    /**
     * will set to HTMLElement.className property
     */
    class?:string,
    /**
     * will set to HTMLElement.style property
     */
    style?:string
}
class WCWYSIWYGExtensionPresetList {
    PresetList: HTMLElement|null = null
    PresetBtn:HTMLElement
    Presets: Array<WCWYSIWYGPreset> = []
    WCWYSIWYG:any
    constructor(WCWYSIWYG:any) {
        this.WCWYSIWYG = WCWYSIWYG;
        this.Presets = JSON.parse(WCWYSIWYG.getAttribute('data-preset-list'));
        this.PresetBtn = el('button', {
            classList: ['wc-wysiwyg_btn'],
            props: {
                innerHTML: 'Оформление',
                onpointerup: () => this.#showPresetList(),
            },
        });
    }
    connectedCallback() {    
        if(this.Presets !== null) {
            this.WCWYSIWYG.EditorActionsSection.append(this.PresetBtn);
        }   
    }
    #showPresetList() {
        console.log('show dialog');
        if(this.PresetList === null) {
            const section = el("section", { });
            //Make presets blocks
            this.Presets.forEach(preset => {
                const presetEl = el(preset.tag, {
                    props: {
                        innerHTML: `${preset.name}`,
                        className: preset.class || null,
                        style: preset.style || null,
                    }
                });
                section.append(el('button', {
                    props: {
                        type: 'button',
                        style: "cursor:pointer;border: 1px solid rgba(0,0,0,0.5); margin-bottom:5px; border-radius:5px; background: transparent; display:block;",
                        onclick: e => this.#makePreset(preset),
                    },
                    append: [presetEl],
                }));
            });

            //Close dialog button
            this.PresetList = el('div', {
                // classList: ['wc-wysiwyg_ec'],
                append: [
                    section,
                    el('button', {
                        classList: ['wc-wysiwyg_btn'],
                        props: {
                            type: 'button',
                            innerText: 'Закрыть',
                            onclick: event => this.PresetList.style.display = 'none'
                        }
                    })
                ]
            });
            // this.WCWYSIWYG.EditorActionsSection.append(this.PresetList);
            this.WCWYSIWYG.EditorActionsSection.insertAdjacentElement('beforeend', this.PresetList);
            // this.PresetBtn.append(this.PresetList);
        }
        // this.PresetList.show();
        this.PresetList.style.display = 'block';
    }
    #makePreset(preset:WCWYSIWYGPreset) {
        const editorSelection = this.WCWYSIWYG.getSelection();
        
        console.log('make preset', preset, editorSelection);
        let tagNode = el(preset.tag, {});
        if(preset.style) {
            tagNode.setAttribute('style', preset.style);
        }
        if(preset.class) {
            tagNode.className = preset.class;
        }
        if (editorSelection.selection !== null && editorSelection.selection.rangeCount && editorSelection.text !== null) {
            const range = editorSelection.selection.getRangeAt(0).cloneRange();
            range.surroundContents(tagNode);
            editorSelection.selection.removeAllRanges();
            editorSelection.selection.addRange(range);
            tagNode.innerText = editorSelection.text;
            this.WCWYSIWYG.updateContent();
            // this.WCWYSIWY.#checkEditProps({target:tagNode, stopPropagation: () => false});
        }
    }
}
//Put extension in global view
(window._WCWYSIWYG !== undefined) ? window._WCWYSIWYG.extensions.push(WCWYSIWYGExtensionPresetList) : window._WCWYSIWYG = {extensions:[WCWYSIWYGExtensionPresetList]};
export default WCWYSIWYGExtensionPresetList;