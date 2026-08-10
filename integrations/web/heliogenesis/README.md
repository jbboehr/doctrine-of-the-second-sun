# Heliogenesis

Heliogenesis is an optional browser integration for the **Dawning of the Second Sun** documentation effect. It mounts a
temporary Three.js environment over an existing page, coordinates the page-lighting states, and restores the original
documentation view after the event.

The integration does not modify a documentation framework or activate itself. A consuming site supplies a button and
explicitly marks any document surfaces that should respond to the second light.

## Files

- `heliogenesis.js` provides the public controller and event lifecycle;
- `heliogenesis-scene.js` renders the hydrogen cloud, accretion flow, forming star, magnetic prominences, coronal
  rupture, eclipse, particles, and atmosphere;
- `heliogenesis.css` provides the fixed environmental layer, world-scale ignition front, and optional trigger
  appearance;
- `heliogenesis-document.css` provides an optional documentation-lighting and second-shadow treatment for marked
  elements;
- `vendor/three.module.min.js` and `vendor/three.core.min.js` are the pinned Three.js r185 runtime;
- `example/index.html` is a minimal integration example;
- `tests/` contains the Playwright lifecycle and failure-recovery suite.

The dependency-free baseline, active visual laboratory, and archived studies are catalogued under
[`experiments/`](../../../experiments/README.md). They are design provenance, not runtime dependencies of this
integration.

## Installation

The adapter is distributed with the rest of the Doctrine package. Copy the complete directory into a location served
by the consuming documentation site.

From a Composer installation:

```console
cp -R vendor/jbboehr/doctrine-of-the-second-sun/integrations/web/heliogenesis public/heliogenesis
```

From a Nix installation:

```console
cp -R "$DOCTRINE_OF_SECOND_SUN_DIR"/integrations/web/heliogenesis public/heliogenesis
```

Keeping the directory intact preserves the renderer's relative import of the pinned Three.js module. No JavaScript
package manager, bundler, framework, or external network request is required at runtime.

Serve ES modules over HTTP during local development. For example, from the repository root:

```console
nix run nixpkgs#miniserve -- integrations/web/heliogenesis
```

Then open the URL printed by `miniserve` and select `example/`. Some browsers intentionally reject relative ES-module
imports from `file://` URLs.

## Browser tests

The repository provides a Nix-owned Playwright runner for the integration:

```console
nix run .#test-heliogenesis
```

The suite exercises the rendered WebGL lifecycle in Chromium at normal and enlarged page scales, replay and cleanup,
custom state-root layering, reduced-motion rendering, offline asset loading, and deterministic renderer-failure
recovery in Firefox. It writes traces and failure screenshots under the system temporary directory rather than into
the repository. The runner and its CI job are currently provided for x86_64 Linux.

## Basic use

Include the environmental stylesheet and, optionally, the document-lighting stylesheet:

```html
<link rel="stylesheet" href="/heliogenesis/heliogenesis.css">
<link rel="stylesheet" href="/heliogenesis/heliogenesis-document.css">
```

Provide a real button. The controller adds the `data-heliogenesis-trigger` styling hook when mounted.

```html
<button id="secondSun" type="button" aria-label="Dawn the Second Sun"></button>
```

Mount one controller after the page body exists:

```html
<script type="module">
  import { Heliogenesis } from "/heliogenesis/heliogenesis.js";

  const heliogenesis = new Heliogenesis({
    trigger: document.querySelector("#secondSun"),
  });

  heliogenesis.mount();
</script>
```

The Three.js renderer is loaded and constructed on first hover, keyboard focus, or activation. Calling `mount()` alone
does not allocate a WebGL context.

## Document-lighting hooks

`heliogenesis-document.css` changes only elements carrying an explicit hook:

| Hook | Intended element |
| --- | --- |
| `data-heliogenesis-world` | The page body or outer documentation shell |
| `data-heliogenesis-chrome` | A header, toolbar, or other elevated chrome |
| `data-heliogenesis-surface` | The main reading plane or article panel |
| `data-heliogenesis-callout` | A callout that should catch the altered light |
| `data-heliogenesis-code` | A code block or dark technical panel |
| `data-heliogenesis-rule` | A border or section whose edge should bloom |

The optional treatment explicitly recolors headings and links inside a marked surface so common theme-level color
rules cannot leave pale dark-theme text on the event's light reading plane. Override `--heliogenesis-ink-event` or
`--heliogenesis-link-event` when a consuming theme needs different accessible event colors.

The generic chrome treatment intentionally avoids `!important` and cannot override consumer rules with ID specificity.
Add a narrow adapter in that consumer when necessary, using the active state and the provided chrome value:

