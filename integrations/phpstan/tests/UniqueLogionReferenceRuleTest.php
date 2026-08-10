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

use DoctrineOfTheSecondSun\PHPStan\Collectors\CommandFileLogionReferenceCollector;
use DoctrineOfTheSecondSun\PHPStan\Collectors\LogionReferenceCollector;
use DoctrineOfTheSecondSun\PHPStan\Collectors\TraitMethodLogionReferenceCollector;
use DoctrineOfTheSecondSun\PHPStan\CommandFileSelector;
use DoctrineOfTheSecondSun\PHPStan\DeclarationSelector;
use DoctrineOfTheSecondSun\PHPStan\LogionParser;
use DoctrineOfTheSecondSun\PHPStan\RuntimeSwitch;
use DoctrineOfTheSecondSun\PHPStan\Rules\UniqueLogionReferenceRule;
use PhpParser\Node;
use PHPStan\Collectors\Collector;
use PHPStan\Rules\Rule;
use PHPStan\Testing\RuleTestCase;

/** @extends RuleTestCase<UniqueLogionReferenceRule> */
final class UniqueLogionReferenceRuleTest extends RuleTestCase
{
    protected function getRule(): Rule
    {
        return new UniqueLogionReferenceRule();
    }

    /** @return list<Collector<Node, mixed>> */
    protected function getCollectors(): array
    {
        return [
            new LogionReferenceCollector(
                new LogionParser(['OSD', 'RAS', 'AWC', 'SFA']),
                new DeclarationSelector(new RuntimeSwitch(true, 'DOCTRINE_LOGION_TEST'), [], [], true, true, true),
            ),
            new CommandFileLogionReferenceCollector(
                new LogionParser(['OSD', 'RAS', 'AWC', 'SFA']),
                new CommandFileSelector(
                    new RuntimeSwitch(true, 'DOCTRINE_LOGION_TEST'),
                    ['~(?:duplicate-references-command|command-class-overlap)\.php$~'],
                ),
            ),
            new TraitMethodLogionReferenceCollector(
                new LogionParser(['OSD', 'RAS', 'AWC', 'SFA']),
                new DeclarationSelector(new RuntimeSwitch(true, 'DOCTRINE_LOGION_TEST'), [], [], true, true, true),
            ),
        ];
    }

    public function testReportsEveryDeclarationSharingAReference(): void
    {
        $message = 'Logion reference OSD 1:1 is used more than once in the configured Doctrine scope.';

        $this->analyse([
            __DIR__ . '/data/duplicate-references.php',
            __DIR__ . '/data/duplicate-references-command.php',
        ], [
            [$message, 10],
            [$message, 17],
            [$message, 8],
        ]);
    }

    public function testTraitReanalysisDoesNotCreateACollision(): void
    {
        $this->analyse([__DIR__ . '/data/trait-references.php'], []);
    }

    public function testCommandAndDeclarationCollectorsShareOnePhysicalLogion(): void
    {
        $this->analyse([__DIR__ . '/data/command-class-overlap.php'], []);
    }

    public function testTraitMethodReferencesParticipateInRepositoryUniqueness(): void
    {
        $message = 'Logion reference OSD 9:2 is used more than once in the configured Doctrine scope.';

        $this->analyse([__DIR__ . '/data/trait-duplicate-reference.php'], [
            [$message, 11],
            [$message, 17],
        ]);
    }
}
