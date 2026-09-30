import { prisma } from "@/lib/prisma";
import { TransmissionStatus } from "@prisma/client";

export interface EInvoicePayload {
  documentId: string;
  workspaceId: string;
  documentNumber: string;
  documentType: "INVOICE" | "CREDIT_NOTE";
  issueDate: Date | string;
  totalHt: number;
  totalTax: number;
  totalTtc: number;
  sellerSiren: string;
  buyerSiren?: string;
  buyerCountry: string;
  operationType: "SERVICES" | "GOODS" | "MIXED";
}

export interface EInvoicingProvider {
  name: string;
  submitInvoice(payload: EInvoicePayload): Promise<{
    status: TransmissionStatus;
    transmissionReference?: string;
    message: string;
    isSimulation: boolean;
  }>;
  checkStatus(transmissionReference: string): Promise<{
    status: TransmissionStatus;
    updatedAt: Date;
    details?: string;
  }>;
  recordEReporting(payload: EInvoicePayload, paymentStatus?: string): Promise<any>;
}

/**
 * Fournisseur simulateur conforme à l'architecture cible de la réforme française.
 * Rappel fondamental : Un simple fichier PDF ne constitue PAS à lui seul une facture électronique
 * conforme à la réforme 2026/2027. La transmission réglementaire B2B impose le recours à une
 * Plateforme de Dématérialisation Partenaire (PDP) agréée ou au Portail Public de Facturation (PPF).
 */
export class MockEInvoicingProvider implements EInvoicingProvider {
  name = "mock_pdp_simulator";

  async submitInvoice(payload: EInvoicePayload) {
    const isB2BFrance = Boolean(payload.buyerSiren && payload.buyerCountry.toLowerCase() === "france");
    const transmissionReference = `PDP-SIM-${Date.now()}-${payload.documentNumber}`;

    // Création de l'enregistrement de traçabilité e-reporting / e-invoicing
    await prisma.electronicReportingRecord.create({
      data: {
        workspaceId: payload.workspaceId,
        documentId: payload.documentId,
        transactionType: isB2BFrance ? "B2B_DOMESTIC" : "B2C_DOMESTIC",
        transmissionFormat: "FACTUR_X",
        amountHt: payload.totalHt,
        taxAmount: payload.totalTax,
        amountTtc: payload.totalTtc,
        paymentStatus: "UNPAID",
        customerType: payload.buyerSiren ? "COMPANY" : "INDIVIDUAL",
        customerCountry: payload.buyerCountry,
        status: TransmissionStatus.SUBMITTED,
        submittedAt: new Date(),
        providerReference: transmissionReference,
        rawResponseJson: JSON.stringify({
          acknowledged: true,
          notice: "Prêt pour transmission PDP agréée (Environnement Sandbox Réforme 2026/2027)",
          standard: "Factur-X / EN16931 compliant structure",
        }),
      },
    });

    return {
      status: TransmissionStatus.SUBMITTED,
      transmissionReference,
      message: "Facture préparée au standard Factur-X / UBL et transmise au simulateur PDP.",
      isSimulation: true,
    };
  }

  async checkStatus(transmissionReference: string) {
    return {
      status: TransmissionStatus.ACCEPTED_BY_PLATFORM,
      updatedAt: new Date(),
      details: "Validé par le concentrateur fiscal partenaire.",
    };
  }

  async recordEReporting(payload: EInvoicePayload, paymentStatus: string = "PAID") {
    return await prisma.electronicReportingRecord.create({
      data: {
        workspaceId: payload.workspaceId,
        documentId: payload.documentId,
        transactionType: "B2C_DOMESTIC",
        transmissionFormat: "FACTUR_X",
        amountHt: payload.totalHt,
        taxAmount: payload.totalTax,
        amountTtc: payload.totalTtc,
        paymentStatus,
        paymentDate: new Date(),
        customerType: "INDIVIDUAL",
        customerCountry: payload.buyerCountry,
        status: TransmissionStatus.ACCEPTED_BY_PLATFORM,
        submittedAt: new Date(),
        providerReference: `E-REP-${Date.now()}`,
      },
    });
  }
}

export function getEInvoicingProvider(): EInvoicingProvider {
  return new MockEInvoicingProvider();
}
