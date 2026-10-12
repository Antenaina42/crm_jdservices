<?php
declare(strict_types=1);

namespace JdServices\Controllers;

use JdServices\Database;
use JdServices\ApiGuard;
use JdServices\Audit;
use PDO;
use Exception;

class PaymentsController
{
    public static function list(): void
    {
        $workspaceId = $_GET['workspaceId'] ?? null;
        $g = ApiGuard::guardWorkspace($workspaceId, 'read');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $validWs = $g['access']['workspaceId'];

        $stmt = $pdo->prepare('
            SELECT p.*,
                   c.firstName, c.lastName, c.companyName, c.isCompany,
                   d.documentNumber, d.totalTtc, d.status as documentStatus, d.documentType
            FROM payment p
            LEFT JOIN client c ON c.id = p.clientId
            LEFT JOIN documentrecord d ON d.id = p.documentId
            WHERE p.workspaceId = ?
            ORDER BY p.paymentDate DESC
        ');
        $stmt->execute([$validWs]);
        $rows = $stmt->fetchAll();

        $payments = array_map(function ($r) {
            return [
                'id' => $r['id'],
                'workspaceId' => $r['workspaceId'],
                'documentId' => $r['documentId'],
                'clientId' => $r['clientId'],
                'amount' => (float)$r['amount'],
                'paymentDate' => $r['paymentDate'],
                'paymentMethod' => $r['paymentMethod'],
                'reference' => $r['reference'],
                'notes' => $r['notes'],
                'receivedById' => $r['receivedById'],
                'createdAt' => $r['createdAt'],
                'client' => [
                    'firstName' => $r['firstName'],
                    'lastName' => $r['lastName'],
                    'companyName' => $r['companyName'],
                    'isCompany' => (bool)$r['isCompany'],
                ],
                'document' => [
                    'documentNumber' => $r['documentNumber'],
                    'totalTtc' => (float)$r['totalTtc'],
                    'status' => $r['documentStatus'],
                    'documentType' => $r['documentType'],
                ],
            ];
        }, $rows);

        echo json_encode(['payments' => $payments]);
    }

    public static function create(array $body): void
    {
        $documentId = $body['documentId'] ?? null;
        $amount = (float)($body['amount'] ?? 0);

        if (!$documentId || $amount <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Document et montant supérieur à 0 obligatoires']);
            return;
        }

        $pdo = Database::getConnection();
        $stmtDoc = $pdo->prepare('SELECT * FROM documentrecord WHERE id = ?');
        $stmtDoc->execute([$documentId]);
        $doc = $stmtDoc->fetch();

        if (!$doc) {
            http_response_code(404);
            echo json_encode(['error' => 'Document introuvable']);
            return;
        }

        // Garde avec action 'pay' sur le workspace du document
        $g = ApiGuard::guardWorkspace($doc['workspaceId'], 'pay', true);
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $validWs = $doc['workspaceId'];
        $session = $g['access']['session'];
        $role = $g['access']['role'];

        $payAmount = round($amount, 2);
        $newTotalPaid = round((float)$doc['totalPaid'] + $payAmount, 2);
        $newBalanceDue = round((float)$doc['totalTtc'] - $newTotalPaid, 2);

        $newStatus = $doc['status'];
        if ($newBalanceDue <= 0) {
            $newStatus = 'PAID';
        } elseif ($newTotalPaid > 0) {
            $newStatus = 'PARTIALLY_PAID';
        }

        $pdo->beginTransaction();
        try {
            $paymentId = Database::generateId('pay_');
            $paymentDate = !empty($body['paymentDate']) ? date('Y-m-d H:i:s', strtotime($body['paymentDate'])) : date('Y-m-d H:i:s');
            $method = $body['paymentMethod'] ?? 'TRANSFER';

            $stmtPay = $pdo->prepare('
                INSERT INTO payment (
                    id, workspaceId, documentId, clientId, amount,
                    paymentDate, paymentMethod, reference, notes, receivedById, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))
            ');
            $stmtPay->execute([
                $paymentId,
                $validWs,
                $documentId,
                $doc['clientId'],
                $payAmount,
                $paymentDate,
                $method,
                $body['reference'] ?? null,
                $body['notes'] ?? null,
                $session['id'],
            ]);

            $stmtUpDoc = $pdo->prepare('
                UPDATE documentrecord SET
                    totalPaid = ?,
                    balanceDue = ?,
                    status = ?,
                    updatedAt = NOW(3)
                WHERE id = ?
            ');
            $stmtUpDoc->execute([
                $newTotalPaid,
                max(0, $newBalanceDue),
                $newStatus,
                $documentId,
            ]);

            $pdo->commit();

            Audit::log([
                'workspaceId' => $validWs,
                'userId' => $session['id'],
                'userEmail' => $session['email'],
                'userRole' => $role,
                'action' => ($newStatus === 'PAID') ? 'PAID' : 'PARTIALLY_PAID',
                'entityType' => 'Document',
                'entityId' => $doc['id'],
                'entityReference' => $doc['documentNumber'],
                'newValue' => [
                    'amountPaid' => $payAmount,
                    'totalPaid' => $newTotalPaid,
                    'remainingBalance' => $newBalanceDue,
                    'status' => $newStatus,
                ],
            ]);

            echo json_encode([
                'success' => true,
                'payment' => [
                    'id' => $paymentId,
                    'amount' => $payAmount,
                    'paymentDate' => $paymentDate,
                    'paymentMethod' => $method,
                ],
                'updatedDoc' => [
                    'id' => $documentId,
                    'totalPaid' => $newTotalPaid,
                    'balanceDue' => max(0, $newBalanceDue),
                    'status' => $newStatus,
                ],
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}
