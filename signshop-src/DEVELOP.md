# Sign shop pricing app: how to make a new version

Layout:

- `src/sign-quote.html`: the app's page (UI + logic). It is also the claude.ai artifact version.
- `changelog.json`: what's new. Add an entry at the **top** for every release. The app shows it after an update.
- `tools/build_app.py <out_dir> <version>`: builds the installable offline app (PWA) into `out_dir`. It adds the HTML head, local fonts, html2canvas, manifest, `sw.js` (version-stamped cache), icons, backup/restore, update banner and print.
- `tools/make_icons.py`: app icons (run by the build).
- `tools/test_app.js <project_root> <built_app_dir>`: end-to-end check over `http://127.0.0.1:8765` (serve the built dir first). Covers offline reload, image export, and the update flow to 1.0.1 without data loss. Run it on a throwaway copy, because it rebuilds that copy as 1.0.1.
- `vend/` (not shipped): unpacked npm tarballs. Recreate them with:
  `cd vend && npm pack html2canvas@1.4.1 @fontsource/sarabun@5.3.0 @fontsource/kanit@5.3.0`, then extract each tarball into a folder named after it.

Hosting: GitHub Pages of `cokapon01-hue/JAWAT-Downloads`, served from the `gh-pages` branch, root folder.
Live app: https://cokapon01-hue.github.io/JAWAT-Downloads/signshop/ (this folder is `signshop-src/`, the served app is `../signshop/`).

Release steps (run inside `signshop-src/`, on branch `gh-pages`):

1. Edit `src/sign-quote.html`.
2. Add a `changelog.json` entry with the new version number (semver, e.g. 1.1.0).
3. `python3 tools/build_app.py ../signshop 1.1.0`
4. Commit and push `gh-pages`. Installed apps notice the changed `sw.js`, show "มีเวอร์ชันใหม่แล้ว" and update on one tap.
5. Optional offline zip for the shop: `python3 tools/build_app.py dist/คิดราคาป้าย 1.1.0 && python3 tools/package.py 1.1.0`

Never move the app out of `/JAWAT-Downloads/signshop/`. Installed apps and their saved data are tied to that address.

User data lives in `localStorage` under keys prefixed `signq:` (config, quotes, draft, calc, lastBackup, lastVersion). Never rename these keys or the hosting origin/path: data is tied to the origin. If a data shape changes, migrate it in `normalizeCfg` / on load. Never drop old fields.
