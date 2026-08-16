# Ruinenwert: Designing Software for a Useful Afterlife

![Durable ruins preserved beneath the Second Sun](assets/banners/ruinenwert.webp)

## Purpose

Software lives in an environment that changes around it.

Frameworks replace their APIs. Dependencies are abandoned or rewritten. Runtimes remove old behavior. Build tools become
obsolete. Package registries and hosted services disappear. Formats and protocols evolve. Maintainers leave.
Organizations change direction. A project may remain actively maintained and still lose useful structure to that drift.

This document describes a design principle for that condition:

> Design software so that external change destroys as little accumulated knowledge and useful structure as possible.

This is called **Ruinenwert**, or "ruin value": the value a structure retains after the environment or use for which it
was built has changed.

The objective is not to create immortal software. That is generally impossible. The objective is to produce **good
ruins**: software that keeps recognizable structure after parts of its surrounding technological environment have moved
on.

A project with good Ruinenwert can be repaired, migrated, forked, reimplemented, or used as prior art without
reconstructing the original authors' entire environment and thought process. Maintainer abandonment is the extreme case
of the same problem.

## Scope

Ruinenwert is an engineering doctrine for resilience, recoverability, and continuation under ecosystem change.

It asks what remains useful when the environment around software changes or decays.

It governs properties of the software and the knowledge required to keep that software understandable:

- resilience to ecosystem change and decay;
- recoverability;
- reproducibility;
- independent buildability and testability;
- documented invariants and compatibility contracts;
- replaceable infrastructure and dependencies;
- release reconstructability;
- preservation of critical technical knowledge;
- practical forkability; and
- the ability to continue the software after the original steward or environment disappears.

It does not decide who holds authority, who must inherit a repository, or which lineage remains official.

> Forkability is a property of the artifact. Succession is a property of the institution around it.

That distinction supports continuation. It is not the whole of Ruinenwert. The
[Code of Sovereignty](CODE_OF_SOVEREIGNTY.md) addresses authority within a particular repository. Adoption of one does
not adopt the other.

### Adoption

A project that adopts Ruinenwert undertakes its engineering principles. Those principles include Fork Continuity as the
default continuation model.

The names, paths, layouts, procedures, and mechanisms in this document are suggested realizations. They are not
requirements unless the project, or its local policy, makes them so. Preserve a project's conventional structure.
Consolidate related material when that is clearer.

A project does not need to preserve its original canonical identity in order to satisfy Ruinenwert.

### How to read this document

- A **principle** states an engineering outcome that Ruinenwert adoption requires.
- A **recommended practice** describes a preferred way to achieve a principle. An equivalent mechanism is acceptable.
- An **illustrative mechanism** is an example only: a file name, directory, procedure, or other concrete realization.

When the distinction is unclear, preserve the stated engineering outcome rather than the particular mechanism.

## Ecosystem Change and Decay

Ruinenwert concerns resilience to **ecosystem change and decay**: change outside the project's semantic core that can
make previously working software difficult to build, test, run, release, or maintain.

**Ecosystem drift** is the ordinary accumulation of that change: APIs evolving, toolchains falling out of favor, and
conventions moving elsewhere. Abrupt loss belongs to the same problem. A package may disappear, a hosted service may
shut down, a registry may vanish, or maintainers and organizations may disappear.

```text
ecosystem resilience
    |
    +-- recoverability
            |
            +-- continuation
                    |
                    +-- Fork Continuity — default
                            |
                            +-- Canonical Succession — optional addition
```

**Ecosystem resilience** asks whether the project can adapt when dependencies, frameworks, services, formats, runtimes,
or tools change.

**Recoverability** asks whether enough knowledge remains to reconstruct, replace, or reimplement a part that has become
unusable.

**Continuation** asks whether someone else can continue the software if the current maintainers or organization
disappear.

**Fork Continuity** is the default engineering model for independent continuation. **Canonical Succession** is an
optional additional profile for continuity of original identities.

Fork Continuity is an important consequence of Ruinenwert, not the entire subject.

