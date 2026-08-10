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

namespace DoctrineOfTheSecondSun\PHPStan\Collectors;

use DoctrineOfTheSecondSun\PHPStan\DeclarationSelector;
use DoctrineOfTheSecondSun\PHPStan\LogionParser;
use PhpParser\Node;
use PhpParser\Node\Stmt\Trait_;
use PHPStan\Analyser\Scope;
use PHPStan\Collectors\Collector;

/**
 * @phpstan-type ReferenceData array{reference: string, file: string, line: int, docPosition: int}
 * @implements Collector<Trait_, list<ReferenceData>>
 */
final class TraitMethodLogionReferenceCollector implements Collector
{
    public function __construct(
        private LogionParser $parser,
        private DeclarationSelector $selector,
    ) {
    }

    public function getNodeType(): string
    {
        return Trait_::class;
    }

    /**
     * @param Trait_ $node
     * @return list<ReferenceData>|null
     */
    public function processNode(Node $node, Scope $scope): ?array
    {
        $file = $scope->getFile();
        if (!$this->selector->acceptsTraitMethods($file)) {
            return null;
        }

        $references = [];
        foreach ($node->getMethods() as $method) {
            $docComment = $method->getDocComment();
            $inspection = $this->parser->inspect($docComment);
            if (!$inspection->isValid() || $inspection->reference === null || $docComment === null) {
                continue;
            }

            $references[] = [
                'reference' => $inspection->reference,
                'file' => $file,
                'line' => $method->getStartLine(),
                'docPosition' => $docComment->getStartFilePos(),
            ];
        }

        return $references !== [] ? $references : null;
    }
}
