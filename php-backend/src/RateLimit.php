<?php
declare(strict_types=1);

namespace JdServices;

class RateLimit
{
    private static function getStorageDir(): string
    {
        $dir = sys_get_temp_dir() . '/jd_services_ratelimit';
        if (!is_dir($dir)) {
            @mkdir($dir, 0770, true);
        }
        return $dir;
    }

    private static function getFilePath(string $key): string
    {
        $hash = hash('sha256', $key);
        return self::getStorageDir() . '/' . $hash . '.json';
    }

    public static function check(string $key, int $maxAttempts = 5, int $windowSeconds = 900): array
    {
        $file = self::getFilePath($key);
        $now = time();

        if (!file_exists($file)) {
            return ['allowed' => true, 'remaining' => $maxAttempts, 'retryAfter' => 0];
        }

        $data = json_decode((string)@file_get_contents($file), true);
        if (!is_array($data) || !isset($data['attempts']) || !is_array($data['attempts'])) {
            return ['allowed' => true, 'remaining' => $maxAttempts, 'retryAfter' => 0];
        }

        // Filtrer les tentatives récentes
        $attempts = array_filter($data['attempts'], fn(int $ts) => ($now - $ts) < $windowSeconds);

        if (count($attempts) >= $maxAttempts) {
            $oldest = min($attempts);
            $retryAfter = max(0, $windowSeconds - ($now - $oldest));
            return ['allowed' => false, 'remaining' => 0, 'retryAfter' => $retryAfter];
        }

        return ['allowed' => true, 'remaining' => $maxAttempts - count($attempts), 'retryAfter' => 0];
    }

    public static function recordFailure(string $key, int $windowSeconds = 900): void
    {
        $file = self::getFilePath($key);
        $now = time();

        $attempts = [];
        if (file_exists($file)) {
            $data = json_decode((string)@file_get_contents($file), true);
            if (is_array($data) && isset($data['attempts']) && is_array($data['attempts'])) {
                $attempts = array_filter($data['attempts'], fn(int $ts) => ($now - $ts) < $windowSeconds);
            }
        }

        $attempts[] = $now;
        @file_put_contents($file, json_encode(['attempts' => array_values($attempts)]), LOCK_EX);
    }

    public static function reset(string $key): void
    {
        $file = self::getFilePath($key);
        if (file_exists($file)) {
            @unlink($file);
        }
    }
}
