<?php
declare(strict_types=1);

namespace JdServices\Controllers;

use JdServices\Database;
use JdServices\ApiGuard;
use JdServices\Audit;
use PDO;

class UsersController
{
    private const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL', 'COMPTABLE', 'LECTURE_SEULE'];

    /**
     * GET /api/users
     */
    public static function list(): void
    {
        $g = ApiGuard::guardAdmin();
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->query('SELECT id, email, firstName, lastName, role, isActive, createdAt, updatedAt FROM user ORDER BY createdAt DESC');
        $users = $stmt->fetchAll();

        foreach ($users as &$u) {
            $u['isActive'] = (bool)$u['isActive'];

            // Récupérer les workspaces liés
            $stmtWs = $pdo->prepare('SELECT wu.id, wu.role, w.id AS wsId, w.slug, w.name
                FROM workspaceuser wu
                JOIN workspace w ON wu.workspaceId = w.id
                WHERE wu.userId = ?');
            $stmtWs->execute([$u['id']]);
            $wsRows = $stmtWs->fetchAll();

            $u['workspaceUsers'] = array_map(function ($row) {
                return [
                    'id' => $row['id'],
                    'role' => $row['role'],
                    'workspace' => [
                        'id' => $row['wsId'],
                        'slug' => $row['slug'],
                        'name' => $row['name'],
                    ]
                ];
            }, $wsRows);
        }

        echo json_encode(['users' => $users]);
    }

    /**
     * POST /api/users
     */
    public static function create(): void
    {
        $g = ApiGuard::guardAdmin();
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $callerRole = $g['access']['role'];
        $callerSession = $g['access']['session'];

        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $email = strtolower(trim((string)($input['email'] ?? '')));
        $password = (string)($input['password'] ?? '');
        $firstName = trim((string)($input['firstName'] ?? ''));
        $lastName = trim((string)($input['lastName'] ?? ''));
        $role = $input['role'] ?? 'COMMERCIAL';
        $workspaceSlugs = $input['workspaceSlugs'] ?? ['automobile'];

        if (empty($email) || empty($password) || empty($firstName) || empty($lastName)) {
            http_response_code(400);
            echo json_encode(['error' => 'Tous les champs sont requis']);
            return;
        }

        if (strlen($password) < 10) {
            http_response_code(400);
            echo json_encode(['error' => 'Le mot de passe doit comporter au moins 10 caractères.']);
            return;
        }

        if (!in_array($role, self::VALID_ROLES, true)) {
            http_response_code(400);
            echo json_encode(['error' => 'Rôle non valide']);
            return;
        }

        if ($role === 'SUPER_ADMIN' && $callerRole !== 'SUPER_ADMIN') {
            http_response_code(403);
            echo json_encode(['error' => 'Seul un Super Administrateur peut créer un compte Super Admin.']);
            return;
        }

        $pdo = Database::getConnection();
        $stmtCheck = $pdo->prepare('SELECT id FROM user WHERE email = ?');
        $stmtCheck->execute([$email]);
        if ($stmtCheck->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => 'Un utilisateur existe déjà avec cet email']);
            return;
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
        $userId = Database::generateCuid();

        $stmtIns = $pdo->prepare('INSERT INTO user (
            id, email, passwordHash, firstName, lastName, role, isActive, createdAt, updatedAt
        ) VALUES (
            ?, ?, ?, ?, ?, ?, 1, NOW(3), NOW(3)
        )');
        $stmtIns->execute([$userId, $email, $passwordHash, $firstName, $lastName, $role]);

        // Assigner les espaces
        if (is_array($workspaceSlugs) && !empty($workspaceSlugs)) {
            $inClause = implode(',', array_fill(0, count($workspaceSlugs), '?'));
            $stmtWs = $pdo->prepare("SELECT id FROM workspace WHERE slug IN ($inClause)");
            $stmtWs->execute($workspaceSlugs);
            $workspaces = $stmtWs->fetchAll();

            $stmtWu = $pdo->prepare('INSERT INTO workspaceuser (id, workspaceId, userId, role, canManageDocuments, canSign, canIssueInvoices, createdAt) VALUES (?, ?, ?, ?, 1, 1, 1, NOW(3))');
            foreach ($workspaces as $ws) {
                $wuId = Database::generateCuid();
                $stmtWu->execute([$wuId, $ws['id'], $userId, $role]);
            }
        }

        Audit::log(
            'workspace_auto',
            Audit::CREATED,
            'User',
            $userId,
            "{$email} ({$role})",
            null,
            ['email' => $email, 'role' => $role, 'firstName' => $firstName, 'lastName' => $lastName]
        );

        $stmtGet = $pdo->prepare('SELECT id, email, firstName, lastName, role, isActive, createdAt, updatedAt FROM user WHERE id = ?');
        $stmtGet->execute([$userId]);
        $user = $stmtGet->fetch();
        if ($user) {
            $user['isActive'] = (bool)$user['isActive'];
        }

        echo json_encode(['success' => true, 'user' => $user]);
    }

