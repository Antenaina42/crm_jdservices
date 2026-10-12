<?php
declare(strict_types=1);

namespace JdServices\Controllers;

use JdServices\Database;
use JdServices\ApiGuard;
use PDO;

class CatalogController
{
    /**
     * GET /api/catalog?workspaceId=...
     */
    public static function list(): void
    {
        $workspaceId = $_GET['workspaceId'] ?? null;
        $g = ApiGuard::guardWorkspace($workspaceId, 'read');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $validWs = $g['access']['workspaceId'];
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare('SELECT * FROM servicecatalogitem WHERE workspaceId = ? ORDER BY category ASC, name ASC');
        $stmt->execute([$validWs]);
        $items = $stmt->fetchAll();

        foreach ($items as &$it) {
            $it['isActive'] = (bool)$it['isActive'];
            $it['defaultPriceHt'] = (float)$it['defaultPriceHt'];
            $it['defaultTaxRate'] = (float)$it['defaultTaxRate'];
        }

        echo json_encode(['items' => $items]);
    }

    /**
     * POST /api/catalog
     */
    public static function create(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $workspaceId = $input['workspaceId'] ?? null;
        $code = trim((string)($input['code'] ?? ''));
        $name = trim((string)($input['name'] ?? ''));

        $g = ApiGuard::guardWorkspace($workspaceId, 'write');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        if (empty($code) || empty($name)) {
            http_response_code(400);
            echo json_encode(['error' => 'Champs obligatoires manquants']);
            return;
        }

        $validWs = $g['access']['workspaceId'];
        $pdo = Database::getConnection();

        $category = trim((string)($input['category'] ?? 'GENERAL'));
        $description = !empty($input['description']) ? trim((string)$input['description']) : null;
        $unit = $input['unit'] ?? 'Forfait';
        $defaultPriceHt = isset($input['defaultPriceHt']) ? (float)$input['defaultPriceHt'] : 0.0;
        $defaultTaxRate = isset($input['defaultTaxRate']) ? (float)$input['defaultTaxRate'] : 20.0;
        $frequency = $input['frequency'] ?? 'PONCTUELLE';
        $id = Database::generateCuid();

        $stmt = $pdo->prepare('INSERT INTO servicecatalogitem (
            id, workspaceId, code, category, name, description, unit,
            defaultPriceHt, defaultTaxRate, frequency, isActive, createdAt, updatedAt
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, 1, NOW(3), NOW(3)
        )');

        $stmt->execute([
            $id, $validWs, $code, $category, $name, $description, $unit,
            $defaultPriceHt, $defaultTaxRate, $frequency
        ]);

        $stmtGet = $pdo->prepare('SELECT * FROM servicecatalogitem WHERE id = ?');
        $stmtGet->execute([$id]);
        $item = $stmtGet->fetch();
        if ($item) {
            $item['isActive'] = (bool)$item['isActive'];
            $item['defaultPriceHt'] = (float)$item['defaultPriceHt'];
            $item['defaultTaxRate'] = (float)$item['defaultTaxRate'];
        }

        echo json_encode(['success' => true, 'item' => $item]);
    }

    /**
     * PUT /api/catalog
     */
    public static function update(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = $input['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requis']);
            return;
        }

        $g = ApiGuard::guardEntity('catalogItem', $id, 'write');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $updates = [];
        $params = [];

        if (array_key_exists('defaultPriceHt', $input)) {
            $updates[] = 'defaultPriceHt = ?';
            $params[] = (float)$input['defaultPriceHt'];
        }
        if (array_key_exists('name', $input)) {
            $updates[] = 'name = ?';
            $params[] = trim((string)$input['name']);
        }
        if (array_key_exists('description', $input)) {
            $updates[] = 'description = ?';
            $params[] = !empty($input['description']) ? trim((string)$input['description']) : null;
        }
        if (array_key_exists('isActive', $input)) {
            $updates[] = 'isActive = ?';
            $params[] = $input['isActive'] ? 1 : 0;
        }

        if (!empty($updates)) {
            $updates[] = 'updatedAt = NOW(3)';
            $params[] = $id;
            $sql = 'UPDATE servicecatalogitem SET ' . implode(', ', $updates) . ' WHERE id = ?';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }

        $stmtGet = $pdo->prepare('SELECT * FROM servicecatalogitem WHERE id = ?');
        $stmtGet->execute([$id]);
        $item = $stmtGet->fetch();
        if ($item) {
            $item['isActive'] = (bool)$item['isActive'];
            $item['defaultPriceHt'] = (float)$item['defaultPriceHt'];
            $item['defaultTaxRate'] = (float)$item['defaultTaxRate'];
        }

        echo json_encode(['success' => true, 'item' => $item]);
    }

    /**
     * DELETE /api/catalog?id=...
     */
    public static function delete(): void
    {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requis']);
            return;
        }

        $g = ApiGuard::guardEntity('catalogItem', $id, 'delete');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('DELETE FROM servicecatalogitem WHERE id = ?');
        $stmt->execute([$id]);

        echo json_encode(['success' => true, 'message' => 'Prestation supprimée du catalogue']);
    }
}
