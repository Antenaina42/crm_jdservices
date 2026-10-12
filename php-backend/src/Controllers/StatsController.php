<?php
declare(strict_types=1);

namespace JdServices\Controllers;

use JdServices\Database;
use JdServices\ApiGuard;
use PDO;

class StatsController
{
    /**
     * GET /api/dashboard/stats?workspaceId=...
     */
    public static function get(): void
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

        // 1. Clients & Prospects
        $stmtClient = $pdo->prepare('SELECT COUNT(*) FROM client WHERE workspaceId = ? AND status = "ACTIVE"');
        $stmtClient->execute([$validWs]);
        $clientsCount = (int)$stmtClient->fetchColumn();

        $stmtProspect = $pdo->prepare('SELECT COUNT(*) FROM client WHERE workspaceId = ? AND status = "PROSPECT"');
        $stmtProspect->execute([$validWs]);
        $prospectsCount = (int)$stmtProspect->fetchColumn();

        $stmtPrj = $pdo->prepare('SELECT COUNT(*) FROM project WHERE workspaceId = ? AND status = "IN_PROGRESS"');
        $stmtPrj->execute([$validWs]);
        $activeProjectsCount = (int)$stmtPrj->fetchColumn();

        // 2. Proformas
        $stmtProfDraft = $pdo->prepare('SELECT COUNT(*) FROM documentrecord WHERE workspaceId = ? AND documentType = "PROFORMA" AND status = "DRAFT"');
        $stmtProfDraft->execute([$validWs]);
        $proformasDraft = (int)$stmtProfDraft->fetchColumn();

        $stmtProfSent = $pdo->prepare('SELECT COUNT(*) FROM documentrecord WHERE workspaceId = ? AND documentType = "PROFORMA" AND status = "SENT"');
        $stmtProfSent->execute([$validWs]);
        $proformasSent = (int)$stmtProfSent->fetchColumn();

        $stmtProfAcc = $pdo->prepare('SELECT COUNT(*) FROM documentrecord WHERE workspaceId = ? AND documentType = "PROFORMA" AND status = "ACCEPTED"');
        $stmtProfAcc->execute([$validWs]);
        $proformasAccepted = (int)$stmtProfAcc->fetchColumn();

        // 3. Factures
        $stmtInvIssued = $pdo->prepare('SELECT COUNT(*) FROM documentrecord WHERE workspaceId = ? AND documentType = "INVOICE" AND status IN ("ISSUED", "SENT", "PARTIALLY_PAID")');
        $stmtInvIssued->execute([$validWs]);
        $invoicesIssued = (int)$stmtInvIssued->fetchColumn();

        $stmtInvPaid = $pdo->prepare('SELECT COUNT(*) FROM documentrecord WHERE workspaceId = ? AND documentType = "INVOICE" AND status = "PAID"');
        $stmtInvPaid->execute([$validWs]);
        $invoicesPaid = (int)$stmtInvPaid->fetchColumn();

        $stmtInvOverdue = $pdo->prepare('SELECT COUNT(*) FROM documentrecord WHERE workspaceId = ? AND documentType = "INVOICE" AND dueDate < NOW() AND status NOT IN ("PAID", "CANCELLED", "CREDITED")');
        $stmtInvOverdue->execute([$validWs]);
        $invoicesOverdue = (int)$stmtInvOverdue->fetchColumn();

        // 4. Signatures
        $stmtSig = $pdo->prepare('SELECT COUNT(*) FROM signaturerequest WHERE workspaceId = ? AND status = "PENDING"');
        $stmtSig->execute([$validWs]);
        $signaturesPending = (int)$stmtSig->fetchColumn();

        // 5. CA et Totaux Financiers
        $stmtFin = $pdo->prepare('SELECT 
            COALESCE(SUM(totalHt), 0) AS caHt,
            COALESCE(SUM(totalTax), 0) AS caTax,
            COALESCE(SUM(totalTtc), 0) AS caTtc,
            COALESCE(SUM(totalPaid), 0) AS caCollected,
            COALESCE(SUM(balanceDue), 0) AS caPending
            FROM documentrecord
            WHERE workspaceId = ? AND documentType = "INVOICE" AND status NOT IN ("CANCELLED", "DRAFT")');
        $stmtFin->execute([$validWs]);
        $fin = $stmtFin->fetch();

        // 6. Activités Récentes (Audit & Documents)
        $stmtLogs = $pdo->prepare('SELECT * FROM auditlog WHERE workspaceId = ? ORDER BY timestamp DESC LIMIT 10');
        $stmtLogs->execute([$validWs]);
        $recentLogs = $stmtLogs->fetchAll();

        $stmtRecentDocs = $pdo->prepare('SELECT d.*, c.firstName, c.lastName, c.companyName
            FROM documentrecord d
            JOIN client c ON d.clientId = c.id
            WHERE d.workspaceId = ?
            ORDER BY d.createdAt DESC LIMIT 5');
        $stmtRecentDocs->execute([$validWs]);
        $recentDocsRows = $stmtRecentDocs->fetchAll();

        $recentDocuments = array_map(function ($row) {
            $client = [
                'firstName' => $row['firstName'],
                'lastName' => $row['lastName'],
                'companyName' => $row['companyName'],
            ];
            unset($row['firstName'], $row['lastName'], $row['companyName']);
            $row['client'] = $client;
            return $row;
        }, $recentDocsRows);

        echo json_encode([
            'kpis' => [
                'clientsCount' => $clientsCount,
                'prospectsCount' => $prospectsCount,
                'activeProjectsCount' => $activeProjectsCount,
                'proformasDraft' => $proformasDraft,
                'proformasSent' => $proformasSent,
                'proformasAccepted' => $proformasAccepted,
                'invoicesIssued' => $invoicesIssued,
                'invoicesPaid' => $invoicesPaid,
                'invoicesOverdue' => $invoicesOverdue,
                'signaturesPending' => $signaturesPending,
            ],
            'financial' => [
                'caHt' => round((float)$fin['caHt'], 2),
                'caTax' => round((float)$fin['caTax'], 2),
                'caTtc' => round((float)$fin['caTtc'], 2),
                'caCollected' => round((float)$fin['caCollected'], 2),
                'caPending' => round((float)$fin['caPending'], 2),
            ],
            'recentLogs' => $recentLogs,
            'recentDocuments' => $recentDocuments,
        ]);
    }
}
