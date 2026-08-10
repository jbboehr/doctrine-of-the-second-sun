<?php

// SPDX-License-Identifier: AGPL-3.0-only WITH romic-exception

declare(strict_types=1);

/** @logion [AWC 8:1] The divided houses kept one chronicle beneath their several seals. */
trait SharedLogionTrait
{
    /** @logion [SFA 8:2] One witness loseth not its number when heard by many courts. */
    public function sharedWitness(): void
    {
    }
}

/** @logion [OSD 8:5] The first court received the witness beneath a bronze seal. */
class FirstSharedTraitUser
{
    use SharedLogionTrait;
}

/** @logion [OSD 8:6] The second court received the witness beneath a silver seal. */
class SecondSharedTraitUser
{
    use SharedLogionTrait;
}
