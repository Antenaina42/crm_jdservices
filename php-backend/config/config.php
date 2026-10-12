<?php
/**
 * Configuration globale de l'API PHP JD-SERVICES MANAGEMENT
 * Ce fichier lit les paramètres depuis l'environnement ou depuis un fichier local non versionné.
 */

declare(strict_types=1);

// Charger les variables locales .env si présentes
$envFile = __DIR__ . '/.env.local.php';
$localConfig = file_exists($envFile) ? require $envFile : [];

return [
    'db' => [
        'host' => getenv('DB_HOST') ?: ($localConfig['DB_HOST'] ?? '127.0.0.1'),
        'port' => (int)(getenv('DB_PORT') ?: ($localConfig['DB_PORT'] ?? 3306)),
        'name' => getenv('DB_NAME') ?: ($localConfig['DB_NAME'] ?? 'jd_services_management'),
        'user' => getenv('DB_USER') ?: ($localConfig['DB_USER'] ?? 'root'),
        'pass' => getenv('DB_PASS') !== false ? getenv('DB_PASS') : ($localConfig['DB_PASS'] ?? 'root'),
        'charset' => 'utf8mb4',
    ],
    'auth' => [
        'jwt_secret' => getenv('AUTH_SECRET') ?: ($localConfig['AUTH_SECRET'] ?? 'jd-services-super-secret-key-32-chars-minimum-2026-mgmt'),
        'cookie_name' => 'jd_session_token',
        'ttl_seconds' => 7 * 24 * 3600, // 7 jours
    ],
    'app' => [
        'url' => getenv('NEXT_PUBLIC_APP_URL') ?: ($localConfig['APP_URL'] ?? 'http://localhost:3000'),
        'env' => getenv('APP_ENV') ?: ($localConfig['APP_ENV'] ?? 'development'), // 'production' ou 'development'
    ],
    'mail' => [
        'provider' => getenv('EMAIL_PROVIDER') ?: ($localConfig['EMAIL_PROVIDER'] ?? 'mock'),
        'from_email' => getenv('EMAIL_FROM') ?: ($localConfig['EMAIL_FROM'] ?? 'contact@jd-services.fr'),
        'from_name' => getenv('EMAIL_FROM_NAME') ?: ($localConfig['EMAIL_FROM_NAME'] ?? 'JD-SERVICES'),
        'api_key' => getenv('EMAIL_API_KEY') ?: ($localConfig['EMAIL_API_KEY'] ?? ''),
    ],
];
