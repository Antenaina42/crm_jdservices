<?php
declare(strict_types=1);

namespace JdServices\Controllers;

use JdServices\Database;
use JdServices\ApiGuard;
use PDO;

class TaxController
{
    /**
     * GET /api/tax?workspaceId=...
     */
    public static function list(): void
    {
        $workspaceId = $_GET['workspaceId'] ?? null;
        $pdo = Database::getConnection();

        if ($workspaceId) {
            $g = ApiGuard::guardWorkspace($workspaceId, 'read');
            if (!$g['ok']) {
                http_response_code($g['status']);
                echo json_encode(['error' => $g['error']]);
                return;
            }

            $stmt = $pdo->prepare('SELECT t.*, w.slug AS workspaceSlug, w.name AS workspaceName
                FROM taxrate t
                JOIN workspace w ON t.workspaceId = w.id
                WHERE t.workspaceId = ?
                ORDER BY t.rate DESC');
            $stmt->execute([$g['access']['workspaceId']]);
        } else {
            $g = ApiGuard::guardAdmin();
            if (!$g['ok']) {
                http_response_code($g['status']);
                echo json_encode(['error' => $g['error']]);
                return;
            }

            $stmt = $pdo->query('SELECT t.*, w.slug AS workspaceSlug, w.name AS workspaceName
                FROM taxrate t
                JOIN workspace w ON t.workspaceId = w.id
                ORDER BY t.rate DESC');
        }

        $rates = $stmt->fetchAll();
        foreach ($rates as &$r) {
            $r['rate'] = (float)$r['rate'];
            $r['isActive'] = (bool)$r['isActive'];
            $r['workspace'] = [
                'slug' => $r['workspaceSlug'],
                'name' => $r['workspaceName'],
            ];
            unset($r['workspaceSlug'], $r['workspaceName']);
        }

        echo json_encode(['taxRates' => $rates]);
    }

    /**
     * POST /api/tax
     */
    public static function create(): void
    {
        $g = ApiGuard::guardAdmin();
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $workspaceId = $input['workspaceId'] ?? null;
        $name = trim((string)($input['name'] ?? ''));
        $rate = isset($input['rate']) ? (float)$input['rate'] : null;
        $type = $input['type'] ?? 'STANDARD';

        if (empty($workspaceId) || empty($name) || $rate === null) {
            http_response_code(400);
            echo json_encode(['error' => 'Tous les champs sont requis']);
            return;
        }

        $pdo = Database::getConnection();
        $stmtWs = $pdo->prepare('SELECT id FROM workspace WHERE id = ?');
        $stmtWs->execute([$workspaceId]);
        if (!$stmtWs->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Espace introuvable']);
            return;
        }

        $id = Database::generateCuid();
        $stmt = $pdo->prepare('INSERT INTO taxrate (
            id, workspaceId, name, rate, country, type, effectiveFrom, isActive, createdAt, updatedAt
        ) VALUES (
            ?, ?, ?, ?, "FR", ?, NOW(3), 1, NOW(3), NOW(3)
        )');
        $stmt->execute([$id, $workspaceId, $name, $rate, $type]);

        $stmtGet = $pdo->prepare('SELECT * FROM taxrate WHERE id = ?');
        $stmtGet->execute([$id]);
        $taxRate = $stmtGet->fetch();
        if ($taxRate) {
            $taxRate['rate'] = (float)$taxRate['rate'];
            $taxRate['isActive'] = (bool)$taxRate['isActive'];
        }

        echo json_encode(['success' => true, 'taxRate' => $taxRate]);
    }

    /**
     * PUT /api/tax
     */
    public static function update(): void
    {
        $g = ApiGuard::guardAdmin();
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = $input['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requis']);
            return;
        }

        $pdo = Database::getConnection();
        $stmtGet = $pdo->prepare('SELECT * FROM taxrate WHERE id = ?');
        $stmtGet->execute([$id]);
        $existing = $stmtGet->fetch();
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Taux de TVA introuvable']);
            return;
        }

        $updates = [];
        $params = [];

        if (array_key_exists('name', $input)) {
            $updates[] = 'name = ?';
            $params[] = trim((string)$input['name']);
        }
        if (array_key_exists('rate', $input)) {
            $updates[] = 'rate = ?';
            $params[] = (float)$input['rate'];
        }
        if (array_key_exists('isActive', $input)) {
            $updates[] = 'isActive = ?';
            $params[] = $input['isActive'] ? 1 : 0;
        }

        if (!empty($updates)) {
            $updates[] = 'updatedAt = NOW(3)';
            $params[] = $id;
            $stmtUp = $pdo->prepare('UPDATE taxrate SET ' . implode(', ', $updates) . ' WHERE id = ?');
            $stmtUp->execute($params);
        }

        $stmtGet->execute([$id]);
        $updated = $stmtGet->fetch();
        if ($updated) {
            $updated['rate'] = (float)$updated['rate'];
            $updated['isActive'] = (bool)$updated['isActive'];
        }

        echo json_encode(['success' => true, 'taxRate' => $updated]);
    }

    /**
     * DELETE /api/tax?id=...
     */
    public static function delete(): void
    {
        $g = ApiGuard::guardAdmin();
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requis']);
            return;
        }

        $pdo = Database::getConnection();
        $stmtDel = $pdo->prepare('DELETE FROM taxrate WHERE id = ?');
        $stmtDel->execute([$id]);

        echo json_encode(['success' => true, 'message' => 'Taux de TVA supprimé']);
    }
}
