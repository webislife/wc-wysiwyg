import {t} from './core/translates.js';
import { el } from "./core/el.js";

interface WCWYSIWYGTag {
    tag:string
    method?:Function,
    hint?:string,
    is?: string,
}
interface WCWYSIWYGActions {
    wrapTag: Function,
    insertImageBlock: Function,
    insertAudio: Function,
    insertVideo: Function,
}

//All semantic html5 known editor tags
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
    { tag: 'a'},
    { tag: 'q'},
    { tag: 'b'},
    { tag: 'i'},
    { tag: 'u'},
    { tag: 's'},
    { tag: 'sup'},
    { tag: 'sub'},
    { tag: 'kbd'},
    { tag: 'abbr'},
    { tag: 'strong'},
    { tag: 'code'},
    { tag: 'samp'},
    { tag: 'del'},
    { tag: 'ins'},
    { tag: 'var'},
    { tag: 'ul'},
    { tag: 'ol'},
    { tag: 'pre'},
    { tag: 'time'},
    { tag: 'img'},
    { tag: 'audio'},
    { tag: 'video'},
    { tag: 'blockquote'},
] as WCWYSIWYGTag[];

class WCWYSIWYG extends HTMLElement {
    public EditorTags:WCWYSIWYGTag[]
    public EditorCustomTags:WCWYSIWYGTag[]
    //Content editable wc-editor element
    public EditorNode:HTMLElement
    public EditorActionsSection:HTMLElement
    //Inline edites
    public EditorInlineActions:any[]
    public EditorInlineDialog:HTMLDialogElement
    public EditorInlineActionsForm:HTMLElement
    //Editor props
    public EditorPropertyForm?:HTMLElement
    //Clear btn
    public EditorClearFormatBtn:HTMLElement
    //Autocomplete area
    public EditorAutoCompleteForm?:HTMLElement
    //Bottom actions
    public EditorBottomForm?:HTMLElement
    public EditorBottomFormNewP?:HTMLElement
    public EditorBottomFormViewToggle?:HTMLElement
    
    public EditorPreviewText:HTMLTextAreaElement
    public EditorCustomTagsForm?:HTMLElement
    public EditorTagsMethods:WCWYSIWYGActions
    public EditorAllowTags:string[]
    public EditorFullScreenButton?:HTMLElement
    public lang:string = 'ru'
    public value:string = ''

    static observedAttributes = ['value'];

    #EditProps:boolean|object
    #Autocomplete:boolean
    #SotrageKey:string|null
    #HideBottomActions:boolean
    #Connected:boolean = false;
    
    constructor() {
        super();
        this.classList.add('wc-wysiwyg');

        //Listen root element events
        this.onpointerup = (event) => {
            const selection = window.getSelection();
            //if check exist selection string
            if(selection !== null && selection.toString().length > 0) {
                this.EditorInlineActionsForm.style.display = '';
                this.EditorPropertyForm.style.display = 'none';
                this.showEditorInlineDialog();
            } else {
                this.hideEditorInlineDialog();
            }
        };
        this.onfullscreenchange = (event) => {
            const isFullScreen = document.fullscreenElement;
            this.classList.toggle('-fullscreen', isFullScreen !== null);
        };
    }

