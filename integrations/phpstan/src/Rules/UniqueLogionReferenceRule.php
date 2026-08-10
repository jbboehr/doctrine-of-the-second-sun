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

namespace DoctrineOfTheSecondSun\PHPStan\Rules;

use DoctrineOfTheSecondSun\PHPStan\Collectors\CommandFileLogionReferenceCollector;
use DoctrineOfTheSecondSun\PHPStan\Collectors\LogionReferenceCollector;
use DoctrineOfTheSecondSun\PHPStan\Collectors\TraitMethodLogionReferenceCollector;
use PhpParser\Node;
use PHPStan\Analyser\Scope;
use PHPStan\Node\CollectedDataNode;
use PHPStan\Rules\Rule;
use PHPStan\Rules\RuleErrorBuilder;

use function count;
use function ksort;
use function sprintf;

/** @implements Rule<CollectedDataNode> */
final class UniqueLogionReferenceRule implements Rule
{
    public function getNodeType(): string
    {
        return CollectedDataNode::class;
    }

    /** @param CollectedDataNode $node */
    public function processNode(Node $node, Scope $scope): array
    {
        /** @var array<string, array<string, array{reference: string, file: string, line: int, docPosition: int}>> */
        $byReference = [];

        $collectedData = [
            $node->get(LogionReferenceCollector::class),
            $node->get(CommandFileLogionReferenceCollector::class),
        ];
        foreach ($collectedData as $dataByFile) {
            foreach ($dataByFile as $occurrences) {
                foreach ($occurrences as $occurrence) {
                    $locationKey = sprintf('%s:%d', $occurrence['file'], $occurrence['docPosition']);
                    $byReference[$occurrence['reference']][$locationKey] = $occurrence;
                }
            }
        }

        foreach ($node->get(TraitMethodLogionReferenceCollector::class) as $referencesByTrait) {
            foreach ($referencesByTrait as $references) {
                foreach ($references as $reference) {
                    $locationKey = sprintf('%s:%d', $reference['file'], $reference['docPosition']);
                    $byReference[$reference['reference']][$locationKey] = $reference;
                }
            }
        }

        ksort($byReference);
        $errors = [];
        foreach ($byReference as $reference => $occurrences) {
            if (count($occurrences) < 2) {
                continue;
            }

            ksort($occurrences);
            foreach ($occurrences as $occurrence) {
                $errors[] = RuleErrorBuilder::message(sprintf(
                    'Logion reference %s is used more than once in the configured Doctrine scope.',
                    $reference,
                ))
                    ->file($occurrence['file'])
                    ->line($occurrence['line'])
                    ->identifier('doctrine.logion.duplicate')
                    ->build();
            }
        }

        return $errors;
    }
}
