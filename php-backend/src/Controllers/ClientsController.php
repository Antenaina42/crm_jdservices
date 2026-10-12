<?php
declare(strict_types=1);

namespace JdServices\Controllers;

use JdServices\Database;
use JdServices\ApiGuard;
use JdServices\Audit;
use PDO;

class ClientsController
{
    public static function list(): void
    {
        $workspaceId = $_GET['workspaceId'] ?? null;
        $query = trim((string)($_GET['q'] ?? ''));
        $status = $_GET['status'] ?? null;

        $g = ApiGuard::guardWorkspace($workspaceId, 'read');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $validWs = $g['access']['workspaceId'];

        $sql = 'SELECT * FROM client WHERE workspaceId = ?';
        $params = [$validWs];

        if ($status) {
            $sql .= ' AND status = ?';
            $params[] = $status;
        }

        if (!empty($query)) {
            $sql .= ' AND (firstName LIKE ? OR lastName LIKE ? OR companyName LIKE ? OR email LIKE ? OR phone LIKE ? OR clientNumber LIKE ? OR siren LIKE ?)';
            $like = "%{$query}%";
            array_push($params, $like, $like, $like, $like, $like, $like, $like);
        }

        $sql .= ' ORDER BY createdAt DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $clients = $stmt->fetchAll();

        // Récupérer les projets, documents et paiements associés pour chaque client
        foreach ($clients as &$c) {
            $c['isCompany'] = (bool)$c['isCompany'];

            // Projets
            $stmtPrj = $pdo->prepare('SELECT id, title, status, vehicleMake, vehicleModel FROM project WHERE clientId = ?');
            $stmtPrj->execute([$c['id']]);
            $c['projects'] = $stmtPrj->fetchAll();

            // Documents
            $stmtDocs = $pdo->prepare('SELECT id, documentNumber, documentType, totalTtc, status FROM documentrecord WHERE clientId = ?');
            $stmtDocs->execute([$c['id']]);
            $c['documents'] = $stmtDocs->fetchAll();

            // Paiements
            $stmtPay = $pdo->prepare('SELECT amount FROM payment WHERE clientId = ?');
            $stmtPay->execute([$c['id']]);
            $c['payments'] = $stmtPay->fetchAll();
        }
        unset($c);

        echo json_encode(['clients' => $clients]);
    }

