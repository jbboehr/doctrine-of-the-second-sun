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

   Implementation follow-up: the second slice removes the closing delimiter from the captured first passage line,
   then rejects empty or whitespace-only content. The whitespace check recognizes Unicode spaces in UTF-8 text.
   Citation matching remains byte-oriented, and only a positive whitespace match rejects the passage, preserving the
   existing acceptance of nonempty non-UTF-8 bytes. Tag-count, citation-number, and allowed-book checks remain intact.

   The [parser tests](../../integrations/phpstan/tests/LogionParserTest.php) cover nineteen cases. They check empty and
   whitespace-only passages, both closing-delimiter layouts, text starting only on a later line, and valid single-line
   and multiline passages. Three closing-delimiter cases returned `valid` before the fix and now return `malformed`.
   Adversarial testing also exposed three Unicode whitespace cases: U+00A0 before the delimiter, with and without an
   intervening ASCII space, and U+3000 on a multiline comment's citation line. All three failed before the whitespace
   fix and now pass. Controls preserve passages consisting of a single `*` or `/`, text after Unicode whitespace,
   and a nonempty non-UTF-8 byte string.

   A new case in the
   [extension integration test](../../integrations/phpstan/tests/ExtensionIntegrationTest.php) runs complete PHPStan
   analysis against an empty command header and an empty declaration passage. Before the fix it exited successfully
   with zero diagnostics. Afterward it exits with status `1` and reports `doctrine.logion.commandMalformed` and
   `doctrine.logion.malformed`.

   Verification used the updated dev shell with PHP 8.4.24 and PHPUnit 11.5.56. The focused parser and extension tests
   passed 21 cases with 42 assertions. `composer test` passed 33 tests with 64 assertions and all four additional
   PHPStan analyses. `composer cs`, `composer analyse`, `composer validate --strict`, and `nix flake check` also passed
   on x86_64 Linux. Independent correctness review of the final fix found no additional defects. PHP 8.1 was not run
   locally. The subsequent reviews found no actionable regressions, and the user approved this slice for commit.

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

   **Implementation, 2026-09-04:** The coding guide now delegates generation and literary selection to the generation
   guide, including its portable fallback and batch guidance. It records existing citations before generation,
   allocates or preserves references after selection and leakage review, and inserts the selected text and book
   unchanged. Its scope, inventory, source-safety, and verification responsibilities remain in place.

   Follow-up review clarified that generation through insertion repeats per item within small batches, rejected
   candidate sets return to generation, and allocation and insertion require both reviews to pass. Existing books are
   supplied as fixed generation constraints. The workflow now explicitly requires reading the generation guide and
   omits the abbreviated generation sequence. The completion checklist also confirms that its review process was
   followed and any fallback loss of isolation was disclosed.

   **Verification of the fix:** Document comparison covered multiple new quotations, explicitly requested regeneration
   with a fixed citation, rejection during literary selection or leakage review, and the portable fallback. A source
   search confirmed removal of the single-quotation generation and revision instructions. All 17 relative links and
   anchors in the changed documents resolve. The rendered coding guide also contains all four generation-guide links
   with valid target anchors. `nix develop --command bash docs/build.sh`,
   `nix develop --command composer validate --strict`, and `nix flake check --print-build-logs` passed on x86_64 Linux.
   The complete diff was reviewed. No agent-generation experiment was run, so this verifies document consistency and
   rendering without measuring agent compliance. The user approved this slice for commit after the review findings
   were addressed.

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

   **Implementation, 2026-09-04:** `summon()` now discovers and shuffles candidates once, then tries alternative glyph
   signatures from that list. It still permits up to fourteen distinct failed signatures and stops immediately when
   renderer initialization becomes unavailable. The list belongs to one invocation, so later summons recheck the
   document and occupied glyphs. The final position and visibility check remains in place.

   **Verification of the fix:** The long-document browser regression lets lowercase `o` produce an empty Canvas
   snapshot, then successfully renders uppercase `O` through the real preparation path. It failed before the fix
   because discovery ran twice. The strengthened Firefox fallback test failed with fourteen scans and thirteen
   preparation attempts after renderer unavailability was known. Both now pass, along with a control confirming that
   occupied glyphs are excluded and replacement text and positions are discovered on later summons.

   Independent correctness and adversarial test reviews found no additional runtime defects. Four retained tests cover
   both sides of the fourteen-signature retry limit, duplicate signatures, the centered candidate pool, and cleanup
   when CSS hides a candidate after its canvas is appended. The seven focused cases and all 22 browser tests from
   `nix run .#test-document-looks-back` passed. JavaScript syntax checks, the documentation build, Composer validation,
   Nix checks, report links, and the complete diff also passed review on x86_64 Linux. Rendering was tested with
   Chromium software WebGL and Firefox covered renderer unavailability. Hardware GPUs and other platforms were not
   tested. Subsequent reviews found no actionable regressions, and the user approved this slice for commit.

   The follow-up repeated the 75,000-character, 200-span workload above three times per browser mode before and after
   the fix, starting from revision `c608c4072e654b89d613f6fa6d2d5101956e213d`. Each run served a captured copy of the
   implementation so edits could not affect later trials. All trials found 1,221 candidates per discovery pass.
   Chromium 151.0.7922.75 used the same viewport and WebGL modes as the original experiment. Results and the measurement
   script are retained under the ignored experiment directory as `slice-4-before.json`, `slice-4-after.json`, and
   `slice-4-measure.cjs`.

   | Browser mode | Version | Scans | Preparation attempts | `summon()` time | Queued callback delay |
   | --- | --- | --- | --- | --- | --- |
   | Software WebGL | Before | 1 | 1 | 248.5-251.9 ms | 261.8-265.7 ms |
   | Software WebGL | After | 1 | 1 | 236.5-253.0 ms | 250.5-266.6 ms |
   | WebGL disabled | Before | 14 | 14 | 3,026.4-3,067.8 ms | 3,027.3-3,068.6 ms |
   | WebGL disabled | After | 1 | 1 | 221.8-225.0 ms | 222.7-226.5 ms |

   These timings remain measurements of one controlled workload. A single discovery pass still took 216.7-231.5 ms
   after the fix. Per-character traversal, repeated style reads within that pass, and earlier offscreen pruning remain
   opportunities for a separate optimization slice.

   **Ninth remediation slice, 2026-09-05:** `findCandidates()` now keeps computed styles, clipping rectangles,
   visibility bounds, and paint checks in maps local to that synchronous call. Later scans start with fresh maps.
   Per-glyph range measurements and occlusion checks continue to run for each candidate, and final placement checks
   read current styles and geometry without using the discovery maps.

   A profile of the same 75,000-character, 200-span workload counted 202,978 computed-style reads and 23,245 element
   rectangle reads before this change. The corresponding profile after the change counted 203 style reads and one
   element rectangle read. Both performed 22,000 glyph-range measurements and 1,221 hit tests.

   The new measurement-budget regression found 242 reads of a shared element's style before the change, against
   a budget of one read per element in a scan. It now passes, along with a control that changes ancestor opacity,
   text transformation, clipping width, and position between successive scans. Existing coverage also checks final
   visibility after appending a canvas, occupied glyphs, later summons, and scrolling.

   The independent correctness review found no actionable defects. The adversarial test review demonstrated one
   missed optimization: a watched element that also clips its text had its rectangle measured twice. A retained
   regression preserved all 80 expected candidates but failed its one-read budget. Recording the initial watchable
   rectangle in the scan's map fixed the duplicate read, and the regression now passes. No static findings remain
   open in this slice.

   The comparison used captured before/after sources from revision `26b29c9` and the working tree. Three paired
   trials per browser mode alternated their order and used fresh pages at 1280 × 800. Every trial returned the same
   1,221 candidates. Hashes of the complete ordered node IDs, text offsets, glyphs, and rectangles matched in all
   twelve trials. Each summon still performed one discovery pass and one preparation attempt.

   | Browser mode | Scan before | Scan after | Queued callback before | Queued callback after |
   | --- | --- | --- | --- | --- |
   | Chromium software WebGL | 244.0-271.8 ms | 68.6-89.6 ms | 281.2-307.5 ms | 107.8-128.8 ms |
   | Chromium with WebGL disabled | 242.1-258.3 ms | 67.8-78.9 ms | 249.1-265.8 ms | 74.8-87.1 ms |

   These measurements show a 70-72% reduction in median scan time for this workload. An earlier unpaired baseline
   ranged from 386.9 to 438.5 ms; a paired run before the review fix measured 222.3-231.6 ms before and 62.8-66.2 ms
   after optimization. The table records the final paired run, including the review fix, to account for that timing
   variation.
   The scripts, captured sources, profiles, and raw results are retained as `slice-9-*` under
   `tmp/project-review-2026-09-04/`. Timing is not asserted as a machine-dependent CI threshold.

   The three focused cases and all 25 Document Looks Back browser tests passed with `CI=1` and retries disabled:
   `CI=1 nix run .#test-document-looks-back -- --retries=0`.
   JavaScript syntax checks, `nix develop --command composer validate --strict`,
   `nix develop --command bash docs/build.sh`, and `nix flake check --print-build-logs` also passed, including six
   link-checker tests and installed-package and rendered-documentation link checks. All 18 relative report links and
   anchors resolve; added prose was checked for stale terminology and the complete diff was reviewed.

   Verification used Chromium 151.0.7922.75 with software WebGL and the suite's Firefox fallback case on x86_64 Linux.
   Hardware GPUs, WebKit, and discovery in other browsers and platforms remain unverified. A scan still takes about
   68-90 ms in this workload, and reducing per-character traversal remains a possible later slice. The reliability
   verdict is **PASS_WITH_RESIDUAL_RISK** for those verification limits.
   Subsequent review found no actionable regressions and passed an additional before/after cache-isolation check.
   The user approved this slice for commit.

   **Tenth remediation slice, 2026-09-05:** Discovery now checks the complete range of text nodes with eligible glyphs
   before enumerating individual glyphs. Nodes outside the effective viewport or ancestor clipping bounds are skipped.
   Partly visible nodes retain the existing per-glyph checks. The prefilter uses text geometry, allowing visible text
   to overflow an intermediate parent with no area. It retains the existing node IDs and measures text on every scan.

   Two regression cases each performed 2,000 unnecessary individual glyph measurements before the change: one for
   text beyond the viewport and one for text inside the viewport but outside its clipping ancestor. Both now perform
   zero individual measurements for that text while preserving the four visible candidates. Two characterization
   cases passed before and after the change: a partly visible multiline node responds to scrolling, resizing, and
   movement, and text overflowing a zero-area parent remains discoverable.

   Additional profiling caught unnecessary geometry reads for text without eligible glyphs. A 200-span workload
   containing only `x` increased from zero to 200 range measurements in the initial implementation. A cheap glyph
   eligibility check now runs before geometry, restoring zero range measurements and three computed-style reads.
   Its regression first failed with one unnecessary measurement, then passed while retaining all four glyphs in a
   following text node. Resetting the shared regular expression before both checks preserves the first match.

   A profile of the 75,000-character, 200-span workload counted 22,000 range measurements before and 1,520 after,
   including the new whole-text measurements. Both profiles found 1,221 candidates and performed 1,221 hit tests,
   203 computed-style reads, and one element-rectangle read.

   Three paired trials per browser mode alternated before/after order on fresh 1280 × 800 pages. The sources were
   captured from revision `36638ac` and the working tree. The complete ordered candidate IDs, text offsets, glyphs,
   and rectangles produced identical hashes in all twelve trials. Each summon used one scan and one preparation
   attempt.

   | Browser mode | Scan before | Scan after | Queued callback before | Queued callback after |
   | --- | --- | --- | --- | --- |
   | Chromium software WebGL | 63.7-67.2 ms | 20.0-23.4 ms | 93.3-99.2 ms | 39.8-60.0 ms |
   | Chromium with WebGL disabled | 67.1-68.9 ms | 20.2-23.6 ms | 73.7-75.0 ms | 25.4-30.1 ms |

   Median scan time fell by about 66% for this workload. A separate twelve-trial control placed all 75,000 characters
   in one text node. Its 1,539 candidates matched before and after, but scan time remained similar: 115.2-129.7 ms
   before and 114.9-120.8 ms after across both browser modes. Whole-node pruning does not avoid scanning the offscreen
   portion of a node that intersects the viewport. That remains a limit of this optimization.

   The scripts, captured sources, profiles, and raw results are retained as `slice-10-*` under
   `tmp/project-review-2026-09-04/`. Timing remains experimental evidence rather than a CI threshold.

   Independent correctness and adversarial test reviews found no candidate-selection defects. A differential layout
   probe rerun against the final source found the same 114 candidates, in the same order, across layouts with
   transforms, vertical or bidirectional text, multiple columns, ruby, SVG text paths, and overflowing text.
   No static findings remain open. The five focused cases and all 30 browser tests passed with retries disabled:
   `CI=1 nix run .#test-document-looks-back -- --retries=0`.
   JavaScript syntax checks, `nix develop --command composer validate --strict`,
   `nix develop --command bash docs/build.sh`, and `nix flake check --print-build-logs` also passed, including six
   checker tests and package and rendered-documentation link checks. The report's 18 relative links and anchors,
   added terminology, and complete diff were checked.

   Verification used Chromium 151.0.7922.75 with software WebGL and the Firefox fallback case on x86_64 Linux.
   Hardware GPUs, WebKit, and discovery in other browsers and platforms remain unverified. The reliability verdict
   is **PASS_WITH_RESIDUAL_RISK** for these limits and the remaining cost of partly visible long text nodes.
   Subsequent review found no actionable regressions and passed 209 before/after discovery comparisons alongside
   the full browser suite and repository checks. The user approved this slice for commit.

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

   **Fifth remediation slice, 2026-09-05:** The default Nix package now includes `experiments/`, preserving its README
   and all four linked HTML studies. The existing source filter continues to exclude high-quality image masters.
   The package's install check runs the [link-checker tests](../tests/test_check_links.py), then checks local links in
   all installed Markdown and HTML files. This also runs through the existing `nix flake check` package check.

   The [link checker](../check-links.py) accepts `--markdown` to render Markdown through `cmark` before extracting
   links. This handles reference links and inline images while excluding inline and fenced code examples. The Nix
   package supplies `cmark` and Python as install-check dependencies. Querying the built output found no Nix store
   references, confirming that these tools add no runtime dependency. The rendered website keeps its existing
   HTML-only invocation.

   The missing README was reproduced against revision `0c79c55`. After adding the install check but before changing
   the copied files, `nix build .#default --no-link --print-build-logs` failed with the exact broken provenance link.
   After adding `experiments/`, that same build passed. A separate copy of the installed package with only the
   experiment README retained was rejected for all four missing studies, confirming that a partial copy cannot
   satisfy the check. All five experiment files in the complete package matched the repository byte for byte, and
   no `*-hq*` files were installed.

   The five checker tests passed, including cases that remove the provenance README, an archived study, and an
   image. Before Markdown scanning was implemented, the new missing-file assertions failed because those Markdown
   links were never checked. The complete installed package passed validation across 19 Markdown and six HTML files.
   `nix flake check --print-build-logs`, `nix develop --command composer validate --strict`, and
   `nix fmt -- --check flake.nix` passed on x86_64 Linux. The documentation build also passed its rendered-link checks
   and SEO validation for 18 pages.

   Independent correctness review found no defects in this slice. The independent test pass added checks for raw
   HTML image targets in Markdown and for HTML-only validation with `cmark` absent from `PATH`. Both passed. It also
   identified the preexisting iframe coverage gap recorded in finding 6.

   Coverage is local file existence. Fragment IDs, remote URL availability, experiment rendering, and other platforms
   remain outside these checks. Subsequent review found no actionable regressions, and the user approved this slice
   for commit.

