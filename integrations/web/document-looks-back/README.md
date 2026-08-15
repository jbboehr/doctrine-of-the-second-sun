# The Document Looks Back

The Document Looks Back is an optional browser integration that makes an occasional letter in technical prose form one
eye, notice the reader, and return to ordinary type. It does not replace text nodes or alter document layout.

The effect is opt-in. Only text inside an element marked with `data-document-looks-back` is eligible.

## Installation

Copy this integration and its pinned Three.js runtime from the Doctrine package:

```console
cp -R vendor/jbboehr/doctrine-of-the-second-sun/integrations/web/document-looks-back public/document-looks-back
```

The integration includes its own Three.js r185 files. No package manager, framework, build step,
or runtime network request is required. Serve the files over HTTP because browsers can reject module imports from
`file://` URLs.

The repository provides a Nix-owned Playwright runner:

```console
nix run .#test-document-looks-back
```

Include the stylesheet and mount one controller after the document body exists:

```html
<link rel="stylesheet" href="/document-looks-back/document-looks-back.css">

<p data-document-looks-back>
  Observers receive a stable snapshot after the current transaction commits.
</p>

<script type="module">
  import { DocumentLooksBack } from "/document-looks-back/document-looks-back.js";

  const documentLooksBack = new DocumentLooksBack().mount();
</script>
```

## Configuration

```js
const documentLooksBack = new DocumentLooksBack({
  maxEyes: 3,
  duration: 5300,
  excludeSelector: "a, code, pre, button",
  frequency: { min: 25000, max: 39000 },
  selector: "main p, main li",
}).mount();
```

| Option | Default | Meaning |
| --- | --- | --- |
| `maxEyes` | `8` | Maximum simultaneous eyes, including manual summons; accepted values are 1–8. |
| `duration` | `5300` | Complete lifetime of one eye in milliseconds. Internal phases scale with it. |
| `excludeSelector` | `null` | CSS selector for excluded descendants. `null` uses the defaults below. |
| `frequency` | `{ min: 25000, max: 39000 }` | Random delay range between automatic attempts, in milliseconds. |
| `selector` | `null` | CSS selector for eligible text containers. `null` uses `[data-document-looks-back]`. |

Set `frequency` to one number for a fixed interval. Set it to `0`, `false`, or `null` to disable automatic spawning.
Intervals below 250 milliseconds are rejected. Automatic attempts respect `maxEyes` and never select a letter already
occupied by another eye.

Set `selector` when a consuming site already has useful structural markup or needs to narrow the eligible text:

```js
new DocumentLooksBack({
  root: document.querySelector("main"),
  selector: "article > p, article > ul li",
}).mount();
```

The controller scans matching elements inside `root`. Nested matches are collapsed to their outermost match so the same
text node cannot enter the candidate set twice.

By default, `excludeSelector` protects links, controls, code, keyboard and sample text, editable content, disclosure
labels, inert subtrees, and content hidden from accessibility tools. Set a custom selector to replace that list. Set
`excludeSelector` to `false` to allow all descendants of eligible containers.

The optional `root` limits hook discovery to one `Document` or `Element`. The optional `mount` controls where generated
canvases are attached; it defaults to `document.body`. A custom mount must not create a containing block for fixed
descendants unless its coordinate system matches the viewport.

## Lifecycle

- `mount()` installs input, visibility, and motion-preference listeners and starts the automatic schedule;
- `summon()` attempts one immediate eye and returns whether it succeeded;
- `reset()` restores all active letters and restarts the automatic schedule;
- `destroy()` restores the document, removes listeners, clears timers, and disposes pooled renderers.

The read-only `active` and `activeCount` properties report current activity. Only one controller may be mounted in a
document.

Candidates must be visible and at least 82 percent inside the effective viewport and clipping ancestors. The initial
eligible set is deliberately conservative: `a`, `b`, `d`, `e`, `g`, `o`, `p`, `q`, `0`, `6`, `8`, and `9` in either
case where applicable. These forms provide enough interior mass for a legible eye at documentation text sizes.

## Motion and input

An eye opens looking forward, makes one small autonomous glance when undisturbed, and follows actual mouse movement.
After mouse inactivity it blinks once and eases back to center. Touch and pen input do not direct the pupil.

With `prefers-reduced-motion: reduce`, the integration shows a static formed eye for the configured duration. It omits
the fill, gaze, blink, and return motion. A hidden document or motion-preference change resets active eyes.

## Rendering and compatibility

Each active letter is sampled at high resolution. A small directional morphology pass removes thin horizontal serif
terminals, then a convex envelope defines the creature body. The eye follows the principal axis of the largest connected
stroke mass. A contrast-aware eyelid preserves the pale sclera against both dark and light text. The source glyph
remains painted while WebGL draws only the added fill and eye above it. Keeping the browser-rendered letter in place
prevents a subpixel jump when browser and Canvas text rasterization differ.

The controller reuses a renderer pool capped at `maxEyes`; it does not intentionally force WebGL context loss during
cleanup. If WebGL initialization is unavailable, `summon()` returns `false` and the document remains unchanged.

Set the integration layer relative to the consuming site's chrome when needed:

```css
:root {
  --document-looks-back-layer: 30;
}
```

## License and attribution

The integration is covered by the repository license unless otherwise indicated. The vendored Three.js runtime is
Copyright © 2010–2026 Three.js authors and distributed under the MIT License; its complete notice is retained in
`vendor/THREE-LICENSE.txt`.
