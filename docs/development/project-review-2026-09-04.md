# Project review, 2026-09-04

The review found three P2 issues and two P3 issues at revision
`afe53e8b8de73d323c72996412505d328708f920`. P2 denotes a correctness or contract issue worth fixing in normal
development. P3 denotes a lower-priority performance or documentation improvement. The Heliogenesis finding includes
two reproduced lifecycle failures.

The review covered the PHPStan adapter, maintained browser integrations, documentation and guidance, packaging, CI,
and test coverage. Follow-up verification on 2026-09-04 reproduced the executable findings and ran this report's
JavaScript, PHP, and shell examples. The guidance conflict was checked against the source documents. Its effect on
agent behavior was not experimentally measured. The findings describe the reviewed revision; implementation progress
is recorded separately within each finding.

The follow-up used PHP 8.4.24, PHPStan 2.2.8, and Chromium 151.0.7922.75 on x86_64 Linux. Performance workloads used a
1280 × 800 viewport. Local experiment scripts and raw results are retained in the ignored
`tmp/project-review-2026-09-04/` directory. The observations and relevant measurements are recorded below so the report
does not depend on those temporary files.

1. **P2: Pending Heliogenesis operations survive cancellation**

   Source: [heliogenesis.js](../../integrations/web/heliogenesis/heliogenesis.js), especially `prepare()`, `activate()`,
   `reset()`, `destroy()`, and `fail()` (lines 163, 190, 221, 238, and 366 at the reviewed revision).

   Experimentally verified. Both lifecycle failures reproduced in three fresh-page trials using intercepted module
   requests. Both JavaScript examples below were also extracted from this report and executed successfully, producing
   the recorded faulty behavior.

   `activate()` awaits renderer preparation, then checks whether the controller is mounted and its state is
   `"dawning"`. Those checks cannot distinguish the activation that started the operation from a later activation.
   Resetting the controller clears existing timers but does not invalidate the suspended activation.

   With the scene import held pending, the following sequence reproduced the problem:

   ```text
   activate() starts and waits for preparation
   reset() returns the controller to idle
   activate() starts a second event and waits for the same preparation
   preparation completes
   both activations see state === "dawning" and start the scene
   both activations install their lifecycle timers
   ```

   Both promises returned `true`, and `controller.timers.size` was `6`. One current activation should succeed and own
   three timers. The cancelled activation should return `false`. With shortened timings, every trial dispatched
   `radiant` twice and `receding` twice before returning to idle.

   A separate intercepted-request experiment changed the timings between activations. The cancelled event used
   `{ rise: 250, hold: 150, return: 150 }`, while the new event used
   `{ rise: 1500, hold: 500, return: 500 }`. The new event returned to idle about 581 ms after preparation completed,
   before its intended 1,500 ms rise had finished. This directly confirmed that old timers can interrupt the new event.

   The following example isolates the same race by delaying `prepare()`. Run it inside a Playwright test after opening
   the Heliogenesis example and waiting for `globalThis.heliogenesis.mounted`:

   ```js
   const result = await page.evaluate(async () => {
     const controller = globalThis.heliogenesis;
     const prepare = controller.prepare.bind(controller);
     let release;
     const gate = new Promise(resolve => { release = resolve; });
     controller.prepare = async () => {
       await gate;
       return prepare();
     };

     const first = controller.activate();
     controller.reset();
     const second = controller.activate();
     release();

     const results = await Promise.all([first, second]);
     const timers = controller.timers.size;
     controller.reset({ announce: false });
     controller.prepare = prepare;
     return { results, timers };
   });
   // Reviewed behavior: { results: [true, true], timers: 6 }
   // Required behavior: { results: [false, true], timers: 3 }
   ```

   A second failure occurs when preparation rejects after `destroy()`. The `catch` in `activate()` calls `fail()`
   unconditionally. `fail()` then disables the restored trigger, adds `data-heliogenesis-unavailable`, and writes
   `data-heliogenesis-state="idle"` back onto the root after destruction removed it. A removed controller can therefore
   mutate a page or button that a consuming application has already restored or reused.

   On a fresh example page, this failure-injection example demonstrates that path:

   ```js
   const result = await page.evaluate(async () => {
     const controller = globalThis.heliogenesis;
     let rejectPreparation;
     controller.prepare = () => new Promise((resolve, reject) => {
       rejectPreparation = reject;
     });

     const activation = controller.activate();
     controller.destroy();
     rejectPreparation(new Error("Simulated scene-loading failure"));
     await activation;

     return {
       mounted: controller.mounted,
       disabled: controller.trigger.disabled,
       stateAttribute: document.documentElement.getAttribute("data-heliogenesis-state"),
       unavailableHook: controller.trigger.hasAttribute("data-heliogenesis-unavailable"),
     };
   });
   // Reviewed behavior:
   // { mounted: false, disabled: true, stateAttribute: "idle", unavailableHook: true }
   ```

   The review also reproduced both failures by holding the actual `heliogenesis-scene.js` request with Playwright,
   then continuing or aborting it. They do not depend on replacing the controller method. In each destruction trial,
   the button was enabled, the root attribute was absent, and the unavailable hook was absent immediately after
   `destroy()`. After the pending request was aborted, all three had changed to the faulty values shown above.

   Give each activation an identity that reset and destruction invalidate. Check that identity after preparation and
   before scheduling timers or handling an activation failure. Preparation started by hover or focus also needs a
   mount identity so its late failure cannot affect a destroyed or subsequently remounted controller. Keep those
   preparation and activation lifetimes distinct so cancelling an event does not unnecessarily discard reusable
   preparation.

   Add regression tests for reset followed by reactivation during loading, destruction before load failure, and
   destruction followed by remount while an earlier preparation is pending. Check promise results, timer counts,
   lifecycle events, and restoration of the original button and root attributes.

   Implementation follow-up: the first slice adds an activation identity invalidated by reset, destruction, and
   failure. Renderer preparation and hover/focus failure handlers use the existing mount abort signal, so work from
   a destroyed mount cannot act on a later mount. Destruction also releases the pending-preparation reference;
   completion clears that reference only if it still belongs to the same preparation.

   Six regression cases in the [browser suite](../../integrations/web/heliogenesis/tests/heliogenesis.spec.cjs) failed
   before the fix and passed afterward. They cover reset and reactivation with different timings, rejection after
   reset, rejection after destruction from activation/hover/focus, and preparation across destruction and remounting.
   The timing test advances a controlled clock and checks the event sequence, including the absence of early callbacks.
   `nix run .#test-heliogenesis -- --grep 'pending'` passed eight tests. Independent correctness and test reviews found
   no additional defects. The test review added a passing control case confirming that a replacement activation still
   reports a shared preparation failure while the cancelled activation stays silent. Final verification with
   `nix run .#test-heliogenesis` passed all nineteen tests, including Firefox failure recovery. The report's relative
   links and the complete change diff were also checked. The subsequent review found no actionable regressions, and
   the user approved this slice for commit.

