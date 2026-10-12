# wc-wysiwyg custom element

WC-WYSIWYG HTML5 editor written in TypeScript and designed as a web component. Works with all major JS frameworks and browsers.

See full demo — [wc-wysiwyg demo](https://webislife.ru/demo/wc-wysiwyg/) with the list of all editor features.

> No Shadow DOM by design: the editor inherits host-page CSS (content styles,
> `data-content-class`, CMS themes) so inserted semantic HTML is styled by the
> page. Scope your CSS (e.g. `.wc-wysiwyg_content …`) if you need isolation.

## Features

- ✅ Multilingual support via `lang` resolution (🇷🇺/🇬🇧 by default; `ru-RU` correctly resolves to `ru`)
- ✅ Support for all major browsers
- ✅ Reusable with all major JS frameworks (emits a real `input` event)
- ✅ CSS styles for all popular HTML5 tags
- ✅ CSS support for 🔥 emoji in bulleted lists
- ✅ Style inheritance via CSS class in the `data-content-class` attribute
- ✅ Inline actions on selected text
- ✅ Value persistence in `window.localStorage` (quota-safe) with restore after reload
- ✅ Editing editable properties of any tags; tag list and attributes are configurable
- ✅ Autocomplete as you type `/` for supported tags in a new paragraph
- ✅ `Text/HTML5` view switcher
- ✅ Clear-format button `Ⱦ`
- ✅ Live preview (sanitized)
- ✅ Keyboard support
  - `Alt`+`Space` moves the caret outside the current tag
  - `Escape` closes the property dialog
  - All toolbar buttons are native `<button>`s (Enter/Space work, `aria-label`s included)
- ✅ Validation: `required`, `minlength`, `maxlength`, `filtertags`
- ✅ Inserting `<audio>` / `<video>` elements (URL-validated, `Cancel` safe)
- ✅ Support for extensions
  - Color text/background editor
  - Emoji table (clipboard with HTTP fallback)
  - Preset list
- ✅ XSS hardening: output sanitizer strips `script`/`iframe`/`object`, `on*` handlers, and `javascript:` URLs
- 🚀 Vite-powered build (`ES` + `UMD` + CSS + `.d.ts`, zero runtime dependencies)

## Install

```bash
npm i wc-wysiwyg-editor --save
```

## Usage

Include the styles and the script (extension registration first, editor second):

```html
<link rel="stylesheet" href="node_modules/wc-wysiwyg-editor/dist/style.css" />
<script type="module">
  import 'wc-wysiwyg-editor/dist/wc-wysiwyg.es.js';
  // optional extensions (each self-registers; load before defining if you
  // rely on the legacy window._WCWYSIWYG queue, otherwise import anywhere):
  // import 'wc-wysiwyg-editor/dist/extensions/...' (if published separately)
</script>
```

Source-layout usage (this repo):

```javascript
await Promise.all([
  import('./src/extensions/colorerDialog.ts'),
  import('./src/extensions/emojiDialog.ts'),
  import('./src/extensions/presetList.ts'),
]);
const { define } = await import('./src/wc-wysiwyg.ts');
define(); // registers <wc-wysiwyg>
```

HTML:

```html
<wc-wysiwyg
  id="wc-demo-comment"
  data-allow-tags="strong,u,i,b,q,blockquote,a,img,pre"
  data-storage="demo-comment"
  data-hide-bottom-actions="1"
  required
  minlength="5"
  maxlength="500"
>
  <textarea>your comment</textarea>
</wc-wysiwyg>
```

Listening to changes (framework-friendly):

```javascript
document.querySelector('wc-wysiwyg').addEventListener('input', (e) => {
  console.log(e.target.value); // sanitized HTML
});
```

## Commands

```bash
npm run dev        # vite dev server (demo in index.html)
npm run typecheck  # tsc --noEmit
npm run build      # vite build (ES + UMD + CSS) + .d.ts into dist/
npm run preview    # preview the production build
```

`dist/` is git-ignored. CI rebuilds it on every pull request and release
and uploads it as a workflow artifact; `npm publish` ships the CI-built files.

## Security model

User-controlled strings (initial `<textarea>` value, `localStorage` restore,
preview element, pasted HTML) pass through `src/core/sanitize.ts`:

- blocked elements (`script`, `iframe`, `object`, `embed`, … plus per-instance
  `filtertags`) are removed,
- `on*` attributes, `javascript:` URLs, and `srcdoc` are stripped,
- live typing is not rewritten (caret preservation); the sanitized copy is
  what lands in `value`, `localStorage`, and the preview.

`filtertags` violations are additionally reported by `checkValidity()`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Changes are described in
[CHANGELOG.md](./CHANGELOG.md). Please star the repo if it helps — enjoy!

Dev by strokoff — make web, not war.
