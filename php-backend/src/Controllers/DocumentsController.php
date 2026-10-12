<?php
declare(strict_types=1);

namespace JdServices\Controllers;

use JdServices\Database;
use JdServices\ApiGuard;
use JdServices\Numbering;
use JdServices\TaxEngine;
use JdServices\ComplianceEngine;
use JdServices\Audit;
use JdServices\SignatureProvider;
use JdServices\EmailProvider;
use PDO;
use Exception;

class DocumentsController
{
    public static function list(): void
    {
        $workspaceId = $_GET['workspaceId'] ?? null;
        $type = $_GET['type'] ?? null;

        $g = ApiGuard::guardWorkspace($workspaceId, 'read');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $validWs = $g['access']['workspaceId'];

        $sql = 'SELECT * FROM documentrecord WHERE workspaceId = ?';
        $params = [$validWs];

        if ($type) {
            $sql .= ' AND documentType = ?';
            $params[] = $type;
        }

        $sql .= ' ORDER BY createdAt DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $documents = $stmt->fetchAll();

        foreach ($documents as &$doc) {
            $doc['isImmutable'] = (bool)$doc['isImmutable'];

            // Client
            $stmtCli = $pdo->prepare('SELECT id, firstName, lastName, companyName, isCompany, email FROM client WHERE id = ?');
            $stmtCli->execute([$doc['clientId']]);
            $cli = $stmtCli->fetch();
            if ($cli) {
                $cli['isCompany'] = (bool)$cli['isCompany'];
            }
            $doc['client'] = $cli;

            // Projet
            if ($doc['projectId']) {
                $stmtPrj = $pdo->prepare('SELECT id, title, projectNumber FROM project WHERE id = ?');
                $stmtPrj->execute([$doc['projectId']]);
                $doc['project'] = $stmtPrj->fetch();
            } else {
                $doc['project'] = null;
            }

            // Lignes
            $stmtLines = $pdo->prepare('SELECT * FROM documentline WHERE documentId = ? ORDER BY sortOrder ASC');
            $stmtLines->execute([$doc['id']]);
            $doc['lines'] = $stmtLines->fetchAll();

            // Paiements
            $stmtPay = $pdo->prepare('SELECT * FROM payment WHERE documentId = ? ORDER BY paymentDate DESC');
            $stmtPay->execute([$doc['id']]);
            $doc['payments'] = $stmtPay->fetchAll();
        }
        unset($doc);

        echo json_encode(['documents' => $documents]);
    }

