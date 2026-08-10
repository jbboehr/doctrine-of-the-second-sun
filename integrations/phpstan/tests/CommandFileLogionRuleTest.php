<?php

/**
 * Copyright (c) anno Domini nostri Jesu Christi MMXXVI, John Boehr & contributors
 *
 * SPDX-License-Identifier: AGPL-3.0-only WITH romic-exception
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3,
 * as published by the Free Software Foundation, together with the Romic
 * Exception (an additional permission under section 7 of that license).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * and the Romic Exception along with this program.  If not, see
 * <http://www.gnu.org/licenses/> and the LICENSE_EXCEPTION file.
 */

declare(strict_types=1);

namespace DoctrineOfTheSecondSun\PHPStan\Tests;

use DoctrineOfTheSecondSun\PHPStan\CommandFileSelector;
use DoctrineOfTheSecondSun\PHPStan\LogionParser;
use DoctrineOfTheSecondSun\PHPStan\RuntimeSwitch;
use DoctrineOfTheSecondSun\PHPStan\Rules\CommandFileLogionRule;
use PHPStan\Rules\Rule;
use PHPStan\Testing\RuleTestCase;

/** @extends RuleTestCase<CommandFileLogionRule> */
final class CommandFileLogionRuleTest extends RuleTestCase
{
    protected function getRule(): Rule
    {
        return new CommandFileLogionRule(
            new LogionParser(['OSD', 'RAS', 'AWC', 'SFA']),
            new CommandFileSelector(
                new RuntimeSwitch(true, 'DOCTRINE_LOGION_TEST'),
                ['~command-(?:valid|missing|malformed|unsupported-book|multiple)\.php$~'],
            ),
        );
    }

    public function testChecksOnlyConfiguredCommandEntryPoints(): void
    {
        $this->analyse([
            __DIR__ . '/data/command-valid.php',
            __DIR__ . '/data/command-missing.php',
            __DIR__ . '/data/command-malformed.php',
            __DIR__ . '/data/command-unsupported-book.php',
            __DIR__ . '/data/command-multiple.php',
        ], [
            [
                'PHP command entry point command-missing.php must begin with exactly one @logion PHPDoc tag.',
                5,
            ],
            [
                'The @logion on PHP command entry point command-malformed.php must use '
                    . '"@logion [BOOK C:V] passage" with positive chapter and verse numbers.',
                6,
            ],
            [
                'The @logion on PHP command entry point command-unsupported-book.php uses unsupported book XYZ; '
                    . 'allowed books are OSD, RAS, AWC, SFA.',
                6,
            ],
            [
                'PHP command entry point command-multiple.php begins with 2 @logion PHPDoc tags; '
                    . 'exactly one is required.',
                9,
            ],
        ]);
    }
}
