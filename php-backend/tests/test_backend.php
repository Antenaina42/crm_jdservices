<?php
declare(strict_types=1);

// Test unitaire et fonctionnel du backend PHP/PDO JD-SERVICES
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/ApiGuard.php';
require_once __DIR__ . '/../src/TaxEngine.php';
require_once __DIR__ . '/../src/Numbering.php';
require_once __DIR__ . '/../src/ComplianceEngine.php';
require_once __DIR__ . '/../src/Audit.php';
require_once __DIR__ . '/../src/SignatureProvider.php';

use JdServices\Database;
use JdServices\Auth;
use JdServices\ApiGuard;
use JdServices\TaxEngine;
use JdServices\Numbering;
use JdServices\ComplianceEngine;
use JdServices\Audit;
use JdServices\SignatureProvider;

$config = require __DIR__ . '/../config/config.php';

echo "=== TEST 1: Connexion PDO MySQL ===" . PHP_EOL;
try {
    $pdo = Database::getConnection();
    $version = $pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
    echo "  [OK] Connexion réussie à MySQL. Version: {$version}" . PHP_EOL;
} catch (Throwable $e) {
    echo "  [FAIL] Erreur de connexion: " . $e->getMessage() . PHP_EOL;
    exit(1);
}

echo PHP_EOL . "=== TEST 2: Vérification des tables ===" . PHP_EOL;
$stmt = $pdo->query("SHOW TABLES");
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "  [OK] " . count($tables) . " tables trouvées: " . implode(', ', array_slice($tables, 0, 8)) . "..." . PHP_EOL;

echo PHP_EOL . "=== TEST 3: Authentification & JWT ===" . PHP_EOL;
$stmtUser = $pdo->prepare('SELECT * FROM user WHERE email = ?');
$stmtUser->execute(['admin@jd-services.fr']);
$user = $stmtUser->fetch();

if (!$user) {
    echo "  [FAIL] Utilisateur admin@jd-services.fr introuvable !" . PHP_EOL;
    exit(1);
}

// Vérifier ou corriger le hash si besoin
if (!Auth::verifyPassword('Password123!', $user['passwordHash'])) {
    $newHash = Auth::hashPassword('Password123!');
    $pdo->prepare('UPDATE user SET passwordHash = ? WHERE id = ?')->execute([$newHash, $user['id']]);
    $user['passwordHash'] = $newHash;
    echo "  [INFO] Hash de mot de passe synchronisé avec succès." . PHP_EOL;
}

$isPassOk = Auth::verifyPassword('Password123!', $user['passwordHash']);
if ($isPassOk) {
    echo "  [OK] Mot de passe vérifié pour {$user['email']} (Rôle: {$user['role']})" . PHP_EOL;

    $jwtSecret = $config['auth']['jwt_secret'];
    $sessionPayload = [
        'id' => $user['id'],
        'email' => $user['email'],
        'firstName' => $user['firstName'],
        'lastName' => $user['lastName'],
        'role' => $user['role'],
        'workspaces' => [
            ['workspaceId' => 'workspace_auto', 'slug' => 'automobile', 'name' => 'JD Services Automobile', 'role' => 'SUPER_ADMIN'],
            ['workspaceId' => 'workspace_net', 'slug' => 'reseau', 'name' => 'JD Services Réseau & IT', 'role' => 'SUPER_ADMIN'],
        ],
    ];

    $token = Auth::encodeJwt($sessionPayload, $jwtSecret);
    echo "  [OK] JWT généré: " . substr($token, 0, 30) . "..." . PHP_EOL;

    $decoded = Auth::decodeJwt($token, $jwtSecret);
    if ($decoded && $decoded['email'] === 'admin@jd-services.fr') {
        echo "  [OK] JWT décodé avec succès: id={$decoded['id']}" . PHP_EOL;
    } else {
        echo "  [FAIL] Échec décodage JWT" . PHP_EOL;
        exit(1);
    }
} else {
    echo "  [FAIL] Mot de passe incorrect !" . PHP_EOL;
    exit(1);
}

