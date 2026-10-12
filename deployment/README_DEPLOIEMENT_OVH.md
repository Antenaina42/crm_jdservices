# Guide de Déploiement OVHcloud Perso — JD-SERVICES MANAGEMENT
**Sous-domaine cible :** `https://crm.rasolonjatovo.fr`  
**Dépôt GitHub :** `https://github.com/Antenaina42/crm_jdservices`  
**Architecture :** Frontend Statique (HTML5/React) + API PHP 8.2 PDO + Base MySQL OVH

---

## 1. Import de la Base de Données (`database.sql`)

1. Connectez-vous à votre espace client **OVHcloud** > **Hébergements** > **Bases de données**.
2. Cliquez sur les **trois points (...)** de votre base de données MySQL > **Accéder à phpMyAdmin**.
3. Renseignez votre identifiant et mot de passe de base de données.
4. Cliquez sur l'onglet **Importer** en haut.
5. Sélectionnez le fichier `database.sql` situé à la racine du projet.
6. Cliquez sur **Exécuter** (en bas de page).
7. Les 20 tables sont créées avec les 2 espaces de travail (*Automobile* et *Réseau*), les taux de TVA initiaux, le catalogue de prestations et le compte Super Administrateur par défaut :
   - **Identifiant :** `admin@jd-services.fr`
   - **Mot de passe :** `Password123!`

---

## 2. Configuration des Secrets GitHub (Déploiement Automatisé)

Rendez-vous sur votre dépôt GitHub :  
👉 `https://github.com/Antenaina42/crm_jdservices/settings/secrets/actions`

Cliquez sur **New repository secret** et ajoutez les variables suivantes :

| Nom du Secret | Description | Exemple |
|---|---|---|
| `OVH_FTP_SERVER` | Hôte du serveur FTP OVH | `ftp.cluster0XX.hosting.ovh.net` |
| `OVH_FTP_USERNAME` | Identifiant FTP de l'hébergement OVH | `votre_login_ovh` |
| `OVH_FTP_PASSWORD` | Mot de passe de votre compte FTP OVH | `VotreMotDePasseFTP` |
| `OVH_REMOTE_DIR` | Répertoire distant dédié au sous-domaine `crm` | `crm/` (ou `www/crm/`) |
| `DB_HOST` | Hôte MySQL OVH | `mysqlXX.cluster0XX.hosting.ovh.net` |
| `DB_NAME` | Nom de votre base MySQL OVH | `votre_nom_base` |
| `DB_USER` | Utilisateur de la base MySQL | `votre_user_base` |
| `DB_PASS` | Mot de passe de la base MySQL | `VotreMotDePasseDB` |
| `AUTH_SECRET` | Clé secrète de chiffrement des tokens JWT (32+ car.) | `cle-secrete-tres-longue-jd-services-2026-mgmt` |

> ⚠️ **Sécurité absolue :** Vos identifiants et mots de passe ne sont **jamais** versionnés dans le code Git. Ils restent protégés dans les secrets GitHub et sont injectés exclusivement à la compilation dans le fichier protégé `config/.env.local.php`.

---

## 3. Déploiement Automatique via GitHub Actions

Dès que vous poussez sur la branche `main` :
```bash
git add .
git commit -m "feat: adaptation complete OVH Perso (frontend statique + API PHP/PDO + database.sql)"
git push origin main
```
Le workflow `.github/workflows/deploy.yml` se déclenche automatiquement :
1. Compilation du frontend statique en HTML/CSS/JS optimisé (`out/`).
2. Assemblage du dossier `release/` avec le frontend et le backend PHP/PDO.
3. Injection automatique des identifiants de production dans `config/.env.local.php`.
4. Téléversement sécurisé via FTPS directement dans le sous-dossier dédié sans toucher aux autres sites hébergés sur `rasolonjatovo.fr`.

---

## 4. Option Alternative : Déploiement Manuel via FileZilla

Si vous préférez téléverser manuellement sans GitHub Actions :
1. Exécutez le script d'assemblage local dans votre terminal :
   ```powershell
   powershell -ExecutionPolicy Bypass -File deployment\build_and_package.ps1
   ```
2. Créez le fichier `release/config/.env.local.php` avec vos vrais identifiants de base de données OVH :
   ```php
   <?php
   return [
       'DB_HOST' => 'votre_serveur_mysql_ovh',
       'DB_PORT' => 3306,
       'DB_NAME' => 'votre_base_ovh',
       'DB_USER' => 'votre_utilisateur_ovh',
       'DB_PASS' => 'votre_mot_de_passe_ovh',
       'AUTH_SECRET' => 'votre_cle_jwt_secrete_32_caracteres_minimum',
       'APP_URL' => 'https://crm.rasolonjatovo.fr',
       'APP_ENV' => 'production',
   ];
   ```
3. Ouvrez **FileZilla**, connectez-vous à votre hébergement OVH.
4. Ouvrez le dossier cible lié au sous-domaine `crm.rasolonjatovo.fr` (ex: `/www/crm/` ou `/crm/`).
5. Téléversez l'intégralité du contenu du dossier local `release/` dans ce dossier distant.

---

## 5. Vérification Finale en Ligne

Une fois le déploiement terminé, rendez-vous sur :
👉 **https://crm.rasolonjatovo.fr**

1. **Page de Connexion :** La mire de login s'affiche sans erreur Node.js.
2. **Connexion Super Admin :** Saisissez `admin@jd-services.fr` / `Password123!`.
3. **Sélection de l'Espace :** Choisissez *JD-Services Import Automobile* ou *JD-Services Accompagnement Réseau*.
4. **Tableau de Bord :** Les KPIs, le Chiffre d'Affaires et les activités récentes sont alimentés en direct via l'API PHP/PDO.
5. **Gestion Commerciale :** Testez la création d'un client, d'un dossier projet et d'un devis/proforma avec numérotation séquentielle conforme.
