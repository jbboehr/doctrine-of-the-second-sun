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
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\Node\Stmt\Function_;
use PHPStan\Analyser\Scope;

use function sprintf;

final class DeclarationDescription
{
    public static function describe(Stmt $node, Scope $scope): string
    {
        if ($node instanceof ClassMethod) {
            if ($scope->isInTrait()) {
                $traitReflection = $scope->getTraitReflection();
                $ownerName = $traitReflection->getName();
            } else {
                $classReflection = $scope->getClassReflection();
                $ownerName = $classReflection !== null ? $classReflection->getName() : 'unknown class';
            }

            return sprintf('%s::%s()', $ownerName, $node->name->toString());
        }

        if ($node instanceof ClassLike && $node->name !== null) {
            return self::qualify($node->name->toString(), $scope);
        }

        if ($node instanceof Function_) {
            return sprintf('%s()', self::qualify($node->name->toString(), $scope));
        }

        return 'unknown declaration';
    }

    private static function qualify(string $name, Scope $scope): string
    {
        $namespace = $scope->getNamespace();
        if ($namespace === null) {
            return $name;
        }

        return sprintf('%s\\%s', $namespace, $name);
    }
}
