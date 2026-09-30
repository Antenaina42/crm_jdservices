# JD-SERVICES MANAGEMENT — CRM & FACTURATION LÉGALE MULTI-WORKSPACES

> Solution SaaS B2B premium d'entreprise conçue pour **JD-SERVICES**, intégrant deux espaces de travail totalement cloisonnés : **IMPORT AUTOMOBILE** et **ACCOMPAGNEMENT RÉSEAU**, avec moteur de facturation proforma et légale française, conformité Code de commerce / CGI, audit trail immuable SHA-256 et préparation à la réforme de facturation électronique 2026/2027.

---

## 🌟 Points Clés & Architecture

1. **Isolation Stricte Multi-Workspaces (Zero Data Crossover)**
   - Deux environnements métier indépendants :
     - 🚗 **JD-SERVICES IMPORT AUTOMOBILE** (Import, vente, rachat, démarches WW, transport). Identité visuelle fidèle au site web officiel (`https://jd-services.m-itlevelup.com`).
     - 🖥️ **JD-SERVICES ACCOMPAGNEMENT RÉSEAU** (Audit IT, infrastructures, pare-feu, Wi-Fi 6, VLAN, forfaits de maintenance M1 / M2 / M3). Identité visuelle B2B Tech / Infrastructure.
   - **Garantie serveur** : Chaque requête d'API, Server Action ou lecture base de données filtre impérativement par `workspaceId`. Les clients, prospects, projets, documents et paiements ne fuient jamais d'un espace à l'autre.

2. **Générateur de Proformas & Factures Légales Françaises**
   - **Reproduction conforme du modèle référence** : Proforma client fidèle à la facture proforma de référence **MOREL Hortense** (N° `M10696MDB46468`), incluant les mentions d'acompte, cadre réservé JD-Services, coordonnées bancaires et mentions obligatoires.
   - **Distinction stricte Proforma vs Facture** : Une proforma est un devis commercial sans valeur comptable. La facture définitive scellée possède un numéro comptable non modifiable et non supprimable.
   - **Immuabilité & Avoirs** : Une facture émise ne peut être ni altérée ni supprimée. En cas de rectification, création traçable d'une facture d'avoir avec chaînage complet.
   - **Moteur fiscal multi-taux** : Taux de TVA configurables en base de données (20%, 10%, 5.5%, 2.1%, 0% export/exonéré), arrondis commerciaux au centime d'euro et snapshot figé sur chaque document émis.

3. **Moteur de Contrôle de Conformité Réglementaire (Checklist Pré-Émission)**
   - Vérification automatique avant émission selon le **Code de commerce (Art. L441-9)** et le **CGI (Art. 242 nonies A)** :
     - Dénomination sociale, SIREN/SIRET, TVA intracommunautaire, RCS / Greffe, adresse du siège.
     - Mentions clients, vérification obligatoire du SIREN B2B.
     - Dates d'émission et d'échéance, pénalités de retard, indemnité forfaitaire de 40 € pour frais de recouvrement.
     - Tableau de synthèse avec badge de conformité vert/rouge bloquant toute émission non conforme.

4. **Préparation Réforme Facturation Électronique 2026/2027 & Factur-X**
   - Module d'abstraction `EInvoicingProvider` gérant la génération de métadonnées Factur-X (EN16931 / profil BASIC), les statuts de cycle de vie (Déposée, Reçue, Approuvée, Refusée, Encaissée) et l'e-reporting pour les transactions B2C / Internationales.

5. **Signature Électronique eIDAS & Portail Client Sécurisé**
   - Portail de signature publique accessible par jeton cryptographique chiffré (`/client/signature/[token]` et `/sign/[token]`).
   - Traçabilité complète du signataire : nom, email, consentement explicite, adresse IP, User-Agent, horodatage certifié et empreinte SHA-256.
   - Changement automatique du statut du document (`SIGNED`), génération du dossier d'évidence et notification.

