# Discord Syntax

A single-page, browser-local toolkit for better Discord messages. Dark, responsive, keyboard accessible, and ready to publish on GitHub Pages.

## What’s inside

- **Text formatter:** selection-based toolbar, Discord-like preview, combined styles, headings, subtext, lists, quotes, spoilers, code, links, undo/redo, and copying.
- **Timestamps:** all nine documented formats, automatic local timezone detection, searchable timezone override, previews for another timezone, quick time adjustments, and insertion into your draft.
- **Templates:** event announcement, reminder, maintenance notice, and welcome message.
- **Syntax guide:** searchable, copyable examples with previews.

Drafts, the active tab, and your chosen timezone are saved in this browser’s `localStorage`. Use **Clear saved data** to remove them. No accounts, analytics, API requests, or backend. Nothing is sent to Discord; paste the copied syntax yourself.

## Run locally

From this folder, run:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open **http://127.0.0.1:4173**. Use a local HTTP server rather than opening `index.html` directly: browsers restrict JavaScript modules over `file://`.

There are no production install or build steps. All scripts, styles, fonts (system fonts), icons, and the pinned timezone library are local.

## Publish on GitHub Pages

1. Put this project in a GitHub repository and push it to your publishing branch, usually `main`.
2. In the repository, open **Settings → Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Select your branch and **/ (root)**, then **Save**.
5. Once GitHub finishes publishing, open the URL displayed in Pages settings.

For a repository named `Syntax`, the URL is typically `https://YOUR-USERNAME.github.io/Syntax/`. All asset paths are relative, so repository paths and user-site roots both work. Keep `.nojekyll` in the published root. No Actions workflow or custom domain is required.

## Using the tools

Select text in the formatter and press a toolbar button. Without a selection, inline actions insert example text; heading and list actions format the current line. Line actions cover complete selected lines. **Ctrl/Cmd+B**, **I**, and **U** apply common styles; **Ctrl/Cmd+Z** and **Ctrl/Cmd+Shift+Z** undo and redo. Arrow keys move between tool tabs and between toolbar buttons.

The timestamp input means the date and wall-clock time **in the selected input timezone**. Changing that timezone retains the entered date and time. The separate reader-timezone control only changes previews. Copying or inserting always uses integer Unix **seconds**, not milliseconds.

Daylight-saving gaps are rejected. If a time occurs twice, explicitly select its UTC offset before copying. **+1 day** keeps the wall-clock time on the next calendar date and revalidates daylight saving; **+15 minutes** and **+1 hour** advance the actual instant. “Time only” and “date only” still refer to a complete instant, so different readers can see a different calendar date.

The preview approximates Discord’s supported formatting. It renders raw HTML as text, permits HTTP/HTTPS links, and does not execute code. Syntax highlighting and exact Discord typography are not reproduced. Pasted triple backticks inside a generated code block receive an invisible separator to keep the outer fence intact; inline code converts embedded backticks to lookalikes and newlines to spaces. Messages longer than 2,000 characters show a standard-limit notice; copying preserves the full message. Large previews are capped at 20,000 characters. Clipboard denial opens a manual-copy dialog.

## Validation

With Node.js 20 or newer:

```sh
node --test tests/core.test.mjs
```

Core tests need no installed packages. They cover formatting, links, history, timestamp styles, clock changes, fractional offsets, date boundaries, relative time, and unavailable/corrupt storage.

For DOM renderer and page-structure tests, install the optional development dependency:

```sh
npm install
npm run test:dom
```

These tests use LinkeDOM and do not replace real-browser verification. Before publishing, check the page in desktop and mobile browsers: all four tabs, selected-text formatting, undo/redo, spoiler reveal, link dialog, copy and copy-denial fallback, template replacement, draft restoration, storage clearing, timestamp gaps/overlaps, keyboard focus, narrow layouts, and the repository subpath.

## Project structure

`index.html` is the entry point; `assets/style.css` defines the responsive layout. JavaScript modules in `assets/js/` separate editor operations, safe preview rendering, timezone logic, local storage, starter content, and UI wiring. There are no public API endpoints.

## Dependency and references

Luxon **3.7.2** is vendored in `assets/vendor/` under the MIT licence; its copyright and licence are included in [LUXON-LICENSE.md](assets/vendor/LUXON-LICENSE.md). The file is the published browser build mirrored by [cdnjs](https://github.com/cdnjs/cdnjs/tree/master/ajax/libs/luxon/3.7.2). LinkeDOM **0.18.12** is an optional test-only dependency.

- [Discord Markdown guide](https://support.discord.com/hc/en-us/articles/210298617)
- [Discord timestamp reference](https://discord.com/developers/docs/reference#message-formatting)
- [GitHub Pages configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

Independent community tool; not affiliated with Discord.
