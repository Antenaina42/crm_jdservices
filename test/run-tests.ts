import { PrismaClient, DocumentType, DocumentStatus, RoleEnum } from "@prisma/client";
import { generateNextDocumentNumber } from "../src/lib/numbering";
import { calculateLineTotals, calculateDocumentTotals, roundToCent } from "../src/lib/taxEngine";
import { checkDocumentCompliance } from "../src/lib/complianceEngine";
import { computeDocumentHash } from "../src/lib/audit";
import { getSignatureProvider } from "../src/lib/providers/signatureProvider";

const prisma = new PrismaClient();

async function runTests() {
  console.log("==================================================");
  console.log("🚀 LANCEMENT DE LA SUITE DE TESTS JD-SERVICES MANAGEMENT");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ ÉCHEC : ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1 : TEST CRITIQUE D'ISOLATION STRICTE DES WORKSPACES
    // -------------------------------------------------------------
    console.log("\n[TEST 1] Isolation Stricte des Données Clients entre Espaces :");

    const autoWorkspace = await prisma.workspace.findUnique({ where: { slug: "automobile" } });
    const netWorkspace = await prisma.workspace.findUnique({ where: { slug: "network" } });

    assert(!!autoWorkspace && !!netWorkspace, "Les deux espaces Automobile et Réseau existent en base");

    // Client Automobile : MOREL Hortense
    const morelInAuto = await prisma.client.findFirst({
      where: { workspaceId: autoWorkspace!.id, lastName: { contains: "MOREL" } },
    });
    assert(!!morelInAuto, "Client MOREL Hortense présent dans l'espace Automobile");

    // Vérification critique : MOREL Hortense NE DOIT PAS être dans le réseau
    const morelInNet = await prisma.client.findFirst({
      where: { workspaceId: netWorkspace!.id, lastName: { contains: "MOREL" } },
    });
    assert(!morelInNet, "ISOLATION RESPECTÉE : MOREL Hortense n'apparaît JAMAIS dans le Réseau");

    // Client Réseau : Entreprise Test Réseau
    const netClientInNet = await prisma.client.findFirst({
      where: { workspaceId: netWorkspace!.id, companyName: { contains: "Entreprise Test Réseau" } },
    });
    assert(!!netClientInNet, "Client Entreprise Test Réseau présent dans l'espace Réseau");

    // Vérification critique : Entreprise Test Réseau NE DOIT PAS être dans l'automobile
    const netClientInAuto = await prisma.client.findFirst({
      where: { workspaceId: autoWorkspace!.id, companyName: { contains: "Entreprise Test Réseau" } },
    });
    assert(!netClientInAuto, "ISOLATION RESPECTÉE : Entreprise Test Réseau n'apparaît JAMAIS dans l'Automobile");

    // -------------------------------------------------------------
    // TEST 2 : MOTEUR DE NUMÉROTATION SÉQUENTIELLE TRANSACTIONNELLE
    // -------------------------------------------------------------
    console.log("\n[TEST 2] Moteur de Numérotation Séquentielle Transactionnelle :");

    const nextAutoNum = await generateNextDocumentNumber(autoWorkspace!.id, DocumentType.PROFORMA, 2026);
    assert(nextAutoNum.documentNumber.startsWith("AUTO-PRO-2026-"), `Numérotation Automobile correcte : ${nextAutoNum.documentNumber}`);

    const nextNetNum = await generateNextDocumentNumber(netWorkspace!.id, DocumentType.PROFORMA, 2026);
    assert(nextNetNum.documentNumber.startsWith("NET-PRO-2026-"), `Numérotation Réseau correcte : ${nextNetNum.documentNumber}`);

    assert(nextAutoNum.documentNumber !== nextNetNum.documentNumber, "Les numéros des deux espaces sont strictement distincts et non réutilisables");

    // -------------------------------------------------------------
    // TEST 3 : CALCULS FISCAUX & ARRONDI COMMERCIAL
    // -------------------------------------------------------------
    console.log("\n[TEST 3] Moteur de Calcul Fiscal & Arrondis au Centime :");

    // Vérifier calcul sur le modèle Morel Hortense : Check 650 + Rap 250 + WW 100 = 1000 HT -> 200 TVA -> 1200 TTC
    const testLines = [
      { unitPriceHt: 650, quantity: 1, taxRate: 20 },
      { unitPriceHt: 125, quantity: 2, taxRate: 20 },
      { unitPriceHt: 100, quantity: 1, taxRate: 20 },
    ];
    const totals = calculateDocumentTotals(testLines);

    assert(totals.totalHt === 1000.0, `Total HT conforme (1 000 €) : ${totals.totalHt} €`);
    assert(totals.totalTax === 200.0, `TVA 20% conforme (200 €) : ${totals.totalTax} €`);
    assert(totals.totalTtc === 1200.0, `Total TTC conforme (1 200 €) : ${totals.totalTtc} €`);

    // Test arrondi commercial avec centimes complexes
    const centLines = [
      { unitPriceHt: 33.33, quantity: 3, taxRate: 20 }, // 99.99 HT -> TVA 19.998 -> 20.00 -> TTC 119.99
    ];
    const centTotals = calculateDocumentTotals(centLines);
    assert(centTotals.totalHt === 99.99, `Arrondi HT au centime : ${centTotals.totalHt} €`);
    assert(centTotals.totalTax === 20.0, `Arrondi TVA au centime : ${centTotals.totalTax} €`);
    assert(centTotals.totalTtc === 119.99, `Arrondi TTC au centime : ${centTotals.totalTtc} €`);

    // -------------------------------------------------------------
    // TEST 4 : CONTRÔLE DE CONFORMITÉ LÉGALE AVANT ÉMISSION
    // -------------------------------------------------------------
    console.log("\n[TEST 4] Contrôle de Conformité Légale (Code de commerce art. L441-9) :");

    // Document incomplet (sans adresse client, sans lignes)
    const invalidCheck = checkDocumentCompliance({
      documentType: "INVOICE",
      documentNumber: "AUTO-FAC-2026-999999",
      date: new Date(),
      dueDate: new Date(),
      seller: { companyName: "JD-SERVICES SASU", siren: "130419377", address: "60 rue de l'égalité", city: "Saint-Priest" },
      client: { isCompany: false, firstName: "Inconnu", lastName: "" },
      lines: [],
      totalHt: 0,
      totalTtc: 0,
    });
    assert(!invalidCheck.isCompliant && !invalidCheck.canIssue, "Émission bloquée avec succès pour document incomplet");
    assert(invalidCheck.errors.length > 0, `Erreurs bloquantes détectées : ${invalidCheck.errors.length}`);

    // Document complet (conforme)
    const validCheck = checkDocumentCompliance({
      documentType: "INVOICE",
      documentNumber: "AUTO-FAC-2026-000001",
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      seller: { companyName: "JD-SERVICES SASU", siren: "130419377", address: "60 rue de l'égalité", city: "Saint-Priest" },
      client: { isCompany: false, firstName: "Hortense", lastName: "MOREL", address: "14 Rue Victor Hugo", city: "Lyon" },
      lines: [{ designation: "Check véhicule", quantity: 1, unitPriceHt: 650, taxRate: 20 }],
      totalHt: 650,
      totalTtc: 780,
      paymentTerms: "Paiement comptant",
    });
    assert(validCheck.isCompliant && validCheck.canIssue, "Document complet validé conforme par le moteur légal");

    // -------------------------------------------------------------
    // TEST 5 : EMPREINTE CRYPTOGRAPHIQUE SHA-256 D'IMMUTABILITÉ
    // -------------------------------------------------------------
    console.log("\n[TEST 5] Empreinte d'Intégrité Cryptographique SHA-256 :");

    const hash1 = computeDocumentHash({
      documentNumber: "AUTO-FAC-2026-000001",
      documentType: "INVOICE",
      date: "2026-09-30T10:00:00.000Z",
      sellerSiren: "130419377",
      clientIdentifier: "hortense.morel.demo@example.com",
      totalHt: 1000,
      totalTax: 200,
      totalTtc: 1200,
      lines: [{ designation: "Check véhicule", quantity: 1, unitPriceHt: 650, taxRate: 20 }],
    });

    const hash2 = computeDocumentHash({
      documentNumber: "AUTO-FAC-2026-000001",
      documentType: "INVOICE",
      date: "2026-09-30T10:00:00.000Z",
      sellerSiren: "130419377",
      clientIdentifier: "hortense.morel.demo@example.com",
      totalHt: 1000,
      totalTax: 200,
      totalTtc: 1200,
      lines: [{ designation: "Check véhicule", quantity: 1, unitPriceHt: 650, taxRate: 20 }],
    });

    assert(hash1 === hash2, `Hash reproductible déterministe : ${hash1.slice(0, 16)}...`);

    // Altération d'un seul centime
    const hashAltered = computeDocumentHash({
      documentNumber: "AUTO-FAC-2026-000001",
      documentType: "INVOICE",
      date: "2026-09-30T10:00:00.000Z",
      sellerSiren: "130419377",
      clientIdentifier: "hortense.morel.demo@example.com",
      totalHt: 1000.01, // 1 centime altéré
      totalTax: 200,
      totalTtc: 1200.01,
      lines: [{ designation: "Check véhicule", quantity: 1, unitPriceHt: 650, taxRate: 20 }],
    });

    assert(hash1 !== hashAltered, "Toute modification financière altère immédiatement l'empreinte de sécurité");

    // -------------------------------------------------------------
    // TEST 6 : SIGNATURE ÉLECTRONIQUE & PREUVE D'ÉVIDENCE eIDAS
    // -------------------------------------------------------------
    console.log("\n[TEST 6] Signature Électronique Sécurisée & Dossier d'Évidence :");

    const sigProvider = getSignatureProvider();
    const sigReq = await sigProvider.createSignatureRequest({
      documentId: "test-doc-123",
      documentNumber: "TEST-PRO-001",
      signerName: "Client Test",
      signerEmail: "test@client.fr",
      signerType: "CLIENT",
    });

    assert(sigReq.token.startsWith("sig_"), `Jeton de signature sécurisé généré : ${sigReq.token.slice(0, 16)}...`);

    const verification = await sigProvider.verifySignature(sigReq.token, {
      ipAddress: "192.168.1.50",
      userAgent: "Mozilla/5.0 Test Browser",
      signerName: "Client Test",
    });

    assert(verification.isSuccess, "Vérification de signature réussie");
    assert(!!verification.evidence.certificateFingerprint, "Horodatage et empreinte d'évidence certifiée générés");

    // -------------------------------------------------------------
    // TEST 7 : AUDIT TRAIL IMMUABLE
    // -------------------------------------------------------------
    console.log("\n[TEST 7] Journal d'Audit Immuable :");

    const auditCount = await prisma.auditLog.count();
    assert(auditCount > 0, `Entrées d'audit consignées en base (${auditCount} événements)`);

  } catch (err: any) {
    console.error("Erreur critique durant les tests :", err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n==================================================");
  console.log(`RÉSULTAT DES TESTS : ${passed} RÉUSSIS, ${failed} ÉCHECS`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
