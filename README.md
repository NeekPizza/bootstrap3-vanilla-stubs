# bootstrap3-vanilla-stubs

[![CI & Publish](https://github.com/NeekPizza/bootstrap3-vanilla-stubs/actions/workflows/publish.yml/badge.svg)](https://github.com/NeekPizza/bootstrap3-vanilla-stubs/actions/workflows/publish.yml)
[![npm](https://img.shields.io/npm/v/bootstrap3-vanilla-stubs.svg)](https://www.npmjs.com/package/bootstrap3-vanilla-stubs)

A dependency-free, jQuery-free drop-in replacement for **Bootstrap 3's JavaScript
plugins**. Keep your Bootstrap 3 markup and CSS, delete `jquery.js` and
`bootstrap.js`, and clear the CVEs that come with them.

- **Zero runtime dependencies.** Native DOM APIs only, ~5 KB min+gzip.
- **Same markup:** `data-toggle="modal|dropdown|collapse|tab|pill"`, `data-target`,
  `data-dismiss="modal"`, `data-parent`, `data-backdrop`, `data-keyboard`.
- **Same events:** `show.bs.modal`, `shown.bs.modal`, `hide.bs.collapse`, … with
  `relatedTarget` and `preventDefault()` support.
- **Same calls:** `$('#myModal').modal('show')` keeps working through a tiny
  jQuery-compatible shim, or attaches to a real jQuery if you still load one.

## Why

Bootstrap 3 reached end of life in 2019. Its JavaScript and the jQuery versions it
pairs with are flagged by scanners (e.g. Bootstrap XSS advisories CVE-2018-14040,
CVE-2018-14041, CVE-2018-14042, CVE-2019-8331, CVE-2024-6484, and jQuery's
CVE-2020-11022 / CVE-2020-11023). Most sites only need the modal, dropdown, collapse
and tab behaviour. This library supplies exactly that and nothing else.

## Installation

```bash
npm install bootstrap3-vanilla-stubs
```

### Classic `<script>` tag (most legacy sites)

Replace jQuery and `bootstrap.js` with one file:

```html
<link rel="stylesheet" href="/css/bootstrap.min.css"> <!-- keep your BS3 CSS -->

<!-- remove: <script src="jquery.min.js"></script> -->
<!-- remove: <script src="bootstrap.min.js"></script> -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap3-vanilla-stubs@1/dist/bootstrap3-vanilla-stubs.min.js"></script>
```

The script build initialises itself, wires up all `data-*` attributes and exposes
`window.Bootstrap3VanillaStubs`.

### ES modules / bundlers

```js
import 'bootstrap3-vanilla-stubs'; // auto-initialises in the browser

// or use the API directly
import { Modal, Collapse } from 'bootstrap3-vanilla-stubs';
```

CommonJS (`require('bootstrap3-vanilla-stubs')`) is supported too. Importing in
Node/SSR is safe: nothing touches the DOM until a `window` exists.

## How it works

On load the library attaches three delegated listeners to `document` (`click`,
`keydown`, `focusin`). Every interaction is resolved from the event target, so
elements added to the page later work without any re-initialisation. State is
stored in the same CSS classes Bootstrap 3 uses (`.in`, `.open`, `.active`,
`.collapsed`, `body.modal-open`), so your existing stylesheet keeps working.

| Plugin   | Markup                                                         | Behaviour |
| -------- | -------------------------------------------------------------- | --------- |
| Modal    | `data-toggle="modal"` + `data-target="#id"` or `href="#id"`    | Backdrop, `body.modal-open`, scrollbar compensation, closes on `data-dismiss="modal"`, background/backdrop click and `Esc`, keeps focus inside, restores focus on close, supports stacked modals |
| Dropdown | `data-toggle="dropdown"` inside `.dropdown` / `.btn-group`     | Toggles `.open` on the parent, closes on outside click, menu-item click or `Esc`, ↑/↓ keyboard navigation, stays open while typing in a form inside the menu |
| Collapse | `data-toggle="collapse"` + `data-target` (any selector) / `href` | Toggles `.in`, syncs `.collapsed` and `aria-expanded` on every trigger, accordions via `data-parent` |
| Tab      | `data-toggle="tab"` or `data-toggle="pill"` with `href="#pane"` | Activates the `<li>` and pane, handles `.fade`/`.in`, tabs inside dropdown menus |

### Options (`data-*` or JS)

| Plugin   | Option     | Default | Notes |
| -------- | ---------- | ------- | ----- |
| Modal    | `backdrop` | `true`  | `false` = no backdrop; `'static'` = backdrop that doesn't close on click |
| Modal    | `keyboard` | `true`  | Close on `Esc` |
| Modal    | `show`     | `true`  | Show immediately when initialised via `.modal({...})` |
| Collapse | `parent`   | `null`  | Selector of an accordion container |
| Collapse | `toggle`   | `true`  | Toggle on initialisation (Bootstrap 3 behaviour) |

Modal options can be set on the modal element or on the trigger.

## API usage

### jQuery-style (legacy code keeps working)

```js
$('#myModal').modal('show');            // 'show' | 'hide' | 'toggle' | 'handleUpdate'
$('#myModal').modal({ backdrop: 'static', keyboard: false });
$('.dropdown-toggle').dropdown('toggle');
$('#details').collapse('hide');         // 'show' | 'hide' | 'toggle'
$('#tabs a[href="#profile"]').tab('show');

$('#myModal').on('hidden.bs.modal', function (e) { /* … */ });
$(document).on('shown.bs.tab', 'a[data-toggle="tab"]', function (e) {
  console.log(e.target, e.relatedTarget);
});
```

**Without jQuery on the page**, a small shim is installed as `window.jQuery` (and as
`window.$` if nothing else owns it). It supports selectors, `$(fn)` ready callbacks,
`.each`, `.get`, `.find`, `.on`/`.off`/`.one` (including delegation and namespaces),
`.trigger`, `.addClass`/`.removeClass`/`.toggleClass`/`.hasClass`, and the plugin
methods. It is **not** a full jQuery. Code that uses other jQuery features
(`$.ajax`, animations, DOM building from HTML strings) needs a separate migration.

**With jQuery already loaded**, the plugin methods are added to `jQuery.fn`, except
ones that already exist (for example from a real `bootstrap.js`). Events are
dispatched natively *and* through jQuery, so both `addEventListener('shown.bs.modal')`
and `$(el).on('shown.bs.modal')` fire.

Calling a method that doesn't exist (`.modal('explode')`) logs a warning instead of
throwing. Bootstrap 3 plugins this library does not implement (`tooltip`, `popover`,
`carousel`, `scrollspy`, `affix`, `alert`, `button`) are present as chainable
**no-ops**, so leftover calls don't crash the page.

### Vanilla JS

```js
import { Modal, Dropdown, Collapse, Tab } from 'bootstrap3-vanilla-stubs';

const modal = Modal.getOrCreateInstance('#myModal', { backdrop: 'static' });
modal.show();
modal.hide();
modal.toggle();
modal.isShown; // boolean

Dropdown.getOrCreateInstance('#menuToggle').toggle();          // also show() / hide()
Collapse.getOrCreateInstance('#details', { toggle: false }).show();
Tab.getOrCreateInstance('#profile-tab').show();

Modal.getInstance(element); // existing instance or null
instance.dispose();         // forget the instance
```

### Events

All events bubble and are cancelable via `event.preventDefault()` on the `show`/`hide` phase.

| Plugin   | Fired on              | Events                                                     | `relatedTarget` |
| -------- | --------------------- | ---------------------------------------------------------- | --------------- |
| Modal    | `.modal`              | `show.bs.modal`, `shown.bs.modal`, `hide.bs.modal`, `hidden.bs.modal` | Trigger element (show/shown) |
| Dropdown | parent (`.dropdown`)  | `show.bs.dropdown`, `shown.bs.dropdown`, `hide.bs.dropdown`, `hidden.bs.dropdown` | Toggle |
| Collapse | `.collapse` element   | `show.bs.collapse`, `shown.bs.collapse`, `hide.bs.collapse`, `hidden.bs.collapse` | — |
| Tab      | tab `<a>`             | `hide.bs.tab`, `show.bs.tab`, `hidden.bs.tab`, `shown.bs.tab` | The other tab |

```js
document.getElementById('myModal').addEventListener('show.bs.modal', (e) => {
  if (!formIsReady()) e.preventDefault();
});
```

### Initialisation control

```html
<script>window.BS3_VANILLA_STUBS_MANUAL_INIT = true;</script>
<script src=".../bootstrap3-vanilla-stubs.min.js"></script>
<script>
  Bootstrap3VanillaStubs.init({ jqueryShim: false }); // data API only, no window.$
</script>
```

| Function                              | Description |
| ------------------------------------- | ----------- |
| `init({ jqueryShim = true })`         | Attach the data-API listeners (idempotent) and optionally install the jQuery shim |
| `destroy()`                           | Detach listeners and close open modals and dropdowns |
| `installJQueryShim({ force = false })`| Add plugin methods to a real jQuery, or install the shim; `force` overwrites existing plugins |
| `createJQueryShim()`                  | Return a fresh shim `$` without touching `window` |

## Differences from Bootstrap 3

- **No JavaScript transitions.** Classes switch immediately and `shown`/`hidden`
  events fire synchronously. CSS transitions on `.fade.in` still play when showing.
  Collapse doesn't animate height.
- `remote` modal content (deprecated in BS3) is not supported. Load content yourself
  in a `show.bs.modal` handler.
- Tooltip, popover, carousel, scrollspy, affix, alert and button are no-op stubs.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. In short:

- **Never push to `main`.** All changes go through Pull Requests.
- Branch from `main` using a prefix:
  - `feature/` for new features or capabilities (`feature/modal-animations`)
  - `fix/` for bug fixes (`fix/dropdown-event-bubbling`)
  - `chore/` for build scripts, dependency updates and CI config (`chore/update-vitest`)
- PRs must pass the automated test suite (Node 22 and 24, with coverage thresholds)
  and the branch-name check before merging.

```bash
npm ci
npm test          # Vitest + happy-dom
npm run coverage  # what CI runs
npm run build     # dist/: .mjs, .cjs and minified IIFE
```

Releases are published to npm automatically by GitHub Actions when a GitHub Release
is created (see [CONTRIBUTING.md](CONTRIBUTING.md#releasing-maintainers)).

## License

[MIT](LICENSE)
