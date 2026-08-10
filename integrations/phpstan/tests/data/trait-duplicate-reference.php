<?php

// SPDX-License-Identifier: AGPL-3.0-only WITH romic-exception

declare(strict_types=1);

/** @logion [AWC 9:1] The western house preserved the tablet beneath its winter seal. */
trait DuplicateReferenceTrait
{
    /** @logion [OSD 9:2] Let the ninth witness be counted once before the assembled courts. */
    public function ninthWitness(): void
    {
    }
}

/** @logion [OSD 9:2] Beyond the court, another tablet bore the number already given. */
function duplicateTraitReference(): void
{
}