```css
:where([data-heliogenesis-state="dawning"], [data-heliogenesis-state="radiant"])
  #mdbook-menu-bar[data-heliogenesis-chrome] {
  background: var(--heliogenesis-chrome-event);
}
```

The controller places `data-heliogenesis-state` on the document root. The values are `idle`, `dawning`, `radiant`, and
`receding`. It mirrors the state onto the generated environment, so a custom mount does not need to be a descendant of
the state root. A consuming theme may ignore the supplied document stylesheet and respond to the root states itself.

## Lifecycle and events

Only one Heliogenesis environment may be mounted in a document. The primary methods are:

- `mount()` installs the layer and listeners;
- `prepare()` loads and constructs the renderer early;
- `activate()` begins the event when it is idle;
- `reset()` immediately returns to the normal page;
- `destroy()` removes listeners and generated DOM and disposes the complete Three.js scene.

The controller dispatches `heliogenesis:idle`, `heliogenesis:dawning`, `heliogenesis:radiant`, and
`heliogenesis:receding` on both itself and its state root. It also dispatches `heliogenesis:unavailable` when the
renderer cannot initialize. Event details contain the controller and current state; the unavailable event also contains
the initialization error.

Timing may be adjusted without changing the renderer:

```js
new Heliogenesis({
  trigger,
  timings: {
    standard: { rise: 18000, hold: 10000, return: 8000 },
    reduced: { rise: 1400, hold: 3000, return: 1900 },
  },
});
```

The renderer scales its complete choreography to `standard.rise`, including the eclipse, petals, and embers. After the
rise completes, normalized formation progress remains at its final value while atmospheric animation continues through
the hold and return intervals.

## Ignition and projection

Near the end of stellar assembly, the renderer grows asymmetric magnetic prominences around the photosphere and the
largest prominence stretches, magnetically drains, and ruptures into braided plasma channels aimed partly toward the
camera. The rupture expands a chromatic heliosphere through the accretion flow, intensifying its lensing before the
local ignition shock escapes as a thin environmental front. The generated front expands from the star's projected
screen position; marked document surfaces briefly catch a cyan-and-rose second shadow as it passes. Petals and embers
arrive behind this front so they remain consequences of ignition rather than an independent particle effect.

The controller exposes `data-heliogenesis-ignition` only for the rise-synchronized interval that begins when the
renderer starts. Use that hook for CSS choreography that must share the WebGL formation clock; `dawning` begins earlier
and may include renderer preparation on a cold activation.

The environment sizes itself against `visualViewport` when available and updates on page zoom, pinch zoom, and visual
viewport movement. It mirrors the projected origin into `--heliogenesis-sun-x` and `--heliogenesis-sun-y` on the state
root as viewport-projected pixel coordinates, including visual-viewport offsets. The same properties on the generated
environment are percentages relative to that layer, which keeps its gradients and ignition front aligned to the canvas.
Existing inline values for these properties and `--heliogenesis-rise` are restored by `destroy()`.

## Quality tier

The renderer chooses `desktop`, `compact`, or `narrow` particle budgets from the viewport at first preparation. That
tier is exposed as `heliogenesis.scene.quality` and remains fixed for the life of the scene, avoiding a disruptive GPU
rebuild when the viewport crosses a breakpoint. Camera placement, canvas resolution, and pixel ratio still respond to
later resizes. Prepare the integration after establishing the initial responsive layout when this distinction matters.

## Layering

The complete environment occupies one fixed, pointer-transparent stacking layer. Its default z-index is `30`:

```css
:root {
  --heliogenesis-layer: 30;
}
```

This deliberately renders the sun and accretion flow above opaque documentation panels; otherwise those panels can
erase the central event. Give persistent chrome a larger z-index when it should remain above the environment. Lowering
the Heliogenesis layer behind an opaque reading surface will hide the sun.

## Reduced motion and failure behavior

When `prefers-reduced-motion: reduce` matches, Heliogenesis renders one static, fully meaningful eclipsed-star frame
with magnetic prominences and a restrained ignition halo. It omits the expanding front, moving hydrogen, feeder
streams, coronal rupture, refractive heliosphere, petals, and embers while retaining the gradual CSS lighting
transition.

The trigger is disabled during an active event, so duplicate sequences cannot overlap. A hidden tab or a motion
preference change resets an active event. If WebGL initialization fails during prewarming or activation, the controller
disposes any partial scene, disables further preparation, leaves the documentation usable, dispatches
`heliogenesis:unavailable`, and announces the failure through its live status region.

## License and attribution

Heliogenesis is covered by the repository license unless otherwise indicated. The vendored Three.js runtime is
Copyright © 2010-2026 Three.js authors and distributed under the MIT License; its complete notice is retained in
`vendor/THREE-LICENSE.txt`.
