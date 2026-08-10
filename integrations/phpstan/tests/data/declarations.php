<?php

// SPDX-License-Identifier: AGPL-3.0-only WITH romic-exception

declare(strict_types=1);

/**
 * @logion [OSD 1:1] The lamp remained before the uncarved gate.
 */
class CoveredClass
{
    /**
     * @logion [RAS 1:1] I saw the western glass receive an unborrowed fire.
     */
    public function coveredMethod(): void
    {
    }

    public function missingMethod(): void
    {
    }
}

/**
 * This declaration has no literary marginalia.
 */
class MissingLogion
{
}

/**
 * @logion [AWC 1:1] In those days the bronze court kept its appointed silence.
 * @logion [SFA 1:1] The faithful measure needeth no second witness.
 */
class TooManyLogia
{
}

/**
 * @logion [OSD 0:2] The first boundary was counted before the stars.
 */
class MalformedLogion
{
}

/**
 * @logion [XYZ 1:2] The hidden choir answered from beneath the salt.
 */
class UnsupportedBook
{
}

/**
 * @logion [SFA 2:1] A sealed word is not thereby a faithful word.
 */
function coveredFunction(): void
{
}

function missingFunction(): void
{
}

/** @logion [OSD 4:1] The eastern gate was measured when the mountain yet slept. */
interface CoveredInterface
{
}

/** @logion [RAS 4:1] Above the fifth sea appeared a wheel without a shadow. */
trait CoveredTrait
{
}

/** @logion [AWC 4:1] The ash court kept three fasts before naming its heir. */
enum CoveredEnum
{
}

$anonymous = new class () {
    public function ephemeralMethod(): void
    {
    }
};

$closure = static function (): void {
};