Do not spend equal effort on every external surface. Weight the work by how load-bearing the piece is, how likely it is
to decay, how expensive rediscovery would be, and how valuable the surviving knowledge is.

## The Central Question

For every important component, ask:

> What must survive so that this software remains understandable and recoverable when its environment changes?

Distinguish durable project knowledge from the current ecosystem embodiment:

```text
durable project knowledge
        vs.
current ecosystem embodiment
```

Durable knowledge commonly includes semantics, invariants, compatibility contracts, protocols, important datasets,
behavioral tests, and rationale.

More replaceable embodiment commonly includes framework adapters, CI providers, package publication plumbing, hosting
providers, specific build tools, and external API clients.

Some ecosystem-specific behavior is itself part of the public contract. Treat that as durable knowledge, not as
disposable embodiment.

A project has strong Ruinenwert when the surviving structure includes more than source code. It may include:

- a clearly stated public contract;
- an executable conformance suite;
- stable data formats or diagnostic identifiers;
- documented invariants;
- representative fixtures;
- a small semantic core;
- a reproducible generation process; and
- a reconstructable build, test, and release path.

A project has weak Ruinenwert when its behavior can only be inferred from a large, entangled implementation tied to a
particular version of a framework or toolchain.

## Human Understanding Comes First

Documentation must first be readable by humans.

It may also serve as context for language models and other automated tools, but it should not be written as an opaque
agent prompt or a collection of instructions that only make sense to a particular model.

Prefer documentation that explains:

1. what the system is trying to accomplish;
2. which behavior is intentional;
3. which constraints preserve correctness;
4. where replacement boundaries exist;
5. which parts are expected to decay first; and
6. how an engineer can verify that a change remains compatible.

A language model can work effectively from clear human documentation. Humans cannot reliably work from compressed,
machine-oriented context that omits rationale.

Documentation should therefore preserve both:

- **rules**, which describe what must remain true; and
- **reasons**, which explain why those rules exist.

Rules without reasons become cargo cults. Reasons without rules become suggestions.

## Design for Unequal Rates of Decay

Not every part of a system ages at the same rate.

Framework adapters, build scripts, CI configuration, editor integrations, and tool-specific extension points often decay
quickly. Domain models, parsers, algorithms, formats, and behavioral examples usually decay more slowly.

A Ruinenwert-oriented design separates these according to their expected rate of decay. That is the main way the design
absorbs ecosystem change.

### The Stone

The durable core should contain the project's essential meaning:

- domain concepts;
- parsers and grammars;
- normalization rules;
- algorithms;
- comparison or evaluation semantics;
- stable error categories;
- data models;
- language-independent specifications; and
- public behavioral fixtures.

### The Timber

Replaceable outer layers commonly include:

- framework service providers;
- static-analysis integration APIs;
- build-system plugins;
- command-line presentation;
- editor integrations;
- storage adapters;
- network clients;
- translation plumbing; and
- CI and release automation.

Dependencies should point inward:

```text
Frameworks and external tools
              |
              v
      Integration adapters
              |
              v
       Application logic
              |
              v
    Semantic model and rules
```

The semantic core should not need to understand the framework adapter surrounding it.

When an external API changes, an engineer should be able to replace the corresponding adapter without rediscovering or
rewriting the project's central semantics.

## Do Not Confuse Modularity With Package Count

Separating responsibilities does not require publishing every responsibility as a separate package.

Excessive package splitting can reduce Ruinenwert by introducing:

- additional release processes;
- cross-package version constraints;
- more repositories or package metadata;
- circular compatibility problems;
- fragmented documentation; and
- unclear ownership boundaries.

Begin with logical modules and enforced dependency direction inside one repository.

Split a module into a separate package only when it has a genuinely independent:

- consumer base;
- dependency set;
- release cadence;
- compatibility policy; or
- stewardship boundary.

A coherent repository with several replaceable modules is often easier to resurrect than a constellation of abandoned
micro-packages.

## Treat Tests as an Executable Constitution

Ordinary unit tests often describe the current implementation. A durable project also needs tests that describe the
project's identity.

