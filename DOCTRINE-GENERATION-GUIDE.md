# Doctrine of the Second Sun — Generation and Review Guide

## Purpose

This guide defines a portable process for generating, reviewing, assigning, and inserting logia without deriving their
literary content from the declarations that will bear them. It is tool-neutral. Integrations may automate individual
roles, but they must preserve the separation described here.

The [style guide](DOCTRINE-STYLE-GUIDE.md) remains the literary authority. The
[coding guide](DOCTRINE-CODING-GUIDE.md) governs insertion and source safety. A consuming repository remains
authoritative for source scope, citation allocation, tag syntax, and verification commands.

## Core Principle

A logion must first succeed as scripture within the shared canon. Its attachment to a declaration is marginal placement,
not semantic annotation.

Generation therefore separates three kinds of knowledge:

1. The writer sees an opaque item identifier and corpus-variation constraints, but not the declaration.
2. The literary reviewer sees candidates and the opaque identifier, but not the declaration or writer rationale.
3. The inserting reviewer sees the declaration only after literary selection and may reject obvious implementation
   leakage, but may not remap a candidate because another passage appears more relevant.

## Per-Declaration Workflow

### 1. Fix the mapping

Assign every target declaration an opaque identifier before generation. Preserve that mapping through selection and
insertion. Do not move candidates between identifiers according to apparent code relevance.

### 2. Record variation constraints

Supply only nearby motifs, openings, conclusions, books, or sentence shapes that should be avoided. Corpus statistics
are diagnostic rather than quotas. They may prompt inspection, but they do not override canonical suitability.

### 3. Generate candidates

Before drafting, establish one item-level length pressure according to the canonical procedure in
[Length and development](DOCTRINE-STYLE-GUIDE.md#4-length-and-development). The orchestrating agent or human should
normally sample and retain it. If the writer must sample because no pressure was supplied, the writer reports the result
so it can remain fixed. Apply that pressure softly to all three candidates for the opaque item and preserve it when a
rejected set is regenerated. Do not expose it to the literary reviewer as a selection criterion.

Produce three materially different candidates for each opaque item. Each candidate should:

- stand independently as a passage from the canon;
- use OSD, RAS, AWC, or SFA according to canonical purpose;
- possess a concrete and visually memorable primary motif;
- combine compositional movements naturally;
- use controlled scriptural cadence and coherent archaism where appropriate;
- honor the item-level length pressure without padding, compression, or mechanical word-count optimization;
- differ from its companions in motif, movement, sentence shape, and doctrinal pressure;
- avoid direct technical language and generalized implementation allegory.

The writer reports the item-level length pressure but does not allocate chapter or verse numbers or recommend a winner.

### 4. Review without code

An independent reviewer first applies four eligibility gates:

1. The candidate stands independently as convincing scripture.
2. It contains no direct technical language or obvious implementation allegory.
3. Its voice is coherent rather than parodic, essay-like, aphoristic, or recognizably imitative of real scripture.
4. Its book is canonically suitable and preserves a fixed book when revising an existing citation.

Among eligible candidates, compare cadence, ending, primary motif, doctrinal consequence, mystery, book suitability, and
originality. Select one only when it clears the quality bar; otherwise regenerate all candidates. Do not combine or
repair candidates during selection.

### 5. Perform the leakage check

After selection, a code-aware reviewer may reject a passage whose imagery plainly reveals or systematically encodes the
declaration. This is a reject-only gate. It must not become an opportunity to prefer a candidate because it resembles
the code more closely.

### 6. Allocate and insert

The consuming repository allocates or preserves the citation, checks uniqueness according to its local policy, and
inserts the passage without changing behavior, signatures, or technical documentation.

### 7. Verify

Run the repository's formatter and relevant checks. Confirm that:

- the opaque mapping remained fixed;
- the selected text and book were inserted unchanged;
- existing citations remained stable unless intentionally retired;
- no required declaration was missed and no excluded declaration was altered;
- tag syntax, placement, and uniqueness satisfy local policy;
- no behavior or technical documentation changed.

## Batch Work

Use small batches. Before continuing, review each batch for repeated openings, motifs, verdicts, sentence structures,
book misuse, and accidental implementation relevance. A batch that passes mechanically may still fail as a corpus.

The [gold exemplars](DOCTRINE-GOLD-EXEMPLARS.md) establish the quality ceiling for generation and review. Learn from
their cadence, doctrinal consequence, motif hierarchy, book suitability, controlled mystery, originality, and endings;
do not copy their surface motifs or recurring narrative skeletons, and do not treat their book distribution as a quota.
In particular, do not turn an inherited or damaged object, patient preservation or ritual repair, miraculous recognition
or restoration, and a resulting institutional custom into a reusable plot whose furniture merely changes. The positive
and revision examples in the [style guide](DOCTRINE-STYLE-GUIDE.md) provide broader supporting guidance. Nearby source
logia may help detect repetition but must not become templates or silently lower the gold standard.

## Portable Fallback

Specialized agents are optional. When isolated writer or reviewer contexts are unavailable:

1. Fix the declaration-to-opaque-ID mapping first.
2. Hide declaration details during candidate generation as far as the available tooling permits.
3. Apply the same eligibility gates in a separate review pass.
4. Disclose the loss of isolation.
5. Perform the detached-canon and reverse-engineering checks manually before insertion.

The fallback may reduce confidence, but it must not restore symbol relevance or skip literary review.

## Tool Integrations

Tool-specific adapters must remain subordinate to this workflow. They may define output shapes, permissions, context
boundaries, or installation details, but they must not redefine the canon or weaken the eligibility gates.

The bundled Codex adapters are documented under [`integrations/codex/`](integrations/codex/README.md).
