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

namespace DoctrineOfTheSecondSun\PHPStan;

use InvalidArgumentException;

use function getenv;
use function in_array;
use function strtolower;
use function trim;

final class RuntimeSwitch
{
    public function __construct(
        private bool $configuredEnabled,
        private string $environmentVariable,
    ) {
        if ($environmentVariable === '') {
            throw new InvalidArgumentException('The Doctrine enableEnvVar parameter must not be empty.');
        }
    }

    public function isEnabled(): bool
    {
        if ($this->configuredEnabled) {
            return true;
        }

        $value = getenv($this->environmentVariable);
        if ($value === false) {
            return false;
        }

        return in_array(strtolower(trim($value)), ['1', 'true', 'yes', 'on'], true);
    }
}
