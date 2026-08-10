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

use function implode;
use function sprintf;

final class NamedDeclarationErrorFormatter
{
    public function __construct(private LogionParser $parser)
    {
    }

    /** @return array{message: string, identifier: string}|null */
    public function format(LogionInspection $inspection, string $declaration): ?array
    {
        if ($inspection->isValid()) {
            return null;
        }

        if ($inspection->status === 'missing') {
            return [
                'message' => sprintf(
                    'Named declaration %s must contain exactly one @logion PHPDoc tag.',
                    $declaration,
                ),
                'identifier' => 'doctrine.logion.missing',
            ];
        }

        if ($inspection->status === 'multiple') {
            return [
                'message' => sprintf(
                    'Named declaration %s contains %d @logion PHPDoc tags; exactly one is required.',
                    $declaration,
                    $inspection->tagCount,
                ),
                'identifier' => 'doctrine.logion.multiple',
            ];
        }

        if ($inspection->status === 'unsupportedBook') {
            return [
                'message' => sprintf(
                    'The @logion on %s uses unsupported book %s; allowed books are %s.',
                    $declaration,
                    $inspection->book,
                    implode(', ', $this->parser->allowedBooks()),
                ),
                'identifier' => 'doctrine.logion.book',
            ];
        }

        return [
            'message' => sprintf(
                'The @logion on %s must use "@logion [BOOK C:V] passage" with positive chapter and verse numbers.',
                $declaration,
            ),
            'identifier' => 'doctrine.logion.malformed',
        ];
    }
}
