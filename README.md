# wc-wysiwyg custom element

WC-WSIWYG HTML5 Editor written in TypeScript and designed by web-componennt, support all JS frameworks and browsers.
See full demo - [wc-wysiwyg demo](https://webislife.ru/demo/wc-wysiwyg/) list and demo of all editor features

## Features
✅ Multilingual support via [HTMLElement.lang](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/lang) attribute  🇷🇺/🇺🇸 supported by default

✅ 🌐 Support all major browsers

✅ 🚀 Reusable between all major JS frameworks

✅ CSS styles for all popular HTML5 tags

✅ CSS support for 🔥 in bulleted lists

✅ Support for style inheritance via CSS class in the `data-content-class` attribute of emoji in bulleted lists

✅ Inline actions on selected text

✅ Storing value in `window.localStorage` and restoring after reload, check in comment form below

✅ Eetting  editable properties of any tags, the number of tags and attributes are configurable

✅ Autocomplete as you type `/` for supported tags in new paragraph

✅ `Text\HTML5` view switcher

✅ Clear format tag button `Ⱦ`

✅ Live preview

- ✅ Keyboard Shortcuts
    - `ALT`+`SPACE` toggle the current caret pointer outside the tag
    - `ESCAPE` close bottom editor dialog box

✅ Validation `required`, `minlength`, `maxlength`, `filtertags`

✅ Inserting `<audio>` element

✅ Inserting `<video>` element

- ✅ Suppoer extensions
    - Color text and background editor
    -  Emoji table

🚀 Vite support for wc-wysiwyg develop 

## Install

```
npm i wc-wysiwyg-editor --save
```

## Commands

- Available package commands

- Build scss styles
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
- build all stpes 1.sass 2.tsc 3.babel-minif

```
npm run build
```
- start vite serve mode for wc-wysiwyg development

## Integration WC-WYSIWYG element demo
<!--
```
<wc-wysiwyg value="foo">
  <textarea></textarea>
</wc-wysiwyg>
```
-->
First need integrate wc-wysiwyg styles, you have 2 way, vanila css in `dist/sass` or scss in `src/sass` just include in your web project

Second, include JS and define custom element
```javascript
import('/src/components/wc-wysiwyg.js').then(esm => {
    //you can pass any name into define fn
    esm.define();
});
```

For use extensions, load before wc-wysiwig
```javascript
Promise.all([
    import('./src/extensions/colorerDialog.ts'),
    import('./src/extensions/emojiDialog.ts'),
    import('./src/extensions/presetList.ts'),
]).then(modules => {
    import('./src/wc-wysiwyg.ts').then(esm => esm.define());
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