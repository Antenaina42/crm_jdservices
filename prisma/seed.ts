import { PrismaClient, RoleEnum, ActivityType, ClientStatus, DocumentType, DocumentStatus, TransmissionStatus, SignatureStatus, AuditAction } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Début du peuplement de la base de données JD-SERVICES MANAGEMENT...");

  // 1. Mot de passe commun sécurisé pour la démonstration
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 2. Création des deux Espaces de Travail (Workspaces)
  console.log("⚙️ Initialisation des workspaces Automobile et Réseau...");

  const autoWorkspace = await prisma.workspace.upsert({
    where: { slug: "automobile" },
    update: {
      name: "JD-SERVICES IMPORT AUTOMOBILE",
      activityType: ActivityType.AUTOMOBILE,
      description: "Accompagnement à l'import automobile européen, vente et rachat sécurisé.",
      companyName: "JD-SERVICES SASU",
      commercialName: "JD-Services Import Automobile",
      legalForm: "SASU",
      shareCapital: "1 000 €",
      siren: "130419377",
      siret: "13041937700018",
      rcsCity: "Saint-Priest / Lyon",
      vatNumber: "FR130419377",
      address: "60 rue de l'égalité",
      postalCode: "69800",
      city: "Saint-Priest",
      country: "France",
      phone: "06.25.98.67.23",
      email: "contact@jd-services.fr",
      website: "https://jd-services.m-itlevelup.com",
      invoicePrefix: "AUTO-FAC",
      proformaPrefix: "AUTO-PRO",
      creditNotePrefix: "AUTO-AV",
      quotePrefix: "AUTO-DEV",
      defaultPaymentTerms: "Acompte de 50% à la commande, solde à la livraison du véhicule.",
      legalNotice: "TVA 20% - Pénalités de retard applicables au taux BCE majoré de 10 points. Indemnité forfaitaire de recouvrement : 40 € (art. D.441-5 C. com.).",
      footerText: "JD-Services - Services d'accompagnement import auto\n60 rue de l'égalité, 69800 Saint-Priest, France",
      isVatSubject: true,
      complianceCheck: true,
    },
    create: {
      slug: "automobile",
      name: "JD-SERVICES IMPORT AUTOMOBILE",
      activityType: ActivityType.AUTOMOBILE,
      description: "Accompagnement à l'import automobile européen, vente et rachat sécurisé.",
      companyName: "JD-SERVICES SASU",
      commercialName: "JD-Services Import Automobile",
      legalForm: "SASU",
      shareCapital: "1 000 €",
      siren: "130419377",
      siret: "13041937700018",
      rcsCity: "Saint-Priest / Lyon",
      vatNumber: "FR130419377",
      address: "60 rue de l'égalité",
      postalCode: "69800",
      city: "Saint-Priest",
      country: "France",
      phone: "06.25.98.67.23",
      email: "contact@jd-services.fr",
      website: "https://jd-services.m-itlevelup.com",
      invoicePrefix: "AUTO-FAC",
      proformaPrefix: "AUTO-PRO",
      creditNotePrefix: "AUTO-AV",
      quotePrefix: "AUTO-DEV",
      defaultPaymentTerms: "Acompte de 50% à la commande, solde à la livraison du véhicule.",
      legalNotice: "TVA 20% - Pénalités de retard applicables au taux BCE majoré de 10 points. Indemnité forfaitaire de recouvrement : 40 € (art. D.441-5 C. com.).",
      footerText: "JD-Services - Services d'accompagnement import auto\n60 rue de l'égalité, 69800 Saint-Priest, France",
      isVatSubject: true,
      complianceCheck: true,
    },
  });

  const netWorkspace = await prisma.workspace.upsert({
    where: { slug: "network" },
    update: {
      name: "JD-SERVICES ACCOMPAGNEMENT RÉSEAU",
      activityType: ActivityType.NETWORK,
      description: "Administration réseau, infrastructure informatique, sécurité et infogérance.",
      companyName: "JD-SERVICES SASU",
      commercialName: "JD-Services Accompagnement Réseau",
      legalForm: "SASU",
      shareCapital: "1 000 €",
      siren: "130419377",
      siret: "13041937700018",
      rcsCity: "Saint-Priest / Lyon",
      vatNumber: "FR130419377",
      address: "60 rue de l'égalité",
      postalCode: "69800",
      city: "Saint-Priest",
      country: "France",
      phone: "06.25.98.67.23",
      email: "reseau@jd-services.fr",
      website: "https://jd-services.m-itlevelup.com",
      invoicePrefix: "NET-FAC",
      proformaPrefix: "NET-PRO",
      creditNotePrefix: "NET-AV",
      quotePrefix: "NET-DEV",
      defaultPaymentTerms: "Paiement à 30 jours date d'émission de facture ou prélèvement mensuel SEPA.",
      legalNotice: "TVA 20% - En cas de retard de paiement, pénalité de 3 fois le taux d'intérêt légal. Indemnité forfaitaire de recouvrement : 40 €.",
      footerText: "JD-Services - Accompagnement & Infrastructure Réseau\n60 rue de l'égalité, 69800 Saint-Priest, France",
      isVatSubject: true,
      complianceCheck: true,
    },
    create: {
      slug: "network",
      name: "JD-SERVICES ACCOMPAGNEMENT RÉSEAU",
      activityType: ActivityType.NETWORK,
      description: "Administration réseau, infrastructure informatique, sécurité et infogérance.",
      companyName: "JD-SERVICES SASU",
      commercialName: "JD-Services Accompagnement Réseau",
      legalForm: "SASU",
      shareCapital: "1 000 €",
      siren: "130419377",
      siret: "13041937700018",
      rcsCity: "Saint-Priest / Lyon",
      vatNumber: "FR130419377",
      address: "60 rue de l'égalité",
      postalCode: "69800",
      city: "Saint-Priest",
      country: "France",
      phone: "06.25.98.67.23",
      email: "reseau@jd-services.fr",
      website: "https://jd-services.m-itlevelup.com",
      invoicePrefix: "NET-FAC",
      proformaPrefix: "NET-PRO",
      creditNotePrefix: "NET-AV",
      quotePrefix: "NET-DEV",
      defaultPaymentTerms: "Paiement à 30 jours date d'émission de facture ou prélèvement mensuel SEPA.",
      legalNotice: "TVA 20% - En cas de retard de paiement, pénalité de 3 fois le taux d'intérêt légal. Indemnité forfaitaire de recouvrement : 40 €.",
      footerText: "JD-Services - Accompagnement & Infrastructure Réseau\n60 rue de l'égalité, 69800 Saint-Priest, France",
      isVatSubject: true,
      complianceCheck: true,
    },
  });

  // 3. Utilisateurs & Permissions
  console.log("👤 Création des utilisateurs et assignation des rôles...");

  // Super Admin (accès Automobile + Réseau)
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@jd-services.fr" },
    update: { passwordHash, firstName: "Jean-Désiré", lastName: "Martialino", role: RoleEnum.SUPER_ADMIN },
    create: {
      email: "admin@jd-services.fr",
      passwordHash,
      firstName: "Jean-Désiré",
      lastName: "Martialino",
      role: RoleEnum.SUPER_ADMIN,
      phone: "06.25.98.67.23",
    },
  });

  // Commercial Automobile (accès exclusif Automobile)
  const autoCommercial = await prisma.user.upsert({
    where: { email: "commercial.auto@jd-services.fr" },
    update: { passwordHash, firstName: "Marc", lastName: "Dubois", role: RoleEnum.COMMERCIAL },
    create: {
      email: "commercial.auto@jd-services.fr",
      passwordHash,
      firstName: "Marc",
      lastName: "Dubois",
      role: RoleEnum.COMMERCIAL,
      phone: "06.11.22.33.44",
    },
  });

  // Commercial Réseau (accès exclusif Réseau)
  const netCommercial = await prisma.user.upsert({
    where: { email: "tech.network@jd-services.fr" },
    update: { passwordHash, firstName: "Thomas", lastName: "Leroy", role: RoleEnum.COMMERCIAL },
    create: {
      email: "tech.network@jd-services.fr",
      passwordHash,
      firstName: "Thomas",
      lastName: "Leroy",
      role: RoleEnum.COMMERCIAL,
      phone: "06.55.66.77.88",
    },
  });

  // Comptable (accès lecture/comptabilité aux deux espaces)
  const comptable = await prisma.user.upsert({
    where: { email: "comptable@jd-services.fr" },
    update: { passwordHash, firstName: "Sophie", lastName: "Bernard", role: RoleEnum.COMPTABLE },
    create: {
      email: "comptable@jd-services.fr",
      passwordHash,
      firstName: "Sophie",
      lastName: "Bernard",
      role: RoleEnum.COMPTABLE,
      phone: "06.99.88.77.66",
    },
  });

  // Relations Workspace <-> User
  await prisma.workspaceUser.deleteMany({});

  await prisma.workspaceUser.createMany({
    data: [
      { workspaceId: autoWorkspace.id, userId: superAdmin.id, role: RoleEnum.SUPER_ADMIN },
      { workspaceId: netWorkspace.id, userId: superAdmin.id, role: RoleEnum.SUPER_ADMIN },
      { workspaceId: autoWorkspace.id, userId: autoCommercial.id, role: RoleEnum.COMMERCIAL },
      { workspaceId: netWorkspace.id, userId: netCommercial.id, role: RoleEnum.COMMERCIAL },
      { workspaceId: autoWorkspace.id, userId: comptable.id, role: RoleEnum.COMPTABLE },
      { workspaceId: netWorkspace.id, userId: comptable.id, role: RoleEnum.COMPTABLE },
    ],
  });

  // 4. Moteur Fiscal - Taux de TVA configurables
  console.log("💶 Configuration des taux fiscaux configurables...");
  await prisma.taxRate.deleteMany({});

  const taxRatesAuto = [
    { workspaceId: autoWorkspace.id, name: "TVA normale France 20%", rate: 20.0, type: "STANDARD" },
    { workspaceId: autoWorkspace.id, name: "TVA intermédiaire 10%", rate: 10.0, type: "REDUCED" },
    { workspaceId: autoWorkspace.id, name: "TVA réduite 5.5%", rate: 5.5, type: "REDUCED" },
    { workspaceId: autoWorkspace.id, name: "Exonération TVA 0% (Export / Intracommunautaire)", rate: 0.0, type: "ZERO" },
  ];

  const taxRatesNet = [
    { workspaceId: netWorkspace.id, name: "TVA normale France 20%", rate: 20.0, type: "STANDARD" },
    { workspaceId: netWorkspace.id, name: "TVA intermédiaire 10%", rate: 10.0, type: "REDUCED" },
    { workspaceId: netWorkspace.id, name: "TVA réduite 5.5%", rate: 5.5, type: "REDUCED" },
    { workspaceId: netWorkspace.id, name: "Autoliquidation TVA 0% (Art. 283-2 CGI)", rate: 0.0, type: "ZERO" },
  ];

  await prisma.taxRate.createMany({ data: [...taxRatesAuto, ...taxRatesNet] });

  // 5. Catalogues de Services Configurables
  console.log("📦 Initialisation des catalogues de services indépendants...");
  await prisma.serviceCatalogItem.deleteMany({});

  // Services Automobile
  const autoCatalog = [
    {
      workspaceId: autoWorkspace.id,
      code: "AUTO-CHK-01",
      category: "CHECK",
      name: "Service de check véhicule sur place",
      description: "Inspection physique complète, vérification suivi de valise de diagnostic, contrôle kilométrique et accompagnement pour les plaques WW.",
      unit: "Forfait",
      defaultPriceHt: 650.0,
      defaultTaxRate: 20.0,
    },
    {
      workspaceId: autoWorkspace.id,
      code: "AUTO-RAP-01",
      category: "RAPATRIEMENT",
      name: "Rapatriement véhicule / Location remorque",
      description: "Rapatriement sécurisé du véhicule avec remorque porte-voiture dédiée (2 jours inclus).",
      unit: "2 Jours",
      defaultPriceHt: 250.0,
      defaultTaxRate: 20.0,
    },
    {
      workspaceId: autoWorkspace.id,
      code: "AUTO-WW-01",
      category: "PLAQUE",
      name: "Plaque WW provisoire français",
      description: "Délivrance de certificat provisoire d'immatriculation CPI WW et pose de plaques homologuées.",
      unit: "Unité",
      defaultPriceHt: 100.0,
      defaultTaxRate: 20.0,
    },
    {
      workspaceId: autoWorkspace.id,
      code: "AUTO-IMP-01",
      category: "IMPORT",
      name: "Accompagnement Import Clé en Main",
      description: "Recherche, négociation vendeur européen, contrôle administratif complet, transport et immatriculation.",
      unit: "Forfait",
      defaultPriceHt: 1200.0,
      defaultTaxRate: 20.0,
    },
    {
      workspaceId: autoWorkspace.id,
      code: "AUTO-TRP-01",
      category: "TRANSPORT",
      name: "Transport plateau sécurisé",
      description: "Acheminement direct concession Europe vers France métropolitaine.",
      unit: "Trajet",
      defaultPriceHt: 450.0,
      defaultTaxRate: 20.0,
    },
    {
      workspaceId: autoWorkspace.id,
      code: "AUTO-ADM-01",
      category: "ADMINISTRATIF",
      name: "Dossier ANTS & Quitus Fiscal",
      description: "Prise en charge intégrale des formalités fiscales et d'obtention de carte grise définitive.",
      unit: "Dossier",
      defaultPriceHt: 150.0,
      defaultTaxRate: 20.0,
    },
  ];

  // Services Réseau
  const netCatalog = [
    {
      workspaceId: netWorkspace.id,
      code: "NET-AUD-01",
      category: "AUDIT",
      name: "Audit infrastructure & cartographie réseau",
      description: "Audit d'architecture réseau, analyse de vulnérabilités, inventaire des équipements et préconisations.",
      unit: "Prestation",
      defaultPriceHt: 850.0,
      defaultTaxRate: 20.0,
    },
    {
      workspaceId: netWorkspace.id,
      code: "NET-INST-01",
      category: "INSTALLATION",
      name: "Installation Baie & Câblage Réseau",
      description: "Montage baie 19 pouces, brassage RJ45 Cat6A, pose switch manageable et onduleur.",
      unit: "Forfait",
      defaultPriceHt: 1200.0,
      defaultTaxRate: 20.0,
    },
    {
      workspaceId: netWorkspace.id,
      code: "NET-FW-01",
      category: "FIREWALL",
      name: "Configuration Pare-feu & Filtrage UTM",
      description: "Déploiement firewall nouvelle génération, filtrage web, inspection SSL et règles de segmentation.",
      unit: "Équipement",
      defaultPriceHt: 750.0,
      defaultTaxRate: 20.0,
    },
    {
      workspaceId: netWorkspace.id,
      code: "NET-WIFI-01",
      category: "WIFI",
      name: "Déploiement Wi-Fi Professionnel Roaming",
      description: "Bornes Wi-Fi 6 haute densité, contrôleur centralisé cloud et portail captif invité sécurisé.",
      unit: "Forfait",
      defaultPriceHt: 600.0,
      defaultTaxRate: 20.0,
    },
    {
      workspaceId: netWorkspace.id,
      code: "NET-VPN-01",
      category: "VPN",
      name: "Accès Distant Sécurisé VPN IPsec / WireGuard",
      description: "Interconnexion inter-sites sécurisée et passerelle télétravail avec double authentification MFA.",
      unit: "Configuration",
      defaultPriceHt: 450.0,
      defaultTaxRate: 20.0,
    },
    {
      workspaceId: netWorkspace.id,
      code: "NET-M1",
      category: "M1",
      name: "Contrat M1 — ESSENTIEL",
      description: "Supervision réseau 24/7, alertes préventives, maintien en conditions opérationnelles des switchs et routeurs.",
      unit: "Mois",
      defaultPriceHt: 290.0,
      defaultTaxRate: 20.0,
      frequency: "MENSUELLE",
    },
    {
      workspaceId: netWorkspace.id,
      code: "NET-M2",
      category: "M2",
      name: "Contrat M2 — PROFESSIONNEL",
      description: "Maintenance proactive réseau et sécurité, gestion pare-feu, mises à jour firmwares et support prioritaire J+1.",
      unit: "Mois",
      defaultPriceHt: 590.0,
      defaultTaxRate: 20.0,
      frequency: "MENSUELLE",
    },
    {
      workspaceId: netWorkspace.id,
      code: "NET-M3",
      category: "M3",
      name: "Contrat M3 — ENTREPRISE",
      description: "Infogérance totale infrastructure, haute disponibilité, astreinte technique H+4 et sauvegarde Cloud 3-2-1 vérifiée.",
      unit: "Mois",
      defaultPriceHt: 1190.0,
      defaultTaxRate: 20.0,
      frequency: "MENSUELLE",
    },
  ];

  await prisma.serviceCatalogItem.createMany({ data: [...autoCatalog, ...netCatalog] });

  // 6. Nettoyage des documents existants pour un seed propre
  console.log("🧹 Préparation des données de démonstration...");
  await prisma.electronicReportingRecord.deleteMany({});
  await prisma.signatureEvent.deleteMany({});
  await prisma.signatureRequest.deleteMany({});
  await prisma.documentStorageRecord.deleteMany({});
  await prisma.emailMessage.deleteMany({});
  await prisma.paymentReminder.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.documentLine.deleteMany({});
  await prisma.documentRecord.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.anonymizationRequest.deleteMany({});
  await prisma.client.deleteMany({});

  // 7. CLIENT AUTOMOBILE : MOREL Hortense (conforme au document PDF fourni)
  console.log("🚗 Création du client Automobile (MOREL Hortense) et de sa Proforma de référence...");
  const autoClient = await prisma.client.create({
    data: {
      workspaceId: autoWorkspace.id,
      clientNumber: "CLI-AUTO-2026-0001",
      isCompany: false,
      firstName: "Hortense",
      lastName: "MOREL",
      email: "hortense.morel.demo@example.com",
      phone: "06 12 34 56 78",
      address: "14 Rue Victor Hugo",
      postalCode: "69002",
      city: "Lyon",
      country: "France",
      status: ClientStatus.ACTIVE,
      notes: "Projet d'accompagnement import BMW X5 en provenance de Munich (Allemagne).",
    },
  });

  // Projet Automobile
  const autoProject = await prisma.project.create({
    data: {
      workspaceId: autoWorkspace.id,
      clientId: autoClient.id,
      projectNumber: "PRJ-AUTO-2026-001",
      title: "Accompagnement Import BMW X5 xDrive30d",
      type: "Import",
      status: "IN_PROGRESS",
      vehicleMake: "BMW",
      vehicleModel: "X5 xDrive30d M Sport",
      vehicleYear: 2022,
      vehicleMileage: 42000,
      vehicleVin: "WBA11AA000DEMO001",
      vehiclePlate: "WW-123-AB",
      vehicleFuel: "Diesel Hybride",
      vehicleGearbox: "Automatique Steptronic",
      vehicleOriginCountry: "Allemagne",
      vehiclePurchasePrice: 48500.0,
      vehicleNotes: "Véhicule première main en concession officielle allemande. Historique limpide avec carnet numérique.",
    },
  });

  // Proforma Automobile de référence exacte du PDF : M10696MDB46468
  const autoProforma = await prisma.documentRecord.create({
    data: {
      workspaceId: autoWorkspace.id,
      clientId: autoClient.id,
      projectId: autoProject.id,
      documentType: DocumentType.PROFORMA,
      documentNumber: "M10696MDB46468",
      sequentialIndex: 1,
      year: 2026,
      status: DocumentStatus.SENT,
      transmissionStatus: TransmissionStatus.NOT_SENT,
      complianceStatus: "VALID",
      date: new Date("2026-09-29T10:00:00Z"),
      dueDate: new Date("2026-10-29T10:00:00Z"),
      validityDays: 30,
      paymentTerms: "Acompte de 50% à la commande, solde à la livraison du véhicule.",
      notes: "NB: Carburant aller/retour + péage en SUS",
      internalNotes: "La voiture sera tracté avec notre véhicule par remorque.",
      specialMentions: "Arrêté la présente facture à la somme de mille deux cent euros.",
      totalHt: 1000.0,
      totalTax: 200.0,
      totalTtc: 1200.0,
      totalPaid: 0.0,
      balanceDue: 1200.0,
      advancePercentage: 50.0,
      isImmutable: false,
      documentHash: crypto.createHash("sha256").update("AUTO-M10696MDB46468-1000-200-1200").digest("hex"),
      snapshotSellerJson: JSON.stringify({
        companyName: "Jean-Désiré Martialino SASU",
        legalForm: "SASU",
        address: "60 rue de l'égalité, 69800 Saint-Priest, France",
        siret: "130419377",
        phone: "06.25.98.67.23",
        email: "contact@jd-services.fr",
      }),
      snapshotClientJson: JSON.stringify({
        name: "MOREL Hortense",
        address: "14 Rue Victor Hugo, 69002 Lyon, France",
        email: "hortense.morel.demo@example.com",
        phone: "06 12 34 56 78",
      }),
    },
  });

  // Lignes de la proforma automobile de référence
  await prisma.documentLine.createMany({
    data: [
      {
        documentId: autoProforma.id,
        sortOrder: 1,
        designation: "Service de check véhicule sur place avec vérification suivi de valise de diagnostic et km et accompagnement pour les plaques WW.",
        quantity: 1,
        unit: "Forfait",
        unitPriceHt: 650.0,
        taxRate: 20.0,
        taxRateName: "TVA 20%",
        totalHt: 650.0,
        totalTax: 130.0,
        totalTtc: 780.0,
      },
      {
        documentId: autoProforma.id,
        sortOrder: 2,
        designation: "Rappatriement véhicule - Location remorque pour 2 jours,",
        quantity: 2,
        unit: "Jours",
        unitPriceHt: 125.0,
        taxRate: 20.0,
        taxRateName: "TVA 20%",
        totalHt: 250.0,
        totalTax: 50.0,
        totalTtc: 300.0,
      },
      {
        documentId: autoProforma.id,
        sortOrder: 3,
        designation: "Plaque ww français",
        quantity: 1,
        unit: "Unité",
        unitPriceHt: 100.0,
        taxRate: 20.0,
        taxRateName: "TVA 20%",
        totalHt: 100.0,
        totalTax: 20.0,
        totalTtc: 120.0,
      },
    ],
  });

  // Demande de signature client pour la proforma automobile
  const autoSignatureToken = "sig_auto_demo_token_morel_2026";
  await prisma.signatureRequest.create({
    data: {
      workspaceId: autoWorkspace.id,
      documentId: autoProforma.id,
      token: autoSignatureToken,
      provider: "mock",
      status: SignatureStatus.PENDING,
      signerType: "CLIENT",
      signerName: "MOREL Hortense",
      signerEmail: "hortense.morel.demo@example.com",
      signerPhone: "06 12 34 56 78",
      expiresAt: new Date("2026-10-29T23:59:59Z"),
      events: {
        create: [
          {
            eventType: "CREATED",
            ipAddress: "127.0.0.1",
            userAgent: "JD-Services Management Platform",
            payloadJson: JSON.stringify({ action: "Demande de signature proforma générée" }),
          },
        ],
      },
    },
  });

  // 8. CLIENT RÉSEAU : Entreprise Test Réseau (DEMO SARL)
  console.log("🖥️ Création du client Réseau indépendant et de sa proforma infrastructure...");
  const netClient = await prisma.client.create({
    data: {
      workspaceId: netWorkspace.id,
      clientNumber: "CLI-NET-2026-0001",
      isCompany: true,
      companyName: "Entreprise Test Réseau (DEMO SARL)",
      firstName: "Laurent",
      lastName: "Dupuis",
      email: "laurent.dupuis.demo@network-entreprise.fr",
      phone: "04 78 90 12 34",
      address: "85 Avenue Jean Jaurès",
      postalCode: "69007",
      city: "Lyon",
      country: "France",
      siren: "847592019",
      siret: "84759201900021",
      vatNumber: "FR84759201900",
      status: ClientStatus.ACTIVE,
      notes: "Société d'ingénierie (35 collaborateurs, 2 sites distants). Souhaite refondre son infrastructure réseau et passer sur contrat M2.",
    },
  });

  // Projet Réseau
  const netProject = await prisma.project.create({
    data: {
      workspaceId: netWorkspace.id,
      clientId: netClient.id,
      projectNumber: "PRJ-NET-2026-001",
      title: "Refonte Infrastructure & Contrat Infogérance M2",
      type: "Audit & M2",
      status: "IN_PROGRESS",
      networkWorkstationsCount: 35,
      networkUsersCount: 40,
      networkSitesCount: 2,
      networkServers: "1 Serveur Virtualisation VMware ESXi + NAS Synology RS2423+",
      networkFirewall: "Fortinet FortiGate 60F Cluster HA",
      networkSwitches: "3x Cisco Catalyst 1000 48 ports PoE+",
      networkWifi: "6x Bornes UniFi U6-Pro",
      networkVpn: "VPN IPsec inter-site Lyon-Paris + VPN Client SSL MFA",
      networkVlan: "VLAN 10 Prod, VLAN 20 Voip, VLAN 30 Guests, VLAN 99 Admin",
      networkBackup: "Stratégie 3-2-1 Veeam Backup & Replication vers Cloud chiffré",
      networkPlanLevel: "M2",
      networkNotes: "Planification des interventions le samedi pour minimiser l'impact utilisateur.",
    },
  });

  // Proforma Réseau
  const netProforma = await prisma.documentRecord.create({
    data: {
      workspaceId: netWorkspace.id,
      clientId: netClient.id,
      projectId: netProject.id,
      documentType: DocumentType.PROFORMA,
      documentNumber: "NET-PRO-2026-000001",
      sequentialIndex: 1,
      year: 2026,
      status: DocumentStatus.SENT,
      transmissionStatus: TransmissionStatus.NOT_SENT,
      complianceStatus: "VALID",
      date: new Date("2026-09-30T09:00:00Z"),
      dueDate: new Date("2026-10-30T09:00:00Z"),
      validityDays: 30,
      paymentTerms: "Paiement à 30 jours net par virement bancaire.",
      notes: "Prestation réalisée sur le site de Lyon 7ème. Mise en service hors heures ouvrées sans interruption de service.",
      internalNotes: "Vérifier compatibilité licence FortiGuard avant déploiement.",
      specialMentions: "Facturation mensuelle du contrat M2 à compter du mois de novembre 2026.",
      totalHt: 3370.0,
      totalTax: 674.0,
      totalTtc: 4044.0,
      totalPaid: 0.0,
      balanceDue: 4044.0,
      advancePercentage: 30.0,
      isImmutable: false,
      documentHash: crypto.createHash("sha256").update("NET-NET-PRO-2026-000001-3370-674-4044").digest("hex"),
      snapshotSellerJson: JSON.stringify({
        companyName: "JD-SERVICES SASU",
        commercialName: "JD-Services Accompagnement Réseau",
        address: "60 rue de l'égalité, 69800 Saint-Priest, France",
        siren: "130419377",
        phone: "06.25.98.67.23",
        email: "reseau@jd-services.fr",
      }),
      snapshotClientJson: JSON.stringify({
        companyName: "Entreprise Test Réseau (DEMO SARL)",
        contact: "Laurent Dupuis",
        address: "85 Avenue Jean Jaurès, 69007 Lyon, France",
        siren: "847592019",
        vatNumber: "FR84759201900",
      }),
    },
  });

  // Lignes de la proforma réseau
  await prisma.documentLine.createMany({
    data: [
      {
        documentId: netProforma.id,
        sortOrder: 1,
        designation: "Audit infrastructure & cartographie réseau",
        description: "Analyse des flux, identification des goulets d'étranglement et rapport de préconisations techniques.",
        quantity: 1,
        unit: "Prestation",
        unitPriceHt: 850.0,
        taxRate: 20.0,
        taxRateName: "TVA 20%",
        totalHt: 850.0,
        totalTax: 170.0,
        totalTtc: 1020.0,
      },
      {
        documentId: netProforma.id,
        sortOrder: 2,
        designation: "Configuration Pare-feu & Déploiement VLANs",
        description: "Mise en œuvre du firewall Fortinet, segmentation réseau VLAN (Prod, VoIP, Invités) et règles de sécurité.",
        quantity: 1,
        unit: "Équipement",
        unitPriceHt: 750.0,
        taxRate: 20.0,
        taxRateName: "TVA 20%",
        totalHt: 750.0,
        totalTax: 150.0,
        totalTtc: 900.0,
      },
      {
        documentId: netProforma.id,
        sortOrder: 3,
        designation: "Contrat M2 — PROFESSIONNEL (Engagement 1er trimestre)",
        description: "Infogérance proactive, supervision 24/7, support prioritaire et gestion des sauvegardes (3 mois).",
        quantity: 3,
        unit: "Mois",
        unitPriceHt: 590.0,
        taxRate: 20.0,
        taxRateName: "TVA 20%",
        totalHt: 1770.0,
        totalTax: 354.0,
        totalTtc: 2124.0,
      },
    ],
  });

  // Demande de signature client réseau
  const netSignatureToken = "sig_net_demo_token_dupuis_2026";
  await prisma.signatureRequest.create({
    data: {
      workspaceId: netWorkspace.id,
      documentId: netProforma.id,
      token: netSignatureToken,
      provider: "mock",
      status: SignatureStatus.PENDING,
      signerType: "CLIENT",
      signerName: "Laurent Dupuis (DEMO SARL)",
      signerEmail: "laurent.dupuis.demo@network-entreprise.fr",
      signerPhone: "04 78 90 12 34",
      expiresAt: new Date("2026-10-30T23:59:59Z"),
      events: {
        create: [
          {
            eventType: "CREATED",
            ipAddress: "127.0.0.1",
            userAgent: "JD-Services Management Platform",
            payloadJson: JSON.stringify({ action: "Demande de signature proforma réseau générée" }),
          },
        ],
      },
    },
  });

  // 9. Initialisation des séquences de numérotation pour 2026
  console.log("🔢 Initialisation des compteurs de numérotation séquentielle...");
  await prisma.numberSequence.deleteMany({});
  await prisma.numberSequence.createMany({
    data: [
      { workspaceId: autoWorkspace.id, documentType: DocumentType.PROFORMA, year: 2026, prefix: "AUTO-PRO", lastNumber: 1 },
      { workspaceId: autoWorkspace.id, documentType: DocumentType.INVOICE, year: 2026, prefix: "AUTO-FAC", lastNumber: 0 },
      { workspaceId: autoWorkspace.id, documentType: DocumentType.CREDIT_NOTE, year: 2026, prefix: "AUTO-AV", lastNumber: 0 },
      { workspaceId: autoWorkspace.id, documentType: DocumentType.QUOTE, year: 2026, prefix: "AUTO-DEV", lastNumber: 0 },

      { workspaceId: netWorkspace.id, documentType: DocumentType.PROFORMA, year: 2026, prefix: "NET-PRO", lastNumber: 1 },
      { workspaceId: netWorkspace.id, documentType: DocumentType.INVOICE, year: 2026, prefix: "NET-FAC", lastNumber: 0 },
      { workspaceId: netWorkspace.id, documentType: DocumentType.CREDIT_NOTE, year: 2026, prefix: "NET-AV", lastNumber: 0 },
      { workspaceId: netWorkspace.id, documentType: DocumentType.QUOTE, year: 2026, prefix: "NET-DEV", lastNumber: 0 },
    ],
  });

  // 10. Audit Log initial
  console.log("📝 Enregistrement de l'audit log initial...");
  await prisma.auditLog.deleteMany({});
  await prisma.auditLog.createMany({
    data: [
      {
        workspaceId: autoWorkspace.id,
        userId: superAdmin.id,
        userEmail: superAdmin.email,
        userRole: "SUPER_ADMIN",
        action: AuditAction.CREATED,
        entityType: "Document",
        entityId: autoProforma.id,
        entityReference: autoProforma.documentNumber,
        newValueJson: JSON.stringify({ action: "Création proforma automobile de référence M10696MDB46468", client: "MOREL Hortense", totalTtc: 1200.0 }),
        ipAddress: "127.0.0.1",
        userAgent: "JD-Services Management System Initialization",
      },
      {
        workspaceId: netWorkspace.id,
        userId: superAdmin.id,
        userEmail: superAdmin.email,
        userRole: "SUPER_ADMIN",
        action: AuditAction.CREATED,
        entityType: "Document",
        entityId: netProforma.id,
        entityReference: netProforma.documentNumber,
        newValueJson: JSON.stringify({ action: "Création proforma infrastructure NET-PRO-2026-000001", client: "Entreprise Test Réseau", totalTtc: 4044.0 }),
        ipAddress: "127.0.0.1",
        userAgent: "JD-Services Management System Initialization",
      },
    ],
  });

  console.log("✅ Seed terminé avec succès !");
  console.log("--------------------------------------------------");
  console.log("Comptes de test disponibles :");
  console.log("• Super Admin : admin@jd-services.fr (Mot de passe : Password123!)");
  console.log("• Commercial Auto : commercial.auto@jd-services.fr (Mot de passe : Password123!)");
  console.log("• Commercial Réseau : tech.network@jd-services.fr (Mot de passe : Password123!)");
  console.log("• Comptable : comptable@jd-services.fr (Mot de passe : Password123!)");
  console.log("--------------------------------------------------");
  console.log(`Lien signature client Auto : /client/signature/${autoSignatureToken}`);
  console.log(`Lien signature client Réseau : /client/signature/${netSignatureToken}`);
  console.log("--------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
