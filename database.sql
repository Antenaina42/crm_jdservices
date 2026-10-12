-- ==============================================================================
-- JD-SERVICES MANAGEMENT — SCHEMA & BASE DE DONNÉES MYSQL (OVH MUTUALISÉ / PDO)
-- Fichier d'initialisation et d'import pour phpMyAdmin / MySQL CLI
-- Date de génération : 2026-10-12
-- Compatible : MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+
-- Charset : utf8mb4 / Collation : utf8mb4_unicode_ci
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- ------------------------------------------------------------------------------
-- 1. TABLE : workspace (Isolation stricte multi-activités Automobile & Réseau)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `workspace` (
  `id` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `activityType` ENUM('AUTOMOBILE','NETWORK') NOT NULL,
  `description` TEXT NULL,
  `companyName` VARCHAR(191) NOT NULL DEFAULT 'JD-SERVICES',
  `commercialName` VARCHAR(191) NULL,
  `legalForm` VARCHAR(191) NOT NULL DEFAULT 'SASU',
  `shareCapital` VARCHAR(191) NULL DEFAULT '1 000 €',
  `siren` VARCHAR(191) NOT NULL DEFAULT '130419377',
  `siret` VARCHAR(191) NOT NULL DEFAULT '13041937700018',
  `rcsCity` VARCHAR(191) NULL DEFAULT 'Saint-Priest / Lyon',
  `vatNumber` VARCHAR(191) NOT NULL DEFAULT 'FR130419377',
  `address` VARCHAR(191) NOT NULL DEFAULT '60 rue de l\'égalité',
  `postalCode` VARCHAR(191) NOT NULL DEFAULT '69800',
  `city` VARCHAR(191) NOT NULL DEFAULT 'Saint-Priest',
  `country` VARCHAR(191) NOT NULL DEFAULT 'France',
  `phone` VARCHAR(191) NOT NULL DEFAULT '06.25.98.67.23',
  `email` VARCHAR(191) NOT NULL DEFAULT 'contact@jd-services.fr',
  `website` VARCHAR(191) NULL DEFAULT 'https://rasolonjatovo.fr',
  `logoUrl` VARCHAR(191) NULL,
  `iban` VARCHAR(191) NULL,
  `bic` VARCHAR(191) NULL,
  `bankName` VARCHAR(191) NULL,
  `defaultPaymentTerms` VARCHAR(191) NULL DEFAULT 'Acompte 50% à la commande, solde à la livraison.',
  `legalNotice` TEXT NULL,
  `footerText` TEXT NULL,
  `isVatSubject` TINYINT(1) NOT NULL DEFAULT 1,
  `invoicePrefix` VARCHAR(191) NOT NULL DEFAULT 'FAC',
  `proformaPrefix` VARCHAR(191) NOT NULL DEFAULT 'PRO',
  `creditNotePrefix` VARCHAR(191) NOT NULL DEFAULT 'AV',
  `quotePrefix` VARCHAR(191) NOT NULL DEFAULT 'DEV',
  `complianceCheck` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Workspace_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABLE : user (Utilisateurs et authentification)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `firstName` VARCHAR(191) NOT NULL,
  `lastName` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `role` ENUM('SUPER_ADMIN','ADMIN','COMMERCIAL','COMPTABLE','LECTURE_SEULE') NOT NULL DEFAULT 'COMMERCIAL',
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABLE : workspaceuser (Liaison utilisateur <-> espace et permissions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `workspaceuser` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `role` ENUM('SUPER_ADMIN','ADMIN','COMMERCIAL','COMPTABLE','LECTURE_SEULE') NULL,
  `canManageDocuments` TINYINT(1) NOT NULL DEFAULT 1,
  `canSign` TINYINT(1) NOT NULL DEFAULT 1,
  `canIssueInvoices` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `WorkspaceUser_workspaceId_userId_key` (`workspaceId`,`userId`),
  KEY `WorkspaceUser_userId_fkey` (`userId`),
  CONSTRAINT `WorkspaceUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `WorkspaceUser_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspace` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABLE : client (CRM Clients & Prospects isolés par espace)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `client` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `clientNumber` VARCHAR(191) NOT NULL,
  `isCompany` TINYINT(1) NOT NULL DEFAULT 0,
  `companyName` VARCHAR(191) NULL,
  `firstName` VARCHAR(191) NOT NULL,
  `lastName` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NOT NULL,
  `address` VARCHAR(191) NOT NULL,
  `postalCode` VARCHAR(191) NOT NULL,
  `city` VARCHAR(191) NOT NULL,
  `country` VARCHAR(191) NOT NULL DEFAULT 'France',
  `deliveryAddress` VARCHAR(191) NULL,
  `deliveryPostalCode` VARCHAR(191) NULL,
  `deliveryCity` VARCHAR(191) NULL,
  `deliveryCountry` VARCHAR(191) NULL,
  `siren` VARCHAR(191) NULL,
  `siret` VARCHAR(191) NULL,
  `vatNumber` VARCHAR(191) NULL,
  `status` ENUM('PROSPECT','ACTIVE','ARCHIVED','LEGAL_HOLD') NOT NULL DEFAULT 'ACTIVE',
  `anonymizedAt` DATETIME(3) NULL,
  `anonymizationReason` TEXT NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Client_workspaceId_clientNumber_key` (`workspaceId`,`clientNumber`),
  KEY `Client_workspaceId_email_idx` (`workspaceId`,`email`),
  KEY `Client_workspaceId_lastName_idx` (`workspaceId`,`lastName`),
  CONSTRAINT `Client_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspace` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABLE : project (Dossiers projets Automobile / Réseau)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `project` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `projectNumber` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'IN_PROGRESS',
  `vehicleMake` VARCHAR(191) NULL,
  `vehicleModel` VARCHAR(191) NULL,
  `vehicleVersion` VARCHAR(191) NULL,
  `vehicleYear` INT NULL,
  `vehicleVin` VARCHAR(191) NULL,
  `vehiclePlate` VARCHAR(191) NULL,
  `vehicleMileage` INT NULL,
  `vehicleFuel` VARCHAR(191) NULL,
  `vehicleGearbox` VARCHAR(191) NULL,
  `vehicleOriginCountry` VARCHAR(191) NULL,
  `vehicleAdLink` TEXT NULL,
  `vehiclePurchasePrice` DOUBLE NULL,
  `vehicleNotes` TEXT NULL,
  `networkWorkstationsCount` INT NULL,
  `networkUsersCount` INT NULL,
  `networkSitesCount` INT NULL,
  `networkServers` TEXT NULL,
  `networkFirewall` VARCHAR(191) NULL,
  `networkSwitches` VARCHAR(191) NULL,
  `networkWifi` VARCHAR(191) NULL,
  `networkVpn` VARCHAR(191) NULL,
  `networkVlan` VARCHAR(191) NULL,
  `networkBackup` VARCHAR(191) NULL,
  `networkPlanLevel` VARCHAR(191) NULL,
  `networkNotes` TEXT NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Project_workspaceId_projectNumber_key` (`workspaceId`,`projectNumber`),
  KEY `Project_workspaceId_clientId_idx` (`workspaceId`,`clientId`),
  KEY `Project_clientId_fkey` (`clientId`),
  CONSTRAINT `Project_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `client` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Project_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspace` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TABLE : servicecatalogitem (Catalogue de prestations configurables)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `servicecatalogitem` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `category` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `unit` VARCHAR(191) NOT NULL DEFAULT 'Forfait',
  `defaultPriceHt` DOUBLE NOT NULL DEFAULT 0,
  `defaultTaxRate` DOUBLE NOT NULL DEFAULT 20,
  `frequency` VARCHAR(191) NOT NULL DEFAULT 'PONCTUELLE',
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ServiceCatalogItem_workspaceId_code_key` (`workspaceId`,`code`),
  KEY `ServiceCatalogItem_workspaceId_category_idx` (`workspaceId`,`category`),
  CONSTRAINT `ServiceCatalogItem_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspace` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. TABLE : taxrate (Taux de TVA paramétrables par espace)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `taxrate` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `rate` DOUBLE NOT NULL,
  `country` VARCHAR(191) NOT NULL DEFAULT 'FR',
  `type` VARCHAR(191) NOT NULL DEFAULT 'STANDARD',
  `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `effectiveTo` DATETIME(3) NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `legalMention` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `TaxRate_workspaceId_rate_idx` (`workspaceId`,`rate`),
  CONSTRAINT `TaxRate_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspace` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. TABLE : taxrule (Règles fiscales territoriales et B2B/B2C)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `taxrule` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `sellerCountry` VARCHAR(191) NOT NULL DEFAULT 'FR',
  `customerCountry` VARCHAR(191) NOT NULL DEFAULT 'FR',
  `customerType` VARCHAR(191) NOT NULL DEFAULT 'B2B',
  `operationType` VARCHAR(191) NOT NULL DEFAULT 'SERVICES',
  `taxRate` DOUBLE NOT NULL DEFAULT 20,
  `requiresTaxVerification` TINYINT(1) NOT NULL DEFAULT 0,
  `legalMention` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `TaxRule_workspaceId_customerType_idx` (`workspaceId`,`customerType`),
  CONSTRAINT `TaxRule_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspace` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. TABLE : documentrecord (Pièces de facturation : proformas, factures, acomptes, avoirs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `documentrecord` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NULL,
  `documentType` ENUM('QUOTE','PROFORMA','INVOICE','CREDIT_NOTE','ADVANCE_PAYMENT') NOT NULL,
  `documentNumber` VARCHAR(191) NOT NULL,
  `sequentialIndex` INT NOT NULL,
  `year` INT NOT NULL,
  `status` ENUM('DRAFT','ISSUED','SENT','DELIVERED','ACCEPTED','SIGNED','REJECTED','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED','CREDITED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `transmissionStatus` ENUM('NOT_SENT','READY','SUBMITTED','ACCEPTED_BY_PLATFORM','REJECTED_BY_PLATFORM','ERROR','UNKNOWN') NOT NULL DEFAULT 'NOT_SENT',
  `complianceStatus` VARCHAR(191) NOT NULL DEFAULT 'VALID',
  `complianceErrors` TEXT NULL,
  `originalInvoiceId` VARCHAR(191) NULL,
  `proformaId` VARCHAR(191) NULL,
  `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `operationDate` DATETIME(3) NULL,
  `dueDate` DATETIME(3) NOT NULL,
  `validityDays` INT NOT NULL DEFAULT 30,
  `paymentTerms` VARCHAR(191) NULL DEFAULT 'Acompte 50% à la commande, solde à la livraison.',
  `notes` TEXT NULL,
  `internalNotes` TEXT NULL,
  `specialMentions` TEXT NULL,
  `totalHt` DOUBLE NOT NULL DEFAULT 0,
  `totalTax` DOUBLE NOT NULL DEFAULT 0,
  `totalTtc` DOUBLE NOT NULL DEFAULT 0,
  `totalPaid` DOUBLE NOT NULL DEFAULT 0,
  `balanceDue` DOUBLE NOT NULL DEFAULT 0,
  `advancePercentage` DOUBLE NOT NULL DEFAULT 0,
  `isImmutable` TINYINT(1) NOT NULL DEFAULT 0,
  `documentHash` VARCHAR(191) NULL,
  `snapshotSellerJson` TEXT NULL,
  `snapshotClientJson` TEXT NULL,
  `snapshotTaxRulesJson` TEXT NULL,
  `issuedAt` DATETIME(3) NULL,
  `issuedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `DocumentRecord_workspaceId_documentNumber_key` (`workspaceId`,`documentNumber`),
  KEY `DocumentRecord_workspaceId_documentType_idx` (`workspaceId`,`documentType`),
  KEY `DocumentRecord_workspaceId_status_idx` (`workspaceId`,`status`),
  KEY `DocumentRecord_workspaceId_clientId_idx` (`workspaceId`,`clientId`),
  KEY `DocumentRecord_workspaceId_year_idx` (`workspaceId`,`year`),
  KEY `DocumentRecord_clientId_fkey` (`clientId`),
  KEY `DocumentRecord_projectId_fkey` (`projectId`),
  KEY `DocumentRecord_originalInvoiceId_fkey` (`originalInvoiceId`),
  CONSTRAINT `DocumentRecord_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `client` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `DocumentRecord_originalInvoiceId_fkey` FOREIGN KEY (`originalInvoiceId`) REFERENCES `documentrecord` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `DocumentRecord_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `DocumentRecord_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspace` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. TABLE : documentline (Lignes de prestations et ventilation TVA)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `documentline` (
  `id` VARCHAR(191) NOT NULL,
  `documentId` VARCHAR(191) NOT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `designation` TEXT NOT NULL,
  `description` TEXT NULL,
  `quantity` DOUBLE NOT NULL DEFAULT 1,
  `unit` VARCHAR(191) NOT NULL DEFAULT 'Forfait',
  `unitPriceHt` DOUBLE NOT NULL DEFAULT 0,
  `taxRate` DOUBLE NOT NULL DEFAULT 20,
  `taxRateName` VARCHAR(191) NULL DEFAULT 'TVA 20%',
  `totalHt` DOUBLE NOT NULL DEFAULT 0,
  `totalTax` DOUBLE NOT NULL DEFAULT 0,
  `totalTtc` DOUBLE NOT NULL DEFAULT 0,
  `taxExemptionReason` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  KEY `DocumentLine_documentId_idx` (`documentId`),
  CONSTRAINT `DocumentLine_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documentrecord` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. TABLE : numbersequence (Séquences de numérotation légale ininterrompue)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `numbersequence` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `documentType` ENUM('QUOTE','PROFORMA','INVOICE','CREDIT_NOTE','ADVANCE_PAYMENT') NOT NULL,
  `year` INT NOT NULL,
  `prefix` VARCHAR(191) NOT NULL,
  `lastNumber` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `NumberSequence_workspaceId_documentType_year_key` (`workspaceId`,`documentType`,`year`),
  CONSTRAINT `NumberSequence_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspace` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. TABLE : signaturerequest (Demandes de signature électronique)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `signaturerequest` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `documentId` VARCHAR(191) NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  `provider` VARCHAR(191) NOT NULL DEFAULT 'mock',
  `externalRequestId` VARCHAR(191) NULL,
  `status` ENUM('DRAFT','PENDING','VIEWED','SIGNED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `signerType` VARCHAR(191) NOT NULL DEFAULT 'CLIENT',
  `signerName` VARCHAR(191) NOT NULL,
  `signerEmail` VARCHAR(191) NOT NULL,
  `signerPhone` VARCHAR(191) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `viewedAt` DATETIME(3) NULL,
  `signedAt` DATETIME(3) NULL,
  `rejectedAt` DATETIME(3) NULL,
  `rejectionReason` TEXT NULL,
  `ipAddress` VARCHAR(191) NULL,
  `userAgent` TEXT NULL,
  `signedPdfHash` VARCHAR(191) NULL,
  `evidenceJson` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `SignatureRequest_token_key` (`token`),
  KEY `SignatureRequest_workspaceId_status_idx` (`workspaceId`,`status`),
  KEY `SignatureRequest_token_idx` (`token`),
  KEY `SignatureRequest_documentId_fkey` (`documentId`),
  CONSTRAINT `SignatureRequest_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documentrecord` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. TABLE : signatureevent (Horodatage juridique et preuves d'audit de signature)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `signatureevent` (
  `id` VARCHAR(191) NOT NULL,
  `signatureRequestId` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(191) NOT NULL,
  `ipAddress` VARCHAR(191) NULL,
  `userAgent` TEXT NULL,
  `payloadJson` TEXT NULL,
  `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `SignatureEvent_signatureRequestId_idx` (`signatureRequestId`),
  CONSTRAINT `SignatureEvent_signatureRequestId_fkey` FOREIGN KEY (`signatureRequestId`) REFERENCES `signaturerequest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 14. TABLE : payment (Encaissements et règlements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `documentId` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `paymentMethod` ENUM('TRANSFER','CARD','CASH','CHECK','OTHER') NOT NULL DEFAULT 'TRANSFER',
  `reference` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `receivedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Payment_workspaceId_documentId_idx` (`workspaceId`,`documentId`),
  KEY `Payment_workspaceId_clientId_idx` (`workspaceId`,`clientId`),
  KEY `Payment_documentId_fkey` (`documentId`),
  KEY `Payment_clientId_fkey` (`clientId`),
  CONSTRAINT `Payment_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `client` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Payment_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documentrecord` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Payment_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspace` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 15. TABLE : paymentreminder (Relances de paiements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `paymentreminder` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `documentId` VARCHAR(191) NOT NULL,
  `reminderLevel` INT NOT NULL DEFAULT 1,
  `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `sentById` VARCHAR(191) NULL,
  `channel` VARCHAR(191) NOT NULL DEFAULT 'EMAIL',
  `status` VARCHAR(191) NOT NULL DEFAULT 'SENT',
  `content` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `PaymentReminder_workspaceId_documentId_idx` (`workspaceId`,`documentId`),
  KEY `PaymentReminder_documentId_fkey` (`documentId`),
  CONSTRAINT `PaymentReminder_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documentrecord` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PaymentReminder_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspace` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 16. TABLE : documentstoragerecord (GED & Registre documentaire légal)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `documentstoragerecord` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NULL,
  `projectId` VARCHAR(191) NULL,
  `documentId` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `documentType` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL DEFAULT 'application/pdf',
  `fileSize` INT NOT NULL DEFAULT 0,
  `filePath` VARCHAR(191) NOT NULL,
  `hashSha256` VARCHAR(191) NULL,
  `retentionYears` INT NOT NULL DEFAULT 10,
  `legalHold` TINYINT(1) NOT NULL DEFAULT 0,
  `uploadedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `DocumentStorageRecord_workspaceId_documentType_idx` (`workspaceId`,`documentType`),
  KEY `DocumentStorageRecord_clientId_fkey` (`clientId`),
  KEY `DocumentStorageRecord_projectId_fkey` (`projectId`),
  KEY `DocumentStorageRecord_documentId_fkey` (`documentId`),
  CONSTRAINT `DocumentStorageRecord_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `client` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `DocumentStorageRecord_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documentrecord` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `DocumentStorageRecord_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `DocumentStorageRecord_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspace` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 17. TABLE : emailmessage (Traçabilité des envois d'e-mails)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `emailmessage` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `documentId` VARCHAR(191) NULL,
  `templateType` ENUM('PROFORMA_CREATED','PROFORMA_SENT','SIGNATURE_REQUEST','SIGNATURE_COMPLETED','SIGNATURE_REJECTED','INVOICE_CREATED','INVOICE_SENT','PAYMENT_RECEIVED','PAYMENT_REMINDER','INVOICE_OVERDUE') NOT NULL,
  `recipientEmail` VARCHAR(191) NOT NULL,
  `recipientName` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `bodyHtml` TEXT NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'SENT',
  `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `openedAt` DATETIME(3) NULL,
  `provider` VARCHAR(191) NOT NULL DEFAULT 'mock',
  `providerMessageId` VARCHAR(191) NULL,
  `errorMessage` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `EmailMessage_workspaceId_documentId_idx` (`workspaceId`,`documentId`),
  KEY `EmailMessage_documentId_fkey` (`documentId`),
  CONSTRAINT `EmailMessage_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documentrecord` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `EmailMessage_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspace` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 18. TABLE : auditlog (Journal d'audit légal immuable)
-- NOTE ARCHITECTURALE : entityId est un identifiant polymorphe sans contrainte FK
-- vers documentrecord, afin de pouvoir auditer Document, Client, Project, User, etc.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `auditlog` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NULL,
  `userEmail` VARCHAR(191) NULL,
  `userRole` VARCHAR(191) NULL,
  `action` ENUM('CREATED','UPDATED','ISSUED','SENT','VIEWED','SIGNED','REJECTED','CANCELLED','CREDITED','PAID','PARTIALLY_PAID','ANONYMIZATION_REQUEST','ANONYMIZED','DELETED') NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `entityReference` VARCHAR(191) NULL,
  `oldValueJson` TEXT NULL,
  `newValueJson` TEXT NULL,
  `ipAddress` VARCHAR(191) NULL,
  `userAgent` TEXT NULL,
  `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `AuditLog_workspaceId_timestamp_idx` (`workspaceId`,`timestamp`),
  KEY `AuditLog_workspaceId_action_idx` (`workspaceId`,`action`),
  KEY `AuditLog_entityType_entityId_idx` (`entityType`,`entityId`),
  KEY `AuditLog_userId_fkey` (`userId`),
  KEY `AuditLog_entityId_idx` (`entityId`),
  CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `AuditLog_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspace` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 19. TABLE : electronicreportingrecord (E-Reporting réforme facturation 2026/2027)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `electronicreportingrecord` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `documentId` VARCHAR(191) NOT NULL,
  `transactionType` VARCHAR(191) NOT NULL DEFAULT 'B2B_DOMESTIC',
  `transmissionFormat` VARCHAR(191) NOT NULL DEFAULT 'FACTUR_X',
  `amountHt` DOUBLE NOT NULL,
  `taxAmount` DOUBLE NOT NULL,
  `amountTtc` DOUBLE NOT NULL,
  `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'UNPAID',
  `paymentDate` DATETIME(3) NULL,
  `customerType` VARCHAR(191) NOT NULL DEFAULT 'COMPANY',
  `customerCountry` VARCHAR(191) NOT NULL DEFAULT 'France',
  `status` ENUM('NOT_SENT','READY','SUBMITTED','ACCEPTED_BY_PLATFORM','REJECTED_BY_PLATFORM','ERROR','UNKNOWN') NOT NULL DEFAULT 'NOT_SENT',
  `submittedAt` DATETIME(3) NULL,
  `providerReference` VARCHAR(191) NULL,
  `rawResponseJson` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ElectronicReportingRecord_workspaceId_documentId_idx` (`workspaceId`,`documentId`),
  KEY `ElectronicReportingRecord_documentId_fkey` (`documentId`),
  CONSTRAINT `ElectronicReportingRecord_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documentrecord` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ElectronicReportingRecord_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspace` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 20. TABLE : anonymizationrequest (Droit à l'effacement RGPD Art. 17)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `anonymizationrequest` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `reason` TEXT NOT NULL,
  `requestedById` VARCHAR(191) NOT NULL,
  `resolvedById` VARCHAR(191) NULL,
  `resolvedAt` DATETIME(3) NULL,
  `resolutionNotes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `AnonymizationRequest_workspaceId_status_idx` (`workspaceId`,`status`),
  KEY `AnonymizationRequest_clientId_fkey` (`clientId`),
  CONSTRAINT `AnonymizationRequest_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `client` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AnonymizationRequest_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspace` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- DONNÉES INITIALES ESSENTIELLES (BASELINE DE PRODUCTION)
-- ==============================================================================

-- 1. Espaces de Travail Officiels
INSERT INTO `workspace` (`id`, `slug`, `name`, `activityType`, `description`, `companyName`, `commercialName`, `legalForm`, `shareCapital`, `siren`, `siret`, `rcsCity`, `vatNumber`, `address`, `postalCode`, `city`, `country`, `phone`, `email`, `website`, `invoicePrefix`, `proformaPrefix`, `creditNotePrefix`, `quotePrefix`, `defaultPaymentTerms`, `legalNotice`, `footerText`, `isVatSubject`, `complianceCheck`)
VALUES 
(
  'ws-auto-001',
  'automobile',
  'JD-SERVICES IMPORT AUTOMOBILE',
  'AUTOMOBILE',
  'Accompagnement à l\'import automobile européen, vente et rachat sécurisé.',
  'JD-SERVICES SASU',
  'JD-Services Import Automobile',
  'SASU',
  '1 000 €',
  '130419377',
  '13041937700018',
  'Saint-Priest / Lyon',
  'FR130419377',
  '60 rue de l\'égalité',
  '69800',
  'Saint-Priest',
  'France',
  '06.25.98.67.23',
  'contact@jd-services.fr',
  'https://rasolonjatovo.fr',
  'AUTO-FAC',
  'AUTO-PRO',
  'AUTO-AV',
  'AUTO-DEV',
  'Acompte de 50% à la commande, solde à la livraison du véhicule.',
  'TVA 20% - Pénalités de retard applicables au taux BCE majoré de 10 points. Indemnité forfaitaire de recouvrement : 40 € (art. D.441-5 C. com.).',
  'JD-Services - Services d\'accompagnement import auto\n60 rue de l\'égalité, 69800 Saint-Priest, France',
  1,
  1
),
(
  'ws-net-002',
  'network',
  'JD-SERVICES ACCOMPAGNEMENT RÉSEAU',
  'NETWORK',
  'Administration réseau, infrastructure informatique, sécurité et infogérance.',
  'JD-SERVICES SASU',
  'JD-Services Accompagnement Réseau',
  'SASU',
  '1 000 €',
  '130419377',
  '13041937700018',
  'Saint-Priest / Lyon',
  'FR130419377',
  '60 rue de l\'égalité',
  '69800',
  'Saint-Priest',
  'France',
  '06.25.98.67.23',
  'reseau@jd-services.fr',
  'https://rasolonjatovo.fr',
  'NET-FAC',
  'NET-PRO',
  'NET-AV',
  'NET-DEV',
  'Paiement à 30 jours date d\'émission de facture ou prélèvement mensuel SEPA.',
  'TVA 20% - En cas de retard de paiement, pénalité de 3 fois le taux d\'intérêt légal. Indemnité forfaitaire de recouvrement : 40 €.',
  'JD-Services - Accompagnement & Infrastructure Réseau\n60 rue de l\'égalité, 69800 Saint-Priest, France',
  1,
  1
)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `siren`=VALUES(`siren`);

-- 2. Compte Administrateur Initial
-- Mot de passe par défaut : Password123! (hash bcrypt standard cost 10)
-- RECOMMANDATION : À modifier dès la première connexion via Paramètres > Utilisateurs
INSERT INTO `user` (`id`, `email`, `passwordHash`, `firstName`, `lastName`, `phone`, `role`, `isActive`)
VALUES 
(
  'usr-superadmin-001',
  'admin@jd-services.fr',
  '$2y$10$UnXdEawBy1uTvRm.OEkT9OIiiUtacLpZ2KWxDLKpOnTjR5o3mcZJS',
  'Jean-Désiré',
  'Martialino',
  '06.25.98.67.23',
  'SUPER_ADMIN',
  1
)
ON DUPLICATE KEY UPDATE `role`=VALUES(`role`);

-- 3. Affectation de l'Administrateur aux deux espaces
INSERT INTO `workspaceuser` (`id`, `workspaceId`, `userId`, `role`, `canManageDocuments`, `canSign`, `canIssueInvoices`)
VALUES
('wsu-admin-auto', 'ws-auto-001', 'usr-superadmin-001', 'SUPER_ADMIN', 1, 1, 1),
('wsu-admin-net',  'ws-net-002',  'usr-superadmin-001', 'SUPER_ADMIN', 1, 1, 1)
ON DUPLICATE KEY UPDATE `role`=VALUES(`role`);

-- 4. Taux fiscaux de base (France)
INSERT INTO `taxrate` (`id`, `workspaceId`, `name`, `rate`, `country`, `type`, `isActive`)
VALUES
('tx-auto-20',  'ws-auto-001', 'TVA normale France 20%', 20.0, 'FR', 'STANDARD', 1),
('tx-auto-10',  'ws-auto-001', 'TVA intermédiaire 10%', 10.0, 'FR', 'REDUCED',  1),
('tx-auto-55',  'ws-auto-001', 'TVA réduite 5.5%', 5.5, 'FR', 'REDUCED',  1),
('tx-auto-00',  'ws-auto-001', 'Exonération TVA 0% (Export)', 0.0, 'FR', 'ZERO', 1),
('tx-net-20',   'ws-net-002',  'TVA normale France 20%', 20.0, 'FR', 'STANDARD', 1),
('tx-net-10',   'ws-net-002',  'TVA intermédiaire 10%', 10.0, 'FR', 'REDUCED',  1),
('tx-net-55',   'ws-net-002',  'TVA réduite 5.5%', 5.5, 'FR', 'REDUCED',  1),
('tx-net-00',   'ws-net-002',  'Autoliquidation TVA 0% (Art. 283-2 CGI)', 0.0, 'FR', 'ZERO', 1)
ON DUPLICATE KEY UPDATE `rate`=VALUES(`rate`);

-- 5. Catalogues de Prestations Métier Initiaux
INSERT INTO `servicecatalogitem` (`id`, `workspaceId`, `code`, `category`, `name`, `description`, `unit`, `defaultPriceHt`, `defaultTaxRate`, `frequency`, `isActive`)
VALUES
-- Prestations Automobile
('cat-auto-01', 'ws-auto-001', 'AUTO-CHK-01', 'CHECK', 'Service de check véhicule sur place', 'Inspection physique complète, vérification suivi de valise de diagnostic, contrôle kilométrique et accompagnement plaques WW.', 'Forfait', 650.0, 20.0, 'PONCTUELLE', 1),
('cat-auto-02', 'ws-auto-001', 'AUTO-RAP-01', 'RAPATRIEMENT', 'Rapatriement véhicule / Remorque', 'Rapatriement sécurisé du véhicule, carburant et péage selon devis.', 'Forfait', 500.0, 20.0, 'PONCTUELLE', 1),
('cat-auto-03', 'ws-auto-001', 'AUTO-WW-01',  'PLAQUES_WW', 'Accompagnement démarches plaques WW', 'Constitution dossier ANTS, obtention certificat d\'immatriculation provisoire CPI WW.', 'Forfait', 150.0, 20.0, 'PONCTUELLE', 1),
('cat-auto-04', 'ws-auto-001', 'AUTO-IMP-01', 'IMPORT_GLOBAL', 'Accompagnement import complet clé en main', 'Négociation vendeur étranger, vérification historique, check complet, rapatriement et immatriculation.', 'Forfait', 1200.0, 20.0, 'PONCTUELLE', 1),
-- Prestations Réseau & Infrastructure
('cat-net-01',  'ws-net-002',  'NET-AUD-01',  'AUDIT', 'Audit réseau & cybersécurité', 'Cartographie infrastructure, analyse vulnérabilités, test de débit et rapport de préconisations.', 'Forfait', 750.0, 20.0, 'PONCTUELLE', 1),
('cat-net-02',  'ws-net-002',  'NET-INS-01',  'INSTALLATION', 'Déploiement switch & VLAN', 'Configuration switch managé, segmentation VLAN entreprise, QoS et règles de routage.', 'Forfait', 600.0, 20.0, 'PONCTUELLE', 1),
('cat-net-03',  'ws-net-002',  'NET-FW-01',   'FIREWALL', 'Configuration pare-feu & VPN nomade', 'Sécurisation passerelle internet, inspection paquets, tunnel VPN IPsec / OpenVPN multi-sites.', 'Forfait', 850.0, 20.0, 'PONCTUELLE', 1),
('cat-net-04',  'ws-net-002',  'NET-M1',      'MAINTENANCE', 'Contrat M1 — Support & Supervision Essentiel', 'Supervision proactive des équipements critiques, support distant sous 4h ouvrées.', 'Mois', 250.0, 20.0, 'MENSUELLE', 1),
('cat-net-05',  'ws-net-002',  'NET-M2',      'MAINTENANCE', 'Contrat M2 — Infogérance & Réseau Pro', 'Supervision H24, administration pare-feu, gestion sauvegardes et interventions sur site.', 'Mois', 450.0, 20.0, 'MENSUELLE', 1),
('cat-net-06',  'ws-net-002',  'NET-M3',      'MAINTENANCE', 'Contrat M3 — Entreprise & Haute Disponibilité', 'Infogérance complète, plan de reprise d\'activité (PRA), support prioritaire 24/7.', 'Mois', 850.0, 20.0, 'MENSUELLE', 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `defaultPriceHt`=VALUES(`defaultPriceHt`);

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- FIN DU SCRIPT database.sql
-- ==============================================================================
