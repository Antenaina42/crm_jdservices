<?php
declare(strict_types=1);

namespace JdServices;

use PDO;
use Exception;

class Numbering
{
    /**
     * Génère de façon atomique et transactionnelle le prochain numéro légal ininterrompu.
     * Conforme aux articles 242 nonies A et 289 du Code Général des Impôts.
     *
     * @return array{documentNumber: string, sequentialIndex: int, year: int, prefix: string}
     */
    public static function generateNextDocumentNumber(string $workspaceId, string $documentType): array
    {
        $pdo = Database::getConnection();
        $year = (int)date('Y');

        $pdo->beginTransaction();
        try {
            // 1. Récupérer le préfixe configuré dans le workspace (recherche par ID, slug ou alias)
            $stmtWs = $pdo->prepare('SELECT id, slug, invoicePrefix, proformaPrefix, creditNotePrefix, quotePrefix FROM workspace WHERE id = ? OR slug = ? OR (slug = "network" AND ? = "reseau")');
            $stmtWs->execute([$workspaceId, $workspaceId, $workspaceId]);
            $ws = $stmtWs->fetch();

            if (!$ws) {
                throw new Exception("Workspace introuvable : {$workspaceId}");
            }
            $workspaceId = $ws['id'];

            $prefix = match ($documentType) {
                'INVOICE' => $ws['invoicePrefix'] ?: 'FAC',
                'PROFORMA' => $ws['proformaPrefix'] ?: 'PRO',
                'CREDIT_NOTE' => $ws['creditNotePrefix'] ?: 'AV',
                'QUOTE' => $ws['quotePrefix'] ?: 'DEV',
                'ADVANCE_PAYMENT' => ($ws['invoicePrefix'] ?: 'FAC') . '-AC',
                default => 'DOC',
            };

            // 2. Verrouiller la ligne de séquence avec SELECT ... FOR UPDATE
            $stmtSeq = $pdo->prepare(
                'SELECT id, lastNumber FROM numbersequence WHERE workspaceId = ? AND documentType = ? AND year = ? FOR UPDATE'
            );
            $stmtSeq->execute([$workspaceId, $documentType, $year]);
            $seq = $stmtSeq->fetch();

            $nextNumber = 1;
            if ($seq) {
                $nextNumber = (int)$seq['lastNumber'] + 1;
                $stmtUpdate = $pdo->prepare('UPDATE numbersequence SET lastNumber = ? WHERE id = ?');
                $stmtUpdate->execute([$nextNumber, $seq['id']]);
            } else {
                $seqId = Database::generateId('seq_');
                $stmtInsert = $pdo->prepare(
                    'INSERT INTO numbersequence (id, workspaceId, documentType, year, prefix, lastNumber) VALUES (?, ?, ?, ?, ?, ?)'
                );
                $stmtInsert->execute([$seqId, $workspaceId, $documentType, $year, $prefix, $nextNumber]);
            }

            $pdo->commit();

            $documentNumber = sprintf('%s-%d-%06d', $prefix, $year, $nextNumber);

            return [
                'documentNumber' => $documentNumber,
                'sequentialIndex' => $nextNumber,
                'year' => $year,
                'prefix' => $prefix,
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
}
