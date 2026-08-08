# Agent Guidelines

This repository publishes portable human documentation. Preserve the distinction between its universal guidance and
the project-specific policies supplied by consuming repositories.

## Authorities

- `DOCTRINE-STYLE-GUIDE.md` governs literary meaning and voice.
- `DOCTRINE-CODING-GUIDE.md` governs safe editing and insertion.
- `DOCTRINE-IMAGE-GUIDE.md` governs visual translation.
- `DOCTRINE-GENERATION-GUIDE.md` governs the tool-neutral generation and review process.
- `RUINENWERT.md` governs long-term software knowledge preservation.

The four canonical books remain OSD, RAS, AWC, and SFA. Preserve mixed compositional movements and one coherent canon;
do not restore rigid per-logion genres or project implementation relevance.

## Repository Boundary

Do not add one consuming project's source roots, tag coverage, citation allocation, asset paths, framework assumptions,
or verification commands to the universal guides. Put such requirements in that project's own repository policy.

Keep primary documents at the repository root. Tool-specific adapters belong under `integrations/<tool>/` and must be
identified by the tool they target. Do not present a Codex TOML file as a portable agent standard.

## Editing

- Preserve useful rationale when shortening guidance.
- Keep links relative and valid from the repository root.
- Wrap prose at 120 columns where practical.
- Avoid broad reformatting during focused changes.
- Review all four books and the generation guide when changing canonical terminology.
- Review both coding and image guides when changing the style guide's movements, symbols, or citation model.

## Verification

For metadata or Nix changes, run:

```console
composer validate --strict
nix flake check
```

For documentation changes, also inspect relative links, search for stale terminology, and review the complete diff.
