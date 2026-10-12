# Contributing

Thanks for considering a contribution to `wc-wysiwyg-editor`.

## Development

Requirements: Node.js >= 18, npm.

```bash
npm ci
npm run dev      # vite dev server for index.html demo
npm run typecheck
npm run build    # vite lib (ES + UMD + CSS) + .d.ts into dist/
```

`dist/` is git-ignored — do not commit build artifacts. CI rebuilds them
on every pull request and attaches them as workflow artifacts.

## Pull requests

1. Fork and create a topic branch.
2. Keep the runtime dependency-free (zero `dependencies`).
3. Sanitize any new `innerHTML` assignment via `src/core/sanitize.ts`.
4. Use `click` + `aria-label` for buttons (never `onpointerup`-only).
5. Normalize languages via `src/core/i18n.ts` (`ru-RU` → `ru`).
6. Register extensions via `registerExtension()` in `src/core/extensions.ts`
   and drain them in the editor — do not hand-roll `window._WCWYSIWYG` pushes.
7. Run `npm run typecheck && npm run build` before pushing.
8. Describe user-visible changes in `CHANGELOG.md`.

## Security

This is an HTML editor: treat every report of unsanitized HTML injection
as high priority. The sanitizer lives in `src/core/sanitize.ts`; blocked
tags can be extended per-instance via the `filtertags` attribute.

Please report vulnerabilities via GitHub Issues (redact exploit payloads
or use a minimal PoC).
