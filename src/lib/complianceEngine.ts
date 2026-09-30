export interface ComplianceCheckResult {
  isCompliant: boolean;
  canIssue: boolean;
  errors: string[];
  warnings: string[];
  checklist: Array<{
    item: string;
    passed: boolean;
    mandatory: boolean;
    details?: string;
  }>;
}

export interface DocumentComplianceData {
  documentType: string;
  documentNumber: string;
  date: Date | string;
  dueDate: Date | string;
  seller: {
    companyName?: string | null;
    legalForm?: string | null;
    siren?: string | null;
    siret?: string | null;
    address?: string | null;
    postalCode?: string | null;
    city?: string | null;
    vatNumber?: string | null;
  };
  client: {
    isCompany: boolean;
    companyName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    siren?: string | null;
    address?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    deliveryAddress?: string | null;
  };
  lines: Array<{
    designation: string;
    quantity: number;
    unitPriceHt: number;
    taxRate: number;
  }>;
  totalHt: number;
  totalTtc: number;
  paymentTerms?: string | null;
}

/**
 * Moteur de conformité légale et fiscale française (Code de commerce art. L441-9, CGI art. 242 nonies A, Réforme 2026/2027)
 */
export function checkDocumentCompliance(doc: DocumentComplianceData): ComplianceCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checklist: ComplianceCheckResult["checklist"] = [];

  // 1. Numéro unique et chronologique
  const hasValidNumber = Boolean(doc.documentNumber && doc.documentNumber.trim().length > 3);
  checklist.push({
    item: "Numéro de document séquentiel et unique",
    passed: hasValidNumber,
    mandatory: true,
    details: doc.documentNumber,
  });
  if (!hasValidNumber) errors.push("Le document doit comporter un numéro séquentiel valide.");

  // 2. Dates réglementaires
  const hasDate = Boolean(doc.date);
  checklist.push({
    item: "Date d'émission du document",
    passed: hasDate,
    mandatory: true,
  });
  if (!hasDate) errors.push("La date d'émission est obligatoire.");

  const hasDueDate = Boolean(doc.dueDate);
  checklist.push({
    item: "Date d'échéance de paiement",
    passed: hasDueDate,
    mandatory: true,
  });
  if (!hasDueDate) errors.push("La date d'échéance de règlement est obligatoire.");

  // 3. Mentions vendeur
  const hasSellerIdentity = Boolean(doc.seller.companyName && doc.seller.siren);
  checklist.push({
    item: "Identité complète du vendeur (Raison sociale, SIREN/SIRET)",
    passed: hasSellerIdentity,
    mandatory: true,
    details: `${doc.seller.companyName || "Manquant"} - SIREN: ${doc.seller.siren || "Manquant"}`,
  });
  if (!hasSellerIdentity) errors.push("L'identité de l'émetteur (Raison sociale et SIREN) est incomplète.");

  const hasSellerAddress = Boolean(doc.seller.address && doc.seller.city);
  checklist.push({
    item: "Adresse du siège social de l'émetteur",
    passed: hasSellerAddress,
    mandatory: true,
  });
  if (!hasSellerAddress) errors.push("L'adresse du siège social du vendeur est obligatoire.");

  // 4. Mentions client
  const clientName = doc.client.isCompany
    ? doc.client.companyName
    : `${doc.client.firstName || ""} ${doc.client.lastName || ""}`.trim();
  const hasClientName = Boolean(clientName && clientName.length > 0);
  checklist.push({
    item: "Nom ou dénomination sociale du client",
    passed: hasClientName,
    mandatory: true,
    details: clientName || undefined,
  });
  if (!hasClientName) errors.push("L'identité du client (nom ou raison sociale) est obligatoire.");

  const hasClientAddress = Boolean(doc.client.address && doc.client.city);
  checklist.push({
    item: "Adresse de facturation du client",
    passed: hasClientAddress,
    mandatory: true,
  });
  if (!hasClientAddress) errors.push("L'adresse de facturation du client est obligatoire.");

  // Vérification B2B : SIREN Client (Obligatoire pour la réforme française de facturation électronique)
  if (doc.client.isCompany) {
    const hasClientSiren = Boolean(doc.client.siren && doc.client.siren.trim().length >= 9);
    checklist.push({
      item: "SIREN client (Obligation B2B réforme 2026)",
      passed: hasClientSiren,
      mandatory: doc.documentType === "INVOICE", // Bloquant pour facture définitive
      details: doc.client.siren ? `SIREN: ${doc.client.siren}` : "Non renseigné",
    });
    if (!hasClientSiren) {
      if (doc.documentType === "INVOICE") {
        errors.push("Le SIREN du client professionnel est obligatoire pour l'émission de facture (Réforme Facturation Électronique).");
      } else {
        warnings.push("Le SIREN du client professionnel est recommandé dès la proforma.");
      }
    }
  }

  // 5. Lignes et tarification
  const hasLines = doc.lines && doc.lines.length > 0;
  checklist.push({
    item: "Lignes de prestations / marchandises",
    passed: hasLines,
    mandatory: true,
    details: `${doc.lines?.length || 0} ligne(s)`,
  });
  if (!hasLines) {
    errors.push("Le document doit comporter au moins une ligne de prestation ou marchandise.");
  } else {
    for (let i = 0; i < doc.lines.length; i++) {
      const l = doc.lines[i];
      if (!l.designation || l.designation.trim().length === 0) {
        errors.push(`Ligne ${i + 1} : La désignation est obligatoire.`);
      }
      if (l.quantity <= 0) {
        errors.push(`Ligne ${i + 1} : La quantité doit être supérieure à zéro.`);
      }
    }
  }

  // 6. Totaux
  const hasValidTotals = doc.totalHt >= 0 && doc.totalTtc >= doc.totalHt;
  checklist.push({
    item: "Cohérence des totaux HT / TVA / TTC",
    passed: hasValidTotals,
    mandatory: true,
    details: `HT: ${doc.totalHt} € | TTC: ${doc.totalTtc} €`,
  });
  if (!hasValidTotals) errors.push("Les montants totaux HT et TTC sont incohérents.");

  // 7. Conditions de règlement & pénalités légales
  const hasPaymentTerms = Boolean(doc.paymentTerms && doc.paymentTerms.trim().length > 0);
  checklist.push({
    item: "Conditions de règlement & pénalités légales",
    passed: hasPaymentTerms,
    mandatory: doc.documentType === "INVOICE",
  });
  if (!hasPaymentTerms && doc.documentType === "INVOICE") {
    errors.push("Les conditions de règlement et mentions de pénalités de retard sont obligatoires sur la facture.");
  }

  const isCompliant = errors.length === 0;

  return {
    isCompliant,
    canIssue: isCompliant,
    errors,
    warnings,
    checklist,
  };
}
