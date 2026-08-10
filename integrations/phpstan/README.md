# PHPStan Integration

This optional PHPStan extension enforces the mechanical `@logion` invariants selected by a consuming PHP repository.
It remains subordinate to that repository's policy: the extension supplies reusable checks, while the consumer defines
which source and command files are covered.

The extension checks:

- named classes, interfaces, traits, enums, methods, and functions selected by local configuration;
- configured PHP command entry points;
- exactly one `@logion` tag in the declaration PHPDoc or command entry-point header PHPDoc;
- the form `@logion [BOOK C:V] passage`, with positive chapter and verse numbers and a nonempty first line;
- membership in the configured book list, which defaults to `OSD`, `RAS`, `AWC`, and `SFA`; and
- reference uniqueness across every covered declaration and command entry point in one PHPStan analysis.

Anonymous classes and anonymous functions are not declarations covered by this adapter. The checks establish form,
coverage, and uniqueness only; they cannot establish literary quality, canonical suitability, originality, or freedom
from implementation allegory.

## Requirements and installation

The extension supports PHPStan 2.x and uses PHP 8.1 syntax. When Doctrine is installed through Composer, make PHPStan
available in the consuming project and include the extension from `phpstan.neon`:

```neon
includes:
    - vendor/jbboehr/doctrine-of-the-second-sun/integrations/phpstan/extension.neon
```

The package's Composer autoloader exposes the extension classes. The adapter is not enabled automatically merely by
installing Doctrine or including its configuration. Enable it for one invocation at runtime:

```console
DOCTRINE_LOGION=1 vendor/bin/phpstan analyse
```

The values `1`, `true`, `yes`, and `on` enable enforcement, case-insensitively. An absent variable or any other value
leaves it disabled. The resolved state participates in PHPStan's result-cache metadata, so changing the variable also
invalidates results produced in the other state.

For a Nix installation, PHPStan must load
`$DOCTRINE_OF_SECOND_SUN_DIR/integrations/phpstan/autoload.php` before it reads a configuration that includes the
extension. Pass that file with PHPStan's `--autoload-file` option, and resolve the store path in the consuming project's
own generated or local PHPStan configuration. Composer installation is simpler when the consuming project already uses
Composer for PHPStan.

To enable enforcement for every invocation, such as in CI, set `enabled: true` in committed configuration. The
environment variable remains the convenient opt-in for an individual maintainer:

```neon
parameters:
    doctrineOfTheSecondSun:
        enabled: true
```

## Configure local scope

An empty `filePatterns` list covers named declarations in every file PHPStan analyses. Command checking is disabled
until `commandFilePatterns` contains at least one regular expression. A typical consuming configuration narrows
declarations to `src/`, excludes generated sources, and selects command files under `bin/`:

```neon
parameters:
    paths:
        - src
        - bin/console

    doctrineOfTheSecondSun:
        filePatterns:
            - '#/src/#'
        excludeFilePatterns:
            - '#/src/Generated/#'
        commandFilePatterns:
            - '#/bin/[^/]+$#'
```

Patterns are matched against PHPStan's file path. Use forward slashes in cross-platform patterns. PHPStan must analyse
every configured command explicitly; extensionless scripts might not be discovered by a directory scan.

The command tag must be in the PHPDoc attached to the first parsed statement, normally a header before
`declare(strict_types=1)`:

```php
#!/usr/bin/env php
<?php

/**
 * @logion [AWC 3:8] Before the court woke, the western bell remembered its vow.
 */
declare(strict_types=1);
```

Local policy may change the allowed books or disable declaration kinds:

```neon
parameters:
    doctrineOfTheSecondSun:
        allowedBooks:
            - OSD
            - RAS
            - AWC
            - SFA
        checkClassLikes: true
        checkMethods: true
        checkFunctions: true
```

## Adopt the rule for new declarations

When an established repository requires logia only on declarations introduced after adoption, include and configure
the extension, then generate and review a PHPStan baseline once. The error messages name individual declarations, so a
baseline entry for an existing missing tag does not silently cover a differently named declaration added later.

```console
DOCTRINE_LOGION=1 vendor/bin/phpstan analyse --generate-baseline=phpstan-logion-baseline.neon
```

Include the reviewed baseline through the consuming project's normal PHPStan configuration. Baselines are transition
records, not citation registries: do not baseline a new violation, and do not allocate a citation from baseline content.

The uniqueness collector sees only files in the current PHPStan invocation. A changed-files or editor run can provide
fast feedback, but the consuming project's required verification must analyse the complete configured scope so a new
reference is compared with every existing reference.

## Errors

The extension reports stable identifiers under `doctrine.logion.*`, including:

- `doctrine.logion.missing`, `doctrine.logion.multiple`, `doctrine.logion.malformed`, and `doctrine.logion.book` for
  named declarations;
- `doctrine.logion.commandMissing`, `doctrine.logion.commandMultiple`, `doctrine.logion.commandMalformed`, and
  `doctrine.logion.commandBook` for entry points; and
- `doctrine.logion.duplicate` at every covered location that shares a reference.

Prefer fixing the underlying tag or citation. Suppressions and baseline additions should follow the consuming
repository's explicit policy.

## License

The adapter implementation, configuration, and tests are licensed under the [GNU Affero General Public License
version 3](LICENSE.md) with the [Romic Exception](LICENSE_EXCEPTION.md), expressed as
`AGPL-3.0-only WITH romic-exception`. This `README.md` remains part of the repository documentation licensed under
CC BY-SA 4.0.

## Developing the adapter

From this repository, install development dependencies and run:

```console
composer test
composer cs
composer analyse
composer validate --strict
```

The test suite exercises declaration and trait coverage, tag syntax and allowed books, anonymous-declaration
exclusions, command headers, runtime opt-in behavior, and collisions across declarations, traits, and command files.
