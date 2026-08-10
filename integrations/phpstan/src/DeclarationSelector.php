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

use PhpParser\Node\Stmt;
use PhpParser\Node\Stmt\ClassLike;
use PhpParser\Node\Stmt\Class_;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\Node\Stmt\Function_;
use PHPStan\Analyser\Scope;

final class DeclarationSelector
{
    private FilePatternMatcher $fileMatcher;

    /**
     * @param list<string> $filePatterns
     * @param list<string> $excludeFilePatterns
     */
    public function __construct(
        private RuntimeSwitch $runtimeSwitch,
        array $filePatterns,
        array $excludeFilePatterns,
        private bool $checkClassLikes,
        private bool $checkMethods,
        private bool $checkFunctions,
    ) {
        $this->fileMatcher = new FilePatternMatcher($filePatterns, $excludeFilePatterns, true);
    }

    public function accepts(Stmt $node, Scope $scope): bool
    {
        return $this->runtimeSwitch->isEnabled()
            && $this->acceptsNode($node, $scope)
            && $this->fileMatcher->accepts($scope->getFile());
    }

    public function acceptsTraitMethods(string $file): bool
    {
        return $this->runtimeSwitch->isEnabled()
            && $this->checkMethods
            && $this->fileMatcher->accepts($file);
    }

    private function acceptsNode(Stmt $node, Scope $scope): bool
    {
        if ($node instanceof ClassLike) {
            return $this->checkClassLikes
                && $node->name !== null
                && (!$node instanceof Class_ || !$node->isAnonymous());
        }

        if ($node instanceof ClassMethod) {
            if ($scope->isInTrait()) {
                return $this->checkMethods;
            }

            $classReflection = $scope->getClassReflection();

            return $this->checkMethods && ($classReflection === null || !$classReflection->isAnonymous());
        }

        return $this->checkFunctions && $node instanceof Function_;
    }
}
