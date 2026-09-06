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

use DirectoryIterator;
use JsonException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

use function bin2hex;
use function copy;
use function dirname;
use function fclose;
use function file_put_contents;
use function getenv;
use function is_array;
use function is_resource;
use function is_string;
use function json_decode;
use function json_encode;
use function mkdir;
use function proc_close;
use function proc_open;
use function random_bytes;
use function rmdir;
use function stream_get_contents;
use function sys_get_temp_dir;
use function unlink;

final class ExtensionIntegrationTest extends TestCase
{
    /**
     * @param list<string> $expectedIdentifiers
     * @throws JsonException
     */
    #[DataProvider('integrationCases')]
    public function testExtensionWiringReportsViolations(string $configuration, array $expectedIdentifiers): void
    {
        [$exitCode, $stdout, $stderr] = self::runAnalysis(__DIR__ . '/' . $configuration);

        self::assertSame(1, $exitCode, $stderr !== '' ? $stderr : $stdout);
        self::assertSame($expectedIdentifiers, self::decodeIdentifiers($stdout));
    }

    /** @throws JsonException */
    public function testResultCacheTracksEnvironmentEnforcement(): void
    {
        $temporary = sys_get_temp_dir() . '/doctrine-result-cache-' . bin2hex(random_bytes(8));
        self::assertTrue(mkdir($temporary, 0700));

        try {
            self::assertTrue(mkdir($temporary . '/sources'));
            self::assertTrue(copy(__DIR__ . '/data/duplicate-references.php', $temporary . '/sources/fixture.php'));
            // NEON accepts JSON, whose encoding preserves quotes and backslashes in absolute paths.
            $configuration = json_encode([
                'includes' => [dirname(__DIR__) . '/extension.neon'],
                'parameters' => [
                    'level' => 0,
                    'paths' => [$temporary . '/sources'],
                    'tmpDir' => $temporary . '/cache',
                ],
            ], JSON_THROW_ON_ERROR);
            self::assertNotFalse(file_put_contents($temporary . '/phpstan.neon', $configuration));

            $environment = getenv();
            foreach ([false, true, false] as $enabled) {
                unset($environment['DOCTRINE_LOGION']);
                if ($enabled) {
                    $environment['DOCTRINE_LOGION'] = '1';
                }

                foreach ([false, true] as $reuse) {
                    [$exitCode, $stdout, $stderr] = self::runAnalysis($temporary . '/phpstan.neon', $environment);
                    self::assertSame($enabled ? 1 : 0, $exitCode, $stderr !== '' ? $stderr : $stdout);
                    self::assertSame(
                        $enabled ? ['doctrine.logion.duplicate', 'doctrine.logion.duplicate'] : [],
                        self::decodeIdentifiers($stdout),
                    );
                    self::assertStringContainsString(
                        $reuse ? 'Result cache restored. 0 files will be reanalysed.' : 'Result cache not used',
                        $stderr,
                    );
                }
            }
        } finally {
            self::removeDirectory($temporary);
        }
    }

    /**
     * @param array<string, string>|null $environment
     * @return array{int, string, string}
     */
    private static function runAnalysis(string $configuration, ?array $environment = null): array
    {
        $root = dirname(__DIR__, 3);
        $command = [
            PHP_BINARY,
            $root . '/vendor/bin/phpstan',
            'analyse',
            '--configuration=' . $configuration,
            '--error-format=json',
            '--no-progress',
            '--no-ansi',
            '-vv',
        ];
        $descriptorSpec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $pipes = [];
        $process = proc_open($command, $descriptorSpec, $pipes, $root, $environment);
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

        return [$exitCode, $stdout, $stderr];
    }

    private static function removeDirectory(string $directory): void
    {
        foreach (new DirectoryIterator($directory) as $file) {
            if ($file->isDot()) {
                continue;
            }

            if ($file->isDir() && !$file->isLink()) {
                self::removeDirectory($file->getPathname());
            } else {
                unlink($file->getPathname());
            }
        }

        rmdir($directory);
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
