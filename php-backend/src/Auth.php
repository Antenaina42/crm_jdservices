<?php
declare(strict_types=1);

namespace JdServices;

class Auth
{
    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    public static function encodeJwt(array $payload, string $secret, int $ttlSeconds = 604800): string
    {
        $now = time();
        $payload['iat'] = $now;
        $payload['exp'] = $now + $ttlSeconds;

        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $headerEncoded = self::base64UrlEncode((string)json_encode($header));
        $payloadEncoded = self::base64UrlEncode((string)json_encode($payload));

        $signature = hash_hmac('sha256', "$headerEncoded.$payloadEncoded", $secret, true);
        $signatureEncoded = self::base64UrlEncode($signature);

        return "$headerEncoded.$payloadEncoded.$signatureEncoded";
    }

    public static function decodeJwt(string $token, string $secret): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;

        $expectedSig = self::base64UrlEncode(hash_hmac('sha256', "$headerEncoded.$payloadEncoded", $secret, true));
        if (!hash_equals($expectedSig, $signatureEncoded)) {
            return null;
        }

        $payloadJson = self::base64UrlDecode($payloadEncoded);
        $payload = json_decode($payloadJson, true);
        if (!is_array($payload)) {
            return null;
        }

        if (isset($payload['exp']) && time() > $payload['exp']) {
            return null; // Expiré
        }

        return $payload;
    }

    public static function getSession(): ?array
    {
        $config = require __DIR__ . '/../config/config.php';
        $cookieName = $config['auth']['cookie_name'];
        $secret = $config['auth']['jwt_secret'];

        $token = $_COOKIE[$cookieName] ?? null;

        if (!$token && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
            if (str_starts_with($authHeader, 'Bearer ')) {
                $token = substr($authHeader, 7);
            }
        }

        if (!$token) {
            return null;
        }

        return self::decodeJwt($token, $secret);
    }

    public static function setSessionCookie(array $user): void
    {
        $config = require __DIR__ . '/../config/config.php';
        $cookieName = $config['auth']['cookie_name'];
        $secret = $config['auth']['jwt_secret'];
        $ttl = $config['auth']['ttl_seconds'];
        $isProd = ($config['app']['env'] === 'production');

        $token = self::encodeJwt($user, $secret, $ttl);

        setcookie($cookieName, $token, [
            'expires' => time() + $ttl,
            'path' => '/',
            'domain' => '',
            'secure' => $isProd,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    public static function clearSessionCookie(): void
    {
        $config = require __DIR__ . '/../config/config.php';
        $cookieName = $config['auth']['cookie_name'];
        $isProd = ($config['app']['env'] === 'production');

        setcookie($cookieName, '', [
            'expires' => time() - 3600,
            'path' => '/',
            'domain' => '',
            'secure' => $isProd,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    public static function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
    }
}
