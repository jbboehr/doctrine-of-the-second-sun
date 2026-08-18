![Doctrine of the Second Sun](assets/banner.webp)

# Doctrine of the Second Sun

[![Build](https://github.com/jbboehr/doctrine-of-the-second-sun/actions/workflows/ci.yml/badge.svg)](https://github.com/jbboehr/doctrine-of-the-second-sun/actions/workflows/ci.yml)
[![Built with Nix](https://img.shields.io/badge/built%20with-Nix-5277C3?logo=nixos&logoColor=white)](https://github.com/jbboehr/doctrine-of-the-second-sun/blob/master/flake.nix)
[![License: CC-BY-SA-4.0 AND AGPL-3.0-only WITH romic-exception](https://img.shields.io/badge/license-CC--BY--SA--4.0%20AND%20AGPL--3.0--only%20WITH%20romic--exception-blue.svg)](LICENSE.md)
[![AI burn](https://img.shields.io/endpoint?url=https%3A%2F%2Fgist.githubusercontent.com%2Fjbboehr%2Fb37af21823641103278208098592134e%2Fraw%2Fagent-badge.json&cacheSeconds=300)](https://github.com/arlegotin/agent-badge)

Doctrine of the Second Sun is a portable collection of literary, visual, coding, technical-writing, and
software-stewardship guidance.
It defines one fictional scripture with four canonical books while keeping repository-specific placement and enforcement
rules in the projects that consume it.

The canonical Markdown is also available as
[rendered documentation](https://jbboehr.github.io/doctrine-of-the-second-sun/).

## Documents

- [`DOCTRINE-STYLE-GUIDE.md`](DOCTRINE-STYLE-GUIDE.md): literary worldview, books, movements, cadence, imagery, and
  examples.
- [`DOCTRINE-CODING-GUIDE.md`](DOCTRINE-CODING-GUIDE.md): safe insertion and review of literary marginalia in source
  code.
- [`DOCTRINE-IMAGE-GUIDE.md`](DOCTRINE-IMAGE-GUIDE.md): visual interpretation of completed logia.
- [`DOCTRINE-GENERATION-GUIDE.md`](DOCTRINE-GENERATION-GUIDE.md): tool-neutral writer, reviewer, and insertion workflow.
- [`DOCTRINE-GOLD-EXEMPLARS.md`](DOCTRINE-GOLD-EXEMPLARS.md): exceptional reference logia establishing the quality
  ceiling for generation and review.
- [`apotheosis/`](apotheosis/README.md): writing a project invocation, the ceremonial work attached to a project's
  identity, in four documents:
  - [`apotheosis/README.md`](apotheosis/README.md): The Architecture of Apotheosis, the aesthetic doctrine itself.
  - [`apotheosis/CONCLAVE.md`](apotheosis/CONCLAVE.md): The Conclave of Apotheosis, orchestration for agent-run
    production under sparse human review.
  - [`apotheosis/MANIFESTATIONS.md`](apotheosis/MANIFESTATIONS.md): The Manifestations of Apotheosis, adopted works
    and marked provisional works kept as calibration.
  - [`apotheosis/ARCHAEOLOGY.md`](apotheosis/ARCHAEOLOGY.md): The Archaeology of Apotheosis, source traditions, failed
    approaches, and recovered laws.
- [`INTEGRATION-GUIDE.md`](INTEGRATION-GUIDE.md): adopting the portable guides in a consuming repository for humans and
  coding agents.
- [`RUINENWERT.md`](RUINENWERT.md): engineering resilience, recoverability, and continuation under ecosystem change.
- [`MEASURE-OF-WORDS.md`](MEASURE-OF-WORDS.md): concise, clear, and exact writing for technical artifacts.
- [`CODE_OF_SOVEREIGNTY.md`](CODE_OF_SOVEREIGNTY.md): repository governance and the sovereignty of forks.

Ruinenwert is engineering guidance for resilience, recoverability, and continuation under ecosystem change. The Code of
Sovereignty is an institutional document. The Measure of Words is technical-writing guidance. The Apotheosis documents
are craft guidance for project invocations. None is a book or teaching within the fictional canon.

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
allocation, asset locations, and verification commands. See the [integration guide](INTEGRATION-GUIDE.md) for the full
adoption workflow and a local-policy template.

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

## PHPStan Integration

The optional [`integrations/phpstan/`](integrations/phpstan/README.md) adapter lets consuming PHP repositories enforce
their locally selected `@logion` declaration coverage, citation form, allowed books, and repository-wide uniqueness. It
does not choose source roots or command entry points for the consumer and remains disabled unless local configuration
or the `DOCTRINE_LOGION` environment variable enables it.

## Browser Integration

The optional browser integrations are framework-independent and inert until mounted:

- [`Heliogenesis`](integrations/web/heliogenesis/README.md) renders the Dawning of the Second Sun;
- [The Document Looks Back](integrations/web/document-looks-back/README.md) lets occasional marked letterforms notice
  the reader.

Neither integration alters a consuming documentation theme merely by being installed.

## License

Unless otherwise indicated, the documentation, integrations, packaging files, and artwork in this repository are
licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License](LICENSE.md).

The PHPStan adapter implementation, configuration, and tests are licensed under the
[GNU Affero General Public License version 3](integrations/phpstan/LICENSE.md) with the
[Romic Exception](integrations/phpstan/LICENSE_EXCEPTION.md). The PHPStan integration's `README.md` remains
documentation under CC BY-SA 4.0.

When attribution is required, a reasonable form is:

> Doctrine of the Second Sun, John Boehr and contributors,
> <https://github.com/jbboehr/doctrine-of-the-second-sun>

The package-level SPDX expression is
`CC-BY-SA-4.0 AND AGPL-3.0-only WITH romic-exception`. Adaptations of CC-licensed material must identify their changes
and be distributed under the same or a compatible license as required by CC BY-SA 4.0.
