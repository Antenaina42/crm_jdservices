<?php
declare(strict_types=1);

namespace JdServices;

use PDO;
use Exception;

class Audit
{
    public const CREATED = 'CREATED';
    public const UPDATED = 'UPDATED';
    public const DELETED = 'DELETED';
    public const ISSUED = 'ISSUED';
    public const SIGNED = 'SIGNED';
    public const PAID = 'PAID';
    public const VIEWED = 'VIEWED';
    public const REJECTED = 'REJECTED';
    public const CONVERTED = 'CONVERTED';
    public const CANCELLED = 'CANCELLED';
    public const EXPORTED = 'EXPORTED';
    public const ANONYMIZED = 'ANONYMIZED';

    /**
     * Calcule l'empreinte cryptographique SHA-256 canonique d'une facture émise.
     * Reproductible et déterministe, garantit l'intégrité financière.
     */
    public static function computeDocumentHash(array $data): string
    {
        $dateStr = $data['date'] ?? date('Y-m-d');
        if ($dateStr instanceof \DateTimeInterface) {
            $dateStr = $dateStr->format('Y-m-d');
        } else {
            $dateStr = substr((string)$dateStr, 0, 10);
        }

        $linesClean = array_map(function ($l) {
            return [
                'designation' => (string)($l['designation'] ?? ''),
                'quantity' => (float)($l['quantity'] ?? 0),
                'unitPriceHt' => (float)($l['unitPriceHt'] ?? 0),
                'taxRate' => (float)($l['taxRate'] ?? 0),
            ];
        }, $data['lines'] ?? []);

        $canonical = [
            'documentNumber' => (string)($data['documentNumber'] ?? ''),
            'documentType' => (string)($data['documentType'] ?? ''),
            'date' => $dateStr,
            'sellerSiren' => (string)($data['sellerSiren'] ?? ''),
            'clientIdentifier' => (string)($data['clientIdentifier'] ?? ''),
            'totalHt' => round((float)($data['totalHt'] ?? 0), 2),
            'totalTax' => round((float)($data['totalTax'] ?? 0), 2),
            'totalTtc' => round((float)($data['totalTtc'] ?? 0), 2),
            'lines' => $linesClean,
        ];

        $canonicalJson = json_encode($canonical, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        return hash('sha256', (string)$canonicalJson);
    }

    /**
     * Enregistre un événement immuable dans le journal d'audit.
     * Accepte un tableau associatif OU des arguments positionnels.
     */
    public static function log(
        array|string $workspaceOrParams,
        ?string $action = null,
        ?string $entityType = null,
        ?string $entityId = null,
        ?string $entityReference = null,
        mixed $oldValue = null,
        mixed $newValue = null,
        ?string $userId = null,
        ?string $userEmail = null,
        ?string $userRole = null,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): ?string {
        try {
            $pdo = Database::getConnection();
            $id = Database::generateId('aud_');

            $defaultIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $defaultIp = explode(',', $defaultIp)[0];
            $defaultUa = $_SERVER['HTTP_USER_AGENT'] ?? 'JD-Services Internal Engine';

            if (is_array($workspaceOrParams)) {
                $p = $workspaceOrParams;
                $workspaceId = $p['workspaceId'] ?? null;
                $userId = $p['userId'] ?? null;
                $userEmail = $p['userEmail'] ?? 'Système';
                $userRole = $p['userRole'] ?? 'SYSTÈME';
                $action = $p['action'] ?? self::VIEWED;
                $entityType = $p['entityType'] ?? 'System';
                $entityId = $p['entityId'] ?? null;
                $entityReference = $p['entityReference'] ?? null;
                $oldValue = $p['oldValue'] ?? null;
                $newValue = $p['newValue'] ?? null;
                $ipAddress = $p['ipAddress'] ?? $defaultIp;
                $userAgent = $p['userAgent'] ?? $defaultUa;
            } else {
                $workspaceId = $workspaceOrParams;
                // Si session active, déduire l'utilisateur si non fourni
                if (!$userId && class_exists('JdServices\\Auth')) {
                    $session = Auth::getSession();
                    if ($session) {
                        $userId = $session['id'] ?? null;
                        $userEmail = $userEmail ?: ($session['email'] ?? 'Système');
                        $userRole = $userRole ?: ($session['role'] ?? 'SYSTÈME');
                    }
                }
                $userEmail = $userEmail ?: 'Système';
                $userRole = $userRole ?: 'SYSTÈME';
                $ipAddress = $ipAddress ?: $defaultIp;
                $userAgent = $userAgent ?: $defaultUa;
            }

            // Normaliser workspaceId si fourni
            if ($workspaceId) {
                $stmtWsNorm = $pdo->prepare('SELECT id FROM workspace WHERE id = ? OR slug = ? OR (slug = "network" AND ? = "reseau")');
                $stmtWsNorm->execute([$workspaceId, $workspaceId, $workspaceId]);
                $wsRow = $stmtWsNorm->fetch();
                if ($wsRow) {
                    $workspaceId = $wsRow['id'];
                }
            }

            $stmt = $pdo->prepare('
                INSERT INTO auditlog (
                    id, workspaceId, userId, userEmail, userRole, action,
                    entityType, entityId, entityReference,
                    oldValueJson, newValueJson, ipAddress, userAgent, timestamp
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?, NOW(3)
                )
            ');

            $stmt->execute([
                $id,
                $workspaceId,
                $userId,
                $userEmail,
                $userRole,
                $action,
                $entityType,
                $entityId,
                $entityReference,
                $oldValue !== null ? json_encode($oldValue, JSON_UNESCAPED_UNICODE) : null,
                $newValue !== null ? json_encode($newValue, JSON_UNESCAPED_UNICODE) : null,
                $ipAddress,
                $userAgent,
            ]);

            return $id;
        } catch (\Throwable $e) {
            error_log("Audit log error: " . $e->getMessage());
            return null;
        }
    }
}
