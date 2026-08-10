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

use DoctrineOfTheSecondSun\PHPStan\CommandFileSelector;
use DoctrineOfTheSecondSun\PHPStan\LogionParser;
use PhpParser\Node;
use PHPStan\Analyser\Scope;
use PHPStan\Node\FileNode;
use PHPStan\Rules\Rule;
use PHPStan\Rules\RuleErrorBuilder;

use function basename;
use function implode;
use function sprintf;

/** @implements Rule<FileNode> */
final class CommandFileLogionRule implements Rule
{
    public function __construct(
        private LogionParser $parser,
        private CommandFileSelector $selector,
    ) {
    }

    public function getNodeType(): string
    {
        return FileNode::class;
    }

    /** @param FileNode $node */
    public function processNode(Node $node, Scope $scope): array
    {
        $file = $scope->getFile();
        if (!$this->selector->accepts($file)) {
            return [];
        }

        $inspection = $this->parser->inspect($node->getDocComment());
        if ($inspection->isValid()) {
            return [];
        }

        $entryPoint = basename($file);
        if ($inspection->status === 'missing') {
            return [
                RuleErrorBuilder::message(sprintf(
                    'PHP command entry point %s must begin with exactly one @logion PHPDoc tag.',
                    $entryPoint,
                ))
                    ->identifier('doctrine.logion.commandMissing')
                    ->build(),
            ];
        }

        if ($inspection->status === 'multiple') {
            return [
                RuleErrorBuilder::message(sprintf(
                    'PHP command entry point %s begins with %d @logion PHPDoc tags; exactly one is required.',
                    $entryPoint,
                    $inspection->tagCount,
                ))
                    ->identifier('doctrine.logion.commandMultiple')
                    ->build(),
            ];
        }

        if ($inspection->status === 'unsupportedBook') {
            return [
                RuleErrorBuilder::message(sprintf(
                    'The @logion on PHP command entry point %s uses unsupported book %s; allowed books are %s.',
                    $entryPoint,
                    $inspection->book,
                    implode(', ', $this->parser->allowedBooks()),
                ))
                    ->identifier('doctrine.logion.commandBook')
                    ->build(),
            ];
        }

        return [
            RuleErrorBuilder::message(sprintf(
                'The @logion on PHP command entry point %s must use "@logion [BOOK C:V] passage" '
                    . 'with positive chapter and verse numbers.',
                $entryPoint,
            ))
                ->identifier('doctrine.logion.commandMalformed')
                ->build(),
        ];
    }
}
