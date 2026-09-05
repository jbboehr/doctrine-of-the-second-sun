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

namespace DoctrineOfTheSecondSun\PHPStan\Tests;

use DoctrineOfTheSecondSun\PHPStan\LogionParser;
use PhpParser\Comment\Doc;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class LogionParserTest extends TestCase
{
    #[DataProvider('passageComments')]
    public function testRequiresPassageTextOnTheCitationLine(
        string $comment,
        string $status,
        ?string $reference,
    ): void {
        $inspection = (new LogionParser(['OSD']))->inspect(new Doc($comment));

        self::assertSame($status, $inspection->status);
        self::assertSame($reference, $inspection->reference);
    }

    /** @return array<string, array{string, string, ?string}> */
    public static function passageComments(): array
    {
        return [
            'empty single-line passage' => ['/** @logion [OSD 1:1] */', 'malformed', null],
            'spaces and tab before the delimiter' => ["/** @logion [OSD 1:1] \t */", 'malformed', null],
            'non-breaking space before the delimiter' => [
                "/** @logion [OSD 1:1] \u{00A0}*/",
                'malformed',
                null,
            ],
            'non-breaking space followed by a space before the delimiter' => [
                "/** @logion [OSD 1:1] \u{00A0} */",
                'malformed',
                null,
            ],
            'multiline comment closing on the citation line' => [
                "/**\n * @logion [OSD 1:1] */",
                'malformed',
                null,
            ],
            'empty multiline passage' => ["/**\n * @logion [OSD 1:1]\n */", 'malformed', null],
            'whitespace-only multiline passage' => ["/**\n * @logion [OSD 1:1] \t\n */", 'malformed', null],
            'Unicode whitespace-only multiline passage' => [
                "/**\n * @logion [OSD 1:1] \u{3000}\n */",
                'malformed',
                null,
            ],
            'delimiter immediately after citation' => ['/** @logion [OSD 1:1]*/', 'malformed', null],
            'passage only on the following line' => [
                "/**\n * @logion [OSD 1:1]\n * The lamp remained.\n */",
                'malformed',
                null,
            ],
            'nonempty single-line passage' => ['/** @logion [OSD 1:1] The lamp remained. */', 'valid', 'OSD 1:1'],
            'nonempty passage after Unicode whitespace' => [
                "/** @logion [OSD 1:1] \u{00A0}The lamp remained. */",
                'valid',
                'OSD 1:1',
            ],
            'nonempty passage containing a non-UTF-8 byte' => ["/** @logion [OSD 1:1] \xE9 */", 'valid', 'OSD 1:1'],
            'nonempty multiline passage' => [
                "/**\n * @logion [OSD 1:1] The lamp remained.\n */",
                'valid',
                'OSD 1:1',
            ],
            'nonempty passage without space before delimiter' => [
                '/** @logion [OSD 1:1] The lamp remained.*/',
                'valid',
                'OSD 1:1',
            ],
            'passage containing only an asterisk' => ['/** @logion [OSD 1:1] **/', 'valid', 'OSD 1:1'],
            'passage containing only a slash' => ['/** @logion [OSD 1:1] /*/', 'valid', 'OSD 1:1'],
            'passage beginning with an asterisk' => ['/** @logion [OSD 1:1] *The lamp remained.* */', 'valid', 'OSD 1:1'],
            'passage beginning with a slash' => ['/** @logion [OSD 1:1] / The lamp remained. */', 'valid', 'OSD 1:1'],
        ];
    }
}
