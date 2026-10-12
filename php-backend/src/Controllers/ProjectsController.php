<?php
declare(strict_types=1);

namespace JdServices\Controllers;

use JdServices\Database;
use JdServices\ApiGuard;
use JdServices\Audit;
use PDO;

class ProjectsController
{
    /**
     * GET /api/projects?workspaceId=...&clientId=...
     */
    public static function list(): void
    {
        $workspaceId = $_GET['workspaceId'] ?? null;
        $clientId = $_GET['clientId'] ?? null;

        $g = ApiGuard::guardWorkspace($workspaceId, 'read');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $validWs = $g['access']['workspaceId'];
        $pdo = Database::getConnection();

        $sql = 'SELECT * FROM project WHERE workspaceId = ?';
        $params = [$validWs];

        if ($clientId) {
            $sql .= ' AND clientId = ?';
            $params[] = $clientId;
        }

        $sql .= ' ORDER BY createdAt DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $projects = $stmt->fetchAll();

        foreach ($projects as &$p) {
            // Joindre client
            $stmtClient = $pdo->prepare('SELECT id, firstName, lastName, companyName, isCompany FROM client WHERE id = ?');
            $stmtClient->execute([$p['clientId']]);
            $client = $stmtClient->fetch();
            if ($client) {
                $client['isCompany'] = (bool)$client['isCompany'];
            }
            $p['client'] = $client ?: null;

            // Joindre documents associés
            $stmtDocs = $pdo->prepare('SELECT id, documentNumber, documentType, totalTtc, status FROM documentrecord WHERE projectId = ?');
            $stmtDocs->execute([$p['id']]);
            $p['documents'] = $stmtDocs->fetchAll();
        }

        echo json_encode(['projects' => $projects]);
    }

    /**
     * POST /api/projects
     */
    public static function create(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $workspaceId = $input['workspaceId'] ?? null;
        $clientId = $input['clientId'] ?? null;
        $title = trim((string)($input['title'] ?? ''));

        $g = ApiGuard::guardWorkspace($workspaceId, 'write');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        if (empty($clientId) || empty($title)) {
            http_response_code(400);
            echo json_encode(['error' => 'Client et titre sont obligatoires']);
            return;
        }

        $validWs = $g['access']['workspaceId'];
        $pdo = Database::getConnection();

        // Vérifier que le client appartient bien à ce workspace
        $stmtClient = $pdo->prepare('SELECT id FROM client WHERE id = ? AND workspaceId = ?');
        $stmtClient->execute([$clientId, $validWs]);
        if (!$stmtClient->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Client introuvable dans cet espace']);
            return;
        }

        $stmtCount = $pdo->prepare('SELECT COUNT(*) FROM project WHERE workspaceId = ?');
        $stmtCount->execute([$validWs]);
        $count = (int)$stmtCount->fetchColumn();

        $year = date('Y');
        $projectNumber = sprintf('PRJ-%s-%04d', $year, $count + 1);
        $projectId = Database::generateCuid();

        $type = $input['type'] ?? 'Standard';
        $status = $input['status'] ?? 'IN_PROGRESS';

        // Données Automobile
        $vehicleMake = $input['vehicleMake'] ?? null;
        $vehicleModel = $input['vehicleModel'] ?? null;
        $vehicleVersion = $input['vehicleVersion'] ?? null;
        $vehicleYear = isset($input['vehicleYear']) && $input['vehicleYear'] !== '' ? (int)$input['vehicleYear'] : null;
        $vehicleVin = $input['vehicleVin'] ?? null;
        $vehiclePlate = $input['vehiclePlate'] ?? null;
        $vehicleMileage = isset($input['vehicleMileage']) && $input['vehicleMileage'] !== '' ? (int)$input['vehicleMileage'] : null;
        $vehicleFuel = $input['vehicleFuel'] ?? null;
        $vehicleGearbox = $input['vehicleGearbox'] ?? null;
        $vehicleOriginCountry = $input['vehicleOriginCountry'] ?? null;
        $vehicleAdLink = $input['vehicleAdLink'] ?? null;
        $vehiclePurchasePrice = isset($input['vehiclePurchasePrice']) && $input['vehiclePurchasePrice'] !== '' ? (float)$input['vehiclePurchasePrice'] : null;
        $vehicleNotes = $input['vehicleNotes'] ?? null;

        // Données Réseau
        $networkWorkstationsCount = isset($input['networkWorkstationsCount']) && $input['networkWorkstationsCount'] !== '' ? (int)$input['networkWorkstationsCount'] : null;
        $networkUsersCount = isset($input['networkUsersCount']) && $input['networkUsersCount'] !== '' ? (int)$input['networkUsersCount'] : null;
        $networkSitesCount = isset($input['networkSitesCount']) && $input['networkSitesCount'] !== '' ? (int)$input['networkSitesCount'] : null;
        $networkServers = $input['networkServers'] ?? null;
        $networkFirewall = $input['networkFirewall'] ?? null;
        $networkSwitches = $input['networkSwitches'] ?? null;
        $networkWifi = $input['networkWifi'] ?? null;
        $networkVpn = $input['networkVpn'] ?? null;
        $networkVlan = $input['networkVlan'] ?? null;
        $networkBackup = $input['networkBackup'] ?? null;
        $networkPlanLevel = $input['networkPlanLevel'] ?? null;
        $networkNotes = $input['networkNotes'] ?? null;
        $notes = $input['notes'] ?? null;

        $insertSql = 'INSERT INTO project (
            id, workspaceId, clientId, projectNumber, title, type, status,
            vehicleMake, vehicleModel, vehicleVersion, vehicleYear, vehicleVin, vehiclePlate,
            vehicleMileage, vehicleFuel, vehicleGearbox, vehicleOriginCountry, vehicleAdLink,
            vehiclePurchasePrice, vehicleNotes,
            networkWorkstationsCount, networkUsersCount, networkSitesCount, networkServers,
            networkFirewall, networkSwitches, networkWifi, networkVpn, networkVlan, networkBackup,
            networkPlanLevel, networkNotes, notes, createdAt, updatedAt
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, NOW(3), NOW(3)
        )';

