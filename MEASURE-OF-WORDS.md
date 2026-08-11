# The Measure of Words

## Principle

> Use no more words than the work requires. Prefer short, direct, unambiguous prose. Do not restate information,
> narrate routine details, repeat conclusions, or add filler.

The goal is high information density without sacrificing necessary precision or context.

## Scope

The Measure of Words governs technical writing, including:

- technical documentation;
- API and architecture documentation;
- design documents and implementation notes;
- comments and docblocks;
- commit messages;
- merge and pull request descriptions;
- issue descriptions; and
- technical review findings and summaries.

It does not govern logia, creative writing, ceremonial text, project naming, visual language, or other non-technical
prose. It is not a general rule for all writing produced under the Doctrine. Literary work remains subject to the
[style guide](DOCTRINE-STYLE-GUIDE.md) and its own requirements.

## Put the Result First

Prefer this order:

1. result or decision;
2. necessary explanation; and
3. noteworthy risks, tradeoffs, or unresolved questions.

Avoid this pattern:

```text
task or context restatement -> implementation narration -> result -> redundant recap
```

Include context before the result only when the reader needs it to understand the result. Do not narrate routine work.
Report actions and verification when they affect interpretation, establish evidence, expose a risk, or make the result
reproducible.

## Concision and Clarity

The Measure of Words governs concision. The following guidance, adapted from ASD-STE100 Simplified Technical English,
helps keep the remaining prose clear and exact:

- Prefer the shortest wording that preserves the necessary meaning.
- Write short, direct sentences. Give each sentence one main point.
- Prefer active voice when it makes the actor or responsibility clearer.
- Use one term consistently for one concept. Do not vary terminology merely for style.
- Replace a pronoun or indirect reference when its referent could be unclear.
- State conditions and required actions explicitly.
- Use a list when it is clearer than a sentence with several related clauses.

This document adopts useful clarity and sentence-structure principles from ASD-STE100. It does not adopt the standard's
controlled dictionary, restricted aviation vocabulary, or aviation-specific constraints. Technical and domain-specific
terminology remains unrestricted. This adaptation is not a claim of ASD-STE100 conformance. See the
[official ASD-STE100 overview](https://www.asd-ste100.org/about_STE.html) for the standard's scope and structure.

## Preserve Necessary Substance

Do not make technical writing cryptic. Preserve the reasoning needed to understand a decision, review a change, assess
a risk, or reproduce a result. Include applicable constraints, assumptions, evidence, verification, exceptions,
tradeoffs, and unresolved questions.

Remove a sentence if it adds no fact, decision, reason, condition, action, risk, or necessary context. Keep it when its
removal would force the reader to guess.
