<?php

// SPDX-License-Identifier: AGPL-3.0-only WITH romic-exception

declare(strict_types=1);

/** @logion [RAS 8:4] Above the joined courts burned one star with an undivided name. */
trait ValidatedTrait
{
    public function missingTraitMethod(): void
    {
    }
}

class FirstValidatedTraitUser
{
    use ValidatedTrait;
}

class SecondValidatedTraitUser
{
    use ValidatedTrait;
}