2. **P2: PHPStan accepts a citation with no passage**

   Source: [LogionParser.php](../../integrations/phpstan/src/LogionParser.php), `inspect()`, lines 53-80.

   Experimentally verified. The direct parser example and a complete PHPStan analysis of the declaration example were
   rerun. A separate analysis also accepted an empty command-header passage before `declare(strict_types=1)`.

   The passage expression, `(\S[^\r\n]*)`, runs against the complete PHPDoc comment. It accepts the closing `*/` as
   nonempty passage text. This violates the adapter's documented requirement for a nonempty first line after the
   citation.

   This declaration passed a complete PHPStan analysis with enforcement enabled:

   ```php
   <?php

   /** @logion [OSD 1:1] */
   final class EmptyPassage {}
   ```

   PHPStan exited with status `0` and reported:

   ```json
   {"totals":{"errors":0,"file_errors":0},"files":{},"errors":[]}
   ```

   The parser can also be checked directly from the repository root with development dependencies installed:

   ```php
   <?php

   require 'vendor/autoload.php';

   $parser = new DoctrineOfTheSecondSun\PHPStan\LogionParser(['OSD']);
   $comment = new PhpParser\Comment\Doc('/** @logion [OSD 1:1] */');
   echo $parser->inspect($comment)->status, PHP_EOL;
   // Reviewed output: valid
   // Required output: malformed
   ```

   The follow-up checked seven parser cases:

   | Input | Observed status | Required status |
   | --- | --- | --- |
   | Single-line citation followed by a space and `*/` | `valid` | `malformed` |
   | Single-line citation followed by spaces, a tab, and `*/` | `valid` | `malformed` |
   | Empty multiline passage | `malformed` | `malformed` |
   | Whitespace-only multiline passage | `malformed` | `malformed` |
   | Single-line citation immediately followed by `*/` | `malformed` | `malformed` |
   | Nonempty single-line passage | `valid` | `valid` |
   | Nonempty multiline passage | `valid` | `valid` |

   Empty multiline tags were correctly rejected, making validation depend on comment layout. Both the declaration
   and command-header integration cases exited with status `0` and zero errors despite having no passage. This confirms
   that the parser defect affects both enforcement paths.

   Remove the PHPDoc framing before validating the first passage line, or otherwise ensure the closing delimiter cannot
   satisfy the passage expression. Preserve the existing citation, allowed-book, and tag-count checks. Add tests for
   empty and whitespace-only passages in single-line and multiline comments, alongside valid single-line passages.

