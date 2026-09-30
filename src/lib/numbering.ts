import { prisma } from "@/lib/prisma";
import { DocumentType } from "@prisma/client";

/**
 * Moteur de numérotation séquentielle transactionnelle conforme aux règles françaises.
 * Garantit l'unicité, l'absence de trou (ou traçabilité stricte) et la chronologie par espace et par année.
 * Exemple généré : AUTO-PRO-2026-000001 ou NET-FAC-2026-000002
 */
export async function generateNextDocumentNumber(
  workspaceId: string,
  documentType: DocumentType,
  year: number = new Date().getFullYear(),
  customPrefix?: string
): Promise<{ documentNumber: string; sequentialIndex: number; year: number }> {
  return await prisma.$transaction(async (tx) => {
    // 1. Récupérer le workspace pour son préfixe par défaut si non spécifié
    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        slug: true,
        proformaPrefix: true,
        invoicePrefix: true,
        creditNotePrefix: true,
        quotePrefix: true,
      },
    });

    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} introuvable`);
    }

    const spaceCode = workspace.slug === "automobile" ? "AUTO" : "NET";
    let rawPrefix = "DOC";

    switch (documentType) {
      case DocumentType.PROFORMA:
        rawPrefix = workspace.proformaPrefix || "PRO";
        break;
      case DocumentType.INVOICE:
        rawPrefix = workspace.invoicePrefix || "FAC";
        break;
      case DocumentType.CREDIT_NOTE:
        rawPrefix = workspace.creditNotePrefix || "AV";
        break;
      case DocumentType.QUOTE:
        rawPrefix = workspace.quotePrefix || "DEV";
        break;
      case DocumentType.ADVANCE_PAYMENT:
        rawPrefix = "ACO";
        break;
    }

    const defaultPrefix = rawPrefix.startsWith(spaceCode) ? rawPrefix : `${spaceCode}-${rawPrefix}`;
    const prefix = customPrefix || defaultPrefix;

    // 2. Récupérer ou initialiser la séquence atomique pour ce workspace / type / année
    const sequence = await tx.numberSequence.upsert({
      where: {
        workspaceId_documentType_year: {
          workspaceId,
          documentType,
          year,
        },
      },
      update: {
        lastNumber: {
          increment: 1,
        },
      },
      create: {
        workspaceId,
        documentType,
        year,
        prefix,
        lastNumber: 1,
      },
    });

    const nextIndex = sequence.lastNumber;
    // Formatage sur 6 chiffres : ex 000001
    const paddedIndex = String(nextIndex).padStart(6, "0");
    const documentNumber = `${prefix}-${year}-${paddedIndex}`;

    return {
      documentNumber,
      sequentialIndex: nextIndex,
      year,
    };
  });
}
