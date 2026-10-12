<?php
declare(strict_types=1);

namespace JdServices\Controllers;

use JdServices\Database;
use JdServices\Audit;
use JdServices\SignatureProvider;
use PDO;

class PublicSignatureController
{
    /**
     * GET /api/public/signature/{token}
     */
    public static function get(string $token): void
    {
        $pdo = Database::getConnection();

        $stmtSig = $pdo->prepare('SELECT * FROM signaturerequest WHERE token = ?');
        $stmtSig->execute([$token]);
        $sigReq = $stmtSig->fetch();

        if (!$sigReq) {
            http_response_code(404);
            echo json_encode(['error' => 'Lien de signature invalide ou introuvable']);
            return;
        }

        if (strtotime($sigReq['expiresAt']) < time()) {
            http_response_code(410);
            echo json_encode(['error' => 'Ce lien de signature a expiré.']);
            return;
        }

        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Navigateur Client';

        // Enregistrer la consultation si première fois
        if (empty($sigReq['viewedAt'])) {
            $newStatus = $sigReq['status'] === 'PENDING' ? 'VIEWED' : $sigReq['status'];
            $stmtUp = $pdo->prepare('UPDATE signaturerequest SET viewedAt = NOW(3), status = ? WHERE id = ?');
            $stmtUp->execute([$newStatus, $sigReq['id']]);

            $evtId = Database::generateCuid();
            $stmtEvt = $pdo->prepare('INSERT INTO signatureevent (id, signatureRequestId, eventType, ipAddress, userAgent, payloadJson, createdAt) VALUES (?, ?, "VIEWED", ?, ?, ?, NOW(3))');
            $stmtEvt->execute([$evtId, $sigReq['id'], $ip, $userAgent, json_encode(['action' => 'Document consulté par le signataire'])]);

            // Récupérer le numéro du document pour l'audit
            $stmtDocNum = $pdo->prepare('SELECT documentNumber FROM documentrecord WHERE id = ?');
            $stmtDocNum->execute([$sigReq['documentId']]);
            $docNum = $stmtDocNum->fetchColumn() ?: '';

            Audit::log(
                $sigReq['workspaceId'],
                Audit::VIEWED,
                'Document',
                $sigReq['documentId'],
                $docNum,
                null,
                ['action' => 'Ouverture du document par le client pour signature'],
                null,
                $sigReq['signerEmail'],
                'CLIENT_SIGNATAIRE',
                $ip,
                $userAgent
            );

            $sigReq['viewedAt'] = date('Y-m-d H:i:s');
            $sigReq['status'] = $newStatus;
        }

        // Récupérer document complet
        $stmtDoc = $pdo->prepare('SELECT * FROM documentrecord WHERE id = ?');
        $stmtDoc->execute([$sigReq['documentId']]);
        $document = $stmtDoc->fetch();

        if ($document) {
            // Workspace
            $stmtWs = $pdo->prepare('SELECT * FROM workspace WHERE id = ?');
            $stmtWs->execute([$document['workspaceId']]);
            $document['workspace'] = $stmtWs->fetch();

            // Client
            $stmtCli = $pdo->prepare('SELECT * FROM client WHERE id = ?');
            $stmtCli->execute([$document['clientId']]);
            $document['client'] = $stmtCli->fetch();

            // Lines
            $stmtLines = $pdo->prepare('SELECT * FROM documentline WHERE documentId = ? ORDER BY sortOrder ASC');
            $stmtLines->execute([$document['id']]);
            $document['lines'] = $stmtLines->fetchAll();
        }

        echo json_encode([
            'signatureRequest' => [
                'id' => $sigReq['id'],
                'token' => $sigReq['token'],
                'status' => $sigReq['status'],
                'signerName' => $sigReq['signerName'],
                'signerEmail' => $sigReq['signerEmail'],
                'expiresAt' => $sigReq['expiresAt'],
                'signedAt' => $sigReq['signedAt'],
                'evidence' => !empty($sigReq['evidenceJson']) ? json_decode($sigReq['evidenceJson'], true) : null,
            ],
            'document' => $document,
        ]);
    }

