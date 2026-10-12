# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.6] — 2026-10-12

### Fixed

- Crash on empty/invalid `data-edit-props` and `data-custom-tags` (safe JSON parse with fallback).
- Crash when `<textarea>` is missing or `querySelector` returns `null` (textarea is created automatically).
- `InvalidStateError` from `range.surroundContents()` on selections spanning node boundaries (manual fallback via `extractContents`).
- `getSelection()` no longer touches foreign selections and no longer crashes on `anchorNode === null`; returns `null` selection outside the editor.
- `disconnectedCallback` removed a non-existent `onFullscreenChange` listener (now uses a bound handler, no TS error).
- Implemented `attributeChangedCallback` for `observedAttributes = ['value']`.
- Emits `input` instead of `oninput` so forms and frameworks pick up changes.
- `prompt()` `null` (Cancel) no longer creates broken nodes; media URLs are validated (`http/https/blob/data` only).
- XSS hardening: allowlist sanitizer for initial value, `localStorage` restore, preview element, and paste (strips `script/iframe/object`, `on*` handlers, `javascript:` URLs).
- i18n: `navigator.language` (`ru-RU`) is normalized to `ru`; removed hardcoded Russian labels in favor of dictionary keys.
- Accessibility: toolbar buttons use `click` (keyboard/Enter/Space work) with `aria-label`s instead of `onpointerup`-only handlers.
- `localStorage` quota/private-mode errors no longer break typing.
- Removed dead commented `onpaste` block; paste is now sanitized plain/rich insert.
- Extensions: `colorerDialog` self-registers consistently, `console.log`s removed, `Proxy` replaced with explicit setters, color parsing supports hex/`rgb()`/`rgba()`/named colors; `emojiDialog` uses `writeText` with `execCommand` fallback and builds buttons via DOM (no giant `innerHTML`); `presetList` parses safely, renders names via `textContent`, and no longer destroys its wrapper.

### Changed

- Build is now a single `vite build` library (ES + UMD + CSS + `.d.ts` via `tsc`); removed `node-sass`, `babel-minify`, and the stale `sass + tsc + minify` chain.
- `dist/` is no longer committed — CI builds and uploads it as an artifact on every PR/release.
- Package metadata fixed for npm: `main`/`module`/`types`/`exports` point at real build outputs, `publishConfig` is npm `public` (was GitHub Packages), description typos fixed.
- `tsconfig.json` fixed (trailing comma, `include: ["src"]`, `strict`, declaration output).
- CI: `checkout@v4`/`setup-node@v4`, Node 22, `npm ci` with cache, `typecheck → build` on PRs; release workflow publishes to npm with provenance.
- Added `LICENSE` (MIT), `CHANGELOG.md`, `CONTRIBUTING.md`, issue templates.

## [1.0.5] — earlier

- Pre-existing demo and feature set (see git history).
