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

use DoctrineOfTheSecondSun\PHPStan\DeclarationSelector;
use DoctrineOfTheSecondSun\PHPStan\LogionParser;
use DoctrineOfTheSecondSun\PHPStan\NamedDeclarationErrorFormatter;
use DoctrineOfTheSecondSun\PHPStan\RuntimeSwitch;
use DoctrineOfTheSecondSun\PHPStan\Rules\NamedDeclarationLogionRule;
use PHPStan\Rules\Rule;
use PHPStan\Testing\RuleTestCase;

use function array_values;

/** @extends RuleTestCase<NamedDeclarationLogionRule> */
final class NamedDeclarationLogionRuleTest extends RuleTestCase
{
    /** @return list<string> */
    public static function getAdditionalConfigFiles(): array
    {
        $configFiles = parent::getAdditionalConfigFiles();
        $configFiles[] = __DIR__ . '/rule-test.neon';

        return array_values($configFiles);
    }

    protected function getRule(): Rule
    {
        $parser = new LogionParser(['OSD', 'RAS', 'AWC', 'SFA']);

        return new NamedDeclarationLogionRule(
            $parser,
            new DeclarationSelector(new RuntimeSwitch(true, 'DOCTRINE_LOGION_TEST'), [], [], true, true, true),
            new NamedDeclarationErrorFormatter($parser),
        );
    }

    public function testAcceptsValidLogiaAndReportsInvariantViolations(): void
    {
        $this->analyse([__DIR__ . '/data/declarations.php'], [
            [
                'Named declaration CoveredClass::missingMethod() must contain exactly one @logion PHPDoc tag.',
                19,
            ],
            [
                'Named declaration MissingLogion must contain exactly one @logion PHPDoc tag.',
                27,
            ],
            [
                'Named declaration TooManyLogia contains 2 @logion PHPDoc tags; exactly one is required.',
                35,
            ],
            [
                'The @logion on MalformedLogion must use "@logion [BOOK C:V] passage" '
                    . 'with positive chapter and verse numbers.',
                42,
            ],
            [
                'The @logion on UnsupportedBook uses unsupported book XYZ; allowed books are OSD, RAS, AWC, SFA.',
                49,
            ],
            [
                'Named declaration missingFunction() must contain exactly one @logion PHPDoc tag.',
                60,
            ],
        ]);
    }
}
