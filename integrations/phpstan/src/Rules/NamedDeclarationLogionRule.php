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

use DoctrineOfTheSecondSun\PHPStan\DeclarationDescription;
use DoctrineOfTheSecondSun\PHPStan\DeclarationSelector;
use DoctrineOfTheSecondSun\PHPStan\LogionParser;
use DoctrineOfTheSecondSun\PHPStan\NamedDeclarationErrorFormatter;
use PhpParser\Node;
use PhpParser\Node\Stmt;
use PhpParser\Node\Stmt\ClassMethod;
use PHPStan\Analyser\Scope;
use PHPStan\Rules\Rule;
use PHPStan\Rules\RuleErrorBuilder;

/** @implements Rule<Stmt> */
final class NamedDeclarationLogionRule implements Rule
{
    public function __construct(
        private LogionParser $parser,
        private DeclarationSelector $selector,
        private NamedDeclarationErrorFormatter $errorFormatter,
    ) {
    }

    public function getNodeType(): string
    {
        return Stmt::class;
    }

    /** @param Stmt $node */
    public function processNode(Node $node, Scope $scope): array
    {
        if (!$this->selector->accepts($node, $scope)) {
            return [];
        }

        if ($node instanceof ClassMethod && $scope->isInTrait()) {
            return [];
        }

        $inspection = $this->parser->inspect($node->getDocComment());
        $error = $this->errorFormatter->format(
            $inspection,
            DeclarationDescription::describe($node, $scope),
        );
        if ($error === null) {
            return [];
        }

        return [
            RuleErrorBuilder::message($error['message'])
                ->identifier($error['identifier'])
                ->build(),
        ];
    }
}
