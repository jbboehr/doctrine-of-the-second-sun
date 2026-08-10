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
use PhpParser\Node\Stmt;
use PhpParser\Node\Stmt\ClassMethod;
use PHPStan\Analyser\Scope;
use PHPStan\Collectors\Collector;

/**
 * @implements Collector<Stmt, array{reference: string, file: string, line: int, docPosition: int}>
 */
final class LogionReferenceCollector implements Collector
{
    public function __construct(
        private LogionParser $parser,
        private DeclarationSelector $selector,
    ) {
    }

    public function getNodeType(): string
    {
        return Stmt::class;
    }

    /**
     * @param Stmt $node
     * @return array{reference: string, file: string, line: int, docPosition: int}|null
     */
    public function processNode(Node $node, Scope $scope): ?array
    {
        $file = $scope->getFile();
        if (!$this->selector->accepts($node, $scope)) {
            return null;
        }

        if ($node instanceof ClassMethod && $scope->isInTrait()) {
            return null;
        }

        $docComment = $node->getDocComment();
        $inspection = $this->parser->inspect($docComment);
        if (!$inspection->isValid() || $inspection->reference === null || $docComment === null) {
            return null;
        }

        return [
            'reference' => $inspection->reference,
            'file' => $file,
            'line' => $node->getStartLine(),
            'docPosition' => $docComment->getStartFilePos(),
        ];
    }
}
