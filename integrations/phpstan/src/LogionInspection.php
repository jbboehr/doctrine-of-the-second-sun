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

final class LogionInspection
{
    private function __construct(
        public readonly string $status,
        public readonly ?string $reference,
        public readonly ?string $book,
        public readonly int $tagCount,
    ) {
    }

    public static function missing(): self
    {
        return new self('missing', null, null, 0);
    }

    public static function multiple(int $tagCount): self
    {
        return new self('multiple', null, null, $tagCount);
    }

    public static function malformed(): self
    {
        return new self('malformed', null, null, 1);
    }

    public static function unsupportedBook(string $book): self
    {
        return new self('unsupportedBook', null, $book, 1);
    }

    public static function valid(string $reference, string $book): self
    {
        return new self('valid', $reference, $book, 1);
    }

    public function isValid(): bool
    {
        return $this->status === 'valid';
    }
}