A durable project should maintain an explicit **conformance suite** that answers:

> If the implementation were replaced, what behavior would the replacement need to preserve?

That question is useful during ordinary migrations, not only after abandonment.

One useful test structure is:

```text
tests/
|-- Unit/
|-- Integration/
`-- Conformance/
```

Conformance tests should prefer public inputs and outputs over internal implementation details.

They should capture behavior such as:

- accepted and rejected inputs;
- canonical output forms;
- error categories;
- boundary behavior;
- compatibility guarantees;
- representative real-world examples;
- previously fixed regressions; and
- interactions among public features.

Where the public behavior can be represented faithfully as data, store cases as language-neutral fixtures:

```text
tests/Conformance/
|-- valid/
|-- invalid/
|-- expected/
`-- compatibility/
```

A later implementation should be able to consume these fixtures even if it uses different internal abstractions, or a
different programming language. Behavior that depends essentially on language semantics, framework lifecycles, object
identity, or callbacks may instead require black-box conformance tests in the implementation language. Independence from
current internals matters more than independence from every programming language.

### Stable Identifiers Over Stable Prose

Human-readable error messages may improve over time. Localization may change them completely.

When errors form part of the observable behavior, assign stable semantic identifiers:

```text
project.invalid_expression
project.unsupported_operation
project.incompatible_types
```

Tests and integrations should depend on the identifier where possible, not the exact English wording.

The identifier preserves meaning. The message explains it to the current user.

## Document Invariants Independently of Implementation

An invariant is something that must remain true regardless of how the implementation is organized.

Record the project's durable rules independently of any one implementation. Those rules preserve design knowledge when
implementation details or ecosystem conventions change. The relevant invariants depend on the system. Examples from
parsers, analyzers, exact arithmetic, and generated-data projects may include:

- input expressions must be statically knowable;
- normalization must be deterministic;
- equivalent values must produce the same canonical representation;
- operations must not silently discard precision;
- unknown inputs must not be accepted as known-safe values;
- error paths must retain their original source location; and
- generated artifacts must be reproducible from committed sources.

These constraints are often distributed across code comments, tests, issue discussions, and the original maintainer's
memory.

A dedicated document is often the clearest form. One useful `docs/invariants.md` states:

- the invariant;
- why it matters;
- where it is currently enforced;
- what a tempting but invalid alternative might look like; and
- whether violating it is a compatibility break, correctness bug, or accepted tradeoff.

The same knowledge may live in architecture notes or another conventional document when a separate file would add more
maintenance than clarity. Preserve the knowledge, not the filename.

This record is particularly valuable to automated contributors. It tells them which apparent simplifications would
quietly destroy the design.

## Preserve the Specification Independently of the Implementation

The most durable artifact may not be the current source code. It may be the system's specification.

Where possible, describe the project's core semantics independently of:

- class names;
- framework terminology;
- directory structure;
- dependency injection containers;
- a specific programming language; and
- a specific build system.

This does not require writing a formal standard.

A useful specification may consist of:

- a grammar;
- a set of normalization rules;
- tables of valid and invalid cases;
- input/output examples;
- error classifications;
- algebraic laws;
- ordering or precedence rules;
- compatibility expectations; and
- conformance fixtures.

The specification should be precise enough that an engineer could produce a compatible implementation without copying
the existing source line by line, including after a language or toolchain change.

## Commit Generated Artifacts and Their Sources

Generated files create two distinct preservation needs.

The committed generated output allows users to continue consuming the project even when the original generator no longer
runs.

The generator and its source data allow later maintainers to modify or reconstruct that output.

When generated artifacts are valuable independently, preserve both their sources and their output when doing so
materially improves continued use or recovery and their size, provenance, licensing, and sensitivity permit it:

```text
spec/
generator/
generated/
tests/
```

Record:

- which files are generated;
- which files are authoritative;
- how generation is invoked;
- whether generated output should be committed;
- how reproducibility is checked; and
- which tool versions are known to work.