    public static function create(array $body): void
    {
        $workspaceId = $body['workspaceId'] ?? null;
        $documentType = $body['documentType'] ?? 'PROFORMA';

        $action = in_array($documentType, ['PROFORMA', 'QUOTE'], true) ? 'write' : 'issue';

        $g = ApiGuard::guardWorkspace($workspaceId, $action);
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $validWs = $g['access']['workspaceId'];
        $clientId = $body['clientId'] ?? null;
        $lines = $body['lines'] ?? [];

        if (!$clientId || empty($lines) || !is_array($lines)) {
            http_response_code(400);
            echo json_encode(['error' => 'Client et au moins une ligne de prestation sont obligatoires']);
            return;
        }

        $pdo = Database::getConnection();

        // Vérifier l'appartenance du client au workspace
        $stmtCli = $pdo->prepare('SELECT id FROM client WHERE id = ? AND workspaceId = ?');
        $stmtCli->execute([$clientId, $validWs]);
        if (!$stmtCli->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Client introuvable dans cet espace']);
            return;
        }

        // Vérifier l'appartenance du projet si fourni
        $projectId = $body['projectId'] ?? null;
        if ($projectId) {
            $stmtPrj = $pdo->prepare('SELECT id FROM project WHERE id = ? AND workspaceId = ?');
            $stmtPrj->execute([$projectId, $validWs]);
            if (!$stmtPrj->fetch()) {
                http_response_code(404);
                echo json_encode(['error' => 'Projet introuvable dans cet espace']);
                return;
            }
        }

        // 1. Calculs financiers
        $totals = TaxEngine::calculateDocumentTotals($lines);

        // 2. Numérotation continue transactionnelle
        $numbering = Numbering::generateNextDocumentNumber($validWs, $documentType);

        $date = !empty($body['date']) ? date('Y-m-d H:i:s', strtotime($body['date'])) : date('Y-m-d H:i:s');
        $validityDays = (int)($body['validityDays'] ?? 30);
        $dueDate = !empty($body['dueDate'])
            ? date('Y-m-d H:i:s', strtotime($body['dueDate']))
            : date('Y-m-d H:i:s', strtotime($date) + ($validityDays * 86400));

        $docId = Database::generateId('doc_');
        $advancePct = (float)($body['advancePercentage'] ?? 0);

        // 3. Insertion Document
        $stmtInsert = $pdo->prepare('
            INSERT INTO documentrecord (
                id, workspaceId, clientId, projectId, documentType,
                documentNumber, sequentialIndex, year, status, date,
                dueDate, validityDays, paymentTerms, notes, internalNotes,
                specialMentions, totalHt, totalTax, totalTtc, totalPaid,
                balanceDue, advancePercentage, isImmutable, createdAt, updatedAt
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, NOW(3), NOW(3)
            )
        ');

        $stmtInsert->execute([
            $docId,
            $validWs,
            $clientId,
            $projectId ?: null,
            $documentType,
            $numbering['documentNumber'],
            $numbering['sequentialIndex'],
            $numbering['year'],
            'DRAFT',
            $date,
            $dueDate,
            $validityDays,
            $body['paymentTerms'] ?? null,
            $body['notes'] ?? null,
            $body['internalNotes'] ?? null,
            $body['specialMentions'] ?? null,
            $totals['totalHt'],
            $totals['totalTax'],
            $totals['totalTtc'],
            0,
            $totals['totalTtc'],
            $advancePct,
            0,
        ]);

        // 4. Insertion Lignes
        $stmtLine = $pdo->prepare('
            INSERT INTO documentline (
                id, documentId, sortOrder, designation, description,
                quantity, unit, unitPriceHt, taxRate, taxRateName,
                totalHt, totalTax, totalTtc
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');

        foreach ($lines as $idx => $l) {
            $lineId = Database::generateId('dln_');
            $uPrice = (float)($l['unitPriceHt'] ?? 0);
            $qty = (float)($l['quantity'] ?? 1);
            $tRate = (float)($l['taxRate'] ?? 20.0);
            $lCalc = TaxEngine::calculateLineTotals($uPrice, $qty, $tRate, (string)($l['taxRateName'] ?? "TVA {$tRate}%"));

            $stmtLine->execute([
                $lineId,
                $docId,
                $idx + 1,
                (string)($l['designation'] ?? 'Prestation'),
                $l['description'] ?? null,
                $qty,
                $l['unit'] ?? 'Forfait',
                $uPrice,
                $tRate,
                $lCalc['taxRateName'],
                $lCalc['totalHt'],
                $lCalc['totalTax'],
                $lCalc['totalTtc'],
            ]);
        }

        // 5. Audit Log
        Audit::log([
            'workspaceId' => $validWs,
            'userId' => $g['access']['session']['id'],
            'userEmail' => $g['access']['session']['email'],
            'userRole' => $g['access']['role'],
            'action' => 'CREATED',
            'entityType' => 'Document',
            'entityId' => $docId,
            'entityReference' => $numbering['documentNumber'],
            'newValue' => [
                'documentNumber' => $numbering['documentNumber'],
                'type' => $documentType,
                'totalTtc' => $totals['totalTtc'],
            ],
        ]);

        // Retourner le document créé
        self::get($docId);
    }

    public static function get(string $id): void
    {
        $g = ApiGuard::guardEntity('document', $id, 'read');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM documentrecord WHERE id = ?');
        $stmt->execute([$id]);
        $doc = $stmt->fetch();

        if (!$doc) {
            http_response_code(404);
            echo json_encode(['error' => 'Document introuvable']);
            return;
        }

        $doc['isImmutable'] = (bool)$doc['isImmutable'];

        // Workspace
        $stmtWs = $pdo->prepare('SELECT * FROM workspace WHERE id = ?');
        $stmtWs->execute([$doc['workspaceId']]);
        $doc['workspace'] = $stmtWs->fetch();

        // Client
        $stmtCli = $pdo->prepare('SELECT * FROM client WHERE id = ?');
        $stmtCli->execute([$doc['clientId']]);
        $cli = $stmtCli->fetch();
        if ($cli) {
            $cli['isCompany'] = (bool)$cli['isCompany'];
        }
        $doc['client'] = $cli;

        // Projet
        if ($doc['projectId']) {
            $stmtPrj = $pdo->prepare('SELECT * FROM project WHERE id = ?');
            $stmtPrj->execute([$doc['projectId']]);
            $doc['project'] = $stmtPrj->fetch();
        } else {
            $doc['project'] = null;
        }

        // Lignes
        $stmtLines = $pdo->prepare('SELECT * FROM documentline WHERE documentId = ? ORDER BY sortOrder ASC');
        $stmtLines->execute([$id]);
        $doc['lines'] = $stmtLines->fetchAll();

        // Paiements
        $stmtPay = $pdo->prepare('SELECT * FROM payment WHERE documentId = ? ORDER BY paymentDate DESC');
        $stmtPay->execute([$id]);
        $doc['payments'] = $stmtPay->fetchAll();

        // Signatures & événements
        $stmtSig = $pdo->prepare('SELECT * FROM signaturerequest WHERE documentId = ? ORDER BY createdAt DESC');
        $stmtSig->execute([$id]);
        $sigs = $stmtSig->fetchAll();
        foreach ($sigs as &$s) {
            $stmtEv = $pdo->prepare('SELECT * FROM signatureevent WHERE signatureRequestId = ? ORDER BY timestamp DESC');
            $stmtEv->execute([$s['id']]);
            $s['events'] = $stmtEv->fetchAll();
        }
        unset($s);
        $doc['signatureRequests'] = $sigs;

        // Facture originale / Avoirs
        $stmtAvoirs = $pdo->prepare('SELECT * FROM documentrecord WHERE originalInvoiceId = ?');
        $stmtAvoirs->execute([$id]);
        $doc['creditNotes'] = $stmtAvoirs->fetchAll();

        if ($doc['originalInvoiceId']) {
            $stmtOrig = $pdo->prepare('SELECT * FROM documentrecord WHERE id = ?');
            $stmtOrig->execute([$doc['originalInvoiceId']]);
            $doc['originalInvoice'] = $stmtOrig->fetch();
        } else {
            $doc['originalInvoice'] = null;
        }

        echo json_encode(['document' => $doc]);
    }

    public static function update(string $id, array $body): void
    {
        $g = ApiGuard::guardEntity('document', $id, 'write');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM documentrecord WHERE id = ?');
        $stmt->execute([$id]);
        $doc = $stmt->fetch();

        if (!$doc) {
            http_response_code(404);
            echo json_encode(['error' => 'Document introuvable']);
            return;
        }

        if ((bool)$doc['isImmutable']) {
            http_response_code(403);
            echo json_encode([
                'error' => 'MODIFICATION INTERDITE : Ce document a été émis de manière définitive et est immuable. Pour corriger une erreur, veuillez créer un avoir ou une facture rectificative.'
            ]);
            return;
        }

        $oldValues = [
            'totalHt' => $doc['totalHt'],
            'totalTtc' => $doc['totalTtc'],
            'notes' => $doc['notes'],
        ];

        $totals = ['totalHt' => (float)$doc['totalHt'], 'totalTax' => (float)$doc['totalTax'], 'totalTtc' => (float)$doc['totalTtc']];

        if (!empty($body['lines']) && is_array($body['lines'])) {
            $totals = TaxEngine::calculateDocumentTotals($body['lines']);

            $pdo->prepare('DELETE FROM documentline WHERE documentId = ?')->execute([$id]);

            $stmtLine = $pdo->prepare('
                INSERT INTO documentline (
                    id, documentId, sortOrder, designation, description,
                    quantity, unit, unitPriceHt, taxRate, taxRateName,
                    totalHt, totalTax, totalTtc
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');

            foreach ($body['lines'] as $idx => $l) {
                $lineId = Database::generateId('dln_');
                $uPrice = (float)($l['unitPriceHt'] ?? 0);
                $qty = (float)($l['quantity'] ?? 1);
                $tRate = (float)($l['taxRate'] ?? 20.0);
                $lCalc = TaxEngine::calculateLineTotals($uPrice, $qty, $tRate, (string)($l['taxRateName'] ?? "TVA {$tRate}%"));

                $stmtLine->execute([
                    $lineId,
                    $id,
                    $idx + 1,
                    (string)($l['designation'] ?? 'Prestation'),
                    $l['description'] ?? null,
                    $qty,
                    $l['unit'] ?? 'Forfait',
                    $uPrice,
                    $tRate,
                    $lCalc['taxRateName'],
                    $lCalc['totalHt'],
                    $lCalc['totalTax'],
                    $lCalc['totalTtc'],
                ]);
            }
        }

        $stmtUp = $pdo->prepare('
            UPDATE documentrecord SET
                date = COALESCE(?, date),
                dueDate = COALESCE(?, dueDate),
                notes = COALESCE(?, notes),
                internalNotes = COALESCE(?, internalNotes),
                specialMentions = COALESCE(?, specialMentions),
                paymentTerms = COALESCE(?, paymentTerms),
                advancePercentage = COALESCE(?, advancePercentage),
                totalHt = ?,
                totalTax = ?,
                totalTtc = ?,
                balanceDue = ?,
                updatedAt = NOW(3)
            WHERE id = ?
        ');

        $totalPaid = (float)$doc['totalPaid'];
        $newBalance = max(0, $totals['totalTtc'] - $totalPaid);

        $stmtUp->execute([
            !empty($body['date']) ? date('Y-m-d H:i:s', strtotime($body['date'])) : null,
            !empty($body['dueDate']) ? date('Y-m-d H:i:s', strtotime($body['dueDate'])) : null,
            $body['notes'] ?? null,
            $body['internalNotes'] ?? null,
            $body['specialMentions'] ?? null,
            $body['paymentTerms'] ?? null,
            isset($body['advancePercentage']) ? (float)$body['advancePercentage'] : null,
            $totals['totalHt'],
            $totals['totalTax'],
            $totals['totalTtc'],
            $newBalance,
            $id,
        ]);

        Audit::log([
            'workspaceId' => $doc['workspaceId'],
            'userId' => $g['access']['session']['id'],
            'userEmail' => $g['access']['session']['email'],
            'userRole' => $g['access']['role'],
            'action' => 'UPDATED',
            'entityType' => 'Document',
            'entityId' => $id,
            'entityReference' => $doc['documentNumber'],
            'oldValue' => $oldValues,
            'newValue' => ['totalHt' => $totals['totalHt'], 'totalTtc' => $totals['totalTtc']],
        ]);

        self::get($id);
    }

    public static function delete(string $id): void
    {
        $g = ApiGuard::guardEntity('document', $id, 'delete');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM documentrecord WHERE id = ?');
        $stmt->execute([$id]);
        $doc = $stmt->fetch();

        if (!$doc) {
            http_response_code(404);
            echo json_encode(['error' => 'Document introuvable']);
            return;
        }

        if ((bool)$doc['isImmutable'] || in_array($doc['documentType'], ['INVOICE', 'CREDIT_NOTE'], true)) {
            http_response_code(403);
            echo json_encode([
                'error' => 'SUPPRESSION INTERDITE : Conformément au Code de commerce et aux obligations fiscales françaises, une facture ou un avoir émis ne peut jamais être supprimé. Vous devez émettre un avoir ou marquer le document comme annulé avec traçabilité.'
            ]);
            return;
        }

        $pdo->prepare('DELETE FROM documentrecord WHERE id = ?')->execute([$id]);

        Audit::log([
            'workspaceId' => $doc['workspaceId'],
            'userId' => $g['access']['session']['id'],
            'userEmail' => $g['access']['session']['email'],
            'userRole' => $g['access']['role'],
            'action' => 'DELETED',
            'entityType' => 'Document',
            'entityId' => $id,
            'entityReference' => $doc['documentNumber'],
        ]);

        echo json_encode(['success' => true, 'message' => 'Document brouillon supprimé']);
    }

    public static function convertToInvoice(string $id, array $body): void
    {
        $g = ApiGuard::guardEntity('document', $id, 'issue');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM documentrecord WHERE id = ?');
        $stmt->execute([$id]);
        $proforma = $stmt->fetch();

        if (!$proforma) {
            http_response_code(404);
            echo json_encode(['error' => 'Proforma introuvable']);
            return;
        }

        $conversionType = $body['conversionType'] ?? 'FULL';
        $advanceAmountTtc = (float)($body['advanceAmountTtc'] ?? 0);
        $advanceDescription = (string)($body['advanceDescription'] ?? 'Acompte de réservation');

        // Récupérer les documents déjà liés
        $stmtLinked = $pdo->prepare('SELECT * FROM documentrecord WHERE proformaId = ?');
        $stmtLinked->execute([$id]);
        $linked = $stmtLinked->fetchAll();

        $existingFinal = null;
        $existingAdvances = [];
        foreach ($linked as $ld) {
            if ($ld['documentType'] === 'INVOICE') $existingFinal = $ld;
            if ($ld['documentType'] === 'ADVANCE_PAYMENT') $existingAdvances[] = $ld;
        }

        // CAS 1 : FACTURE D'ACOMPTE
        if ($conversionType === 'ADVANCE') {
            if ($existingFinal) {
                http_response_code(400);
                echo json_encode(['error' => "Une facture finale ({$existingFinal['documentNumber']}) a déjà été émise pour cette proforma."]);
                return;
            }
            if ($advanceAmountTtc <= 0) {
                http_response_code(400);
                echo json_encode(['error' => "Veuillez spécifier un montant d'acompte TTC supérieur à 0 €."]);
                return;
            }

            $prevTotal = array_sum(array_column($existingAdvances, 'totalTtc'));
            $maxRemaining = (float)$proforma['totalTtc'] - $prevTotal;
            if ($advanceAmountTtc > $maxRemaining) {
                http_response_code(400);
                echo json_encode(['error' => sprintf("Le montant d'acompte (%.2f €) dépasse le reste à facturer (%.2f €).", $advanceAmountTtc, $maxRemaining)]);
                return;
            }

            $taxRate = 20.0;
            $advanceHt = round($advanceAmountTtc / (1 + ($taxRate / 100)), 2);
            $advanceTax = round($advanceAmountTtc - $advanceHt, 2);

            $num = Numbering::generateNextDocumentNumber($proforma['workspaceId'], 'ADVANCE_PAYMENT');
            $advId = Database::generateId('doc_');

            $stmtAdv = $pdo->prepare('
                INSERT INTO documentrecord (
                    id, workspaceId, clientId, projectId, documentType,
                    documentNumber, sequentialIndex, year, status, proformaId,
                    date, dueDate, validityDays, paymentTerms, notes,
                    internalNotes, specialMentions, totalHt, totalTax, totalTtc,
                    totalPaid, balanceDue, advancePercentage, isImmutable, createdAt, updatedAt
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, NOW(3), NOW(3)
                )
            ');

            $pct = (float)$proforma['totalTtc'] > 0 ? ($advanceAmountTtc / (float)$proforma['totalTtc']) * 100 : 0;
            $stmtAdv->execute([
                $advId,
                $proforma['workspaceId'],
                $proforma['clientId'],
                $proforma['projectId'],
                'ADVANCE_PAYMENT',
                $num['documentNumber'],
                $num['sequentialIndex'],
                $num['year'],
                'DRAFT',
                $proforma['id'],
                date('Y-m-d H:i:s'),
                date('Y-m-d H:i:s', time() + 15 * 86400),
                15,
                'Paiement à réception par virement ou carte bancaire.',
                $proforma['notes'],
                "Facture d'acompte émise sur la proforma {$proforma['documentNumber']}",
                "Facture d'acompte émise conformément à l'article 289-I-1-c du Code Général des Impôts.",
                $advanceHt,
                $advanceTax,
                $advanceAmountTtc,
                0,
                $advanceAmountTtc,
                $pct,
                0,
            ]);

            // Ligne d'acompte
            $dlnId = Database::generateId('dln_');
            $stmtL = $pdo->prepare('
                INSERT INTO documentline (
                    id, documentId, sortOrder, designation, description,
                    quantity, unit, unitPriceHt, taxRate, taxRateName,
                    totalHt, totalTax, totalTtc
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmtL->execute([
                $dlnId,
                $advId,
                1,
                $advanceDescription,
                "Acompte contractuel relatif au dossier proforma n° {$proforma['documentNumber']}",
                1,
                'Forfait',
                $advanceHt,
                $taxRate,
                'TVA 20%',
                $advanceHt,
                $advanceTax,
                $advanceAmountTtc,
            ]);

            $pdo->prepare('UPDATE documentrecord SET status = ? WHERE id = ?')->execute(['ACCEPTED', $proforma['id']]);

            Audit::log([
                'workspaceId' => $proforma['workspaceId'],
                'userId' => $g['access']['session']['id'],
                'userEmail' => $g['access']['session']['email'],
                'userRole' => $g['access']['role'],
                'action' => 'CREATED',
                'entityType' => 'Document',
                'entityId' => $advId,
                'entityReference' => $num['documentNumber'],
                'newValue' => ['action' => 'Création Facture d\'Acompte', 'advanceNumber' => $num['documentNumber']],
            ]);

            echo json_encode([
                'success' => true,
                'message' => "Facture d'acompte {$num['documentNumber']} (" . number_format($advanceAmountTtc, 2) . " € TTC) générée avec succès.",
            ]);
            return;
        }

        // CAS 2 : FACTURE DE SOLDE
        if ($conversionType === 'BALANCE') {
            if ($existingFinal) {
                http_response_code(400);
                echo json_encode(['error' => "Une facture finale ({$existingFinal['documentNumber']}) a déjà été émise."]);
                return;
            }

            $num = Numbering::generateNextDocumentNumber($proforma['workspaceId'], 'INVOICE');
            $finalId = Database::generateId('doc_');

            // Récupérer lignes de la proforma
            $stmtLines = $pdo->prepare('SELECT * FROM documentline WHERE documentId = ? ORDER BY sortOrder ASC');
            $stmtLines->execute([$proforma['id']]);
            $baseLines = $stmtLines->fetchAll();

            $deductedHt = 0.0;
            $deductedTax = 0.0;
            $deductedTtc = 0.0;

            $stmtAdvLine = $pdo->prepare('
                INSERT INTO documentline (
                    id, documentId, sortOrder, designation, description,
                    quantity, unit, unitPriceHt, taxRate, taxRateName,
                    totalHt, totalTax, totalTtc
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');

            $order = count($baseLines) + 1;
            foreach ($existingAdvances as $adv) {
                $deductedHt += (float)$adv['totalHt'];
                $deductedTax += (float)$adv['totalTax'];
                $deductedTtc += (float)$adv['totalTtc'];

                $advLineId = Database::generateId('dln_');
                $stmtAdvLine->execute([
                    $advLineId,
                    $finalId,
                    $order++,
                    "Moins acompte déduit (Facture n° {$adv['documentNumber']})",
                    "Règlement d'acompte facturé",
                    1,
                    'Forfait',
                    -abs((float)$adv['totalHt']),
                    20.0,
                    'TVA 20%',
                    -abs((float)$adv['totalHt']),
                    -abs((float)$adv['totalTax']),
                    -abs((float)$adv['totalTtc']),
                ]);
            }

            // Insérer lignes de base
            foreach ($baseLines as $idx => $bl) {
                $dlnId = Database::generateId('dln_');
                $stmtAdvLine->execute([
                    $dlnId,
                    $finalId,
                    $idx + 1,
                    $bl['designation'],
                    $bl['description'],
                    $bl['quantity'],
                    $bl['unit'],
                    $bl['unitPriceHt'],
                    $bl['taxRate'],
                    $bl['taxRateName'],
                    $bl['totalHt'],
                    $bl['totalTax'],
                    $bl['totalTtc'],
                ]);
            }

            $netHt = max(0, (float)$proforma['totalHt'] - $deductedHt);
            $netTax = max(0, (float)$proforma['totalTax'] - $deductedTax);
            $netTtc = max(0, (float)$proforma['totalTtc'] - $deductedTtc);

            $stmtFinal = $pdo->prepare('
                INSERT INTO documentrecord (
                    id, workspaceId, clientId, projectId, documentType,
                    documentNumber, sequentialIndex, year, status, proformaId,
                    date, dueDate, validityDays, paymentTerms, notes,
                    internalNotes, specialMentions, totalHt, totalTax, totalTtc,
                    totalPaid, balanceDue, advancePercentage, isImmutable, createdAt, updatedAt
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, NOW(3), NOW(3)
                )
            ');

            $advPct = (float)$proforma['totalTtc'] > 0 ? ($deductedTtc / (float)$proforma['totalTtc']) * 100 : 0;
            $stmtFinal->execute([
                $finalId,
                $proforma['workspaceId'],
                $proforma['clientId'],
                $proforma['projectId'],
                'INVOICE',
                $num['documentNumber'],
                $num['sequentialIndex'],
                $num['year'],
                'DRAFT',
                $proforma['id'],
                date('Y-m-d H:i:s'),
                date('Y-m-d H:i:s', time() + 30 * 86400),
                30,
                $proforma['paymentTerms'] ?: 'Règlement du solde à réception.',
                $proforma['notes'],
                "Facture de solde d'après proforma {$proforma['documentNumber']}",
                "Facture de solde définitive.",
                $netHt,
                $netTax,
                $netTtc,
                0,
                $netTtc,
                $advPct,
                0,
            ]);

            $pdo->prepare('UPDATE documentrecord SET status = ? WHERE id = ?')->execute(['ACCEPTED', $proforma['id']]);

            Audit::log([
                'workspaceId' => $proforma['workspaceId'],
                'userId' => $g['access']['session']['id'],
                'userEmail' => $g['access']['session']['email'],
                'userRole' => $g['access']['role'],
                'action' => 'CREATED',
                'entityType' => 'Document',
                'entityId' => $finalId,
                'entityReference' => $num['documentNumber'],
                'newValue' => ['action' => 'Génération Facture de Solde', 'invoiceNumber' => $num['documentNumber']],
            ]);

            echo json_encode([
                'success' => true,
                'message' => "Facture de solde {$num['documentNumber']} créée avec succès (" . number_format($netTtc, 2) . " € TTC restants).",
            ]);
            return;
        }

        // CAS 3 : FACTURE COMPLÈTE (100%)
        if ($existingFinal) {
            http_response_code(400);
            echo json_encode(['error' => "Une facture comptable existe déjà pour cette proforma : {$existingFinal['documentNumber']}"]);
            return;
        }

        $num = Numbering::generateNextDocumentNumber($proforma['workspaceId'], 'INVOICE');
        $invId = Database::generateId('doc_');

        $stmtInv = $pdo->prepare('
            INSERT INTO documentrecord (
                id, workspaceId, clientId, projectId, documentType,
                documentNumber, sequentialIndex, year, status, proformaId,
                date, dueDate, validityDays, paymentTerms, notes,
                internalNotes, specialMentions, totalHt, totalTax, totalTtc,
                totalPaid, balanceDue, advancePercentage, isImmutable, createdAt, updatedAt
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, NOW(3), NOW(3)
            )
        ');

        $stmtInv->execute([
            $invId,
            $proforma['workspaceId'],
            $proforma['clientId'],
            $proforma['projectId'],
            'INVOICE',
            $num['documentNumber'],
            $num['sequentialIndex'],
            $num['year'],
            'DRAFT',
            $proforma['id'],
            date('Y-m-d H:i:s'),
            date('Y-m-d H:i:s', time() + 30 * 86400),
            30,
            $proforma['paymentTerms'],
            $proforma['notes'],
            "Facture générée d'après la proforma acceptée {$proforma['documentNumber']}",
            $proforma['specialMentions'],
            $proforma['totalHt'],
            $proforma['totalTax'],
            $proforma['totalTtc'],
            0,
            $proforma['totalTtc'],
            $proforma['advancePercentage'],
            0,
        ]);

        // Dupliquer lignes
        $stmtLines = $pdo->prepare('SELECT * FROM documentline WHERE documentId = ? ORDER BY sortOrder ASC');
        $stmtLines->execute([$proforma['id']]);
        $baseLines = $stmtLines->fetchAll();

        $stmtLineIns = $pdo->prepare('
            INSERT INTO documentline (
                id, documentId, sortOrder, designation, description,
                quantity, unit, unitPriceHt, taxRate, taxRateName,
                totalHt, totalTax, totalTtc
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');

        foreach ($baseLines as $bl) {
            $stmtLineIns->execute([
                Database::generateId('dln_'),
                $invId,
                $bl['sortOrder'],
                $bl['designation'],
                $bl['description'],
                $bl['quantity'],
                $bl['unit'],
                $bl['unitPriceHt'],
                $bl['taxRate'],
                $bl['taxRateName'],
                $bl['totalHt'],
                $bl['totalTax'],
                $bl['totalTtc'],
            ]);
        }

        $pdo->prepare('UPDATE documentrecord SET status = ? WHERE id = ?')->execute(['ACCEPTED', $proforma['id']]);

        Audit::log([
            'workspaceId' => $proforma['workspaceId'],
            'userId' => $g['access']['session']['id'],
            'userEmail' => $g['access']['session']['email'],
            'userRole' => $g['access']['role'],
            'action' => 'CREATED',
            'entityType' => 'Document',
            'entityId' => $invId,
            'entityReference' => $num['documentNumber'],
            'newValue' => ['action' => 'Conversion de proforma en facture comptable', 'invoiceNumber' => $num['documentNumber']],
        ]);

        echo json_encode([
            'success' => true,
            'message' => "Facture {$num['documentNumber']} créée avec succès.",
        ]);
    }

    public static function creditNote(string $id, array $body): void
    {
        $g = ApiGuard::guardEntity('document', $id, 'issue');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM documentrecord WHERE id = ?');
        $stmt->execute([$id]);
        $invoice = $stmt->fetch();

        if (!$invoice) {
            http_response_code(404);
            echo json_encode(['error' => "Facture d'origine introuvable"]);
            return;
        }

        $reason = (string)($body['reason'] ?? 'Annulation / Rectification commerciale');
        $isFullCredit = !isset($body['isFullCredit']) || (bool)$body['isFullCredit'];
        $amount = (float)($body['amount'] ?? $invoice['totalHt']);

        $num = Numbering::generateNextDocumentNumber($invoice['workspaceId'], 'CREDIT_NOTE');
        $creditId = Database::generateId('doc_');

        $creditHt = $isFullCredit ? (float)$invoice['totalHt'] : $amount;
        $creditTax = $isFullCredit ? (float)$invoice['totalTax'] : round($creditHt * 0.20, 2);
        $creditTtc = $isFullCredit ? (float)$invoice['totalTtc'] : ($creditHt + $creditTax);

        $stmtCred = $pdo->prepare('
            INSERT INTO documentrecord (
                id, workspaceId, clientId, projectId, documentType,
                documentNumber, sequentialIndex, year, status, originalInvoiceId,
                date, dueDate, notes, internalNotes, totalHt,
                totalTax, totalTtc, isImmutable, createdAt, updatedAt
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, NOW(3), NOW(3)
            )
        ');

        $stmtCred->execute([
            $creditId,
            $invoice['workspaceId'],
            $invoice['clientId'],
            $invoice['projectId'],
            'CREDIT_NOTE',
            $num['documentNumber'],
            $num['sequentialIndex'],
            $num['year'],
            'ISSUED',
            $invoice['id'],
            date('Y-m-d H:i:s'),
            date('Y-m-d H:i:s'),
            "Avoir émis en rectification de la facture n° {$invoice['documentNumber']}. Motif : {$reason}",
            "Lien comptable direct : Facture {$invoice['documentNumber']} -> Avoir {$num['documentNumber']}",
            $creditHt,
            $creditTax,
            $creditTtc,
            1,
        ]);

        // Dupliquer lignes en avoir
        $stmtLines = $pdo->prepare('SELECT * FROM documentline WHERE documentId = ? ORDER BY sortOrder ASC');
        $stmtLines->execute([$invoice['id']]);
        $lines = $stmtLines->fetchAll();

        $stmtLineIns = $pdo->prepare('
            INSERT INTO documentline (
                id, documentId, sortOrder, designation, description,
                quantity, unit, unitPriceHt, taxRate, taxRateName,
                totalHt, totalTax, totalTtc
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');

        foreach ($lines as $l) {
            $stmtLineIns->execute([
                Database::generateId('dln_'),
                $creditId,
                $l['sortOrder'],
                "Avoir sur : {$l['designation']}",
                $reason,
                $l['quantity'],
                $l['unit'],
                $l['unitPriceHt'],
                $l['taxRate'],
                $l['taxRateName'],
                $l['totalHt'],
                $l['totalTax'],
                $l['totalTtc'],
            ]);
        }

        $pdo->prepare('UPDATE documentrecord SET status = ? WHERE id = ?')->execute(['CREDITED', $invoice['id']]);

        Audit::log([
            'workspaceId' => $invoice['workspaceId'],
            'userId' => $g['access']['session']['id'],
            'userEmail' => $g['access']['session']['email'],
            'userRole' => $g['access']['role'],
            'action' => 'CREDITED',
            'entityType' => 'Document',
            'entityId' => $creditId,
            'entityReference' => $num['documentNumber'],
            'newValue' => [
                'action' => 'Création d\'un avoir comptable',
                'originalInvoiceNumber' => $invoice['documentNumber'],
                'creditNoteNumber' => $num['documentNumber'],
                'amountCredited' => $creditTtc,
                'reason' => $reason,
            ],
        ]);

        echo json_encode([
            'success' => true,
            'message' => "Avoir {$num['documentNumber']} émis avec succès pour la facture {$invoice['documentNumber']}.",
        ]);
    }

    public static function issue(string $id): void
    {
        $g = ApiGuard::guardEntity('document', $id, 'issue');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM documentrecord WHERE id = ?');
        $stmt->execute([$id]);
        $doc = $stmt->fetch();

        if (!$doc) {
            http_response_code(404);
            echo json_encode(['error' => 'Document introuvable']);
            return;
        }

        if ((bool)$doc['isImmutable']) {
            http_response_code(400);
            echo json_encode(['error' => 'Ce document est déjà émis et verrouillé.']);
            return;
        }

        $stmtWs = $pdo->prepare('SELECT * FROM workspace WHERE id = ?');
        $stmtWs->execute([$doc['workspaceId']]);
        $ws = $stmtWs->fetch();

        $stmtCli = $pdo->prepare('SELECT * FROM client WHERE id = ?');
        $stmtCli->execute([$doc['clientId']]);
        $cli = $stmtCli->fetch();
        $cli['isCompany'] = (bool)$cli['isCompany'];

        $stmtLines = $pdo->prepare('SELECT * FROM documentline WHERE documentId = ? ORDER BY sortOrder ASC');
        $stmtLines->execute([$id]);
        $lines = $stmtLines->fetchAll();

        // 1. Contrôle de conformité Code de commerce / CGI
        $complianceData = [
            'documentType' => $doc['documentType'],
            'documentNumber' => $doc['documentNumber'],
            'date' => $doc['date'],
            'dueDate' => $doc['dueDate'],
            'seller' => [
                'companyName' => $ws['companyName'],
                'legalForm' => $ws['legalForm'],
                'siren' => $ws['siren'],
                'siret' => $ws['siret'],
                'address' => $ws['address'],
                'postalCode' => $ws['postalCode'],
                'city' => $ws['city'],
                'vatNumber' => $ws['vatNumber'],
            ],
            'client' => [
                'isCompany' => $cli['isCompany'],
                'companyName' => $cli['companyName'],
                'firstName' => $cli['firstName'],
                'lastName' => $cli['lastName'],
                'siren' => $cli['siren'],
                'address' => $cli['address'],
                'postalCode' => $cli['postalCode'],
                'city' => $cli['city'],
                'country' => $cli['country'],
                'deliveryAddress' => $cli['deliveryAddress'],
            ],
            'lines' => array_map(fn($l) => [
                'designation' => $l['designation'],
                'quantity' => (float)$l['quantity'],
                'unitPriceHt' => (float)$l['unitPriceHt'],
                'taxRate' => (float)$l['taxRate'],
            ], $lines),
            'totalHt' => (float)$doc['totalHt'],
            'totalTtc' => (float)$doc['totalTtc'],
            'paymentTerms' => $doc['paymentTerms'],
        ];

        $compResult = ComplianceEngine::checkDocumentCompliance($complianceData);

        if ((bool)$ws['complianceCheck'] && !$compResult['canIssue']) {
            http_response_code(422);
            echo json_encode([
                'error' => 'Émission bloquée : Le document ne respecte pas toutes les obligations légales françaises.',
                'checklist' => $compResult['checklist'],
                'errors' => $compResult['errors'],
            ]);
            return;
        }

        // 2. Figer les snapshots immuables
        $snapshotSeller = json_encode([
            'companyName' => $ws['companyName'],
            'commercialName' => $ws['commercialName'],
            'legalForm' => $ws['legalForm'],
            'siren' => $ws['siren'],
            'siret' => $ws['siret'],
            'rcsCity' => $ws['rcsCity'],
            'vatNumber' => $ws['vatNumber'],
            'address' => $ws['address'],
            'postalCode' => $ws['postalCode'],
            'city' => $ws['city'],
            'country' => $ws['country'],
            'phone' => $ws['phone'],
            'email' => $ws['email'],
        ], JSON_UNESCAPED_UNICODE);

        $clientFullName = trim(sprintf('%s %s', $cli['firstName'], $cli['lastName']));
        $snapshotClient = json_encode([
            'isCompany' => $cli['isCompany'],
            'companyName' => $cli['companyName'],
            'name' => $clientFullName,
            'siren' => $cli['siren'],
            'siret' => $cli['siret'],
            'vatNumber' => $cli['vatNumber'],
            'address' => $cli['address'],
            'postalCode' => $cli['postalCode'],
            'city' => $cli['city'],
            'country' => $cli['country'],
        ], JSON_UNESCAPED_UNICODE);

        // 3. Empreinte SHA-256
        $docHash = Audit::computeDocumentHash([
            'documentNumber' => $doc['documentNumber'],
            'documentType' => $doc['documentType'],
            'date' => $doc['date'],
            'sellerSiren' => $ws['siren'],
            'clientIdentifier' => $cli['siren'] ?: $cli['email'],
            'totalHt' => $doc['totalHt'],
            'totalTax' => $doc['totalTax'],
            'totalTtc' => $doc['totalTtc'],
            'lines' => $lines,
        ]);

        // 4. Verrouillage
        $stmtUp = $pdo->prepare('
            UPDATE documentrecord SET
                status = ?,
                isImmutable = 1,
                issuedAt = NOW(3),
                issuedById = ?,
                documentHash = ?,
                snapshotSellerJson = ?,
                snapshotClientJson = ?,
                complianceStatus = ?,
                updatedAt = NOW(3)
            WHERE id = ?
        ');

        $stmtUp->execute([
            'ISSUED',
            $g['access']['session']['id'],
            $docHash,
            $snapshotSeller,
            $snapshotClient,
            'VALID',
            $id,
        ]);

        Audit::log([
            'workspaceId' => $doc['workspaceId'],
            'userId' => $g['access']['session']['id'],
            'userEmail' => $g['access']['session']['email'],
            'userRole' => $g['access']['role'],
            'action' => 'ISSUED',
            'entityType' => 'Document',
            'entityId' => $id,
            'entityReference' => $doc['documentNumber'],
            'newValue' => [
                'action' => 'Émission officielle et scellement',
                'documentHash' => $docHash,
                'totalTtc' => $doc['totalTtc'],
            ],
        ]);

        echo json_encode([
            'success' => true,
            'documentHash' => $docHash,
            'checklist' => $compResult['checklist'],
        ]);
    }

    public static function requestSignature(string $id): void
    {
        $g = ApiGuard::guardEntity('document', $id, 'write');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM documentrecord WHERE id = ?');
        $stmt->execute([$id]);
        $doc = $stmt->fetch();

        $stmtCli = $pdo->prepare('SELECT * FROM client WHERE id = ?');
        $stmtCli->execute([$doc['clientId']]);
        $cli = $stmtCli->fetch();

        $stmtWs = $pdo->prepare('SELECT * FROM workspace WHERE id = ?');
        $stmtWs->execute([$doc['workspaceId']]);
        $ws = $stmtWs->fetch();

        $signerName = !empty($cli['isCompany']) && !empty($cli['companyName'])
            ? "{$cli['firstName']} {$cli['lastName']} ({$cli['companyName']})"
            : "{$cli['firstName']} {$cli['lastName']}";

        $sigData = SignatureProvider::createSignatureRequest([
            'validityDays' => (int)($doc['validityDays'] ?: 30),
        ]);

        $sigId = Database::generateId('sig_');
        $stmtSig = $pdo->prepare('
            INSERT INTO signaturerequest (
                id, workspaceId, documentId, token, provider,
                externalRequestId, status, signerType, signerName,
                signerEmail, signerPhone, expiresAt, createdAt, updatedAt
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, NOW(3), NOW(3)
            )
        ');

        $stmtSig->execute([
            $sigId,
            $doc['workspaceId'],
            $id,
            $sigData['token'],
            $sigData['provider'],
            $sigData['externalRequestId'],
            'PENDING',
            'CLIENT',
            trim($signerName),
            $cli['email'],
            $cli['phone'],
            $sigData['expiresAt'],
        ]);

        // Événement initial
        $stmtEv = $pdo->prepare('
            INSERT INTO signatureevent (
                id, signatureRequestId, eventType, ipAddress, userAgent, payloadJson, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(3))
        ');
        $stmtEv->execute([
            Database::generateId('sge_'),
            $sigId,
            'CREATED',
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
            $_SERVER['HTTP_USER_AGENT'] ?? 'JD-Services System',
            json_encode(['action' => 'Demande de signature initialisée']),
        ]);

        $config = require __DIR__ . '/../../config/config.php';
        $appUrl = $config['app']['url'];
        $signatureUrl = "{$appUrl}/client/signature/{$sigData['token']}";

        // Envoi email
        $tpl = EmailProvider::renderEmailTemplate('SIGNATURE_REQUEST', [
            'clientName' => $signerName,
            'documentNumber' => $doc['documentNumber'],
            'totalTtc' => number_format((float)$doc['totalTtc'], 2, ',', ' ') . ' €',
            'viewUrl' => $signatureUrl,
            'signUrl' => $signatureUrl,
            'workspaceName' => $ws['name'],
        ]);

        EmailProvider::sendEmail([
            'workspaceId' => $doc['workspaceId'],
            'documentId' => $id,
            'templateType' => 'SIGNATURE_REQUEST',
            'recipientEmail' => $cli['email'],
            'recipientName' => $signerName,
            'subject' => $tpl['subject'],
            'bodyHtml' => $tpl['bodyHtml'],
        ]);

        Audit::log([
            'workspaceId' => $doc['workspaceId'],
            'userId' => $g['access']['session']['id'],
            'userEmail' => $g['access']['session']['email'],
            'userRole' => $g['access']['role'],
            'action' => 'SENT',
            'entityType' => 'Document',
            'entityId' => $id,
            'entityReference' => $doc['documentNumber'],
            'newValue' => ['token' => $sigData['token'], 'signerEmail' => $cli['email']],
        ]);

        echo json_encode([
            'success' => true,
            'signatureUrl' => $signatureUrl,
            'token' => $sigData['token'],
            'expiresAt' => $sigData['expiresAt'],
        ]);
    }

    public static function sendEmail(string $id, array $body): void
    {
        $g = ApiGuard::guardEntity('document', $id, 'write');
        if (!$g['ok']) {
            http_response_code($g['status']);
            echo json_encode(['error' => $g['error']]);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM documentrecord WHERE id = ?');
        $stmt->execute([$id]);
        $doc = $stmt->fetch();

        $stmtCli = $pdo->prepare('SELECT * FROM client WHERE id = ?');
        $stmtCli->execute([$doc['clientId']]);
        $cli = $stmtCli->fetch();

        $stmtWs = $pdo->prepare('SELECT * FROM workspace WHERE id = ?');
        $stmtWs->execute([$doc['workspaceId']]);
        $ws = $stmtWs->fetch();

        $recipientEmail = !empty($body['recipientEmail']) ? trim((string)$body['recipientEmail']) : $cli['email'];
        $recipientName = !empty($cli['isCompany']) && !empty($cli['companyName'])
            ? $cli['companyName']
            : trim("{$cli['firstName']} {$cli['lastName']}");

        $config = require __DIR__ . '/../../config/config.php';
        $appUrl = $config['app']['url'];
        $routeFolder = $doc['documentType'] === 'PROFORMA' ? 'proformas' : 'invoices';
        $viewUrl = "{$appUrl}/{$ws['slug']}/{$routeFolder}/{$doc['id']}";

        $stmtToken = $pdo->prepare('SELECT token FROM signaturerequest WHERE documentId = ? AND status = ? LIMIT 1');
        $stmtToken->execute([$id, 'PENDING']);
        $signToken = $stmtToken->fetchColumn();
        $signUrl = $signToken ? "{$appUrl}/client/signature/{$signToken}" : null;

        $templateType = $doc['documentType'] === 'PROFORMA' ? 'PROFORMA_SENT' : 'INVOICE_SENT';
        $rendered = EmailProvider::renderEmailTemplate($templateType, [
            'clientName' => $recipientName,
            'documentNumber' => $doc['documentNumber'],
            'totalTtc' => number_format((float)$doc['totalTtc'], 2, ',', ' ') . ' €',
            'viewUrl' => $viewUrl,
            'signUrl' => $signUrl,
            'workspaceName' => $ws['name'],
        ]);

        $subject = !empty($body['subject']) ? trim((string)$body['subject']) : $rendered['subject'];
        $bodyHtml = $rendered['bodyHtml'];

        if (!empty($body['message'])) {
            $formattedMsg = nl2br(htmlspecialchars((string)$body['message']));
            $bodyHtml = "
            <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;\">
              <div style=\"border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;\">
                <h2 style=\"margin: 0; color: #0f172a; font-size: 20px;\">{$ws['name']}</h2>
                <p style=\"margin: 4px 0 0; color: #6b7280; font-size: 13px;\">Gestion commerciale &amp; facturation</p>
              </div>
              <p>Bonjour <strong>{$recipientName}</strong>,</p>
              <div>{$formattedMsg}</div>
              <div style=\"text-align: center; margin: 32px 0;\">
                <a href=\"{$viewUrl}\" style=\"background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; display: inline-block;\">
                  Consulter le document ({$doc['documentNumber']})
                </a>
              </div>
              <div style=\"border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 16px; font-size: 11px; color: #9ca3af; text-align: center;\">
                <p style=\"margin: 0;\">Ce message vous a été adressé automatiquement par JD-Services Management.</p>
              </div>
            </div>";
        }

        $res = EmailProvider::sendEmail([
            'workspaceId' => $doc['workspaceId'],
            'documentId' => $id,
            'templateType' => $templateType,
            'recipientEmail' => $recipientEmail,
            'recipientName' => $recipientName,
            'subject' => $subject,
            'bodyHtml' => $bodyHtml,
        ]);

        if ($res['success']) {
            if ($doc['status'] === 'DRAFT') {
                $pdo->prepare('UPDATE documentrecord SET status = ? WHERE id = ?')->execute(['SENT', $id]);
            }

            Audit::log([
                'workspaceId' => $doc['workspaceId'],
                'userId' => $g['access']['session']['id'],
                'userEmail' => $g['access']['session']['email'],
                'userRole' => $g['access']['role'],
                'action' => 'SENT',
                'entityType' => 'Document',
                'entityId' => $id,
                'entityReference' => $doc['documentNumber'],
                'newValue' => ['recipient' => $recipientEmail, 'subject' => $subject],
            ]);

            echo json_encode(['success' => true, 'message' => "Email transmis avec succès à {$recipientEmail}"]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => $res['error'] ?: "Échec de l'envoi de l'email"]);
        }
    }
}