        $insertStmt = $pdo->prepare($insertSql);
        $insertStmt->execute([
            $projectId, $validWs, $clientId, $projectNumber, $title, $type, $status,
            $vehicleMake, $vehicleModel, $vehicleVersion, $vehicleYear, $vehicleVin, $vehiclePlate,
            $vehicleMileage, $vehicleFuel, $vehicleGearbox, $vehicleOriginCountry, $vehicleAdLink,
            $vehiclePurchasePrice, $vehicleNotes,
            $networkWorkstationsCount, $networkUsersCount, $networkSitesCount, $networkServers,
            $networkFirewall, $networkSwitches, $networkWifi, $networkVpn, $networkVlan, $networkBackup,
            $networkPlanLevel, $networkNotes, $notes
        ]);

        // Audit log
        Audit::log(
            $validWs,
            Audit::CREATED,
            'Project',
            $projectId,
            "{$projectNumber} - {$title}",
            null,
            ['projectNumber' => $projectNumber, 'title' => $title]
        );

        // Fetch created project
        $stmtGet = $pdo->prepare('SELECT * FROM project WHERE id = ?');
        $stmtGet->execute([$projectId]);
        $project = $stmtGet->fetch();

        echo json_encode(['success' => true, 'project' => $project]);
    }

    /**
     * PUT /api/projects
     */
    public static function update(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = $input['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID du projet requis']);
            return;
        }

        $g = ApiGuard::guardEntity('project', $id, 'write');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $stmtGet = $pdo->prepare('SELECT * FROM project WHERE id = ?');
        $stmtGet->execute([$id]);
        $existing = $stmtGet->fetch();
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Projet introuvable']);
            return;
        }

        $updates = [];
        $params = [];

        $fields = [
            'title', 'status', 'notes',
            'vehicleMake', 'vehicleModel', 'vehicleVersion', 'vehicleYear', 'vehicleVin',
            'vehiclePlate', 'vehicleMileage', 'vehicleFuel', 'vehicleGearbox', 'vehicleOriginCountry',
            'vehicleAdLink', 'vehiclePurchasePrice', 'vehicleNotes',
            'networkWorkstationsCount', 'networkUsersCount', 'networkSitesCount', 'networkServers',
            'networkFirewall', 'networkSwitches', 'networkWifi', 'networkVpn', 'networkVlan',
            'networkBackup', 'networkPlanLevel', 'networkNotes'
        ];

        foreach ($fields as $f) {
            if (array_key_exists($f, $input)) {
                $updates[] = "{$f} = ?";
                $params[] = $input[$f] === '' ? null : $input[$f];
            }
        }

        if (!empty($updates)) {
            $updates[] = 'updatedAt = NOW(3)';
            $params[] = $id;
            $sql = 'UPDATE project SET ' . implode(', ', $updates) . ' WHERE id = ?';
            $stmtUp = $pdo->prepare($sql);
            $stmtUp->execute($params);
        }

        // Fetch updated
        $stmtGet->execute([$id]);
        $updated = $stmtGet->fetch();

        Audit::log(
            $existing['workspaceId'],
            Audit::UPDATED,
            'Project',
            $id,
            "{$existing['projectNumber']} - {$existing['title']}",
            ['title' => $existing['title'], 'status' => $existing['status']],
            ['title' => $updated['title'], 'status' => $updated['status']]
        );

        echo json_encode(['success' => true, 'project' => $updated]);
    }

    /**
     * DELETE /api/projects?id=...
     */
    public static function delete(): void
    {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requis']);
            return;
        }

        $g = ApiGuard::guardEntity('project', $id, 'delete');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $stmtPrj = $pdo->prepare('SELECT * FROM project WHERE id = ?');
        $stmtPrj->execute([$id]);
        $project = $stmtPrj->fetch();
        if (!$project) {
            http_response_code(404);
            echo json_encode(['error' => 'Projet introuvable']);
            return;
        }

        // Vérifier si des documents sont liés
        $stmtDocs = $pdo->prepare('SELECT COUNT(*) FROM documentrecord WHERE projectId = ?');
        $stmtDocs->execute([$id]);
        $docCount = (int)$stmtDocs->fetchColumn();

        if ($docCount > 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Impossible de supprimer ce projet car des documents ou factures lui sont rattachés.']);
            return;
        }

        $stmtDel = $pdo->prepare('DELETE FROM project WHERE id = ?');
        $stmtDel->execute([$id]);

        Audit::log(
            $project['workspaceId'],
            Audit::DELETED,
            'Project',
            $id,
            "{$project['projectNumber']} - {$project['title']}"
        );

        echo json_encode(['success' => true, 'message' => 'Projet supprimé']);
    }
}
