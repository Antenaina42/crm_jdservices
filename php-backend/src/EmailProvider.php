<?php
declare(strict_types=1);

namespace JdServices;

class EmailProvider
{
    public static function renderEmailTemplate(string $templateType, array $data): array
    {
        $clientName = htmlspecialchars((string)($data['clientName'] ?? 'Client'));
        $documentNumber = htmlspecialchars((string)($data['documentNumber'] ?? ''));
        $totalTtc = htmlspecialchars((string)($data['totalTtc'] ?? '0.00 €'));
        $viewUrl = htmlspecialchars((string)($data['viewUrl'] ?? '#'));
        $signUrl = !empty($data['signUrl']) ? htmlspecialchars((string)$data['signUrl']) : null;
        $workspaceName = htmlspecialchars((string)($data['workspaceName'] ?? 'JD-SERVICES'));

        $subject = match ($templateType) {
            'PROFORMA_SENT' => "{$workspaceName} : Votre proforma n° {$documentNumber}",
            'INVOICE_SENT' => "{$workspaceName} : Facture n° {$documentNumber}",
            'SIGNATURE_REQUEST' => "{$workspaceName} : Signature électronique requise — Document {$documentNumber}",
            default => "{$workspaceName} : Document {$documentNumber}",
        };

        $bodyHtml = "
        <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;\">
          <div style=\"border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;\">
            <h2 style=\"margin: 0; color: #0f172a; font-size: 20px;\">{$workspaceName}</h2>
            <p style=\"margin: 4px 0 0; color: #6b7280; font-size: 13px;\">Gestion commerciale &amp; facturation</p>
          </div>
          <p>Bonjour <strong>{$clientName}</strong>,</p>
          <p>Veuillez trouver ci-joint les détails de votre document n° <strong>{$documentNumber}</strong> d'un montant total de <strong>{$totalTtc}</strong>.</p>
          <div style=\"text-align: center; margin: 32px 0;\">
            <a href=\"{$viewUrl}\" style=\"background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; display: inline-block;\">
              Consulter le document en ligne
            </a>
          </div>";

        if ($signUrl) {
            $bodyHtml .= "
          <div style=\"background: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin-top: 24px;\">
            <p style=\"margin: 0; font-size: 14px; color: #334155;\">
              Vous pouvez également valider et signer ce document électroniquement :<br>
              <a href=\"{$signUrl}\" style=\"color: #2563eb; font-weight: bold; text-decoration: underline;\">Accéder à la signature en ligne &rarr;</a>
            </p>
          </div>";
        }

        $bodyHtml .= "
          <div style=\"border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 16px; font-size: 11px; color: #9ca3af; text-align: center;\">
            <p style=\"margin: 0;\">Ce message vous a été adressé automatiquement par JD-Services Management.</p>
          </div>
        </div>";

        return [
            'subject' => $subject,
            'bodyHtml' => $bodyHtml,
        ];
    }

    public static function sendEmail(array $params): array
    {
        $config = require __DIR__ . '/../config/config.php';
        $provider = $config['mail']['provider'] ?? 'mock';

        $recipientEmail = $params['recipientEmail'] ?? '';
        $recipientName = $params['recipientName'] ?? '';
        $subject = $params['subject'] ?? 'Message JD-Services';
        $bodyHtml = $params['bodyHtml'] ?? '';
        $fromEmail = $config['mail']['from_email'];
        $fromName = $config['mail']['from_name'];

        $isSent = false;
        $errorMsg = null;

        if ($provider === 'native') {
            $headers = [
                'MIME-Version: 1.0',
                'Content-type: text/html; charset=UTF-8',
                "From: {$fromName} <{$fromEmail}>",
                "Reply-To: {$fromEmail}",
                'X-Mailer: PHP/' . phpversion(),
            ];
            $isSent = @mail($recipientEmail, $subject, $bodyHtml, implode("\r\n", $headers));
            if (!$isSent) {
                $errorMsg = "Échec d'envoi par la fonction mail() OVH.";
            }
        } else {
            // Mode 'mock' (développement ou tests)
            $isSent = true;
        }

        // Enregistrer la traçabilité dans la table emailmessage
        try {
            $pdo = Database::getConnection();
            $id = Database::generateId('eml_');
            $stmt = $pdo->prepare('
                INSERT INTO emailmessage (
                    id, workspaceId, documentId, templateType,
                    recipientEmail, recipientName, subject, bodyHtml,
                    status, provider, errorMessage, sentAt, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))
            ');
            $stmt->execute([
                $id,
                $params['workspaceId'] ?? null,
                $params['documentId'] ?? null,
                $params['templateType'] ?? 'PROFORMA_SENT',
                $recipientEmail,
                $recipientName,
                $subject,
                $bodyHtml,
                $isSent ? 'SENT' : 'FAILED',
                $provider,
                $errorMsg,
            ]);
        } catch (\Exception $e) {
            error_log("Failed to log email: " . $e->getMessage());
        }

        return [
            'success' => $isSent,
            'error' => $errorMsg,
        ];
    }
}