6. **Journal d'Audit Immuable (Audit Trail & Hachage SHA-256)**
   - Journalisation de chaque événement : Création, modification, émission, envoi email, signature, paiement, génération d'avoir, anonymisation.
   - Empreinte cryptographique SHA-256 calculée et stockée sur chaque document émis pour garantir la non-répudiation.
   - Consultation et filtrage dans l'interface dédiée (`/settings/audit-log`).

7. **Conformité RGPD & Conservation Légale 10 Ans**
   - Conservation légale des pièces comptables pendant 10 ans (Code de commerce art. L123-22).
   - Droit à l'effacement et anonymisation des données personnelles avec préservation de l'intégrité comptable (`/settings/rgpd`).

---

## 🛠️ Stack Technique

- **Framework** : Next.js 14 (App Router) + React 18 + TypeScript
- **Styling** : Tailwind CSS + Lucide Icons + Fonts Inter
- **Base de Données** : MySQL 9.1 (WAMP ou serveur distant)
- **ORM** : Prisma ORM 5.x
- **Authentification** : Sessions sécurisées JWT via cookies HttpOnly (`jose`), mots de passe hachés avec `bcryptjs`
- **Validation & Sécurité** : Zod, Crypto SHA-256 natif Node.js
- **Fournisseurs modulaires** :
  - Signature : Architecture prête pour Yousign / DocuSign / Universign avec fallback Mock Sandbox intégré
  - Email : Architecture prête pour Resend / Brevo / SMTP avec prévisualisation et fallback Mock
  - Stockage : Local FS sécurisé ou Cloud S3 / Cloudflare R2
  - Facturation Électronique : PDP / PPF / Peppol / Factur-X

---

## 🚀 Démarrage Rapide

### 1. Prérequis
- Node.js 18+ (Node.js 20+ recommandé)
- MySQL 8.0+ ou MySQL 9.1 (ex: WAMP Server)

### 2. Configuration de l'environnement
Copiez le fichier `.env.example` en `.env` :
```bash
cp .env.example .env
```
Vérifiez la chaîne de connexion MySQL :
```env
DATABASE_URL="mysql://root:root@localhost:3306/jd_services_management"
AUTH_SECRET="votre-cle-secrete-jwt-de-32-caracteres-minimum"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Initialisation de la Base de Données & Données Démo
Générez le client Prisma, synchronisez les tables et injectez les données de démonstration (comptes utilisateurs, taux de TVA, catalogues de prestations, clients tests MOREL Hortense et Entreprise Test Réseau, documents modèles) :
```bash
npx prisma generate
npx prisma db push
npm run seed
```

### 4. Lancement du Serveur de Développement
```bash
npm run dev
```
L'application est accessible sur : `http://localhost:3000`

---

## 🔐 Identifiants de Démonstration

L'application propose des boutons de connexion en 1 clic sur `/login` :

| Rôle | Email | Mot de passe | Espaces Autorisés |
| :--- | :--- | :--- | :--- |
| **Super Administrateur** | `admin@jd-services.fr` | `Admin2026!` | 🚗 Automobile + 🖥️ Réseau (Accès consolidé) |
| **Commercial Automobile** | `commercial.auto@jd-services.fr` | `Auto2026!` | 🚗 Automobile uniquement |
| **Commercial Réseau** | `commercial.network@jd-services.fr` | `Net2026!` | 🖥️ Réseau uniquement |
| **Comptable** | `comptable@jd-services.fr` | `Compta2026!` | 🚗 Automobile + 🖥️ Réseau (Lecture/Facturation) |

---

## 🧪 Tests Automatisés

Une suite complète de 23 tests unitaires et d'intégration valide l'ensemble des règles métier :
```bash
npm test
```
Tests couverts :
- Isolation stricte des données entre workspaces (vérification serveur)
- Moteur de numérotation séquentielle avec verrouillage de concurrence
- Moteur fiscal, règles de TVA et calculs d'arrondis au centime
- Checklist de conformité légale Code de commerce / CGI
- Empreinte cryptographique SHA-256 déterministe
- Génération et validation des dossiers de preuve de signature électronique
- Consignation du journal d'audit immuable

