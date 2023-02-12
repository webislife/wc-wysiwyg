# wc-time
WYWSIWYG HTML5 Editor written in TypeScript and designed by web-componennt, support all JS frameworks and browsers.
See full demo - [wc-wysiwyg demo](https://webislife.ru/demo/wc-wysiwyg/) list and demo of all editor features


## Install

```
npm i wc-wysiwyg
```

## Commands

Available package commands

```
`npm run sass' - build scss styles
`npm run tsc' - run typescript
`npm run babel-minify' - minify code after typescript
`npm run build' - build all stpes 1.sass 2.tsc 3.babel-minify
```

## Custom element demo
<!--
```
<custom-element-demo>
  <template>
    <link rel="import" href="index.html">
    <next-code-block></next-code-block>
  </template>
</custom-element-demo>
```
-->
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

Dev by strokoff.ru - make web, not war)