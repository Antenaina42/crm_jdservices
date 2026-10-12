<?php
declare(strict_types=1);

namespace JdServices;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $pdo = null;

    public static function getConnection(): PDO
    {
        if (self::$pdo === null) {
            $config = require __DIR__ . '/../config/config.php';
            $db = $config['db'];

            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                $db['host'],
                $db['port'],
                $db['name'],
                $db['charset']
            );

            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
            ];

            try {
                self::$pdo = new PDO($dsn, $db['user'], $db['pass'], $options);
            } catch (PDOException $e) {
                // En production, ne pas exposer les identifiants ou le DSN
                error_log("Database connection error: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(['error' => 'Erreur de connexion à la base de données.']);
                exit;
            }
        }

        return self::$pdo;
    }

    /**
     * Génère un identifiant unique compact compatible avec les identifiants CUID de Prisma (ex: c+timestamp+random).
     */
    public static function generateId(string $prefix = 'c'): string
    {
        // 1 caractère préfixe + timestamp base36 + 16 hexadécimaux aléatoires
        $timePart = base_convert((string)(int)(microtime(true) * 1000), 10, 36);
        $randomPart = bin2hex(random_bytes(8));
        return $prefix . $timePart . $randomPart;
    }

    public static function generateCuid(): string
    {
        return self::generateId('c');
    }
}
