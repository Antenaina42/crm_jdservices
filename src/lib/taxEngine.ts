import { prisma } from "@/lib/prisma";

export interface TaxCalculationLineInput {
  unitPriceHt: number;
  quantity: number;
  taxRate: number; // e.g. 20.0
  taxRateName?: string;
}

export interface TaxCalculationLineResult {
  totalHt: number;
  totalTax: number;
  totalTtc: number;
  taxRate: number;
}

export interface TaxCalculationTotalResult {
  totalHt: number;
  totalTax: number;
  totalTtc: number;
  breakdown: Array<{
    rate: number;
    name: string;
    baseHt: number;
    taxAmount: number;
  }>;
}

/**
 * Arrondi fiscal commercial standard (au centime d'euro le plus proche).
 */
export function roundToCent(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Calcule les montants d'une ligne de document.
 */
export function calculateLineTotals(input: TaxCalculationLineInput): TaxCalculationLineResult {
  const totalHt = roundToCent(input.unitPriceHt * input.quantity);
  const totalTax = roundToCent((totalHt * input.taxRate) / 100);
  const totalTtc = roundToCent(totalHt + totalTax);

  return {
    totalHt,
    totalTax,
    totalTtc,
    taxRate: input.taxRate,
  };
}

/**
 * Calcule les totaux d'un document complet avec ventilation par taux de TVA.
 */
export function calculateDocumentTotals(lines: TaxCalculationLineInput[]): TaxCalculationTotalResult {
  let totalHt = 0;
  let totalTax = 0;
  let totalTtc = 0;

  const breakdownMap = new Map<number, { rate: number; name: string; baseHt: number; taxAmount: number }>();

  for (const line of lines) {
    const lineRes = calculateLineTotals(line);
    totalHt = roundToCent(totalHt + lineRes.totalHt);
    totalTax = roundToCent(totalTax + lineRes.totalTax);
    totalTtc = roundToCent(totalTtc + lineRes.totalTtc);

    const existing = breakdownMap.get(line.taxRate) || {
      rate: line.taxRate,
      name: line.taxRateName || `TVA ${line.taxRate}%`,
      baseHt: 0,
      taxAmount: 0,
    };

    existing.baseHt = roundToCent(existing.baseHt + lineRes.totalHt);
    existing.taxAmount = roundToCent(existing.taxAmount + lineRes.totalTax);
    breakdownMap.set(line.taxRate, existing);
  }

  return {
    totalHt,
    totalTax,
    totalTtc,
    breakdown: Array.from(breakdownMap.values()),
  };
}

/**
 * Moteur de règles fiscales contextuelles.
 * Détermine le régime TVA applicable en fonction du pays client, B2B/B2C, et assujettissement.
 * Si les informations sont incomplètes, signale "Vérification fiscale requise".
 */
export async function determineTaxRule(params: {
  workspaceId: string;
  customerCountry: string;
  isCompany: boolean;
  hasVatNumber: boolean;
  operationType?: "SERVICES" | "GOODS";
}): Promise<{
  applicableRate: number;
  rateName: string;
  legalMention?: string;
  requiresManualVerification: boolean;
  reason: string;
}> {
  const { workspaceId, customerCountry, isCompany, hasVatNumber, operationType = "SERVICES" } = params;

  // 1. Récupérer le workspace pour connaître l'assujettissement
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { isVatSubject: true, country: true },
  });

  if (!workspace?.isVatSubject) {
    return {
      applicableRate: 0,
      rateName: "TVA non applicable",
      legalMention: "TVA non applicable, art. 293 B du CGI.",
      requiresManualVerification: false,
      reason: "Entreprise non assujettie à la TVA (Franchise en base)",
    };
  }

  const isDomestic = customerCountry.trim().toLowerCase() === "france";

  // Cas 1 : Vente en France métropolitaine
  if (isDomestic) {
    return {
      applicableRate: 20.0,
      rateName: "TVA normale France 20%",
      requiresManualVerification: false,
      reason: "Opération domestique soumise au taux standard 20%",
    };
  }

  // Cas 2 : Client Entreprise dans l'Union Européenne (Intracommunautaire)
  const isEU = ["allemagne", "belgique", "italie", "espagne", "pays-bas", "portugal", "luxembourg", "suisse"].includes(
    customerCountry.trim().toLowerCase()
  );

  if (isEU && isCompany) {
    if (hasVatNumber) {
      return {
        applicableRate: 0.0,
        rateName: "TVA Intracommunautaire 0%",
        legalMention: "Exonération de TVA, article 262 ter I du CGI (Autoliquidation par l'acquéreur).",
        requiresManualVerification: false,
        reason: "Prestation / livraison B2B intracommunautaire avec numéro de TVA valide",
      };
    } else {
      // Entreprise UE sans numéro de TVA communiqué
      return {
        applicableRate: 20.0,
        rateName: "Vérification fiscale requise",
        legalMention: "Numéro de TVA intracommunautaire client manquant. Vérification obligatoire.",
        requiresManualVerification: true,
        reason: "Attention : Entreprise de l'UE sans numéro de TVA intracommunautaire renseigné.",
      };
    }
  }

  // Cas 3 : Client Particulier dans l'UE
  if (isEU && !isCompany) {
    return {
      applicableRate: 20.0,
      rateName: "TVA normale 20%",
      requiresManualVerification: false,
      reason: "Vente B2C à un particulier au sein de l'UE (TVA du pays du prestataire pour les prestations de services)",
    };
  }

  // Cas 4 : Hors Union Européenne (Exportation)
  if (!isDomestic && !isEU) {
    return {
      applicableRate: 0.0,
      rateName: "Exonération TVA Export 0%",
      legalMention: "Exonération de TVA, article 262-I du CGI (Exportation hors Union Européenne).",
      requiresManualVerification: false,
      reason: "Exportation hors Union Européenne",
    };
  }

  // Cas indéterminé : exiger vérification manuelle
  return {
    applicableRate: 20.0,
    rateName: "Vérification fiscale requise",
    requiresManualVerification: true,
    reason: "Données territoriales ou fiscales insuffisantes. Veuillez confirmer le régime applicable.",
  };
}