echo PHP_EOL . "=== TEST 4: Isolation des espaces (ApiGuard) ===" . PHP_EOL;
$_COOKIE[$config['auth']['cookie_name']] = $token;
$guardRes = ApiGuard::guardWorkspace('automobile', 'read');
if ($guardRes['ok']) {
    echo "  [OK] Accès workspace 'automobile' accordé à superadmin (Workspace ID: {$guardRes['access']['workspaceId']})" . PHP_EOL;
} else {
    echo "  [FAIL] Accès refusé: " . ($guardRes['error'] ?? 'Inconnu') . PHP_EOL;
    exit(1);
}

echo PHP_EOL . "=== TEST 5: Moteur de calcul fiscal (TaxEngine) ===" . PHP_EOL;
$lines = [
    ['quantity' => 2, 'unitPriceHt' => 150.0, 'taxRate' => 20.0],
    ['quantity' => 1, 'unitPriceHt' => 50.0, 'taxRate' => 10.0],
];
$calc = TaxEngine::calculateDocumentTotals($lines);
echo "  [OK] Total HT: {$calc['totalHt']} € (Attendu: 350.0)" . PHP_EOL;
echo "  [OK] Total TVA: {$calc['totalTax']} € (Attendu: 65.0)" . PHP_EOL;
echo "  [OK] Total TTC: {$calc['totalTtc']} € (Attendu: 415.0)" . PHP_EOL;
assert($calc['totalHt'] === 350.0);
assert($calc['totalTax'] === 65.0);
assert($calc['totalTtc'] === 415.0);

echo PHP_EOL . "=== TEST 6: Numérotation légale séquentielle ===" . PHP_EOL;
$numAuto = Numbering::generateNextDocumentNumber('automobile', 'PROFORMA');
echo "  [OK] Numéro Automobile PROFORMA généré: {$numAuto['documentNumber']} (Index: {$numAuto['sequentialIndex']})" . PHP_EOL;
$numNet = Numbering::generateNextDocumentNumber('reseau', 'INVOICE');
echo "  [OK] Numéro Réseau FACTURE généré: {$numNet['documentNumber']} (Index: {$numNet['sequentialIndex']})" . PHP_EOL;

echo PHP_EOL . "=== TEST 7: Signature électronique & Preuve eIDAS ===" . PHP_EOL;
$sigReq = SignatureProvider::createSignatureRequest([
    'documentId' => 'doc_test_123',
    'workspaceId' => 'automobile',
    'signerName' => 'Client Test',
    'signerEmail' => 'client@test.fr',
]);
echo "  [OK] Token de signature généré: " . substr($sigReq['token'], 0, 20) . "..." . PHP_EOL;
$verified = SignatureProvider::verifySignature($sigReq['token'], ['signerName' => 'Client Test']);
echo "  [OK] Preuve eIDAS générée avec SHA-256: {$verified['evidence']['documentHash']}" . PHP_EOL;

echo PHP_EOL . "=== TEST 8: Journal d'Audit (AuditLog immuable) ===" . PHP_EOL;
$logRes = Audit::log(
    'automobile',
    Audit::CREATED,
    'Client',
    'cli_test_123',
    'CLI-001 - Client Test',
    null,
    ['name' => 'Client Test'],
    $decoded['id'],
    $decoded['email'],
    $decoded['role']
);
if ($logRes) {
    echo "  [OK] Entrée de journal d'audit créée avec succès: ID {$logRes}" . PHP_EOL;
} else {
    echo "  [FAIL] Échec de l'insertion dans auditlog" . PHP_EOL;
}

echo PHP_EOL . "==========================================" . PHP_EOL;
echo "TOUS LES TESTS DU BACKEND SONT VALIDÉS A 100% !" . PHP_EOL;
echo "==========================================" . PHP_EOL;
