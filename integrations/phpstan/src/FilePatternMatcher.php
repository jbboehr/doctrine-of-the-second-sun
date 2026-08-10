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

use function preg_match;
use function sprintf;
use function str_replace;

final class FilePatternMatcher
{
    /**
     * @param list<string> $includePatterns
     * @param list<string> $excludePatterns
     */
    public function __construct(
        private array $includePatterns,
        private array $excludePatterns,
        private bool $includeAllWhenEmpty,
    ) {
        $this->validatePatterns($includePatterns);
        $this->validatePatterns($excludePatterns);
    }

    public function accepts(string $file): bool
    {
        $file = str_replace('\\', '/', $file);

        if (!$this->matchesAny($this->includePatterns, $file, $this->includeAllWhenEmpty)) {
            return false;
        }

        return !$this->matchesAny($this->excludePatterns, $file, false);
    }

    /** @param list<string> $patterns */
    private function matchesAny(array $patterns, string $file, bool $emptyResult): bool
    {
        if ($patterns === []) {
            return $emptyResult;
        }

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $file) === 1) {
                return true;
            }
        }

        return false;
    }

    /** @param list<string> $patterns */
    private function validatePatterns(array $patterns): void
    {
        foreach ($patterns as $pattern) {
            if (@preg_match($pattern, '') === false) {
                throw new InvalidArgumentException(sprintf('Invalid Doctrine file pattern: %s', $pattern));
            }
        }
    }
}
