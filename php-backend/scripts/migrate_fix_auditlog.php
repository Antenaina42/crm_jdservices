<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Database.php';

$pdo = \JdServices\Database::getConnection();

echo "Correction du schéma de la table auditlog..." . PHP_EOL;

// 1. Supprimer la contrainte de clé étrangère erronée sur entityId si elle existe
try {
    $pdo->exec('ALTER TABLE auditlog DROP FOREIGN KEY AuditLog_entityId_fkey');
    echo "  [OK] Contrainte AuditLog_entityId_fkey supprimée avec succès." . PHP_EOL;
} catch (\Throwable $e) {
    echo "  [INFO] " . $e->getMessage() . PHP_EOL;
}

// 2. Supprimer l'index associé si nécessaire
try {
    $pdo->exec('ALTER TABLE auditlog DROP INDEX AuditLog_entityId_idx');
    echo "  [OK] Index simple AuditLog_entityId_idx supprimé." . PHP_EOL;
} catch (\Throwable $e) {
    // Normal s'il n'existe pas
}

// 3. Recréer un index normal non-contraignant sur (workspaceId, entityType, entityId)
try {
    $pdo->exec('ALTER TABLE auditlog ADD INDEX AuditLog_entity_idx (workspaceId, entityType, entityId)');
    echo "  [OK] Nouvel index composite (workspaceId, entityType, entityId) créé." . PHP_EOL;
} catch (\Throwable $e) {
    // Déjà présent
}

echo "Correction terminée !" . PHP_EOL;
