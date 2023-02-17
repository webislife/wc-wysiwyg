/**
 * Short for document.createElement
 * @param tagName element tag name
 * @param params list of object params for document.createElements
 * @returns HTMLElement\CustomElement
 */
 export const el = (tagName:keyof HTMLElementTagNameMap|string, {classList, styles, props, attrs, options, append}:{
    classList?: string[],
    styles?: object,
    props?: object,
    attrs?: object,
    options?: {
        is?:string
    },
    append?: Element[]
} = {}):any => {
    if(!tagName) {
        throw new Error(`Undefined tag ${tagName}`);
    }
    const element = document.createElement(tagName, options);
    // element.classList
    if(classList) {
        for (let i = 0; i < classList.length; i++) {
            if(classList[i]){
                element.classList.add(classList[i]);
            }
        }
    }
    // element.style[prop]
    if(styles) {
        Object.assign(element.style, styles);
    }
    // element[prop]
    if(props) {
        const propKeys = Object.keys(props);
        for (let i = 0; i < propKeys.length; i++) {
            const key = propKeys[i];
            element[key] = props[key];
        }
    }
    // element.setAttribute(key,val)
    if(attrs) {
        const attrsKeys = Object.keys(attrs);
        for (let i = 0; i < attrsKeys.length; i++) {
            const key = attrsKeys[i];
            if(attrs[key]) {
                element.setAttribute(key, attrs[key]);
            }
        }
    }
    //append child elements
    if(append) {
        element.append(...append);
    }
    
    return element;
};