# Integration Guide

This guide explains how a project can adopt Doctrine of the Second Sun for human maintainers and coding agents. It
connects the portable guides in this package to the source scope, repository policy, tools, and verification commands of
a consuming project.

Installing the package makes its documents available. It does not decide where doctrine applies, change a coding
agent's instructions, or impose source-editing rules on the consuming repository. Those decisions remain local.

## 1. Choose One Installation Mechanism

Use either Composer or Nix in a consuming repository. Do not use both unless the project deliberately verifies that both
locks select the same Doctrine revision.

### Composer

Install the package as a development dependency:

```console
composer require --dev jbboehr/doctrine-of-the-second-sun:dev-master
```

The documents are then available under:

```text
vendor/jbboehr/doctrine-of-the-second-sun/
```

Commit `composer.lock` so contributors and automation receive the reviewed revision.

### Nix

Add the repository as a flake input:

```nix
inputs.doctrine-of-the-second-sun.url = "github:jbboehr/doctrine-of-the-second-sun";
```

Expose its installed directory where local tools and instructions can refer to it:

```nix
DOCTRINE_OF_SECOND_SUN_DIR =
  "${inputs.doctrine-of-the-second-sun.packages.${system}.default}/share/doctrine-of-the-second-sun";
```

Commit `flake.lock` so the selected revision remains reproducible.

## 2. Choose What The Project Adopts

Adoption is deliberate. A project may use the literary and coding guides without adopting the institutional documents,
or use Ruinenwert without placing logia in source code.

The available documents have distinct responsibilities:

| Document | Adopt it when the project needs |
| --- | --- |
| `DOCTRINE-STYLE-GUIDE.md` | The canon's literary worldview, voice, books, movements, cadence, and imagery |
| `DOCTRINE-CODING-GUIDE.md` | Safe placement and review of literary marginalia in source code |
| `DOCTRINE-IMAGE-GUIDE.md` | Visual interpretation of completed logia |
| `DOCTRINE-GENERATION-GUIDE.md` | A tool-neutral writer, reviewer, selection, and insertion workflow |
| `DOCTRINE-GOLD-EXEMPLARS.md` | A nonnormative quality ceiling for generation and review |
| `RUINENWERT.md` | Long-term preservation of software knowledge and replacement boundaries |
| `CODE_OF_SOVEREIGNTY.md` | Repository governance under a recognized final authority and the sovereignty of forks |

Do not imply that installing the package automatically adopts the Code of Sovereignty or any other governance policy.
State institutional adoption explicitly where it applies.

## 3. Define Repository-Local Policy

The portable guides cannot know a consuming project's directory layout, comment conventions, compatibility promises,
or test commands. Record those details in the consuming repository's `AGENTS.md` or equivalent authoritative policy.

Define, as applicable:

- which installed documents the project adopts and where they are located;
- the precedence between local repository policy and the portable guides;
- source roots, generated-code boundaries, tests, fixtures, stubs, and other exclusions;
- the tag, annotation, comment, or asset form used to carry doctrine;
- the allowed book codes and exact citation syntax;
- citation allocation, collision checks, stability, and reuse rules;
- whether doctrine applies only to new declarations or may be backfilled during an explicit pass;
- image locations, formats, aspect ratios, and naming rules;
- the local generation, independent review, selection, insertion, and leakage checks;
- formatting, static-analysis, test, documentation, and packaging commands required after edits.

Local policy governs placement, coverage, tooling, and verification. The installed style, coding, image, and generation
guides govern their respective literary and procedural concerns. A local policy may narrow optional choices, but it
should identify deliberate departures instead of silently contradicting the portable guidance.

## 4. Give Humans And Agents The Same Entrance

Link the adopted guides from the files contributors already read. At minimum:

- put operational rules in `AGENTS.md` or the repository's equivalent agent-policy file;
- link the same rules from `CONTRIBUTING.md` when human contributors are expected to apply them;
- identify the installation mechanism and pinned source of the guides;
- keep ordinary build and review commands in conventional repository documentation.

Do not copy the complete portable guides into every consuming repository. Refer to the pinned installation and keep only
project-specific policy locally. Copying is appropriate only when the project intends to maintain a documented
adaptation under the license rather than consume the upstream guidance.

Do not rely on a tool-specific prompt as the only explanation of repository policy. Humans should be able to determine
the same scope, authority, and verification rules without reconstructing an agent configuration.

