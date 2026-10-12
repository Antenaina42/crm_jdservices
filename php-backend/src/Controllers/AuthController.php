<?php
declare(strict_types=1);

namespace JdServices\Controllers;

use JdServices\Database;
use JdServices\Auth;
use JdServices\RateLimit;
use JdServices\Audit;
use PDO;

class AuthController
{
    private const DUMMY_HASH = '$2a$10$e8wU.UqE8qN4uC5v3qA3tO2rI4a5s6d7f8g9h0j1k2l3m4n5o6p7q';

    public static function login(?array $body = null): void
    {
        if ($body === null) {
            $body = json_decode(file_get_contents('php://input'), true) ?: [];
        }
        $email = trim(strtolower((string)($body['email'] ?? '')));
        $password = (string)($body['password'] ?? '');

        if (empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => 'Email et mot de passe requis']);
            return;
        }

        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $ip = explode(',', $ip)[0];

        // 1. Rate limiting
        $emailLimit = RateLimit::check("login:email:{$email}", 5, 900);
        $ipLimit = RateLimit::check("login:ip:{$ip}", 20, 900);

        if (!$emailLimit['allowed'] || !$ipLimit['allowed']) {
            $wait = max($emailLimit['retryAfter'], $ipLimit['retryAfter']);
            http_response_code(429);
            header("Retry-After: {$wait}");
            echo json_encode([
                'error' => "Trop de tentatives infructueuses. Veuillez patienter {$wait} seconde(s) avant de réessayer."
            ]);
            return;
        }

        $pdo = Database::getConnection();

        // 2. Recherche utilisateur
        $stmt = $pdo->prepare('SELECT id, email, passwordHash, firstName, lastName, role, isActive FROM user WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // 3. Vérification constante en temps
        if (!$user || !(bool)$user['isActive']) {
            Auth::verifyPassword($password, self::DUMMY_HASH);
            RateLimit::recordFailure("login:email:{$email}");
            RateLimit::recordFailure("login:ip:{$ip}");
            http_response_code(401);
            echo json_encode(['error' => 'Identifiants invalides']);
            return;
        }

        $isMatch = Auth::verifyPassword($password, $user['passwordHash']);
        if (!$isMatch) {
            RateLimit::recordFailure("login:email:{$email}");
            RateLimit::recordFailure("login:ip:{$ip}");
            http_response_code(401);
            echo json_encode(['error' => 'Identifiants invalides']);
            return;
        }

        // 4. Succès : réinitialiser le rate limit
        RateLimit::reset("login:email:{$email}");
        RateLimit::reset("login:ip:{$ip}");

        // 5. Workspaces autorisés
        $userWorkspaces = [];
        if ($user['role'] === 'SUPER_ADMIN') {
            $stmtWs = $pdo->query('SELECT id, slug, name FROM workspace');
            while ($row = $stmtWs->fetch()) {
                $userWorkspaces[] = [
                    'workspaceId' => $row['id'],
                    'slug' => $row['slug'],
                    'name' => $row['name'],
                    'role' => 'SUPER_ADMIN',
                ];
            }
        } else {
            $stmtWu = $pdo->prepare('
                SELECT w.id, w.slug, w.name, wu.role
                FROM workspaceuser wu
                JOIN workspace w ON w.id = wu.workspaceId
                WHERE wu.userId = ?
            ');
            $stmtWu->execute([$user['id']]);
            while ($row = $stmtWu->fetch()) {
                $userWorkspaces[] = [
                    'workspaceId' => $row['id'],
                    'slug' => $row['slug'],
                    'name' => $row['name'],
                    'role' => $row['role'] ?: $user['role'],
                ];
            }
        }

        $sessionPayload = [
            'id' => $user['id'],
            'email' => $user['email'],
            'firstName' => $user['firstName'],
            'lastName' => $user['lastName'],
            'role' => $user['role'],
            'workspaces' => $userWorkspaces,
        ];

        Auth::setSessionCookie($sessionPayload);

        // 6. Audit Log
        Audit::log([
            'userId' => $user['id'],
            'userEmail' => $user['email'],
            'userRole' => $user['role'],
            'action' => 'VIEWED',
            'entityType' => 'User',
            'entityId' => $user['id'],
            'entityReference' => "Connexion {$user['email']}",
            'newValue' => ['event' => 'Connexion réussie', 'ip' => $ip],
        ]);

        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'name' => "{$user['firstName']} {$user['lastName']}",
                'role' => $user['role'],
            ],
            'workspaces' => $userWorkspaces,
        ]);
    }

    public static function logout(): void
    {
        Auth::clearSessionCookie();
        echo json_encode(['success' => true]);
    }

    public static function me(): void
    {
        $session = Auth::getSession();
        if (!$session) {
            http_response_code(401);
            echo json_encode(['error' => 'Non authentifié']);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT id, email, firstName, lastName, role, isActive FROM user WHERE id = ?');
        $stmt->execute([$session['id']]);
        $user = $stmt->fetch();

        if (!$user || !(bool)$user['isActive']) {
            Auth::clearSessionCookie();
            http_response_code(401);
            echo json_encode(['error' => 'Compte inactif']);
            return;
        }

        // Recharger les espaces à jour
        $userWorkspaces = [];
        if ($user['role'] === 'SUPER_ADMIN') {
            $stmtWs = $pdo->query('SELECT id, slug, name FROM workspace');
            while ($row = $stmtWs->fetch()) {
                $userWorkspaces[] = [
                    'workspaceId' => $row['id'],
                    'slug' => $row['slug'],
                    'name' => $row['name'],
                    'role' => 'SUPER_ADMIN',
                ];
            }
        } else {
            $stmtWu = $pdo->prepare('
                SELECT w.id, w.slug, w.name, wu.role
                FROM workspaceuser wu
                JOIN workspace w ON w.id = wu.workspaceId
                WHERE wu.userId = ?
            ');
            $stmtWu->execute([$user['id']]);
            while ($row = $stmtWu->fetch()) {
                $userWorkspaces[] = [
                    'workspaceId' => $row['id'],
                    'slug' => $row['slug'],
                    'name' => $row['name'],
                    'role' => $row['role'] ?: $user['role'],
                ];
            }
        }

        echo json_encode([
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'firstName' => $user['firstName'],
                'lastName' => $user['lastName'],
                'role' => $user['role'],
            ],
            'workspaces' => $userWorkspaces,
        ]);
    }
}
