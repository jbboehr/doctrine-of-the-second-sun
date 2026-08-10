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
use DoctrineOfTheSecondSun\PHPStan\FilePatternMatcher;
use DoctrineOfTheSecondSun\PHPStan\RuntimeSwitch;
use PHPUnit\Framework\TestCase;

final class SelectorTest extends TestCase
{
    public function testFilePatternsIncludeAndExcludeConfiguredPaths(): void
    {
        $matcher = new FilePatternMatcher(['#/src/#'], ['#/src/Generated/#'], true);

        self::assertTrue($matcher->accepts('/project/src/Service.php'));
        self::assertFalse($matcher->accepts('/project/src/Generated/Client.php'));
        self::assertFalse($matcher->accepts('/project/tests/ServiceTest.php'));
    }

    public function testFilePatternsUseNormalizedWindowsPaths(): void
    {
        $matcher = new FilePatternMatcher(['#/src/#'], ['#/src/Generated/#'], true);

        self::assertTrue($matcher->accepts('C:\\project\\src\\Service.php'));
        self::assertFalse($matcher->accepts('C:\\project\\src\\Generated\\Client.php'));
    }

    public function testCommandPatternsAndRuntimeSwitchAreOptIn(): void
    {
        $enabled = new RuntimeSwitch(true, 'DOCTRINE_LOGION_TEST');
        $disabled = new RuntimeSwitch(false, 'DOCTRINE_LOGION_TEST_DISABLED');

        self::assertFalse((new CommandFileSelector($enabled, []))->accepts('/project/bin/console'));
        self::assertTrue(
            (new CommandFileSelector($enabled, ['#/bin/[^/]+$#']))->accepts('/project/bin/console'),
        );
        self::assertFalse(
            (new CommandFileSelector($disabled, ['#/bin/[^/]+$#']))->accepts('/project/bin/console'),
        );
    }
}