    connectedCallback() {
        if(this.#Connected === false) {
            //Check Tags
            const allowTags = this.getAttribute('data-allow-tags') || allTags.map(t => t.tag).join(',');
           
            //Bind inner textarea to wc-wysiwyg
            this.EditorPreviewText = this.querySelector('textarea') as HTMLTextAreaElement;
            this.EditorPreviewText.className = 'wc-wysiwyg_pr -display-none';
            this.EditorPreviewText.oninput = event => {
                const target = event.target as HTMLTextAreaElement;
                this.EditorNode.innerHTML = target.value;
                this.value = target.value;
            };

            this.EditorAllowTags = allowTags.split(',');
            this.EditorTags = allTags.filter(tag => allowTags.includes(tag.tag));

            this.#EditProps = this.getAttribute('data-edit-props') !== null ? JSON.parse(this.getAttribute('data-edit-props')) : false;
            this.#Autocomplete = this.getAttribute('data-autocomplete') === '1';
            this.#HideBottomActions = this.getAttribute('data-hide-bottom-actions') === '1';
            //allow inline without ['video','audio','img']
            this.EditorInlineActions = this.EditorTags.filter(action =>  ['video','audio','img'].includes(action.tag) === false);

            //Check local storage key
            this.#SotrageKey = this.getAttribute('data-storage');
            if(this.#SotrageKey) {
                let storeValue = window.localStorage.getItem(this.#SotrageKey);
                if(storeValue) {
                    this.value = storeValue;
                }
            }
            this.EditorActionsSection = el('section', { classList: ['wc-wysiwyg_ec'] });
            //Clear format button
            this.EditorClearFormatBtn = el('button', {
                classList: ['wc-wysiwyg_btn', '-clear'],
                attrs: {
                    'data-hint': this.#t('clearFormat'),
                },
                props: {
                    innerHTML:'Ⱦ',
                },
            });
            //Inline selection actions panel
            this.EditorInlineActionsForm = el('form');
            this.EditorInlineDialog = el('dialog', {
                classList: ['wc-wysiwyg_di'],
                append: [this.EditorInlineActionsForm, this.EditorClearFormatBtn],
                props: {
                    //prevent submit
                    onsubmit: event => {
                        event.preventDefault();
                        event.stopPropagation();
                    },
                }
            });

            //Edit props
            if(this.#EditProps) {
                //Inline property editor
                this.EditorPropertyForm = el('form',{
                    styles: { display: 'none' },
                    classList: ['wc-wysiwyg_pf'],
                    props: {
                        onsubmit: event => {
                            event.preventDefault();
                            this.hideEditorInlineDialog();
                        },
                        onpointerup: event => event.stopPropagation(),
                    }
                });
                this.EditorInlineDialog.append(this.EditorPropertyForm);
            }

            //Autocomplete form
            if(this.#Autocomplete) {
                this.EditorAutoCompleteForm = el('form', {
                    classList: ['wc-wysiwyg_au'],
                    props: {
                        onsubmit: submitEvent => {
                            submitEvent.preventDefault();
                            submitEvent.stopPropagation();
                            const tagName = submitEvent.submitter.value;
                            const newEl = el(tagName, {
                                props: {
                                    innerHTML: tagName
                                }
                            });
                            submitEvent.target.parentElement.replaceWith(newEl);
                            newEl.focus();  
                        }
                    }
                });
            }
            
            //Actions in footer
            this.EditorBottomForm = el('fieldset', {
                classList: ['wc-wysiwyg_bt'],
            });
            
            if(this.#HideBottomActions === false) {
                //Toggler btn text/html
                this.EditorBottomFormViewToggle = el('button', {
                    classList: ['wc-wysiwyg_btn'],
                    attrs: {
                        'data-hint': this.#t('toggleViewMode'),
                        'data-mode': 'html5',
                    },
                    props: {
                        type:'button',
                        innerText: 'текст/html5',
                        onpointerup: event => {
                            let mode = this.EditorBottomFormViewToggle.getAttribute('data-mode');
                            let newMode = mode === 'html5' ? 'text' : 'html5';
                            this.EditorBottomFormViewToggle.setAttribute('data-mode', newMode);
                            this.EditorNode.style.display = newMode === 'html5' ? '' : 'none';
                            this.EditorPreviewText.classList.toggle('-display-none', newMode === 'html5' ? true : false)
                            if(newMode === 'text') {
                                this.EditorPreviewText.value = this.EditorNode.innerHTML;
                            }
                        }
                    }
                });
                ///New <p> append btn
                this.EditorBottomFormNewP = el('button', {
                    classList: ['wc-wysiwyg_btn'],
                    attrs: {
                        'data-hint': this.#t('addNewParahraph'),
                    },
                    props: {
                        type:'button',
                        innerText: '+ P',
                        onpointerup: event => {
                            const P = el('p', {props: {innerText: '/'}});
                            this.EditorNode.appendChild(P);
                            P.focus();
                        }
                    }
                });
                //Fullscreen button
                this.EditorFullScreenButton = el('button', {
                    classList: ['wc-wysiwyg_btn'],
                    attrs: {
                        'data-hint': this.#t('fullScreen'),
                    },
                    props: {
                        type: "button",
                        ariaRoleDescription: "button",
                        innerText: '🖥️',
                        onpointerup: event => {
                            this.requestFullscreen();
                        }
                    }
                });
        
                this.EditorBottomForm.append(
                    this.EditorBottomFormNewP,
                    this.EditorBottomFormViewToggle,
                    this.EditorFullScreenButton,
                );
            }

            //Check custom tags
            this.EditorCustomTags = JSON.parse( String(this.getAttribute('data-custom-tags')) );
            if(this.EditorCustomTags !== null) {
                //Custom panel tags 
                this.EditorCustomTagsForm = el('fieldset', {
                    classList: ['wc-wysiwyg_ce'],
                });
                //Make custom actions buttons panel
                this.#makeActionButtons(this.EditorCustomTagsForm, this.EditorCustomTags);

                this.appendChild(this.EditorCustomTagsForm);
            }

            //Node editable
            this.EditorNode = el('article', {
                classList: ['wc-wysiwyg_content', this.getAttribute('data-content-class')],
                props: {
                    contentEditable: true,
                    onpointerup: event => {
                        this.checkCanClearElement(event);
                        if(this.#EditProps) {
                            this.checkEditProps(event);
                        }
                    },
                    oninput: event => {
                        this.updateContent();
                        if(this.#Autocomplete) {
                            this.checkAutoComplete();
                        }
                    },
                    //Handle key bindings
                    onkeydown: event => {
                        //check hold alt
                        if(event.altKey) {
                            //alt+space - move caret to parent node next sibling
                            if(event.code === 'Space') {
                                const Selection = window.getSelection();
                                if(Selection.type === 'Caret') {
                                    //insertAdjacentElement dont support textNodes, first insert span
                                    const span = el('span');
                                    Selection.anchorNode.parentElement.insertAdjacentElement('afterend', span)
                                    //after replace span with textnode and select it
                                    const textN = document.createTextNode('&nbsp');
                                    span.replaceWith(textN);
                                    const range = document.createRange();
                                    range.selectNodeContents(textN);
                                    Selection.removeAllRanges();
                                    Selection.addRange(range);
                                }
                            }
                        }
                        //tag - hide editor dialog
                        if(event.code === 'Escape') {
                            this.hideEditorInlineDialog();
                        }
                        //enter - set p as default tag in newline
                        if(event.code === 'Enter' && event.shiftKey === false) {
                            const Selection = window.getSelection();
                            let tagName = 'p';
                            //tags with return default browser behavior
                            if(['LI', 'ARTICLE', 'P'].includes(Selection.anchorNode.parentElement.tagName)) {
                                return true;
                            }
                            const p = el(tagName, { props: { innerHTML: `&nbsp;` } });
                            Selection.anchorNode.parentElement.insertAdjacentElement('afterend', p);
                            const range = document.createRange();
                            range.selectNodeContents(p);
                            Selection.removeAllRanges();
                            Selection.addRange(range);
                            event.stopPropagation();
                            event.preventDefault();
                        }
                    }
                },
            });

            //Make action buttons
            this.#makeActionButtons(this.EditorActionsSection, this.EditorTags);
            this.#makeActionButtons(this.EditorInlineActionsForm, this.EditorInlineActions);
            
            //Inser wc-editor after textarea node
            this.append(
                this.EditorActionsSection,
                this.EditorInlineDialog,
                this.EditorNode,
                this.EditorPreviewText,
                this.EditorBottomForm,
            );
            this.EditorNode.innerHTML = this.EditorPreviewText.value;
            this.updateContent();

            this.#Connected = true;
        }
    }

    /**
     * Update content value and update behaviors
     */
    updateContent() {
        this.value = this.EditorNode.innerHTML;
        this.checkValidity();
        if(this.#SotrageKey) {
            window.localStorage.setItem(this.#SotrageKey, this.value);
        }
        this.dispatchEvent(new Event('oninput', { bubbles: true, cancelable: false }));
        this.updatePreviewEl(this.getAttribute('data-preview-el'));
    }

    /**
     * Update content at preview element if exists
     * @param selector css
     */
    updatePreviewEl(selector) {
        if(selector) {
            const previewEl = window.document.body.querySelector(selector);
            if(previewEl) {
                previewEl.innerHTML = this.value;
            }
        }
    }

    /**
     * Validate content
     * @returns boolean hasErrors
     */
    checkValidity() {
        let hasErros = false,
            errors= [];
        
        //Check attrs
        if(this.getAttribute('required') !== null) {
            if(String(this.EditorNode.textContent).length === 0) {
                hasErros = true;
                errors.push(this.#t('required'));
            }
        }
        if(Number(this.getAttribute('minlength'))) {
            if(String(this.EditorNode.textContent).length < Number(this.getAttribute('minlength'))) {
                hasErros = true;
                errors.push(`${this.#t('minlength')} ${this.getAttribute('minlength')}`);
            }
        }
        if(Number(this.getAttribute('maxlength'))) {
            if(String(this.EditorNode.textContent).length > Number(this.getAttribute('maxlength'))) {
                hasErros = true;
                errors.push(`${this.#t('maxlength')} ${this.getAttribute('maxlength')}`);
            }
        }
        if(this.getAttribute('filtertags')) {
            const disallowTags = this.getAttribute('filtertags').split(',');
            for (let i = 0; i < disallowTags.length; i++) {
                const checkTag = disallowTags[i];
                if(this.EditorNode.querySelector(checkTag)) {
                    hasErros = true;
                    errors.push(`${this.#t('filtertags')} ${checkTag}`);
                    break;
                }
            }
        }
        this.EditorNode.classList.toggle('-invalid', hasErros);
        let oldErrors = this.querySelector('.-errors');
        if(oldErrors) {
            oldErrors.parentElement.removeChild(oldErrors);
        }
        if(hasErros) {
            const errosEl = el('p', {
                props: {
                    innerHTML: errors.join('<br>')
                },
                classList: ['-errors'],
            })
            
            this.append(errosEl);
        }
        return hasErros === false;
    }

    /**
     * Check if need append autocompleted tags variants
     */
    checkAutoComplete() {
        //CHeck autococmplete 
        const Selecton = window.getSelection();
        if(Selecton !== null && Selecton.anchorNode !== null) {
            const SelectionParentEl = Selecton.anchorNode.parentElement as HTMLParagraphElement;
            
            if(SelectionParentEl !== null && 
                //if empty selection
                Selecton.toString() === '' && 
                //and parent node is <p>
                SelectionParentEl.nodeName === 'P' && 
                //and parent <p> is parentElement in EditorNode
                SelectionParentEl.parentElement === this.EditorNode) {
                    //and parent <p> inner text starts with `/` 
                    if(SelectionParentEl.innerText.startsWith('/')) {
                        const parsedTagName = SelectionParentEl.innerText.replace('/', '');
                        const filteredActions = this.EditorTags.filter(action => action.tag.toLocaleLowerCase().startsWith(parsedTagName.toLocaleLowerCase()));
                        if(filteredActions.length > 0) {
                            this.EditorAutoCompleteForm.innerHTML = '';
                            filteredActions.forEach(action => {
                                this.EditorAutoCompleteForm.appendChild(el('button', {
                                    classList: ['wc-wysiwyg_btn', `-${action.tag}`],
                                    attrs: {
                                        'data-hint': this.#t(action.tag) || null,
                                    },
                                    props: {
                                        type: 'submit',
                                        innerText: action.tag,
                                        value: action.tag,
                                    }
                                }))
                            });
                            SelectionParentEl.appendChild(this.EditorAutoCompleteForm);
                        } else {
                            //clear form
                            this.EditorAutoCompleteForm.innerHTML = '';
                            //if exist in DOM detach
                            if(this.EditorAutoCompleteForm.parentElement) {
                                this.EditorAutoCompleteForm.parentElement.removeChild(this.EditorAutoCompleteForm);
                            }
                        }
                    }
            }
        }
    }

    /**
     * Show and position inline actions dialog at targetNode
     **/
    showEditorInlineDialog() {
        this.EditorInlineDialog.show();
    }

    /**
     * Hide inline dialog
     **/
    hideEditorInlineDialog() {
        if(this.#EditProps){
            this.EditorPropertyForm.style.display = 'none';
        }
        this.EditorInlineDialog.close();
    }
    
    /**
     * Checking and clear tag, if can do it
     * @param event 
     */
    checkCanClearElement(event:Event) {
        const eventTarget = event.target as HTMLElement;
        if(eventTarget !== this.EditorNode) {
            if(eventTarget.nodeName !== 'P' 
            && eventTarget.nodeName !== 'SPAN') {
                this.EditorClearFormatBtn.style.display = 'inline-block';
                this.EditorClearFormatBtn.innerHTML = `Ⱦ ${eventTarget.nodeName}`,
                this.EditorClearFormatBtn.onpointerup = (event) => {
                    eventTarget.replaceWith(document.createTextNode(eventTarget.textContent));
                }
                this.showEditorInlineDialog();
            } else { 
                this.EditorClearFormatBtn.style.display = 'none';
                this.EditorClearFormatBtn.onpointerup = undefined;
            }
        }
    }

    /**
     * Checking click tag for editable props
     **/
    checkEditProps(event) {
        //Check need edit props
        const eventTarget = event.target as HTMLElement;
        
        //Check exist prop\attr
        if(this.#EditProps[eventTarget.nodeName]) {
            const props = this.#EditProps[eventTarget.nodeName];
            event.stopPropagation();
            this.EditorPropertyForm.style.display = '';
            this.showEditorInlineDialog();
            this.EditorPropertyForm.setAttribute('data-tag', eventTarget.nodeName);
            this.EditorPropertyForm.innerHTML = '';
            for (let i = 0; i < props.length; i++) {
                const tagProp = props[i];
                const isAttr = tagProp.indexOf('data-') > -1 || tagProp === 'class';
                this.EditorPropertyForm.append(el('label', {
                    props: { innerText: `${tagProp}=` },
                    append: [
                        el('input', {
                            attrs: { placeholder: tagProp },
                            classList: ['wc-wysiwyg_inp'],
                            props: {
                                value: isAttr ? eventTarget.getAttribute(tagProp) : eventTarget[tagProp] || '',
                                oninput: (eventInput) => {
                                    const eventInputTarget = eventInput.target as HTMLInputElement;
                                    if(tagProp === 'class') {
                                        eventTarget.className = eventInputTarget.value;
                                    }
                                    if((isAttr || tagProp === 'datetime') && eventInputTarget !== null) {
                                        eventTarget.setAttribute(tagProp, eventInputTarget.value)
                                    } else {
                                        eventTarget[tagProp] = eventInputTarget.value;
                                    }
                                    this.updateContent();
                                }
                            }
                        })
                    ]
                }));
            }
            //add submit button for better UX
            this.EditorPropertyForm.append(el('button', {
                classList: ['wc-wysiwyg_btn'],
                props: {
                    type: 'submit',
                    innerHTML: '&#8627;',
                },
            }));
        }
    }

    #makeActionButtons(toEl:HTMLElement, actions) {
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const button = el('button', {
                classList: ['wc-wysiwyg_btn', `-${action.tag}`],
                props: {
                    tabIndex: -1,
                    type:'button',
                    textContent: action.is ? `${action.tag} is=${action.is}` : action.tag,
                    onpointerup: (event) => this.#tag(action.tag, event, action.is),
                },
                attrs: {
                    'data-hint': action.hint ? action.hint : this.#t(action.tag) || '-',
                }
            });
            //-wc
            //Make button with 
            toEl.appendChild(button);
        }
    }


    /**
     * Default behaviors fot tag actions
     */
     #tag = (tag:string, event:Event|false = false, is:boolean|string = false) => {
        switch (tag) {
            case 'audio':
                this.#Media('audio');
                break;
            case 'video':
                this.#Media('video');
                break;
            case 'img':
                this.#Image();
                break;
            default:
                this.#wrapTag(tag, is);
                break;
        }
    }

