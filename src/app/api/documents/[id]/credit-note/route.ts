import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEntity } from "@/lib/apiGuard";
import { generateNextDocumentNumber } from "@/lib/numbering";
import { logAudit } from "@/lib/audit";
import { AuditAction, DocumentType, DocumentStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await guardEntity("document", params.id, "issue");
  if (!g.ok) return g.response;
  const { session, role } = g.access;

  const invoice = await prisma.documentRecord.findUnique({
    where: { id: params.id },
    include: {
      lines: true,
      workspace: true,
      client: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Facture d'origine introuvable" }, { status: 404 });
  }

  const body = await req.json();
  const { reason = "Annulation / Rectification commerciale", isFullCredit = true, amount } = body;

  // 1. Générer le numéro séquentiel d'Avoir
  const { documentNumber, sequentialIndex, year } = await generateNextDocumentNumber(
    invoice.workspaceId,
    DocumentType.CREDIT_NOTE
  );

  const creditTotalHt = isFullCredit ? invoice.totalHt : Number(amount) || invoice.totalHt;
  const creditTotalTax = isFullCredit ? invoice.totalTax : Math.round((creditTotalHt * 0.2) * 100) / 100;
  const creditTotalTtc = isFullCredit ? invoice.totalTtc : creditTotalHt + creditTotalTax;

  // 2. Créer l'Avoir légal
  const creditNote = await prisma.documentRecord.create({
    data: {
      workspaceId: invoice.workspaceId,
      clientId: invoice.clientId,
      projectId: invoice.projectId,
      documentType: DocumentType.CREDIT_NOTE,
      documentNumber,
      sequentialIndex,
      year,
      status: DocumentStatus.ISSUED,
      originalInvoiceId: invoice.id,
      date: new Date(),
      dueDate: new Date(),
      notes: `Avoir émis en rectification de la facture n° ${invoice.documentNumber}. Motif : ${reason}`,
      internalNotes: `Lien comptable direct : Facture ${invoice.documentNumber} &rarr; Avoir ${documentNumber}`,
      totalHt: creditTotalHt,
      totalTax: creditTotalTax,
      totalTtc: creditTotalTtc,
      isImmutable: true,
      lines: {
        create: invoice.lines.map((l) => ({
          sortOrder: l.sortOrder,
          designation: `Avoir sur : ${l.designation}`,
          description: reason,
          quantity: l.quantity,
          unit: l.unit,
          unitPriceHt: l.unitPriceHt,
          taxRate: l.taxRate,
          taxRateName: l.taxRateName,
          totalHt: l.totalHt,
          totalTax: l.totalTax,
          totalTtc: l.totalTtc,
        })),
      },
    },
  });

  // Mettre à jour le statut de la facture originale
  await prisma.documentRecord.update({
    where: { id: invoice.id },
    data: {
      status: DocumentStatus.CREDITED,
    },
  });

  // Audit Log
  await logAudit({
    workspaceId: invoice.workspaceId,
    userId: session.id,
    userEmail: session.email,
    userRole: session.role,
    action: AuditAction.CREDITED,
    entityType: "Document",
    entityId: creditNote.id,
    entityReference: creditNote.documentNumber,
    newValue: {
      action: "Création d'un avoir comptable",
      originalInvoiceNumber: invoice.documentNumber,
      creditNoteNumber: creditNote.documentNumber,
      amountCredited: creditTotalTtc,
      reason,
    },
  });

  return NextResponse.json({
    success: true,
    creditNote,
    message: `Avoir ${creditNote.documentNumber} émis avec succès pour la facture ${invoice.documentNumber}.`,
  });
}