---

## 📁 Structure du Projet

```
c:/wamp64/www/Generateur_facture_legale_france/
├── prisma/
│   ├── schema.prisma              # Schéma de base de données relationnelle
│   └── seed.ts                    # Données de démonstration et configurations
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Page de connexion avec sélecteur 1-clic
│   │   ├── workspace-select/      # Sélecteur cinématique d'espace de travail
│   │   ├── automobile/            # Espace Métier 1 : Import Automobile
│   │   │   ├── dashboard/         # Dashboard Automobile avec KPIs
│   │   │   ├── clients/           # Fiches clients Automobile & véhicules
│   │   │   ├── pipeline/          # Kanban commercial 11 étapes
│   │   │   ├── proformas/         # Proformas (dont modèle Morel Hortense)
│   │   │   ├── invoices/          # Factures d'acompte, solde et avoirs
│   │   │   ├── payments/          # Rapprochement des règlements
│   │   │   ├── catalog/           # Catalogue de prestations Automobile
│   │   │   └── financial/         # Pilotage financier et TVA
│   │   ├── network/               # Espace Métier 2 : Accompagnement Réseau
│   │   │   ├── dashboard/         # Dashboard Réseau avec suivi contrats
│   │   │   ├── clients/           # Fiches clients Réseau & parcs IT
│   │   │   ├── pipeline/          # Pipeline commercial IT
│   │   │   ├── proformas/         # Proformas IT
│   │   │   ├── invoices/          # Factures et abonnements récurrents
│   │   │   ├── catalog/           # Catalogue M1/M2/M3, firewall, Wi-Fi 6
│   │   │   └── financial/         # Pilotage du Chiffre d'Affaires IT
│   │   ├── client/signature/[token] # Portail de signature électronique eIDAS
│   │   ├── settings/              # Paramètres légaux, TVA, utilisateurs, audit, RGPD
│   │   ├── admin/consolidated/    # Vue consolidée multi-sociétés Super Admin
│   │   ├── compliance/            # Centre de conformité réglementaire
│   │   └── api/                   # API Routes sécurisées (auth, docs, sign, export...)
│   ├── components/
│   │   ├── layout/                # WorkspaceLayout, Sidebar, Navigation
│   │   ├── documents/             # Modèles PDF/HTML (Automobile, Réseau, Factur-X)
│   │   ├── kanban/                # Composant Kanban drag-and-drop
│   │   └── ui/                    # Composants d'interface B2B premium
│   └── lib/
│       ├── auth.ts                # Gestion des sessions et permissions
│       ├── workspace.ts           # Middleware d'isolation des workspaces
│       ├── numbering.ts           # Moteur de séquençage transactionnel
│       ├── taxEngine.ts           # Moteur fiscal et calculs d'arrondis
│       ├── complianceEngine.ts    # Vérification des mentions légales obligatoires
│       ├── audit.ts               # Hachage SHA-256 et journal d'audit
│       └── providers/             # Modules Signatures, Email, Storage, Factur-X
└── test/
    └── run-tests.ts               # Suite de tests automatisés
```

---

## ⚖️ Conformité Légale & Sécurité

- **Article L441-9 du Code de commerce** : Contrôle strict des mentions obligatoires sur chaque facture émise.
- **Article 242 nonies A de l'annexe II au CGI** : Règles d'application des taux de TVA et adresses de facturation.
- **Facturation Électronique (Ordonnance n° 2021-1190)** : Structuration prête pour les formats Factur-X / UBL / CII et transmission aux plateformes agréées (PDP / PPF).
- **Règlement eIDAS n° 910/2014** : Horodatage, journal d'évidence et signature électronique à valeur probante.
- **Conservation 10 ans & RGPD** : Gestion conjointe de la prescription légale décennale et de l'anonymisation des données personnelles.