3. **P2: The coding guide contradicts the generation workflow**

   Sources: [coding guide, agent workflow](../../DOCTRINE-CODING-GUIDE.md#18-agent-workflow), especially steps 8-13,
   and [generation guide, per-declaration workflow](../../DOCTRINE-GENERATION-GUIDE.md#per-declaration-workflow).

   Verified by document comparison. The follow-up checked the exact single-candidate and revision instructions against
   the three-candidate, independent-review, and no-repair requirements. No agent-generation experiment was run, and this
   finding does not claim a measured rate of noncompliant agent output.

   The coding guide directs an agent to allocate a citation, choose a quotation's purpose and motifs, generate one
   quotation, revise it, and insert it. It does not direct the agent through the generation guide's opaque mapping,
   three-candidate generation, independent selection, and reject-only leakage review.

   The generation guide requires three materially different candidates and prohibits repairing candidates during
   selection. Its code-aware stage may reject the selected passage but cannot use code relevance to choose or rewrite
   it. An agent following the coding guide's sequence alone can therefore bypass the separation intended to prevent
   implementation allegory and biased selection.

   Replace the overlapping generation instructions with a reference to the generation guide. Keep the coding guide's
   inventory, comment-placement, insertion, formatting, and verification responsibilities. A coherent sequence is:

   ```text
   Inventory the declarations and preserve existing citation information.
   Follow the generation guide to fix opaque mappings, generate candidates, select, and check leakage.
   Allocate or preserve citations according to local policy.
   Insert the selected text and book unchanged, then verify placement and behavior.
   ```

   Review both workflows together after editing. Confirm that the coding guide no longer supplies an alternative
   single-candidate generation process or permits rewriting during selection.

4. **P3: Candidate discovery can noticeably stall long documents**

   Source: [document-looks-back.js](../../integrations/web/document-looks-back/document-looks-back.js), especially
   `findCandidates()` at line 677 and the retry loop in `summon()` at line 941.

   Experimentally verified for both one discovery pass and the complete fourteen-attempt failure path. The latter used
   Chromium's `--disable-webgl` flag to exercise real renderer unavailability without replacing candidate preparation.

   Candidate discovery walks every eligible text node inside each visible matching container. For each eligible
   character it reads text transformation, creates and measures a range, and checks visibility through ancestors.
   A large container can intersect the viewport while most of its text is offscreen.

   `summon()` calls `findCandidates()` again after each unsuccessful candidate, up to fourteen attempts. Much of the
   same DOM measurement can therefore repeat synchronously during one attempt to display an eye.

   The follow-up measured discovery in Chromium with a visible `main` container styled as
   `font: 16px serif; max-width: 800px; margin: 20px`. Its text repeated this 75-character sentence:

   ```js
   const sentence = "Observers receive a stable snapshot after the current transaction commits. ";
   target.textContent = sentence.repeat(1000);

   const started = performance.now();
   const candidates = controller.findCandidates();
   console.log({
     characters: target.textContent.length,
     candidates: candidates.length,
     milliseconds: performance.now() - started,
   });
   ```

   Here `target` was the matching `main` element, and `controller` was mounted with
   `{ selector: "main", frequency: 0 }`. Three fresh-page trials each scanned 750, 7,500, and 75,000 characters in that
   order, flushing layout before timing each scan:

   | Characters | Visible candidates | Median discovery time | Observed range |
   | --- | --- | --- | --- |
   | 750 | 220 | 4.7 ms | 4.3-4.8 ms |
   | 7,500 | 1,539 | 34.2 ms | 30.8-35.9 ms |
   | 75,000 | 1,539 | 256.2 ms | 255.4-257.7 ms |

   The unmodified example above was also executed in each trial, including any synchronous layout work inside the
   timed interval. It measured 269.4-282.9 ms for 75,000 characters. The extra offscreen text increased work without
   increasing the candidate set.

   To test the complete `summon()` operation, a second workload placed the same 75,000 characters in 200 inline spans.
   Each span contained five copies of the sentence. Font families cycled through `serif`, `sans-serif`, and `monospace`,
   with alternating weights of 400 and 700. This provided enough distinct visible glyph signatures to exercise all
   fourteen attempts. The root, font size, viewport, and automatic-spawning setting remained as described above.

   Wrappers counted calls to `findCandidates()` and `prepareCandidate()` while invoking their original implementations.
   No candidate, visibility, glyph-snapshot, or renderer result was stubbed. A zero-delay timer queued immediately
   before `summon()` measured how long the synchronous operation prevented another callback from running.

   | Browser mode | Scans | Preparation attempts | `summon()` result | `summon()` time |
   | --- | --- | --- | --- | --- |
   | Software WebGL enabled | 1 | 1 | `true`, one active eye | 251.4-253.0 ms |
   | WebGL disabled | 14 | 14 | `false`, no active eyes | 3,008.9-3,039.4 ms |

   Each mode was run three times on fresh pages. Every scan returned 1,221 candidates. With WebGL disabled, the browser
   returned `null` from `getContext("webgl2")`, the controller marked the renderer unavailable, and it still retried
   fourteen distinct signatures. Scanning alone consumed 2,978.0-3,007.4 ms. The queued timer ran after
   3,009.9-3,040.4 ms, confirming that other callbacks were blocked for about three seconds. With software WebGL
   enabled, the queued timer ran after 264.6-266.4 ms.

   These are measurements of a controlled long-document workload on one machine. They establish the repeated work and
   its synchronous effect, not its frequency across consuming sites or a universal latency bound. Candidate shuffling
   retained the implementation's normal randomness. All three trials reached the same scan and attempt counts.

   Compute the candidate set once per `summon()` and reuse it while trying alternative glyph signatures. Cache style
   and clipping measurements within that operation, prune offscreen text earlier, and retain the final position check
   before attaching an eye. Prefer operation-local caching so later DOM or viewport changes remain visible.
   Stop the retry loop once renderer unavailability is known, since another glyph cannot restore WebGL support.

   Add a realistic long-document workload and verify that unsuccessful candidate preparation does not trigger repeated
   full scans. Treat elapsed-time measurements as performance evidence rather than a tight, machine-dependent CI limit.

5. **P3: The Nix package contains a broken documentation link**

   Sources: [flake.nix](../../flake.nix), default package installation at lines 41-51, and the
   [Heliogenesis README](../../integrations/web/heliogenesis/README.md), lines 24-26.

   Experimentally verified against the Nix output for the reviewed revision. The shell example below was executed
   unchanged, and its final file check exited with status `1`.

   The default package copies root Markdown documents, `assets/`, and `integrations/`. It omits `experiments/`, although
   the installed Heliogenesis README links to `../../../experiments/README.md`.

   That link resolves correctly in the repository and rendered website. In the installed package it resolves to a
   missing file beneath `share/doctrine-of-the-second-sun/`. A Nix consumer cannot follow the integration's provenance
   link.

   From the repository root, this check reproduces the missing target:

   ```bash
   doctrine_package=$(nix build .#default --no-link --print-out-paths)
   doctrine_documents="$doctrine_package/share/doctrine-of-the-second-sun"
   test -r "$doctrine_documents/integrations/web/heliogenesis/../../../experiments/README.md"
   ```

   The final `test` fails for the reviewed package. `nix flake check` nevertheless passes because the package check
   verifies construction, while the existing link checker runs against rendered HTML in the documentation build.

   The follow-up separately confirmed that the installed Heliogenesis README exists and retains the relative link.
   Its resolved target is missing. The repository target and rendered `experiments/index.html` both exist, and
   `python3 docs/check-links.py` passed when given the rendered documentation output. The failure is specific to the
   installed documentation package.

   Include the referenced experiment documentation and its linked studies in the package, or make the provenance link
   point to an appropriate upstream location. Adding only `experiments/README.md` would leave its study links
   unresolved. Add relative-link validation against the installed documentation tree so package and website coverage
   are both exercised.

The following baseline checks passed during the original review. The follow-up experiments above ran separately and
did not rerun the complete suites or change production code:

| Check | Result |
| --- | --- |
| `composer validate --strict` | Passed |
| `composer test` | 13 PHPUnit tests, 24 assertions, and four additional PHPStan integration analyses passed |
| `composer cs` | Passed |
| `composer analyse` | Passed |
| `nix run .#test-heliogenesis` | 12 browser tests passed |
| `nix run .#test-document-looks-back` | 16 browser tests passed |
| `nix flake check --print-build-logs` | Package and rendered-documentation checks passed on x86_64 Linux |
| Repository Markdown targets and rendered HTML anchors | No broken targets found |
| Publication and master image dimensions | Matched repository conventions |
| Codex adapter TOML syntax | Parsed successfully |

The PHP checks used PHP 8.4.24. Browser suites used Chromium with software WebGL and Firefox fallback cases. PHP 8.1,
other operating systems, and hardware GPU behavior were not verified. No confirmed memory-safety defect was identified.
The review did not establish memory safety of vendored Three.js or browser GPU implementations.

The follow-up also tested actual PHPStan result-cache reuse while toggling enforcement. An initial file-only analysis
was unsuitable because PHPStan explicitly skipped caching for that scope. The experiment was corrected to analyse a
directory containing a duplicate-reference fixture, with one unchanged configuration and cache directory across six
invocations:

| Invocation | `DOCTRINE_LOGION` | Exit status | Duplicate diagnostics | Cache behavior reported by PHPStan |
| --- | --- | --- | --- | --- |
| 1 | Unset | 0 | 0 | Initial cache created |
| 2 | Unset | 0 | 0 | Cache restored, zero files reanalysed |
| 3 | `1` | 1 | 2 | Cache invalidated because `metaExtensions` differed |
| 4 | `1` | 1 | 2 | Cache restored, zero files reanalysed |
| 5 | Unset | 0 | 0 | Cache invalidated because `metaExtensions` differed |
| 6 | Unset | 0 | 0 | Cache restored, zero files reanalysed |

This experiment confirmed correct cache invalidation for the tested sequence. Retaining it as an integration test
would address a coverage gap, not a reproduced cache defect. The current
[runtime-switch test](../../integrations/phpstan/tests/RuntimeSwitchTest.php) checks the switch and metadata hash
directly, so the committed suite does not yet preserve this stronger verification.
