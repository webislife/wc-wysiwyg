# wc-wysiwyg custom element

WC-WSIWYG HTML5 Editor written in TypeScript and designed by web-componennt, support all JS frameworks and browsers.
See full demo - [wc-wysiwyg demo](https://webislife.ru/demo/wc-wysiwyg/) list and demo of all editor features


## Install

```
npm i wc-wysiwyg-editor --save
```

## Features
✅ Multilingual support via [HTMLElement.lang](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/lang) attribute  🇷🇺/🇺🇸 supported by default

✅ CSS styles for all popular HTML5 tags

✅ CSS support for 🔥 in bulleted lists

✅ Support for style inheritance via CSS class in the `data-content-class` attribute of emoji in bulleted lists

✅ Inline actions on selected text

✅ Storing value in `window.localStorage` and restoring after reload, check in comment form below

✅ Eetting  editable properties of any tags, the number of tags and attributes are configurable
✅ Autocomplete as you type / for supported tags in new paragraph

✅ Text\HTML5 view switcher

✅ Size Clear Button `Ⱦ`

✅ Live preview

- ✅ Keyboard Shortcuts
    - `ALT`+`SPACE` toggle the current caret pointer outside the tag
    - `ESCAPE` close bottom editor dialog box

✅ Validation required, minlength, maxlength, filtertags

✅ Inserting `<audio>` element

✅ Inserting `<video>` element

## Commands

- Available package commands

    Build scss styles
```
npm run sass
```
- Compile TypeScript
```
npm run tsc
```
- Minify code with babel-minify after TypeScript compile
```
npm run babel-minify
```
build all stpes 1.sass 2.tsc 3.babel-minif

```
npm run build
```

## Integration WC-WYSIWYG element demo
<!--
```
<wc-wysiwyg value="foo">
  <textarea></textarea>
</wc-wysiwyg>
```
-->
First, include JS and define custom element
```javascript
import('/src/components/wc-wysiwyg.js').then(esm => {
    esm.define();
});
```
And use in HTML

```html
<wc-wysiwyg id="wc-demo-comment"
    data-allow-tags="strong,u,i,b,q,blockquote,a,img,pre"
    data-storage="demo-comment"
    data-hide-bottom-actions="1"
    is="wc-wysiwyg"
    required
    minlength="5"
    maxlength="500">
    <textarea>your comment</textarea>
</wc-wysiwyg>
```


See full demo - [wc-wysiwyg demo](https://webislife.ru/demo/wc-wysiwyg/) list and demo of all editor features

Dont forgot star on git! Thank you! Enojoy!

Dev by strokoff - make web, not war)