    /**
     * PUT /api/users
     */
    public static function update(): void
    {
        $g = ApiGuard::guardAdmin();
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $callerRole = $g['access']['role'];
        $callerSession = $g['access']['session'];

        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = $input['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requis']);
            return;
        }

        $pdo = Database::getConnection();
        $stmtUser = $pdo->prepare('SELECT * FROM user WHERE id = ?');
        $stmtUser->execute([$id]);
        $targetUser = $stmtUser->fetch();
        if (!$targetUser) {
            http_response_code(404);
            echo json_encode(['error' => 'Utilisateur introuvable']);
            return;
        }

        if ($targetUser['role'] === 'SUPER_ADMIN' && $callerRole !== 'SUPER_ADMIN') {
            http_response_code(403);
            echo json_encode(['error' => 'Seul un Super Administrateur peut modifier un compte Super Admin.']);
            return;
        }

        $role = $input['role'] ?? null;
        if ($role && $role === 'SUPER_ADMIN' && $callerRole !== 'SUPER_ADMIN') {
            http_response_code(403);
            echo json_encode(['error' => 'Seul un Super Administrateur peut attribuer le rôle Super Admin.']);
            return;
        }

        if ($role && !in_array($role, self::VALID_ROLES, true)) {
            http_response_code(400);
            echo json_encode(['error' => 'Rôle non valide']);
            return;
        }

        // Protection auto-désactivation et auto-rétrogradation
        if ($id === $callerSession['id']) {
            if (isset($input['isActive']) && !$input['isActive']) {
                http_response_code(400);
                echo json_encode(['error' => 'Vous ne pouvez pas désactiver votre propre compte administrateur.']);
                return;
            }
            if ($role && $role !== $targetUser['role']) {
                http_response_code(400);
                echo json_encode(['error' => 'Vous ne pouvez pas modifier votre propre rôle administrateur.']);
                return;
            }
        }

        $updates = [];
        $params = [];

        if (array_key_exists('firstName', $input)) {
            $updates[] = 'firstName = ?';
            $params[] = trim((string)$input['firstName']);
        }
        if (array_key_exists('lastName', $input)) {
            $updates[] = 'lastName = ?';
            $params[] = trim((string)$input['lastName']);
        }
        if ($role) {
            $updates[] = 'role = ?';
            $params[] = $role;
        }
        if (array_key_exists('isActive', $input)) {
            $updates[] = 'isActive = ?';
            $params[] = $input['isActive'] ? 1 : 0;
        }

        // Optionnel : modification de mot de passe si fourni
        if (!empty($input['password'])) {
            if (strlen((string)$input['password']) < 10) {
                http_response_code(400);
                echo json_encode(['error' => 'Le mot de passe doit comporter au moins 10 caractères.']);
                return;
            }
            $updates[] = 'passwordHash = ?';
            $params[] = password_hash((string)$input['password'], PASSWORD_BCRYPT, ['cost' => 10]);
        }

        if (!empty($updates)) {
            $updates[] = 'updatedAt = NOW(3)';
            $params[] = $id;
            $stmtUp = $pdo->prepare('UPDATE user SET ' . implode(', ', $updates) . ' WHERE id = ?');
            $stmtUp->execute($params);
        }

        $stmtGet = $pdo->prepare('SELECT id, email, firstName, lastName, role, isActive, createdAt, updatedAt FROM user WHERE id = ?');
        $stmtGet->execute([$id]);
        $updated = $stmtGet->fetch();
        if ($updated) {
            $updated['isActive'] = (bool)$updated['isActive'];
        }

        Audit::log(
            'workspace_auto',
            Audit::UPDATED,
            'User',
            $id,
            "{$targetUser['email']} ({$targetUser['role']})",
            ['role' => $targetUser['role'], 'isActive' => (bool)$targetUser['isActive']],
            ['role' => $updated['role'], 'isActive' => (bool)$updated['isActive']]
        );

        echo json_encode(['success' => true, 'user' => $updated]);
    }

    /**
     * DELETE /api/users?id=...
     */
    public static function delete(): void
    {
        $g = ApiGuard::guardAdmin();
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $callerRole = $g['access']['role'];
        $callerSession = $g['access']['session'];

        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requis']);
            return;
        }

        if ($id === $callerSession['id']) {
            http_response_code(400);
            echo json_encode(['error' => 'Impossible de supprimer votre propre compte utilisateur']);
            return;
        }

        $pdo = Database::getConnection();
        $stmtUser = $pdo->prepare('SELECT * FROM user WHERE id = ?');
        $stmtUser->execute([$id]);
        $targetUser = $stmtUser->fetch();
        if (!$targetUser) {
            http_response_code(404);
            echo json_encode(['error' => 'Utilisateur introuvable']);
            return;
        }

        if ($targetUser['role'] === 'SUPER_ADMIN' && $callerRole !== 'SUPER_ADMIN') {
            http_response_code(403);
            echo json_encode(['error' => 'Seul un Super Administrateur peut supprimer un compte Super Admin.']);
            return;
        }

        $stmtDelWu = $pdo->prepare('DELETE FROM workspaceuser WHERE userId = ?');
        $stmtDelWu->execute([$id]);

        $stmtDel = $pdo->prepare('DELETE FROM user WHERE id = ?');
        $stmtDel->execute([$id]);

        Audit::log(
            'workspace_auto',
            Audit::DELETED,
            'User',
            $id,
            "{$targetUser['email']} ({$targetUser['role']})"
        );

        echo json_encode(['success' => true, 'message' => 'Utilisateur supprimé']);
    }
}
