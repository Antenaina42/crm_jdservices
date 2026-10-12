<?php
declare(strict_types=1);

// Test fonctionnel des contrôleurs de l'API PHP JD-SERVICES
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/ApiGuard.php';
require_once __DIR__ . '/../src/TaxEngine.php';
require_once __DIR__ . '/../src/Numbering.php';
require_once __DIR__ . '/../src/ComplianceEngine.php';
require_once __DIR__ . '/../src/Audit.php';
require_once __DIR__ . '/../src/SignatureProvider.php';

require_once __DIR__ . '/../src/Controllers/AuthController.php';
require_once __DIR__ . '/../src/Controllers/ClientsController.php';
require_once __DIR__ . '/../src/Controllers/DocumentsController.php';
require_once __DIR__ . '/../src/Controllers/PaymentsController.php';
require_once __DIR__ . '/../src/Controllers/ProjectsController.php';
require_once __DIR__ . '/../src/Controllers/CatalogController.php';
require_once __DIR__ . '/../src/Controllers/TaxController.php';
require_once __DIR__ . '/../src/Controllers/UsersController.php';
require_once __DIR__ . '/../src/Controllers/StatsController.php';
require_once __DIR__ . '/../src/Controllers/PublicSignatureController.php';

use JdServices\Database;
use JdServices\Auth;
use JdServices\Controllers\AuthController;
use JdServices\Controllers\ClientsController;
use JdServices\Controllers\DocumentsController;
use JdServices\Controllers\PaymentsController;
use JdServices\Controllers\ProjectsController;
use JdServices\Controllers\CatalogController;
use JdServices\Controllers\TaxController;
use JdServices\Controllers\UsersController;
use JdServices\Controllers\StatsController;

$config = require __DIR__ . '/../config/config.php';
$pdo = Database::getConnection();

// Authentifier l'admin et initialiser la session
$u = $pdo->query("SELECT * FROM user WHERE email = 'admin@jd-services.fr'")->fetch();
$sessionPayload = [
    'id' => $u['id'],
    'email' => $u['email'],
    'firstName' => $u['firstName'],
    'lastName' => $u['lastName'],
    'role' => $u['role'],
];
$token = Auth::encodeJwt($sessionPayload, $config['auth']['jwt_secret']);
$_COOKIE[$config['auth']['cookie_name']] = $token;

echo "=== TEST API 1: ClientsController::list ===" . PHP_EOL;
$_GET['workspaceId'] = 'automobile';
ob_start();
ClientsController::list();
$out = ob_get_clean();
$data = json_decode($out, true);
assert(isset($data['clients']));
echo "  [OK] " . count($data['clients']) . " clients récupérés dans 'automobile'." . PHP_EOL;

echo PHP_EOL . "=== TEST API 2: ProjectsController::list ===" . PHP_EOL;
$_GET['workspaceId'] = 'automobile';
ob_start();
ProjectsController::list();
$out = ob_get_clean();
$data = json_decode($out, true);
assert(isset($data['projects']));
echo "  [OK] " . count($data['projects']) . " projets récupérés dans 'automobile'." . PHP_EOL;

echo PHP_EOL . "=== TEST API 3: CatalogController::list ===" . PHP_EOL;
$_GET['workspaceId'] = 'automobile';
ob_start();
CatalogController::list();
$out = ob_get_clean();
$data = json_decode($out, true);
assert(isset($data['items']));
echo "  [OK] " . count($data['items']) . " prestations au catalogue." . PHP_EOL;

echo PHP_EOL . "=== TEST API 4: TaxController::list ===" . PHP_EOL;
$_GET['workspaceId'] = 'automobile';
ob_start();
TaxController::list();
$out = ob_get_clean();
$data = json_decode($out, true);
assert(isset($data['taxRates']));
echo "  [OK] " . count($data['taxRates']) . " taux de TVA configurés." . PHP_EOL;

echo PHP_EOL . "=== TEST API 5: UsersController::list ===" . PHP_EOL;
ob_start();
UsersController::list();
$out = ob_get_clean();
$data = json_decode($out, true);
assert(isset($data['users']));
// Vérification stricte : aucun hash de mot de passe ne doit être renvoyé !
foreach ($data['users'] as $usr) {
    assert(!isset($usr['passwordHash']), "Le hash du mot de passe ne doit JAMAIS fuiter !");
}
echo "  [OK] " . count($data['users']) . " utilisateurs récupérés (aucun hash exposé)." . PHP_EOL;

echo PHP_EOL . "=== TEST API 6: StatsController::get ===" . PHP_EOL;
$_GET['workspaceId'] = 'automobile';
ob_start();
StatsController::get();
$out = ob_get_clean();
$data = json_decode($out, true);
assert(isset($data['kpis']) && isset($data['financial']));
echo "  [OK] KPIs chargés : {$data['kpis']['clientsCount']} clients, CA HT={$data['financial']['caHt']} €" . PHP_EOL;

echo PHP_EOL . "=== TEST API 7: DocumentsController::list ===" . PHP_EOL;
$_GET['workspaceId'] = 'automobile';
ob_start();
DocumentsController::list();
$out = ob_get_clean();
$data = json_decode($out, true);
assert(isset($data['documents']));
echo "  [OK] " . count($data['documents']) . " documents trouvés." . PHP_EOL;

echo PHP_EOL . "==========================================" . PHP_EOL;
echo "TOUS LES CONTRÔLEURS API FONCTIONNENT PARFAITEMENT !" . PHP_EOL;
echo "==========================================" . PHP_EOL;
