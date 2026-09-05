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

use PhpParser\Comment\Doc;

use function array_fill_keys;
use function array_keys;
use function count;
use function explode;
use function preg_match;
use function preg_match_all;
use function sprintf;

final class LogionParser
{
    /** @var array<string, true> */
    private array $allowedBooks;

    /** @param list<string> $allowedBooks */
    public function __construct(array $allowedBooks)
    {
        $this->allowedBooks = array_fill_keys($allowedBooks, true);
    }

    public function inspect(?Doc $docComment): LogionInspection
    {
        if ($docComment === null) {
            return LogionInspection::missing();
        }

        $text = $docComment->getText();
        preg_match_all('~@logion(?=\s|\*/)~', $text, $tags);
        $tagCount = count($tags[0]);

        if ($tagCount === 0) {
            return LogionInspection::missing();
        }

        if ($tagCount > 1) {
            return LogionInspection::multiple($tagCount);
        }

        $matched = preg_match(
            '~@logion[ \t]+\[([A-Z][A-Z0-9]*) ([1-9][0-9]*):([1-9][0-9]*)\][ \t]+(\S[^\r\n]*)~',
            $text,
            $parts,
        );

        if ($matched !== 1) {
            return LogionInspection::malformed();
        }

        // The closing delimiter cannot serve as passage text on the citation line.
        $passage = explode('*/', $parts[4], 2)[0];
        // Reject Unicode blanks without requiring other passage text to be valid UTF-8.
        if (preg_match('~(*UCP)\A\s*\z~u', $passage) === 1) {
            return LogionInspection::malformed();
        }

        $book = $parts[1];
        if (!isset($this->allowedBooks[$book])) {
            return LogionInspection::unsupportedBook($book);
        }

        return LogionInspection::valid(sprintf('%s %s:%s', $book, $parts[2], $parts[3]), $book);
    }

    /** @return list<string> */
    public function allowedBooks(): array
    {
        return array_keys($this->allowedBooks);
    }
}