Do not commit generated output that contains secrets, personal data, or material that cannot be redistributed. Large or
cheaply reproducible output may be better preserved through documented generation and durable source data than through
version control.

Do not require the generator merely to use the latest released artifact unless regeneration is fundamental to normal
operation.

The last valid generated output may outlive the environment that produced it.

## Keep the Project Entrance Conventional

An engineer who does not share the project's historical environment will begin at the repository root.

Use familiar ecosystem landmarks wherever practical:

```text
README.md
CHANGELOG.md
CONTRIBUTING.md
SECURITY.md
LICENSE
docs/
src/
tests/
tools/
```

Project-specific ornamentation is welcome. Distinctive naming, artwork, voice, and philosophy can make a project
memorable.

The load-bearing structure, however, should remain unsurprising.

An engineer should not need to discover:

- a custom task runner before running tests;
- a hidden configuration location before reading the project;
- an undocumented wrapper before invoking the standard package manager;
- a CI-only process before producing a release;
- a private service before rebuilding documentation; or
- a maintainer's shell aliases before executing checks.

Prefer obvious local commands such as:

```text
composer test
composer analyse
composer check
```

CI should call these commands rather than contain the only authoritative version of their logic.

## Separate the Public Contract From Internal Convenience

An engineer must be able to determine which parts of the project users are entitled to depend upon.

Make the public surface explicit:

- public classes and functions;
- supported configuration keys;
- stable error identifiers;
- file or wire formats;
- extension points;
- environment variables;
- command-line behavior; and
- compatibility commitments.

Also state what is internal.

Visibility modifiers alone are not always sufficient. Public language visibility may be necessary for technical reasons
without implying a long-term compatibility promise.

A project may distinguish:

- stable public API;
- provisionally public API;
- integration API;
- internal API; and
- generated implementation detail.

The narrower and clearer the supported surface, the easier the project is to preserve.

## Design Explicit Replacement Boundaries

Abstraction is valuable when it marks a place where change is expected.

It is not valuable merely because an interface can be created.

Good replacement boundaries often exist around:

- framework integration;
- storage;
- transport;
- external parsers;
- rendering;
- clocks and randomness;
- tool-specific APIs;
- data acquisition; and
- generated output backends.

These are places where ecosystem change can be absorbed.

Avoid introducing interfaces for every class. Excessive indirection obscures the semantic structure engineers need to
understand.

An interface should answer a real question:

> What implementation might reasonably need to be replaced while preserving the surrounding system?

Forkability is primarily a property of source clarity, licensing, tests, and compatibility, not universal
subclassability.

Classes may remain `final` where doing so protects meaningful invariants.

## Know What a Dependency Supplies

Ruinenwert does not require avoiding dependencies. A well-chosen dependency may improve Ruinenwert.

Know, for each load-bearing dependency:

- what semantics the project obtains from it;
- what would break if it disappeared or changed incompatibly;
- what replacement boundary exists;
- how much project knowledge is trapped inside its specific APIs; and
- whether tests and specifications would permit a migration.

The question is not whether the dependency can be predicted away. The question is whether its replacement would require
rediscovering the project's semantics from scratch.

Do not introduce abstraction layers, extra implementations, or local replicas merely to imagine a future change.

## State the Compatibility Policy Honestly

False claims of future compatibility do not improve longevity.

Ruinenwert is not speculative compatibility. It does not mean claiming support for unknown future major versions,
setting artificially broad dependency constraints, suppressing version checks, or maintaining abstractions for
hypothetical future ecosystems.

Prepare the project so that incompatible change is understandable and repairable.

A clean failure at a documented boundary may have better Ruinenwert than silently pretending to support an ecosystem
version that has never been tested.

Record:

- tested versions;
- expected compatibility range;
- known dependency on unstable APIs;
- what failures are likely when dependencies change;
- which adapter would need replacement; and
- which conformance tests demonstrate continued correctness.

A narrow but truthful constraint produces a visible maintenance task.

An unrealistically broad constraint produces invisible breakage in users' applications.

## Preserve Representative History, Not Every Accident