    /**
     * Wrap content in <tag>
     **/
    #wrapTag = (tag, is:boolean|string = false) => {
        const isList = ['ul', 'ol'].includes(tag);
        const Selection = window.getSelection();
        let className = null;
        let defaultOptions = {
            classList: className ? className : undefined,
        } as any;
        if(isList) {
            tag = 'li';
        }
        if(is) {
            defaultOptions.options = {is};
        }
        let tagNode = el(tag, defaultOptions);
        
        if (Selection !== null && Selection.rangeCount) {
            if(['ul', 'ol'].includes(tag)) {
                const list = el(tag);
                tagNode.replaceWith(list);
                list.append(tagNode)
            }
            const range = Selection.getRangeAt(0).cloneRange();
            range.surroundContents(tagNode);
            Selection.removeAllRanges();
            Selection.addRange(range);
            if(Selection.toString().length === 0) {
                tagNode.innerText = tag;
            }
            this.updateContent();
        }
    }
 
    /**
     * Insert <audio>
     **/
    #Media = (tagName:string) => {
        const mediaSrc = prompt('src', '');
        if(mediaSrc === '') {
            return false;
        }
        const mediaEl = el(tagName, { attrs: { controls: true }, props: { src: mediaSrc } } );
        this.EditorNode.append(mediaEl);
        this.updateContent();
    }

    /**
     * Insert <img>
     **/
    #Image = () => {
        const src = prompt('IMG URL') ;
        const caption = prompt('IMG caption');
        const img = new Image();
        if(src) {
            img.src = src;
        } else {
            //@todo
            return alert('Invalid src');
        }
        
        if(caption) {
            const figure = el('figure');
            
            const figcaption = el('figcaption', {
                props: {
                    textContent: caption
                }
            });
            figure.appendChild(img);
            figure.appendChild(figcaption);

            img.setAttribute('alt', caption);
            this.EditorNode.appendChild(figure);
        } else {
            this.EditorNode.appendChild(img);
        }
    }

    /**
     * Translate function
     * @param key:string phrase key
     * @returns 
     */
    #t(key:string):string {
        let lang = this.lang;
        return t[lang] ? t[lang][key] || "-" : t["en"][key];
    }
    //define WCWYSIWYG as custom element
    static define(name = 'wc-wysiwyg') {
        window.customElements.define(name, WCWYSIWYG);
    }
}
export default WCWYSIWYG;
export const define = WCWYSIWYG.define;