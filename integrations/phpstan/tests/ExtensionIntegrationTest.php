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

use JsonException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

use function dirname;
use function fclose;
use function is_array;
use function is_resource;
use function is_string;
use function json_decode;
use function proc_close;
use function proc_open;
use function stream_get_contents;

final class ExtensionIntegrationTest extends TestCase
{
    /**
     * @param list<string> $expectedIdentifiers
     * @throws JsonException
     */
    #[DataProvider('integrationCases')]
    public function testExtensionWiringReportsViolations(string $configuration, array $expectedIdentifiers): void
    {
        $root = dirname(__DIR__, 3);
        $command = [
            PHP_BINARY,
            $root . '/vendor/bin/phpstan',
            'analyse',
            '--configuration=' . __DIR__ . '/' . $configuration,
            '--error-format=json',
            '--no-progress',
        ];
        $descriptorSpec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $pipes = [];
        $process = proc_open($command, $descriptorSpec, $pipes, $root);
        if (!is_resource($process)) {
            self::fail('Could not start PHPStan for the extension integration test.');
        }

        $stdin = $pipes[0] ?? null;
        $standardOutput = $pipes[1] ?? null;
        $standardError = $pipes[2] ?? null;
        if (!is_resource($stdin) || !is_resource($standardOutput) || !is_resource($standardError)) {
            self::fail('Could not open PHPStan streams for the extension integration test.');
        }

        fclose($stdin);
        $stdout = stream_get_contents($standardOutput);
        fclose($standardOutput);
        $stderr = stream_get_contents($standardError);
        fclose($standardError);
        $exitCode = proc_close($process);

        if (!is_string($stdout) || !is_string($stderr)) {
            self::fail('Could not read PHPStan output for the extension integration test.');
        }

        self::assertSame(1, $exitCode, $stderr !== '' ? $stderr : $stdout);

        self::assertSame($expectedIdentifiers, self::decodeIdentifiers($stdout));
    }

    /** @return array<string, array{string, list<string>}> */
    public static function integrationCases(): array
    {
        return [
            'duplicate references' => [
                'duplicate-integration.neon',
                ['doctrine.logion.duplicate', 'doctrine.logion.duplicate'],
            ],
            'empty passages' => [
                'empty-passage-integration.neon',
                ['doctrine.logion.commandMalformed', 'doctrine.logion.malformed'],
            ],
        ];
    }

    /**
     * @return list<string>
     * @throws JsonException
     */
    private static function decodeIdentifiers(string $stdout): array
    {
        $result = json_decode($stdout, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($result)) {
            self::fail('PHPStan JSON output must be an object.');
        }

        $files = $result['files'] ?? null;
        if (!is_array($files)) {
            self::fail('PHPStan JSON output must contain files.');
        }

        $identifiers = [];
        foreach ($files as $file) {
            if (!is_array($file)) {
                self::fail('Each PHPStan file result must be an object.');
            }

            $messages = $file['messages'] ?? null;
            if (!is_array($messages)) {
                self::fail('Each PHPStan file result must contain messages.');
            }

            foreach ($messages as $message) {
                if (!is_array($message)) {
                    self::fail('Each PHPStan message must be an object.');
                }

                $identifier = $message['identifier'] ?? null;
                if (is_string($identifier)) {
                    $identifiers[] = $identifier;
                }
            }
        }

        return $identifiers;
    }
}
