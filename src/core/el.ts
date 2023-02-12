/**
 * Short
 * @param tagName element tag name
 * @param params list of object params for document.createElements
 * @returns 
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
            const styleClass = classList[i];
            element.classList.add(styleClass)
        }
    }
    // element.style[prop]
    if(styles) {
        const stylesKeys = Object.keys(styles);
        for (let i = 0; i < stylesKeys.length; i++) {
            const key = stylesKeys[i];
            element.style[key] = styles[key];
        }
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
    if(append) {
        for (let i = 0; i < append.length; i++) {
            const appendEl = append[i];
            element.append(appendEl);
        }
    }
    return element;
};