## 5. Local Policy Template

Adapt the following structure rather than copying it without review. Remove sections that do not apply and replace every
placeholder with a concrete local rule.

```md
## Doctrine of the Second Sun

This repository adopts [list the adopted documents] from Doctrine of the Second Sun, pinned through [Composer or Nix].
The installed guides are available at [path or environment variable].

### Authority

[Name the local policy authority.] Local policy governs repository scope, placement, citation allocation, and
verification. The installed Doctrine guides govern literary style, safe insertion, visual interpretation, and generation
within their stated responsibilities.

### Scope

Doctrine applies to [source roots and declaration or artifact kinds]. It does not apply to [generated code, tests,
fixtures, stubs, vendored files, or other exclusions].

### Form And Citations

Use [tag, annotation, comment, or asset form]. Allowed book codes are `OSD`, `RAS`, `AWC`, and `SFA`. Citations use
[exact syntax]. Allocate and check citations by [procedure], preserve them under [conditions], and never reuse them
under [conditions].

### Workflow

For new material, [describe generation, independent review, human or parent selection, insertion, and leakage review].
Tool-specific adapters are [optional, required, or not used].

### Verification

After an applicable change, run [formatter], [static analysis], [focused tests], and [complete or specialist checks].
Confirm [coverage, citation uniqueness, asset naming, or other project-specific invariants].
```

The template is an integration aid, not a second normative Doctrine. The consuming repository's completed policy is the
authority for its own source tree.

## 6. Install Optional Tool Adapters

The generation guide is tool-neutral. A coding agent can follow it directly when its environment supports isolated
writer and reviewer contexts, or the consuming project can provide a named adapter for a specific tool.

Codex adapters are available under [`integrations/codex/`](integrations/codex/README.md). Installing the Composer
package or Nix flake does not register them automatically. Review any copied adapter, commit it in the consuming
repository, and keep local instructions authoritative for source scope, citations, insertion, and verification.

PHP repositories may also opt into the [`integrations/phpstan/`](integrations/phpstan/README.md) enforcement adapter.
It validates locally selected declaration and command coverage, tag and citation form, allowed books, and citation
uniqueness without choosing those local paths itself. Its collision collector requires a complete analysis of the
configured scope; changed-file analysis alone cannot establish repository-wide uniqueness. The adapter is off by
default and may be enabled per invocation with the `DOCTRINE_LOGION` environment variable.

The optional [`Heliogenesis browser integration`](integrations/web/heliogenesis/README.md) is distributed in the same
package. It must be copied into a consuming site's public assets and mounted explicitly; installation alone never
changes that site's documentation theme.

Do not present one tool's configuration format as a portable agent standard. Additional adapters should live under
`integrations/<tool>/` and identify the tool they target.

## 7. Verify The Integration

Before relying on the integration, confirm:

1. The selected lock file contains the intended Doctrine revision.
2. Every adopted document is readable at the path named by local policy.
3. Human and agent entry points both lead to the same repository-specific rules.
4. Optional tool adapters can locate the installed guides.
5. Citation allocation and collision checks operate over the complete local scope.
6. The documented verification commands run from a fresh checkout without private maintainer state.
7. Package and release artifacts contain or exclude Doctrine material intentionally.

For Composer installations, a basic availability check is:

```console
test -r vendor/jbboehr/doctrine-of-the-second-sun/DOCTRINE-STYLE-GUIDE.md
```

For Nix installations with the environment variable above:

```console
test -r "$DOCTRINE_OF_SECOND_SUN_DIR/DOCTRINE-STYLE-GUIDE.md"
```

These checks establish availability only. They do not validate the consuming project's local scope or policy.

## 8. Upgrade Deliberately

Treat a Doctrine update as a documentation and policy change rather than an incidental dependency refresh.

When advancing the pinned revision:

1. Review the upstream document diff.
2. Identify changes to normative rules, canonical terminology, citation policy, generation workflow, and exemplars.
3. Update repository-local policy where the integration contract changed.
4. Refresh committed tool-adapter copies when their upstream versions changed.
5. Run the consuming project's doctrine and documentation checks.
6. Commit the lock update with any necessary local-policy adjustments.

Do not silently compensate for incompatible guidance inside an agent prompt. Record an intentional local exception where
future humans and tools can find it.
