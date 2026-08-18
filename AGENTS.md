# Agent Guidelines

This repository publishes portable human documentation. Preserve the distinction between its universal guidance and
the project-specific policies supplied by consuming repositories.

## Authorities

- `DOCTRINE-STYLE-GUIDE.md` governs literary meaning and voice.
- `DOCTRINE-CODING-GUIDE.md` governs safe editing and insertion.
- `DOCTRINE-IMAGE-GUIDE.md` governs visual translation.
- `DOCTRINE-GENERATION-GUIDE.md` governs the tool-neutral generation and review process.
- `MEASURE-OF-WORDS.md` governs concision and clarity in technical artifacts, not logia or other non-technical prose.
- `RUINENWERT.md` governs engineering resilience, recoverability, and continuation under ecosystem change.
- `apotheosis/README.md` governs the art of project invocations, not logia or ordinary documentation prose.
- `apotheosis/CONCLAVE.md` governs how an invocation is produced. `apotheosis/MANIFESTATIONS.md` supplies positive
  calibration and `apotheosis/ARCHAEOLOGY.md` is interpretive rather than normative.

The four canonical books remain OSD, RAS, AWC, and SFA. Preserve mixed compositional movements and one coherent canon;
do not restore rigid per-logion genres or project implementation relevance.

## Repository Boundary

Do not add one consuming project's source roots, tag coverage, citation allocation, asset paths, framework assumptions,
or verification commands to the universal guides. Put such requirements in that project's own repository policy.

Keep primary documents at the repository root. A primary document divided into several parts may instead occupy one
named directory, as the Apotheosis set occupies `apotheosis/`. Tool-specific adapters belong under
`integrations/<tool>/` and must be identified by the tool they target. Do not present a Codex TOML file as a portable
agent standard.

## Editing

- Preserve useful rationale when shortening guidance.
- Keep links relative and valid from the repository root.
- Wrap prose at 120 columns where practical.
- Avoid broad reformatting during focused changes.
- Keep repository and primary-document banners at 2172 × 724. Retain each original generated PNG as `*-hq.png` and
  link a same-dimension optimized `.webp` from documentation.
- Store the README hero at `assets/banner-hq.png` and `assets/banner.webp`. Place the WebP before the H1. Place the
  badge block immediately after the H1.
- Store primary-document banners at `assets/banners/<slug>-hq.png` and `assets/banners/<slug>.webp`. Place the WebP
  immediately after the document H1.
- Render banners at full width with plain Markdown image syntax. Do not add banners to `AGENTS.md` or `LICENSE.md`.
- Keep logion illustrations at 16:9. Treat `assets/<reference>-hq.webp` as the 3840 × 2160 working master and
  `assets/<reference>.webp` as the 960 × 540 publication asset. The established workflow may resize a smaller native
  generation once with Lanczos; native 4K detail is required only when a task says so explicitly.
- Before generating an image batch, run one image through the complete generation and resizing path and verify its
  dimensions. Preserve the native generations under `tmp/` until review. Do not introduce neural super-resolution unless
  the user explicitly requests it.
- Review all four books and the generation guide when changing canonical terminology.
- Review both coding and image guides when changing the style guide's movements, symbols, or citation model.

## Verification

For metadata or Nix changes, run:

```console
composer validate --strict
nix flake check
```

For PHPStan adapter changes, also run:

```console
composer test
composer cs
composer analyse
```

For documentation changes, also inspect relative links, search for stale terminology, and review the complete diff.
