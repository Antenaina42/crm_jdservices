<?php
declare(strict_types=1);

/**
 * JD-SERVICES MANAGEMENT — Front Controller API
 * Routage des requêtes REST vers les contrôleurs PHP/PDO
 * Compatible Apache OVHcloud Perso (sans processus Node.js)
 */

// Autoloader PSR-4 pour JdServices
spl_autoload_register(function (string $class): void {
    $prefix = 'JdServices\\';
    $baseDir = __DIR__ . '/../src/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

// En-têtes CORS et Sécurité
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: {$origin}");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');

// Gestion des requêtes OPTIONS (pre-flight)
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $rawUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

    // Extraction du chemin relatif à partir de /api
    $apiPos = strpos($rawUri, '/api');
    if ($apiPos !== false) {
        $path = substr($rawUri, $apiPos);
    } else {
        $path = $rawUri;
    }

    $path = rtrim($path, '/');
    if (empty($path)) {
        $path = '/api';
    }

    // -------------------------------------------------------------------------
    // ROUTAGE
    // -------------------------------------------------------------------------

    // 1. Authentification
    if ($path === '/api/auth/login' && $method === 'POST') {
        \JdServices\Controllers\AuthController::login();
        exit;
    }
    if ($path === '/api/auth/logout' && $method === 'POST') {
        \JdServices\Controllers\AuthController::logout();
        exit;
    }
    if ($path === '/api/auth/me' && $method === 'GET') {
        \JdServices\Controllers\AuthController::me();
        exit;
    }

    // 2. Clients
    if ($path === '/api/clients' && $method === 'GET') {
        \JdServices\Controllers\ClientsController::list();
        exit;
    }
    if ($path === '/api/clients' && $method === 'POST') {
        \JdServices\Controllers\ClientsController::create();
        exit;
    }
    if (preg_match('#^/api/clients/([^/]+)/anonymize$#', $path, $m) && $method === 'POST') {
        \JdServices\Controllers\ClientsController::anonymize($m[1]);
        exit;
    }
    if (preg_match('#^/api/clients/([^/]+)$#', $path, $m)) {
        if ($method === 'GET') {
            \JdServices\Controllers\ClientsController::get($m[1]);
            exit;
        }
        if ($method === 'PUT') {
            \JdServices\Controllers\ClientsController::update($m[1]);
            exit;
        }
        if ($method === 'DELETE') {
            \JdServices\Controllers\ClientsController::delete($m[1]);
            exit;
        }
    }

    // 3. Documents (Devis, Proformas, Factures, Avoirs)
    if ($path === '/api/documents' && $method === 'GET') {
        \JdServices\Controllers\DocumentsController::list();
        exit;
    }
    if ($path === '/api/documents' && $method === 'POST') {
        \JdServices\Controllers\DocumentsController::create();
        exit;
    }
    if (preg_match('#^/api/documents/([^/]+)/issue$#', $path, $m) && $method === 'POST') {
        \JdServices\Controllers\DocumentsController::issue($m[1]);
        exit;
    }
    if (preg_match('#^/api/documents/([^/]+)/convert-to-invoice$#', $path, $m) && $method === 'POST') {
        \JdServices\Controllers\DocumentsController::convertToInvoice($m[1]);
        exit;
    }
    if (preg_match('#^/api/documents/([^/]+)/credit-note$#', $path, $m) && $method === 'POST') {
        \JdServices\Controllers\DocumentsController::creditNote($m[1]);
        exit;
    }
    if (preg_match('#^/api/documents/([^/]+)/request-signature$#', $path, $m) && $method === 'POST') {
        \JdServices\Controllers\DocumentsController::requestSignature($m[1]);
        exit;
    }
    if (preg_match('#^/api/documents/([^/]+)/send-email$#', $path, $m) && $method === 'POST') {
        \JdServices\Controllers\DocumentsController::sendEmail($m[1]);
        exit;
    }
    if (preg_match('#^/api/documents/([^/]+)$#', $path, $m)) {
        if ($method === 'GET') {
            \JdServices\Controllers\DocumentsController::get($m[1]);
            exit;
        }
        if ($method === 'PUT') {
            \JdServices\Controllers\DocumentsController::update($m[1]);
            exit;
        }
        if ($method === 'DELETE') {
            \JdServices\Controllers\DocumentsController::delete($m[1]);
            exit;
        }
    }

    // 4. Paiements
    if ($path === '/api/payments') {
        if ($method === 'GET') {
            \JdServices\Controllers\PaymentsController::list();
            exit;
        }
        if ($method === 'POST') {
            \JdServices\Controllers\PaymentsController::create();
            exit;
        }
    }

    // 5. Projets
    if ($path === '/api/projects') {
        if ($method === 'GET') {
            \JdServices\Controllers\ProjectsController::list();
            exit;
        }
        if ($method === 'POST') {
            \JdServices\Controllers\ProjectsController::create();
            exit;
        }
        if ($method === 'PUT') {
            \JdServices\Controllers\ProjectsController::update();
            exit;
        }
        if ($method === 'DELETE') {
            \JdServices\Controllers\ProjectsController::delete();
            exit;
        }
    }

    // 6. Catalogue de prestations
    if ($path === '/api/catalog') {
        if ($method === 'GET') {
            \JdServices\Controllers\CatalogController::list();
            exit;
        }
        if ($method === 'POST') {
            \JdServices\Controllers\CatalogController::create();
            exit;
        }
        if ($method === 'PUT') {
            \JdServices\Controllers\CatalogController::update();
            exit;
        }
        if ($method === 'DELETE') {
            \JdServices\Controllers\CatalogController::delete();
            exit;
        }
    }

    // 7. TVA et Fiscalité
    if ($path === '/api/tax') {
        if ($method === 'GET') {
            \JdServices\Controllers\TaxController::list();
            exit;
        }
        if ($method === 'POST') {
            \JdServices\Controllers\TaxController::create();
            exit;
        }
        if ($method === 'PUT') {
            \JdServices\Controllers\TaxController::update();
            exit;
        }
        if ($method === 'DELETE') {
            \JdServices\Controllers\TaxController::delete();
            exit;
        }
    }

    // 8. Utilisateurs & Permissions
    if ($path === '/api/users') {
        if ($method === 'GET') {
            \JdServices\Controllers\UsersController::list();
            exit;
        }
        if ($method === 'POST') {
            \JdServices\Controllers\UsersController::create();
            exit;
        }
        if ($method === 'PUT') {
            \JdServices\Controllers\UsersController::update();
            exit;
        }
        if ($method === 'DELETE') {
            \JdServices\Controllers\UsersController::delete();
            exit;
        }
    }

    // 9. Tableau de bord & KPIs
    if ($path === '/api/dashboard/stats' && $method === 'GET') {
        \JdServices\Controllers\StatsController::get();
        exit;
    }

    // 10. Signature Publique Client (Accès eIDAS par token sécurisé)
    if (preg_match('#^/api/public/signature/([^/]+)$#', $path, $m)) {
        if ($method === 'GET') {
            \JdServices\Controllers\PublicSignatureController::get($m[1]);
            exit;
        }
        if ($method === 'POST') {
            \JdServices\Controllers\PublicSignatureController::post($m[1]);
            exit;
        }
    }

    // Route non trouvée
    http_response_code(404);
    echo json_encode([
        'error' => "Endpoint introuvable : {$method} {$path}",
    ]);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Erreur interne du serveur',
        'details' => $e->getMessage(),
    ]);
}