    public static function create(array $body): void
    {
        $workspaceId = $body['workspaceId'] ?? null;
        $g = ApiGuard::guardWorkspace($workspaceId, 'write');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $validWs = $g['access']['workspaceId'];
        $session = $g['access']['session'];
        $role = $g['access']['role'];

        $lastName = trim((string)($body['lastName'] ?? ''));
        $email = trim(strtolower((string)($body['email'] ?? '')));
        $phone = trim((string)($body['phone'] ?? ''));
        $address = trim((string)($body['address'] ?? ''));
        $postalCode = trim((string)($body['postalCode'] ?? ''));
        $city = trim((string)($body['city'] ?? ''));

        if (empty($lastName) || empty($email) || empty($phone) || empty($address) || empty($postalCode) || empty($city)) {
            http_response_code(400);
            echo json_encode(['error' => 'Veuillez renseigner tous les champs obligatoires (Nom, Email, Téléphone, Adresse, CP, Ville)']);
            return;
        }

        $pdo = Database::getConnection();

        // Récupérer le slug du workspace pour le préfixe
        $stmtWs = $pdo->prepare('SELECT slug FROM workspace WHERE id = ?');
        $stmtWs->execute([$validWs]);
        $ws = $stmtWs->fetch();

        $prefix = ($ws && $ws['slug'] === 'automobile') ? 'CLI-AUTO' : 'CLI-NET';

        $stmtCount = $pdo->prepare('SELECT COUNT(*) FROM client WHERE workspaceId = ?');
        $stmtCount->execute([$validWs]);
        $count = (int)$stmtCount->fetchColumn();

        $year = date('Y');
        $clientNumber = sprintf('%s-%s-%04d', $prefix, $year, $count + 1);

        $id = Database::generateId('cli_');
        $isCompany = !empty($body['isCompany']) ? 1 : 0;

        $stmtInsert = $pdo->prepare('
            INSERT INTO client (
                id, workspaceId, clientNumber, isCompany, companyName,
                firstName, lastName, email, phone, address,
                postalCode, city, country, deliveryAddress, deliveryPostalCode,
                deliveryCity, deliveryCountry, siren, siret, vatNumber,
                notes, status, createdAt, updatedAt
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, NOW(3), NOW(3)
            )
        ');

        $stmtInsert->execute([
            $id,
            $validWs,
            $clientNumber,
            $isCompany,
            $body['companyName'] ?? null,
            trim((string)($body['firstName'] ?? '')),
            $lastName,
            $email,
            $phone,
            $address,
            $postalCode,
            $city,
            trim((string)($body['country'] ?? 'France')),
            $body['deliveryAddress'] ?? null,
            $body['deliveryPostalCode'] ?? null,
            $body['deliveryCity'] ?? null,
            $body['deliveryCountry'] ?? null,
            $body['siren'] ?? null,
            $body['siret'] ?? null,
            $body['vatNumber'] ?? null,
            $body['notes'] ?? null,
            'ACTIVE',
        ]);

        Audit::log([
            'workspaceId' => $validWs,
            'userId' => $session['id'],
            'userEmail' => $session['email'],
            'userRole' => $role,
            'action' => 'CREATED',
            'entityType' => 'Client',
            'entityId' => $id,
            'entityReference' => "{$clientNumber} - {$lastName}",
            'newValue' => ['clientNumber' => $clientNumber, 'email' => $email],
        ]);

        $stmtGet = $pdo->prepare('SELECT * FROM client WHERE id = ?');
        $stmtGet->execute([$id]);
        $client = $stmtGet->fetch();
        $client['isCompany'] = (bool)$client['isCompany'];

        echo json_encode(['success' => true, 'client' => $client]);
    }

    public static function get(string $id): void
    {
        $g = ApiGuard::guardEntity('client', $id, 'read');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM client WHERE id = ?');
        $stmt->execute([$id]);
        $client = $stmt->fetch();

        if (!$client) {
            http_response_code(404);
            echo json_encode(['error' => 'Client introuvable']);
            return;
        }

        $client['isCompany'] = (bool)$client['isCompany'];

        // Projets
        $stmtPrj = $pdo->prepare('SELECT * FROM project WHERE clientId = ? ORDER BY createdAt DESC');
        $stmtPrj->execute([$id]);
        $client['projects'] = $stmtPrj->fetchAll();

        // Documents complets
        $stmtDocs = $pdo->prepare('SELECT * FROM documentrecord WHERE clientId = ? ORDER BY createdAt DESC');
        $stmtDocs->execute([$id]);
        $documents = $stmtDocs->fetchAll();

        foreach ($documents as &$doc) {
            $doc['isImmutable'] = (bool)$doc['isImmutable'];

            $stmtLines = $pdo->prepare('SELECT * FROM documentline WHERE documentId = ? ORDER BY sortOrder ASC');
            $stmtLines->execute([$doc['id']]);
            $doc['lines'] = $stmtLines->fetchAll();

            $stmtPay = $pdo->prepare('SELECT * FROM payment WHERE documentId = ? ORDER BY paymentDate DESC');
            $stmtPay->execute([$doc['id']]);
            $doc['payments'] = $stmtPay->fetchAll();

            $stmtSig = $pdo->prepare('SELECT * FROM signaturerequest WHERE documentId = ? ORDER BY createdAt DESC');
            $stmtSig->execute([$doc['id']]);
            $doc['signatureRequests'] = $stmtSig->fetchAll();
        }
        unset($doc);

        $client['documents'] = $documents;

        // Paiements globaux
        $stmtPayments = $pdo->prepare('SELECT * FROM payment WHERE clientId = ? ORDER BY paymentDate DESC');
        $stmtPayments->execute([$id]);
        $client['payments'] = $stmtPayments->fetchAll();

        // Demandes anonymisation
        $stmtAnon = $pdo->prepare('SELECT * FROM anonymizationrequest WHERE clientId = ?');
        $stmtAnon->execute([$id]);
        $client['anonymizationRequests'] = $stmtAnon->fetchAll();

        echo json_encode(['client' => $client]);
    }

    public static function update(string $id, array $body): void
    {
        $g = ApiGuard::guardEntity('client', $id, 'write');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM client WHERE id = ?');
        $stmt->execute([$id]);
        $client = $stmt->fetch();

        if (!$client) {
            http_response_code(404);
            echo json_encode(['error' => 'Client introuvable']);
            return;
        }

        $fields = [
            'isCompany' => isset($body['isCompany']) ? ($body['isCompany'] ? 1 : 0) : null,
            'companyName' => $body['companyName'] ?? null,
            'firstName' => $body['firstName'] ?? null,
            'lastName' => $body['lastName'] ?? null,
            'email' => isset($body['email']) ? strtolower(trim($body['email'])) : null,
            'phone' => $body['phone'] ?? null,
            'address' => $body['address'] ?? null,
            'postalCode' => $body['postalCode'] ?? null,
            'city' => $body['city'] ?? null,
            'country' => $body['country'] ?? null,
            'deliveryAddress' => $body['deliveryAddress'] ?? null,
            'deliveryPostalCode' => $body['deliveryPostalCode'] ?? null,
            'deliveryCity' => $body['deliveryCity'] ?? null,
            'deliveryCountry' => $body['deliveryCountry'] ?? null,
            'siren' => $body['siren'] ?? null,
            'siret' => $body['siret'] ?? null,
            'vatNumber' => $body['vatNumber'] ?? null,
            'status' => $body['status'] ?? null,
            'notes' => $body['notes'] ?? null,
        ];

        $updates = [];
        $params = [];
        foreach ($fields as $col => $val) {
            if ($val !== null) {
                $updates[] = "`$col` = ?";
                $params[] = $val;
            }
        }

        if (empty($updates)) {
            echo json_encode(['success' => true, 'client' => $client]);
            return;
        }

        $updates[] = '`updatedAt` = NOW(3)';
        $params[] = $id;

        $sqlUpdate = 'UPDATE client SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $stmtUp = $pdo->prepare($sqlUpdate);
        $stmtUp->execute($params);

        Audit::log([
            'workspaceId' => $client['workspaceId'],
            'userId' => $g['access']['session']['id'],
            'userEmail' => $g['access']['session']['email'],
            'userRole' => $g['access']['role'],
            'action' => 'UPDATED',
            'entityType' => 'Client',
            'entityId' => $id,
            'entityReference' => "{$client['clientNumber']} - {$client['lastName']}",
            'oldValue' => ['email' => $client['email'], 'phone' => $client['phone']],
            'newValue' => ['email' => $body['email'] ?? $client['email'], 'phone' => $body['phone'] ?? $client['phone']],
        ]);

        $stmtGet = $pdo->prepare('SELECT * FROM client WHERE id = ?');
        $stmtGet->execute([$id]);
        $updatedClient = $stmtGet->fetch();
        $updatedClient['isCompany'] = (bool)$updatedClient['isCompany'];

        echo json_encode(['success' => true, 'client' => $updatedClient]);
    }

    public static function delete(string $id): void
    {
        $g = ApiGuard::guardEntity('client', $id, 'delete');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM client WHERE id = ?');
        $stmt->execute([$id]);
        $client = $stmt->fetch();

        if (!$client) {
            http_response_code(404);
            echo json_encode(['error' => 'Client introuvable']);
            return;
        }

        // RÈGLE LÉGALE STRICTE : Si des pièces comptables existent, suppression interdite (10 ans conservation légale)
        $stmtDocs = $pdo->prepare('SELECT COUNT(*) FROM documentrecord WHERE clientId = ?');
        $stmtDocs->execute([$id]);
        $docCount = (int)$stmtDocs->fetchColumn();

        if ($docCount > 0) {
            http_response_code(403);
            echo json_encode([
                'error' => "SUPPRESSION LÉGALE IMPOSSIBLE : Ce client est associé à des pièces comptables (factures, proformas). Conformément aux articles L. 123-22 du Code de commerce et L. 102 B du LPF, ces pièces doivent être conservées pendant une durée minimale de 10 ans. Vous pouvez utiliser la fonction 'Demande d'anonymisation RGPD' pour purger les données personnelles non comptables."
            ]);
            return;
        }

        $stmtDel = $pdo->prepare('DELETE FROM client WHERE id = ?');
        $stmtDel->execute([$id]);

        Audit::log([
            'workspaceId' => $client['workspaceId'],
            'userId' => $g['access']['session']['id'],
            'userEmail' => $g['access']['session']['email'],
            'userRole' => $g['access']['role'],
            'action' => 'DELETED',
            'entityType' => 'Client',
            'entityId' => $id,
            'entityReference' => $client['clientNumber'],
        ]);

        echo json_encode(['success' => true, 'message' => 'Client supprimé avec succès.']);
    }

    public static function anonymize(string $id, array $body): void
    {
        $g = ApiGuard::guardEntity('client', $id, 'delete');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        // Réservé aux administrateurs
        if ($g['access']['role'] !== 'SUPER_ADMIN' && $g['access']['role'] !== 'ADMIN') {
            http_response_code(403);
            echo json_encode(['error' => 'Droits insuffisants. Seul un administrateur peut valider une anonymisation RGPD.']);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM client WHERE id = ?');
        $stmt->execute([$id]);
        $client = $stmt->fetch();

        if (!$client) {
            http_response_code(404);
            echo json_encode(['error' => 'Client introuvable']);
            return;
        }

        $reason = $body['reason'] ?? "Demande d'exercice du droit à l'effacement RGPD (Art. 17 RGPD)";
        $isCompany = (bool)$client['isCompany'];
        $companyAnon = $isCompany ? 'Société Anonymisée (RGPD)' : null;

        $stmtAnon = $pdo->prepare('
            UPDATE client SET
                firstName = ?,
                lastName = ?,
                companyName = ?,
                email = ?,
                phone = ?,
                address = ?,
                notes = ?,
                status = ?,
                anonymizedAt = NOW(3),
                anonymizationReason = ?,
                updatedAt = NOW(3)
            WHERE id = ?
        ');

        $stmtAnon->execute([
            'Client',
            'Anonymisé',
            $companyAnon,
            "anonymized_{$id}@rgpd.local",
            '0000000000',
            'Adresse effacée (RGPD)',
            "Données personnelles purgées le " . date('d/m/Y') . ". Motif : {$reason}",
            'ARCHIVED',
            $reason,
            $id,
        ]);

        Audit::log([
            'workspaceId' => $client['workspaceId'],
            'userId' => $g['access']['session']['id'],
            'userEmail' => $g['access']['session']['email'],
            'userRole' => $g['access']['role'],
            'action' => 'ANONYMIZED',
            'entityType' => 'Client',
            'entityId' => $id,
            'entityReference' => $client['clientNumber'],
            'newValue' => [
                'action' => 'Anonymisation RGPD effectuée',
                'reason' => $reason,
                'preservationNotice' => 'Les pièces comptables associées demeurent scellées pour conservation légale décennale.',
            ],
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Données personnelles du client anonymisées conformément au RGPD.',
        ]);
    }
}
