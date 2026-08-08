![Doctrine of the Second Sun](assets/banner.png)

# Doctrine of the Second Sun

Doctrine of the Second Sun is a portable collection of literary, visual, coding, and software-stewardship guidance.
It defines one fictional scripture with four canonical books while keeping repository-specific placement and enforcement
rules in the projects that consume it.

## Documents

- [`DOCTRINE-STYLE-GUIDE.md`](DOCTRINE-STYLE-GUIDE.md): literary worldview, books, movements, cadence, imagery, and
  examples.
- [`DOCTRINE-CODING-GUIDE.md`](DOCTRINE-CODING-GUIDE.md): safe insertion and review of literary marginalia in source
  code.
- [`DOCTRINE-IMAGE-GUIDE.md`](DOCTRINE-IMAGE-GUIDE.md): visual interpretation of completed logia.
- [`DOCTRINE-GENERATION-GUIDE.md`](DOCTRINE-GENERATION-GUIDE.md): tool-neutral writer, reviewer, and insertion workflow.
- [`DOCTRINE-GOLD-EXEMPLARS.md`](DOCTRINE-GOLD-EXEMPLARS.md): exceptional reference logia establishing the quality
  ceiling for generation and review.
- [`RUINENWERT.md`](RUINENWERT.md): designing software so its useful knowledge survives active maintenance.
- [`CODE_OF_SOVEREIGNTY.md`](CODE_OF_SOVEREIGNTY.md): repository governance and the sovereignty of forks.

Ruinenwert and the Code of Sovereignty are institutional documents, not books or teachings within the fictional canon.

## Composer

Install the documents as a development dependency:

```console
composer require --dev jbboehr/doctrine-of-the-second-sun:dev-master
```

The package root is then available at:

```text
vendor/jbboehr/doctrine-of-the-second-sun/
```

Consuming projects should keep their own `AGENTS.md` or equivalent policy for source scope, tag syntax, citation
allocation, asset locations, and verification commands.

## Nix

Add the repository as a flake input:

```nix
inputs.doctrine-of-the-second-sun.url = "github:jbboehr/doctrine-of-the-second-sun";
```

The default package installs the documents beneath:

```text
share/doctrine-of-the-second-sun/
```

A consuming development shell can expose that location explicitly:

```nix
DOCTRINE_OF_SECOND_SUN_DIR =
  "${inputs.doctrine-of-the-second-sun.packages.${system}.default}/share/doctrine-of-the-second-sun";
```

Prefer one installation mechanism per consuming repository so Composer and Nix locks cannot silently select different
revisions.

## Codex Integration

Codex-specific writer and reviewer adapters live under [`integrations/codex/`](integrations/codex/README.md). They are
optional workflow aids rather than part of the tool-neutral doctrine.

## License

Unless otherwise indicated, the documentation, Codex integrations, packaging files, and artwork in this repository are
licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License](LICENSE.md).

When attribution is required, a reasonable form is:

> Doctrine of the Second Sun, John Boehr and contributors,
> <https://github.com/jbboehr/doctrine-of-the-second-sun>

The SPDX identifier is `CC-BY-SA-4.0`. Adaptations must identify their changes and be distributed under the same or a
compatible license as required by CC BY-SA 4.0.
