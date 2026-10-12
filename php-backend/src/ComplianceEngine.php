<?php
declare(strict_types=1);

namespace JdServices;

class ComplianceEngine
{
    /**
     * Moteur de conformité légale et fiscale française (Code de commerce art. L441-9, CGI art. 242 nonies A).
     *
     * @param array $doc Données complètes du document (seller, client, lines, totaux, dates, etc.)
     * @return array{isCompliant: bool, canIssue: bool, errors: string[], warnings: string[], checklist: array}
     */
    public static function checkDocumentCompliance(array $doc): array
    {
        $errors = [];
        $warnings = [];
        $checklist = [];

        // 1. Numéro unique et chronologique
        $docNumber = trim((string)($doc['documentNumber'] ?? ''));
        $hasValidNumber = strlen($docNumber) > 3;
        $checklist[] = [
            'item' => 'Numéro de document séquentiel et unique',
            'passed' => $hasValidNumber,
            'mandatory' => true,
            'details' => $docNumber,
        ];
        if (!$hasValidNumber) {
            $errors[] = 'Le document doit comporter un numéro séquentiel valide.';
        }

        // 2. Dates réglementaires
        $hasDate = !empty($doc['date']);
        $checklist[] = [
            'item' => 'Date d\'émission du document',
            'passed' => $hasDate,
            'mandatory' => true,
        ];
        if (!$hasDate) {
            $errors[] = 'La date d\'émission est obligatoire.';
        }

        $hasDueDate = !empty($doc['dueDate']);
        $checklist[] = [
            'item' => 'Date d\'échéance de paiement',
            'passed' => $hasDueDate,
            'mandatory' => true,
        ];
        if (!$hasDueDate) {
            $errors[] = 'La date d\'échéance de règlement est obligatoire.';
        }

        // 3. Mentions vendeur
        $seller = $doc['seller'] ?? [];
        $hasSellerIdentity = !empty($seller['companyName']) && !empty($seller['siren']);
        $checklist[] = [
            'item' => 'Identité complète du vendeur (Raison sociale, SIREN/SIRET)',
            'passed' => $hasSellerIdentity,
            'mandatory' => true,
            'details' => sprintf('%s - SIREN: %s', $seller['companyName'] ?? 'Manquant', $seller['siren'] ?? 'Manquant'),
        ];
        if (!$hasSellerIdentity) {
            $errors[] = 'L\'identité de l\'émetteur (Raison sociale et SIREN) est incomplète.';
        }

        $hasSellerAddress = !empty($seller['address']) && !empty($seller['city']);
        $checklist[] = [
            'item' => 'Adresse du siège social de l\'émetteur',
            'passed' => $hasSellerAddress,
            'mandatory' => true,
        ];
        if (!$hasSellerAddress) {
            $errors[] = 'L\'adresse du siège social du vendeur est obligatoire.';
        }

        // 4. Mentions client
        $client = $doc['client'] ?? [];
        $isCompany = !empty($client['isCompany']);
        $clientName = $isCompany
            ? ($client['companyName'] ?? '')
            : trim(sprintf('%s %s', $client['firstName'] ?? '', $client['lastName'] ?? ''));
        $hasClientName = strlen($clientName) > 0;

        $checklist[] = [
            'item' => 'Nom ou dénomination sociale du client',
            'passed' => $hasClientName,
            'mandatory' => true,
            'details' => $clientName ?: null,
        ];
        if (!$hasClientName) {
            $errors[] = 'L\'identité du client (nom ou raison sociale) est obligatoire.';
        }

        $hasClientAddress = !empty($client['address']) && !empty($client['city']);
        $checklist[] = [
            'item' => 'Adresse de facturation du client',
            'passed' => $hasClientAddress,
            'mandatory' => true,
        ];
        if (!$hasClientAddress) {
            $errors[] = 'L\'adresse de facturation du client est obligatoire.';
        }

        // B2B : Vérification SIREN
        $docType = (string)($doc['documentType'] ?? 'INVOICE');
        if ($isCompany) {
            $clientSiren = trim((string)($client['siren'] ?? ''));
            $hasClientSiren = strlen($clientSiren) >= 9;
            $checklist[] = [
                'item' => 'SIREN client (Obligation B2B réforme 2026)',
                'passed' => $hasClientSiren,
                'mandatory' => ($docType === 'INVOICE'),
                'details' => $hasClientSiren ? "SIREN: {$clientSiren}" : 'Non renseigné',
            ];
            if (!$hasClientSiren) {
                if ($docType === 'INVOICE') {
                    $errors[] = 'Le SIREN du client professionnel est obligatoire pour l\'émission de facture (Réforme Facturation Électronique).';
                } else {
                    $warnings[] = 'Le SIREN du client professionnel est recommandé dès la proforma.';
                }
            }
        }

        // 5. Lignes et tarification
        $lines = $doc['lines'] ?? [];
        $hasLines = is_array($lines) && count($lines) > 0;
        $checklist[] = [
            'item' => 'Lignes de prestations / marchandises',
            'passed' => $hasLines,
            'mandatory' => true,
            'details' => sprintf('%d ligne(s)', count($lines)),
        ];
        if (!$hasLines) {
            $errors[] = 'Le document doit comporter au moins une ligne de prestation ou marchandise.';
        } else {
            foreach ($lines as $i => $l) {
                $designation = trim((string)($l['designation'] ?? ''));
                if (strlen($designation) === 0) {
                    $errors[] = sprintf('Ligne %d : La désignation est obligatoire.', $i + 1);
                }
                $qty = (float)($l['quantity'] ?? 0);
                if ($qty <= 0) {
                    $errors[] = sprintf('Ligne %d : La quantité doit être supérieure à zéro.', $i + 1);
                }
            }
        }

        // 6. Totaux
        $totalHt = (float)($doc['totalHt'] ?? 0);
        $totalTtc = (float)($doc['totalTtc'] ?? 0);
        $hasValidTotals = ($totalHt >= 0 && $totalTtc >= $totalHt);
        $checklist[] = [
            'item' => 'Cohérence des totaux HT / TVA / TTC',
            'passed' => $hasValidTotals,
            'mandatory' => true,
            'details' => sprintf('HT: %.2f € | TTC: %.2f €', $totalHt, $totalTtc),
        ];
        if (!$hasValidTotals) {
            $errors[] = 'Les montants totaux HT et TTC sont incohérents.';
        }

        // 7. Conditions de règlement & mentions légales
        $paymentTerms = trim((string)($doc['paymentTerms'] ?? ''));
        $hasPaymentTerms = strlen($paymentTerms) > 0;
        $checklist[] = [
            'item' => 'Conditions de règlement & pénalités légales',
            'passed' => $hasPaymentTerms,
            'mandatory' => ($docType === 'INVOICE'),
        ];
        if (!$hasPaymentTerms && $docType === 'INVOICE') {
            $errors[] = 'Les conditions de règlement et mentions de pénalités de retard sont obligatoires sur la facture.';
        }

        $isCompliant = (count($errors) === 0);

        return [
            'isCompliant' => $isCompliant,
            'canIssue' => $isCompliant,
            'errors' => $errors,
            'warnings' => $warnings,
            'checklist' => $checklist,
        ];
    }
}