6. **P3: The rendered-documentation checker ignores iframe targets**

   Source: [link checker](../check-links.py), `LinkParser.handle_starttag()`. Found during the independent test pass
   for the fifth remediation slice on 2026-09-05.

   mdBook renders its table of contents through `<iframe src="toc.html">`. At discovery, the checker collected `src`
   values only from images and scripts, so a missing table-of-contents document passed validation. Removing
   `toc.html` from a disposable rendered build left the checker returning status `0`.

   This minimal HTML fixture also passed the checker at revisions `0c79c55` and `6c4290f`, although its target did
   not exist:

   ```html
   <iframe src="missing-toc.html"></iframe>
   ```

   Extend the supported source tags to include iframes and retain a regression test for a missing target. This gap
   predates the package fix, and the installed experiments contain no iframe targets. It was deferred from the
   fifth slice. A standalone reproducer is retained at
   `tmp/project-review-2026-09-04/iframe-link-reproduction.py`.

   **Seventh remediation slice, 2026-09-05:** The checker now collects iframe `src` values and validates them through
   its existing path-resolution rules. This covers rendered HTML and raw HTML in Markdown when `--markdown` is used.

   Before the fix, two regression assertions failed because a missing iframe target returned status `0`: one in
   rendered HTML and one in raw HTML inside Markdown. After adding `iframe` to the supported source tags, all six
   checker tests passed. The tests also confirm that an existing target referenced from a nested page passes, external
   iframe URLs and inline `srcdoc` content need no local file, and fenced iframe examples in Markdown are ignored.

   A separate experiment copied the rendered documentation and removed `toc.html`. The checker from revision
   `6c4290f` still returned status `0`. The fixed checker returned status `1` and reported 20 broken iframe references,
   including `index.html: toc.html`. Both versions accepted the complete site before removal. The original standalone
   reproducer also passed against the fix. Results are retained in
   `tmp/project-review-2026-09-04/iframe-rendered-verification.txt`.

   `nix flake check --print-build-logs` passed both package and rendered-documentation checks, including all six
   checker tests, installed Markdown and HTML link validation, and SEO validation for 18 pages.
   `nix develop --command composer validate --strict` also passed.

   Verification is local to x86_64 Linux. Other platforms remain unverified. Subsequent reviews found no actionable
   regressions, and the user approved this slice for commit.