A project's history contains important knowledge, but not every implementation detail deserves preservation.

Prioritize artifacts that explain:

- why a design was chosen;
- which alternatives were rejected;
- which bugs revealed important assumptions;
- which compatibility promises users rely upon;
- which external dependencies are unusually brittle; and
- which compromises were accepted intentionally.

Architecture decision records can help:

```text
docs/decisions/
|-- 0001-use-canonical-normalization.md
|-- 0002-keep-framework-adapter-thin.md
`-- 0003-stable-error-identifiers.md
```

Each decision should be concise:

- context;
- decision;
- consequences;
- rejected alternatives; and
- conditions under which the decision should be revisited.

Do not turn the decision log into a diary. Preserve reasoning that changes how later work should be performed.

## Preserve Local Reproducibility

An engineer should be able to perform the essential work from a local checkout.

The following operations must be possible from that checkout, and the knowledge required to perform them must be
written down:

- install dependencies;
- run tests;
- run static analysis, if the project uses it;
- generate committed artifacts;
- build documentation;
- create a release artifact; and
- verify package contents.

Hosted automation may assist these tasks, but it should not be their only implementation.

Where external services are unavoidable, distinguish:

- required services;
- optional conveniences;
- publication-only services; and
- historical services that are no longer necessary.

If a service disappears, the project should fail in an understandable location rather than become archaeologically
opaque.

Knowing which infrastructure exists and how it can be replaced is engineering continuity. Deciding who is entitled to
inherit authority over it is not.

## Prefer Data That Can Outlive Its Current Code

When a project depends on a body of knowledge -- rules, stubs, compatibility mappings, benchmark history, protocol
cases, translations, or classifications -- represent that knowledge as inspectable data where practical.

Structured, documented data may survive implementation and tooling changes more cheaply than knowledge embedded only in
current code.

Durable data should be:

- versioned;
- documented;
- validated;
- usable independently of one internal class hierarchy;
- accompanied by representative examples;
- clear about provenance; and
- clear about licensing.

A later tool can reinterpret structured data more easily than it can extract intent from thousands of conditional
branches.

Do not force inherently behavioral logic into data merely for appearance. Preserve data as data and algorithms as
algorithms.

## Avoid False Forms of Longevity

### Abstraction Everywhere

Indirection without a replacement scenario creates sediment rather than structure.

### Excessive Package Splitting

More packages create more independent failure points, release processes, and compatibility relationships.

### Broad Dependency Ranges

Unknown future versions are not supported merely because the package manager permits their installation.

### Generated Documentation Alone

API reference documentation describes available symbols. It rarely explains architectural intent or invariants.

### CI as Institutional Memory

A green workflow is not a substitute for a documented local process.

### Clever Repository Layouts

Novel layouts impose an archaeological tax on every later contributor.

### Exact-Message Compatibility

Depending on prose rather than semantic identifiers makes localization and improvement unnecessarily dangerous.

### Comments as the Only Specification

Comments near an implementation often explain how the current implementation works, not what all valid implementations
must do.

### "The Code Is Self-Documenting"

Code can describe operations. It rarely describes rejected alternatives, compatibility promises, or the boundary between
accidental and intentional behavior.

### Official Lineage as the Only Continuity

A project that can continue only if the original repository, package name, or maintainer account survives has not yet
made continuation a property of the artifact.

## Fork Continuity

Independent continuation is the extreme case of resilience under change.

If a dependency disappears, replace the dependency. If infrastructure disappears, replace the infrastructure. If the
original steward disappears, replace the steward and, if necessary, the project identities. Loss of the original
steward is another change in the environment the project must be able to survive.

> A competent third party can fork the project and continue development independently without cooperation, credentials,
> or private infrastructure controlled by the original steward.

A fork is an independent continuation of the software under identities and infrastructure the new maintainer controls.
It need not become the official successor. It need not preserve the original repository, package name, domain, release
identity, signing identity, or infrastructure stack.

Independent continuation is a normal engineering outcome, not a failure of governance.

```text
original project
      |
      +-- abandoned
      |
      +-- frozen
      |
      +-- independent fork
              |
              +-- new identities and infrastructure
              +-- continued maintenance
