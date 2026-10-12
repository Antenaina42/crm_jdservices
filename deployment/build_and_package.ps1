# ==============================================================================
# Script de build et de packaging de livraison pour OVHcloud Perso
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host "=== 1. Validation du Backend PHP/PDO ===" -ForegroundColor Cyan
& "c:\wamp64\bin\php\php8.2.26\php.exe" php-backend/tests/test_backend.php
if ($LASTEXITCODE -ne 0) { throw "Erreur lors des tests du backend PHP" }

Write-Host "`n=== 2. Validation des Contrôleurs API PHP ===" -ForegroundColor Cyan
& "c:\wamp64\bin\php\php8.2.26\php.exe" php-backend/tests/test_controllers.php
if ($LASTEXITCODE -ne 0) { throw "Erreur lors des tests des contrôleurs PHP" }

Write-Host "`n=== 3. Compilation du Frontend Statique (Next.js export) ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Erreur de compilation Next.js" }

Write-Host "`n=== 4. Assemblage du dossier de livraison (release/) ===" -ForegroundColor Cyan
if (Test-Path release) {
    Remove-Item release -Recurse -Force
}
New-Item -ItemType Directory -Path release | Out-Null
Copy-Item -Path out\* -Destination release -Recurse

New-Item -ItemType Directory -Path release\api | Out-Null
New-Item -ItemType Directory -Path release\src | Out-Null
New-Item -ItemType Directory -Path release\config | Out-Null

Copy-Item -Path php-backend\api\* -Destination release\api -Recurse
Copy-Item -Path php-backend\src\* -Destination release\src -Recurse
Copy-Item -Path php-backend\config\config.php -Destination release\config\

Copy-Item -Path deployment\.htaccess -Destination release\.htaccess
Copy-Item -Path deployment\.ovhconfig -Destination release\.ovhconfig

Write-Host "`n=== SUCCÈS : Le dossier de livraison 'release/' est prêt à être téléversé sur OVH ! ===" -ForegroundColor Green