7. **P3: The Heliogenesis cancellation test exceeds CI's timeout through forced software rendering**

   Sources: [lifecycle test](../../integrations/web/heliogenesis/tests/heliogenesis.spec.cjs), lines 51-88,
   [test configuration](../../integrations/web/heliogenesis/tests/playwright.config.cjs), and
   [renderer](../../integrations/web/heliogenesis/heliogenesis-scene.js), `renderFrame()` and `draw()`.

   Investigated on 2026-09-05 at revision `a15d569`. The cancellation/replacement test exceeded its 20-second limit
   on both attempts in the
   [latest browser run](https://github.com/jbboehr/doctrine-of-the-second-sun/actions/runs/33993525374).
   The [preceding run](https://github.com/jbboehr/doctrine-of-the-second-sun/actions/runs/33990439558)
   failed the same way.
   The other 18 Heliogenesis tests passed. The reported closed-page error at the final event assertion follows test
   timeout cleanup and does not establish a spontaneous browser crash.

   At that revision, the test called `page.clock.runFor(600)` and `page.clock.runFor(1900)` while the real scene was
   animated. Playwright's
   [`runFor()`](https://playwright.dev/docs/api/class-clock#clock-run-for) executes the callbacks throughout that
   interval. Its pinned 1.61.1 clock implementation schedules animation frames at 16 ms intervals. The renderer
   schedules another frame after every draw, so advancing 2.5 seconds forces 156 frames through software WebGL.
   This makes the lifecycle test's duration depend on rendering throughput.

   The unchanged test passed three times with `CI=1` and the local machine's 32 available logical CPUs. Restricting
   the same command to two CPUs reproduced the timeout twice, including the same final assertion location as CI:

   ```bash
   CI=1 taskset -c 0,1 nix run .#test-heliogenesis -- \
     --grep 'reset cancels a pending activation without cancelling its replacement' \
     --repeat-each=2 --retries=0
   ```

   CPU IDs 0 and 1 were verified as available before this experiment. On another Linux host, select CPUs from its
   allowed affinity set. This models reduced CPU availability without claiming an exact replica of the GitHub runner.

   An instrumented copy with a 90-second diagnostic limit completed successfully on two CPUs. Both activation
   promises resolved within 0.38 seconds of test start. The first clock advance took 7.36 seconds and rendered 37
   frames. The second took 21.07 seconds, bringing the total to 156 frames. All lifecycle assertions passed, with
   events `radiant`, `receding`, and `idle` in order. The longer limit was used only to measure completion.

   | Variant | CPU affinity | Trials | Result | Test duration |
   | --- | --- | --- | --- | --- |
   | Unchanged test | 32 logical CPUs | 3 | All passed | 7.58-8.02 s |
   | Unchanged test | 2 logical CPUs | 2 | Both timed out | 20 s limit |
   | Instrumented `runFor()`, 90 s limit | 2 logical CPUs | 1 | Passed, 156 frames | 29.31 s |
   | Instrumented `fastForward()`, original limit | 2 logical CPUs | 3 | All passed, 1 frame each | 1.76-2.12 s |

   The correction tested during the investigation replaced the two clock advances with
   [`fastForward()`](https://playwright.dev/docs/api/class-clock#clock-fast-forward), which jumps time and executes
   each due timer at most once. The existing assertions remain: the replacement is still dawning after 600 ms,
   no stale lifecycle events have occurred, and the expected transitions have completed after 2,500 ms.

   ```diff
   - await page.clock.runFor(600);
   + await page.clock.fastForward(600);
   ...
   - await page.clock.runFor(1900);
   + await page.clock.fastForward(1900);
   ```

   An isolated copy of the full suite with these two substitutions passed all 19 tests under the existing 20-second
   limit. A control experiment served the controller from revision `afe53e8`, before the lifecycle fix, to the
   fast-forward variant. It failed the original cancellation assertion, returning `[true, true]` instead of
   `[false, true]`, confirming that the clock change still detects that bug.

   The investigation used temporary test copies on x86_64 Linux with Chromium 151.0.7922.75 and software WebGL.
   Probe sources, local traces, CI logs, and `ci-timeout-*.json` results are retained under
   `tmp/project-review-2026-09-04/`.

   **Sixth remediation slice, 2026-09-05:** The checked-in lifecycle test now uses `fastForward()` for both clock
   advances, with a comment explaining the rendering cost. Its assertions and 20-second timeout are unchanged.
   The focused test that previously timed out on two CPUs passed all three fresh trials with retries
   disabled, taking 1.75-2.14 seconds per test. The full Heliogenesis suite also passed all 19 tests with `CI=1` and
   retries disabled. Runtime code and workflow configuration are unchanged.

   These checks ran on x86_64 Linux, using Chromium with software WebGL and the suite's Firefox fallback case.
   The correction has not yet run on GitHub Actions or other platforms. Subsequent reviews found no actionable
   regressions, and the user approved this slice for commit.

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

This experiment confirmed correct cache invalidation for the tested sequence and identified a coverage gap. At the
reviewed revision, the
[runtime-switch test](../../integrations/phpstan/tests/RuntimeSwitchTest.php) checked the switch and metadata hash
directly without running cached analyses.

**Eighth remediation slice, 2026-09-05:** The
[extension integration test](../../integrations/phpstan/tests/ExtensionIntegrationTest.php) now retains the six-run
cache experiment. It copies the existing duplicate-reference fixture into a temporary source directory and uses one
unchanged configuration and cache directory across all six PHPStan processes. Each enforcement state is analysed
twice before changing to the next state: disabled, enabled, then disabled again. The assertions check exit codes,
duplicate diagnostic identifiers, invalidation after each change, and cache restoration with zero files reanalysed
on repeated runs. Cache reuse is observed through PHPStan's verbose diagnostics.

The test supplies the enforcement variable in each child process's environment without changing the parent process.
Its temporary source and cache files are removed in `finally`. The existing process runner and diagnostic decoder
are shared with the other extension integration cases.

The focused test passed with 22 assertions. Two isolated mutation experiments confirmed that it detects broken
invalidation and missing cache reuse. Removing the extension's `phpstan.resultCacheMetaExtension` registration caused
the enabled run to restore disabled results and return status `0` instead of `1`. Clearing the cache before every
analysis failed the cache-restoration assertion on the second run. The unchanged control passed, and temporary
directories were empty after both passing and failing tests. The probe and outputs are retained as
`tmp/project-review-2026-09-04/cache-integration-controls.py` and `cache-integration-controls.json`.

Two concurrent focused runs also passed with the parent enforcement variable set to `on` and `off`, confirming that
the test controls its own environment and uses independent cache directories. `composer test` passed 34 tests with
86 assertions and all four additional PHPStan analyses. `composer cs` and `composer analyse` passed.
`composer validate --strict` and `nix flake check --print-build-logs` also passed, including the package and
rendered-documentation link checks.

Verification used PHP 8.4.24, PHPStan 2.2.8, and PHPUnit 11.5.56 on x86_64 Linux. PHP 8.1 and other platforms remain
unverified. This slice changes test coverage only. Subsequent review found no actionable regressions, and the user
approved this slice for commit.