    /**
     * POST /api/public/signature/{token}
     */
    public static function post(string $token): void
    {
        $pdo = Database::getConnection();

        $stmtSig = $pdo->prepare('SELECT * FROM signaturerequest WHERE id = ? OR token = ?');
        $stmtSig->execute([$token, $token]);
        $sigReq = $stmtSig->fetch();

        if (!$sigReq) {
            http_response_code(404);
            echo json_encode(['error' => 'Lien invalide']);
            return;
        }

        if ($sigReq['status'] === 'SIGNED') {
            http_response_code(400);
            echo json_encode(['error' => 'Ce document a déjà été signé avec succès.']);
            return;
        }

        if (strtotime($sigReq['expiresAt']) < time()) {
            http_response_code(410);
            echo json_encode(['error' => 'Ce lien de signature a expiré.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $action = $input['action'] ?? '';
        $signerName = trim((string)($input['signerName'] ?? '')) ?: $sigReq['signerName'];
        $comment = trim((string)($input['comment'] ?? ''));
        $rejectionReason = trim((string)($input['rejectionReason'] ?? 'Refusé par le client'));

        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Navigateur Client';

        $stmtDoc = $pdo->prepare('SELECT * FROM documentrecord WHERE id = ?');
        $stmtDoc->execute([$sigReq['documentId']]);
        $document = $stmtDoc->fetch();

        if ($action === 'ACCEPT_AND_SIGN') {
            $verification = SignatureProvider::verifySignature($token, [
                'ipAddress' => $ip,
                'userAgent' => $userAgent,
                'signerName' => $signerName,
            ]);

            $evidenceJson = json_encode($verification['evidence']);
            $docHash = $verification['evidence']['documentHash'];

            $stmtUpSig = $pdo->prepare('UPDATE signaturerequest SET
                status = "SIGNED",
                signedAt = NOW(3),
                signerName = ?,
                ipAddress = ?,
                userAgent = ?,
                signedPdfHash = ?,
                evidenceJson = ?
                WHERE id = ?');
            $stmtUpSig->execute([$signerName, $ip, $userAgent, $docHash, $evidenceJson, $sigReq['id']]);

            // Event
            $evtId = Database::generateCuid();
            $stmtEvt = $pdo->prepare('INSERT INTO signatureevent (id, signatureRequestId, eventType, ipAddress, userAgent, payloadJson, createdAt) VALUES (?, ?, "SIGNED", ?, ?, ?, NOW(3))');
            $stmtEvt->execute([$evtId, $sigReq['id'], $ip, $userAgent, $evidenceJson]);

            // Mettre à jour document
            $stmtUpDoc = $pdo->prepare('UPDATE documentrecord SET status = "ACCEPTED", updatedAt = NOW(3) WHERE id = ?');
            $stmtUpDoc->execute([$sigReq['documentId']]);

            Audit::log(
                $sigReq['workspaceId'],
                Audit::SIGNED,
                'Document',
                $sigReq['documentId'],
                $document['documentNumber'] ?? '',
                null,
                ['action' => 'Signature électronique validée et horodatée', 'evidence' => $verification['evidence']],
                null,
                $sigReq['signerEmail'],
                'CLIENT_SIGNATAIRE',
                $ip,
                $userAgent
            );

            echo json_encode([
                'success' => true,
                'message' => 'Document signé avec succès !',
                'evidence' => $verification['evidence'],
            ]);
            return;
        }

        if ($action === 'REJECT') {
            $stmtUpSig = $pdo->prepare('UPDATE signaturerequest SET
                status = "REJECTED",
                rejectedAt = NOW(3),
                rejectionReason = ?
                WHERE id = ?');
            $stmtUpSig->execute([$rejectionReason, $sigReq['id']]);

            $evtId = Database::generateCuid();
            $stmtEvt = $pdo->prepare('INSERT INTO signatureevent (id, signatureRequestId, eventType, ipAddress, userAgent, payloadJson, createdAt) VALUES (?, ?, "REJECTED", ?, ?, ?, NOW(3))');
            $stmtEvt->execute([$evtId, $sigReq['id'], $ip, $userAgent, json_encode(['reason' => $rejectionReason])]);

            $stmtUpDoc = $pdo->prepare('UPDATE documentrecord SET status = "REJECTED", updatedAt = NOW(3) WHERE id = ?');
            $stmtUpDoc->execute([$sigReq['documentId']]);

            Audit::log(
                $sigReq['workspaceId'],
                Audit::REJECTED,
                'Document',
                $sigReq['documentId'],
                $document['documentNumber'] ?? '',
                null,
                ['action' => 'Document refusé', 'reason' => $rejectionReason],
                null,
                $sigReq['signerEmail'],
                'CLIENT_SIGNATAIRE',
                $ip,
                $userAgent
            );

            echo json_encode(['success' => true, 'message' => 'Le document a été refusé.']);
            return;
        }

        if ($action === 'REQUEST_MODIFICATION') {
            $evtId = Database::generateCuid();
            $stmtEvt = $pdo->prepare('INSERT INTO signatureevent (id, signatureRequestId, eventType, ipAddress, userAgent, payloadJson, createdAt) VALUES (?, ?, "MODIFICATION_REQUESTED", ?, ?, ?, NOW(3))');
            $stmtEvt->execute([$evtId, $sigReq['id'], $ip, $userAgent, json_encode(['comment' => $comment])]);

            echo json_encode([
                'success' => true,
                'message' => 'Votre demande de modification a été transmise à l\'équipe JD-Services.',
            ]);
            return;
        }

        http_response_code(400);
        echo json_encode(['error' => 'Action non reconnue']);
    }
}
