<?php
declare(strict_types=1);

namespace JdServices;

use PDO;

class ApiGuard
{
    private const PERMISSIONS = [
        'SUPER_ADMIN' => ['read', 'write', 'delete', 'issue', 'pay'],
        'ADMIN' => ['read', 'write', 'delete', 'issue', 'pay'],
        'COMMERCIAL' => ['read', 'write', 'delete'],
        'COMPTABLE' => ['read', 'issue', 'pay'],
        'LECTURE_SEULE' => ['read'],
    ];

    public static function roleCan(string $role, string $action): bool
    {
        return in_array($action, self::PERMISSIONS[$role] ?? [], true);
    }

    /**
     * Garde de sécurité pour un espace de travail donné.
     * Revalide le compte actif et les rôles en base de données.
     *
     * @return array{ok: bool, access?: array{session: array, role: string, workspaceId: string}, error?: string, status?: int}
     */
    public static function guardWorkspace(?string $workspaceId, string $action, bool $notFoundOnNoMembership = false): array
    {
        $session = Auth::getSession();
        if (!$session) {
            return ['ok' => false, 'error' => 'Non autorisé', 'status' => 401];
        }

        if (!$workspaceId) {
            return ['ok' => false, 'error' => 'workspaceId requis', 'status' => 400];
        }

        $pdo = Database::getConnection();

        // Normaliser le workspaceId (résolution par id, slug ou alias réseau)
        $stmtWsNorm = $pdo->prepare('SELECT id FROM workspace WHERE id = ? OR slug = ? OR (slug = "network" AND ? = "reseau")');
        $stmtWsNorm->execute([$workspaceId, $workspaceId, $workspaceId]);
        $wsNorm = $stmtWsNorm->fetch();
        if ($wsNorm) {
            $workspaceId = $wsNorm['id'];
        }

        // 1. Vérifier l'utilisateur en base
        $stmt = $pdo->prepare('SELECT id, email, firstName, lastName, role, isActive FROM user WHERE id = ?');
        $stmt->execute([$session['id']]);
        $user = $stmt->fetch();

        if (!$user || !(bool)$user['isActive']) {
            return ['ok' => false, 'error' => 'Non autorisé', 'status' => 401];
        }

        // 2. Déterminer le rôle effectif dans l'espace
        $effectiveRole = $user['role'];

        if ($user['role'] !== 'SUPER_ADMIN') {
            $stmtWs = $pdo->prepare('SELECT role FROM workspaceuser WHERE workspaceId = ? AND userId = ?');
            $stmtWs->execute([$workspaceId, $user['id']]);
            $membership = $stmtWs->fetch();

            if (!$membership) {
                return [
                    'ok' => false,
                    'error' => $notFoundOnNoMembership ? 'Ressource introuvable' : 'Accès refusé à cet espace de travail',
                    'status' => $notFoundOnNoMembership ? 404 : 403,
                ];
            }

            if (!empty($membership['role'])) {
                $effectiveRole = $membership['role'];
            }
        }

        // 3. Vérifier la matrice des permissions
        if (!self::roleCan($effectiveRole, $action)) {
            return ['ok' => false, 'error' => 'Permission insuffisante pour cette action', 'status' => 403];
        }

        return [
            'ok' => true,
            'access' => [
                'session' => $session,
                'role' => $effectiveRole,
                'workspaceId' => $workspaceId,
            ],
        ];
    }

    /**
     * Garde pour une entité spécifique (client, project, document, etc.)
     * Charge le workspaceId de l'entité puis applique guardWorkspace avec statut 404 si non membre.
     */
    public static function guardEntity(string $entity, ?string $id, string $action): array
    {
        $session = Auth::getSession();
        if (!$session) {
            return ['ok' => false, 'error' => 'Non autorisé', 'status' => 401];
        }

        if (!$id) {
            return ['ok' => false, 'error' => 'Identifiant requis', 'status' => 400];
        }

        $pdo = Database::getConnection();
        $table = match ($entity) {
            'client' => 'client',
            'project' => 'project',
            'document' => 'documentrecord',
            'catalogItem' => 'servicecatalogitem',
            'taxRate' => 'taxrate',
            default => null,
        };

        if (!$table) {
            return ['ok' => false, 'error' => 'Type d\'entité non supporté', 'status' => 400];
        }

        $stmt = $pdo->prepare("SELECT workspaceId FROM `$table` WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            return ['ok' => false, 'error' => 'Ressource introuvable', 'status' => 404];
        }

        return self::guardWorkspace($row['workspaceId'], $action, true);
    }

    /**
     * Garde d'administration globale (SUPER_ADMIN ou ADMIN).
     */
    public static function guardAdmin(): array
    {
        $session = Auth::getSession();
        if (!$session) {
            return ['ok' => false, 'error' => 'Non autorisé', 'status' => 401];
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT id, role, isActive FROM user WHERE id = ?');
        $stmt->execute([$session['id']]);
        $user = $stmt->fetch();

        if (!$user || !(bool)$user['isActive']) {
            return ['ok' => false, 'error' => 'Non autorisé', 'status' => 401];
        }

        if ($user['role'] !== 'SUPER_ADMIN' && $user['role'] !== 'ADMIN') {
            return ['ok' => false, 'error' => 'Réservé aux administrateurs', 'status' => 403];
        }

        return [
            'ok' => true,
            'access' => [
                'session' => $session,
                'role' => $user['role'],
                'workspaceId' => '',
            ],
        ];
    }
}
