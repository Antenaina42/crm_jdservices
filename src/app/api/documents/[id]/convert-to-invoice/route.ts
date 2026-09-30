import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateNextDocumentNumber } from "@/lib/numbering";
import { logAudit } from "@/lib/audit";
import { AuditAction, DocumentType, DocumentStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const proforma = await prisma.documentRecord.findUnique({
    where: { id: params.id },
    include: {
      lines: true,
      workspace: true,
      client: true,
    },
  });

  if (!proforma) {
    return NextResponse.json({ error: "Proforma introuvable" }, { status: 404 });
  }

  // Vérifier qu'une facture n'a pas déjà été créée depuis cette proforma
  const existingInvoice = await prisma.documentRecord.findFirst({
    where: { proformaId: proforma.id },
  });

  if (existingInvoice) {
    return NextResponse.json(
      {
        error: `Une facture comptable existe déjà pour cette proforma : ${existingInvoice.documentNumber}`,
        invoiceId: existingInvoice.id,
      },
      { status: 400 }
    );
  }

  // 1. Générer le numéro officiel de facture séquentielle pour ce workspace
  const { documentNumber, sequentialIndex, year } = await generateNextDocumentNumber(
    proforma.workspaceId,
    DocumentType.INVOICE
  );

  // 2. Créer la Facture Comptable Définitive (sans écraser la proforma !)
  const invoice = await prisma.documentRecord.create({
    data: {
      workspaceId: proforma.workspaceId,
      clientId: proforma.clientId,
      projectId: proforma.projectId,
      documentType: DocumentType.INVOICE,
      documentNumber,
      sequentialIndex,
      year,
      status: DocumentStatus.DRAFT, // Démarre en brouillon avant émission finale
      proformaId: proforma.id,
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Échéance 30j
      validityDays: 30,
      paymentTerms: proforma.paymentTerms,
      notes: proforma.notes,
      internalNotes: `Facture générée d'après la proforma acceptée ${proforma.documentNumber}`,
      specialMentions: proforma.specialMentions,
      totalHt: proforma.totalHt,
      totalTax: proforma.totalTax,
      totalTtc: proforma.totalTtc,
      totalPaid: 0,
      balanceDue: proforma.totalTtc,
      advancePercentage: proforma.advancePercentage,
      isImmutable: false,
      lines: {
        create: proforma.lines.map((l) => ({
          sortOrder: l.sortOrder,
          designation: l.designation,
          description: l.description,
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

  // Mettre à jour le statut de la proforma pour indiquer qu'elle a été convertie
  await prisma.documentRecord.update({
    where: { id: proforma.id },
    data: {
      status: DocumentStatus.ACCEPTED,
    },
  });

  // Audit Log
  await logAudit({
    workspaceId: proforma.workspaceId,
    userId: session.id,
    userEmail: session.email,
    userRole: session.role,
    action: AuditAction.CREATED,
    entityType: "Document",
    entityId: invoice.id,
    entityReference: invoice.documentNumber,
    newValue: {
      action: "Conversion de proforma en facture comptable",
      proformaNumber: proforma.documentNumber,
      invoiceNumber: invoice.documentNumber,
      totalTtc: invoice.totalTtc,
    },
  });

  return NextResponse.json({
    success: true,
    invoice,
    message: `Facture ${invoice.documentNumber} créée avec succès.`,
  });
}
