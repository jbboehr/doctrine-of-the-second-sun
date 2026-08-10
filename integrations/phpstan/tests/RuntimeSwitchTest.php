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

use DoctrineOfTheSecondSun\PHPStan\LogionResultCacheMetaExtension;
use DoctrineOfTheSecondSun\PHPStan\RuntimeSwitch;
use PHPUnit\Framework\TestCase;

use function getenv;
use function putenv;

final class RuntimeSwitchTest extends TestCase
{
    private const ENVIRONMENT_VARIABLE = 'DOCTRINE_LOGION_RUNTIME_SWITCH_TEST';

    private string|false $originalValue;

    protected function setUp(): void
    {
        $this->originalValue = getenv(self::ENVIRONMENT_VARIABLE);
        putenv(self::ENVIRONMENT_VARIABLE);
    }

    protected function tearDown(): void
    {
        if ($this->originalValue === false) {
            putenv(self::ENVIRONMENT_VARIABLE);

            return;
        }

        putenv(self::ENVIRONMENT_VARIABLE . '=' . $this->originalValue);
    }

    public function testEnvironmentVariableEnablesEnforcementAndInvalidatesTheCache(): void
    {
        $runtimeSwitch = new RuntimeSwitch(false, self::ENVIRONMENT_VARIABLE);
        $cacheExtension = new LogionResultCacheMetaExtension($runtimeSwitch);

        self::assertFalse($runtimeSwitch->isEnabled());
        self::assertSame('disabled', $cacheExtension->getHash());

        putenv(self::ENVIRONMENT_VARIABLE . '=1');

        self::assertTrue($runtimeSwitch->isEnabled());
        self::assertSame('enabled', $cacheExtension->getHash());

        putenv(self::ENVIRONMENT_VARIABLE . '=off');

        self::assertFalse($runtimeSwitch->isEnabled());
        self::assertSame('disabled', $cacheExtension->getHash());
    }

    public function testConfigurationCanEnableEnforcementWithoutTheEnvironmentVariable(): void
    {
        $runtimeSwitch = new RuntimeSwitch(true, self::ENVIRONMENT_VARIABLE);

        self::assertTrue($runtimeSwitch->isEnabled());
    }
}