```

Given accessible source, a competent third party should be able to:

- obtain the source and reconstruct the essential development environment;
- build the software from preserved source and documented, obtainable dependencies;
- run the tests independently;
- reconstruct essential generated material;
- replace CI-specific infrastructure;
- understand and continue the software without project-specific secrets;
- reproduce or replace the release process from written knowledge;
- change hard-coded project identities where continuation requires it;
- replace package, repository, and domain identities;
- continue without the original maintainer's hosting account, package-registry account, signing key, domain account, or
  other credentials;
- substitute external services that cannot be inherited; and
- recover the technical knowledge required for maintenance from the project, not from oral or private memory alone.

These are target capabilities. They do not require a particular document set, steward hierarchy, or transfer ceremony.

A license that permits forking is not enough. The engineering must make independent continuation practical. Designation
of a canonical steward, if any, identifies authority over original identities. It does not limit licensed rights to
fork, maintain, or redistribute the project.

A continued lineage may preserve an established application-level namespace when interoperability requires it. It should
use its own repository and package identity unless the canonical identities are validly transferred.

If the project is intentionally frozen rather than continued, say so. A frozen project can still be a useful ruin.

### Access Boundaries

Ruinenwert does not require that every project be public.

Where source is restricted, apply the same properties inside the access boundary. A competent party with legitimate
access should be able to reconstruct, test, and continue the software without the original team's private environment,
undocumented knowledge, or non-transferable personal infrastructure.

Public forkability is the common open-source form of this property. It is not the only form.

## Canonical Succession — Optional

A project may additionally prepare for transfer or preservation of its canonical identity.

> This supplements Fork Continuity. It does not replace it.

Adopt this profile when the original repository, package name, domain, website, or release identity should survive a
change of steward. Do not infer it from ordinary Ruinenwert adoption.

Canonical Succession may cover:

- repository ownership transfer;
- package-registry ownership;
- domains and DNS;
- project websites;
- release credentials;
- signing identities or key transition;
- CI secrets;
- organizational accounts;
- successor designation;
- inventories of canonical resources; and
- handover procedures.

A useful `docs/succession.md` may record those matters, or the same knowledge may live in another conventional document.
Never record secret values in the repository. Identify where credentials are managed, not the credentials themselves.

A designation of steward or successor identifies authority over the canonical repository and publishing identities. It
does not replace Fork Continuity or limit licensed fork rights.

## Recommended Project Documents

A project does not need extensive bureaucracy. A small set of deliberate artifacts provides most of the value. Their
names, paths, and boundaries should follow the host project's conventions.

| Typical artifact          | Purpose                                                                                     | Status                          |
| ------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------- |
| `README.md`               | Explain the project, its audience, basic use, maintenance status, and deeper documentation. | Recommended                     |
| `docs/architecture.md`    | Record components, dependency direction, public surfaces, and expected replacement points.  | Recommended                     |
| `docs/invariants.md`      | Record durable rules, their reasons, enforcement, and common invalid alternatives.          | Recommended                     |
| `docs/compatibility.md`   | State tested versions, compatibility promises, unstable integrations, and breaking changes. | Recommended                     |
| Continuation notes        | Explain rebuild, test, release, and how identities may be replaced independently.           | Recommended; may live in README |
| `docs/succession.md`      | Explain transfer of canonical identities, accounts, and designated succession.              | Optional; Canonical Succession  |
| `docs/decisions/`         | Preserve significant architectural decisions and their rationale.                           | Recommended                     |
| `tests/Conformance/`      | Preserve behavior that defines the project independently of its present implementation.     | Recommended                     |

Equivalent material may be consolidated into existing documents or test structures when separate artifacts would add
more maintenance than clarity.

## Guidance for Maintainers

When adding a feature, consider:

1. Is this part of the semantic core or an integration layer?
2. What is the smallest stable public contract?
3. Which invariant does the implementation rely upon?
4. Can the behavior be expressed as a conformance case?
5. Is any new dependency allowed to leak into the core?
6. If this dependency or service changes substantially or disappears, what must change with it?
7. Does this change move durable project knowledge into an external framework or service?
8. Does the feature introduce knowledge that should be represented as data?
9. Would a later engineer know which parts are safe to replace?
10. Can the essential checks still be run locally?
11. Does the documentation explain why the design exists?
12. Could a third party continue this work under new identities if the current steward vanished?

Not every feature requires new architectural machinery. The purpose of these questions is to preserve important
boundaries before they become invisible.

## Guidance for Automated Contributors

Automated tools and language models should treat the repository's human documentation as authoritative context.

Before making structural changes, inspect, in roughly this order:

1. public documentation;
2. architecture documentation;
3. invariants;
4. compatibility policy;
5. conformance tests;
6. relevant decision records;
7. implementation tests; and
8. current implementation.

Automated contributors should not infer that existing code is necessarily the intended specification. Existing code may
contain accidents, obsolete workarounds, or incomplete migrations.

When documentation, tests, and implementation disagree:

- do not silently select whichever is easiest to modify;
- identify the disagreement;
- preserve existing public behavior unless a deliberate breaking change is being made;
- prefer conformance tests and explicit invariants over incidental internal structure;
- update documentation when the project's intended contract changes; and
- avoid deleting apparently redundant code until its compatibility role is understood.

If a repository adopts Ruinenwert and does not also adopt Canonical Succession, do not create succession plans, nominate
stewards, inventory personal accounts for transfer, or establish authority-transfer rules. Reason first about resilience
to ecosystem change and decay, recoverability, and practical independent continuation.

Automated contributors should optimize for human reviewability:

- keep changes conceptually narrow;
- explain altered invariants;
- add conformance cases for changed behavior;
- avoid gratuitous renaming;
- avoid introducing novel abstractions without a replacement scenario; and
- leave the project easier for the next human to understand.

The objective is not merely to produce code that passes the current test suite. It is to preserve or improve the
structure by which later engineers can determine what correctness means.

## A Practical Review Rubric

A project with strong Ruinenwert should allow a competent engineer to answer the following questions from the project
itself.

- **Meaning:** What problem does the project solve, what is its central idea, and which behavior is intentional?
- **Structure:** Where is the semantic core, which parts are tool-specific, and in which direction may dependencies
  flow?
- **Resilience:** Which external components are most likely to change, and can they be replaced without rediscovering
  the project's semantics?
- **Correctness:** What invariants must remain true, which tests define compatibility, and how are failures classified?
- **Operation:** How are checks run, generated artifacts rebuilt, and releases produced locally?
- **Continuation:** Can the project be continued independently under new identities and infrastructure?
- **Recovery:** If the implementation became unusable, could its core behavior be reconstructed from the remaining
  documentation, fixtures, and tests?

Resilience is the ordinary test. Recovery is the extreme one.

Canonical Succession, when adopted, adds a further question: can the original identities be transferred or preserved
without destroying Fork Continuity?

## Minimal Adoption Plan

A project can begin applying this doctrine without a large refactor.

1. Write a short architecture note.
2. List the most important invariants.
3. Identify the fastest-decaying external integration and what it supplies.
4. Add several black-box conformance cases for the public contract.
5. Create standard local check commands.
6. Document the release process.
7. Record how a continued lineage would publish under new identities.
8. Preserve the source and output of important generators.
9. Record later architectural decisions as they occur.
10. Review new work by asking what remains useful when the environment changes.

These steps are a useful beginning, not a required artifact set.

The purpose is not to anticipate every future environment.

It is to leave enough structure that later engineers do not have to begin from myth.

## Final Principle

Ruinenwert does not mean resisting all change or predicting every future environment.

It means arranging the project so that accumulated knowledge is not destroyed when an implementation, dependency,
service, toolchain, maintainer, or institution disappears.

> Do not attempt to build immortal software. Build software that can lose its environment without losing its knowledge.
