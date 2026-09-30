import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateDocumentTotals } from "@/lib/taxEngine";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const doc = await prisma.documentRecord.findUnique({
    where: { id: params.id },
    include: {
      workspace: true,
      client: true,
      project: true,
      lines: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paymentDate: "desc" } },
      signatureRequests: {
        include: { events: { orderBy: { timestamp: "desc" } } },
        orderBy: { createdAt: "desc" },
      },
      creditNotes: true,
      originalInvoice: true,
    },
  });

  if (!doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  return NextResponse.json({ document: doc });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const doc = await prisma.documentRecord.findUnique({
    where: { id: params.id },
  });

  if (!doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  // RÈGLE CRITIQUE D'IMMUTABILITÉ
  // Une facture ou document émis ne peut JAMAIS être directement modifié
  if (doc.isImmutable) {
    return NextResponse.json(
      {
        error: "MODIFICATION INTERDITE : Ce document a été émis de manière définitive et est immuable. Pour corriger une erreur, veuillez créer un avoir ou une facture rectificative.",
      },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { date, dueDate, notes, internalNotes, specialMentions, paymentTerms, advancePercentage, lines } = body;

  const oldValues = {
    totalHt: doc.totalHt,
    totalTtc: doc.totalTtc,
    notes: doc.notes,
  };

  let totals = { totalHt: doc.totalHt, totalTax: doc.totalTax, totalTtc: doc.totalTtc };

  if (lines && lines.length > 0) {
    const lineInputs = lines.map((l: any) => ({
      unitPriceHt: Number(l.unitPriceHt) || 0,
      quantity: Number(l.quantity) || 1,
      taxRate: Number(l.taxRate) || 20.0,
      taxRateName: l.taxRateName || `TVA ${l.taxRate}%`,
    }));
    totals = calculateDocumentTotals(lineInputs);

    // Remplacer les lignes
    await prisma.documentLine.deleteMany({ where: { documentId: doc.id } });
    await prisma.documentLine.createMany({
      data: lines.map((l: any, idx: number) => {
        const lHt = Number(l.unitPriceHt) * Number(l.quantity);
        const lTax = (lHt * Number(l.taxRate)) / 100;
        return {
          documentId: doc.id,
          sortOrder: idx + 1,
          designation: l.designation,
          description: l.description || null,
          quantity: Number(l.quantity) || 1,
          unit: l.unit || "Forfait",
          unitPriceHt: Number(l.unitPriceHt) || 0,
          taxRate: Number(l.taxRate) || 20.0,
          taxRateName: l.taxRateName || `TVA ${l.taxRate}%`,
          totalHt: Math.round(lHt * 100) / 100,
          totalTax: Math.round(lTax * 100) / 100,
          totalTtc: Math.round((lHt + lTax) * 100) / 100,
        };
      }),
    });
  }

  const updatedDoc = await prisma.documentRecord.update({
    where: { id: doc.id },
    data: {
      date: date ? new Date(date) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes: notes !== undefined ? notes : undefined,
      internalNotes: internalNotes !== undefined ? internalNotes : undefined,
      specialMentions: specialMentions !== undefined ? specialMentions : undefined,
      paymentTerms: paymentTerms !== undefined ? paymentTerms : undefined,
      advancePercentage: advancePercentage !== undefined ? Number(advancePercentage) : undefined,
      totalHt: totals.totalHt,
      totalTax: totals.totalTax,
      totalTtc: totals.totalTtc,
      balanceDue: totals.totalTtc - doc.totalPaid,
    },
    include: { lines: true },
  });

  // Audit Log
  await logAudit({
    workspaceId: doc.workspaceId,
    userId: session.id,
    userEmail: session.email,
    userRole: session.role,
    action: AuditAction.UPDATED,
    entityType: "Document",
    entityId: doc.id,
    entityReference: doc.documentNumber,
    oldValue: oldValues,
    newValue: { totalHt: updatedDoc.totalHt, totalTtc: updatedDoc.totalTtc },
  });

  return NextResponse.json({ success: true, document: updatedDoc });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const doc = await prisma.documentRecord.findUnique({
    where: { id: params.id },
  });

  if (!doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  // RÈGLE LÉGALE STRICTE : Une facture émise ne peut JAMAIS être supprimée
  if (doc.isImmutable || doc.documentType === "INVOICE" || doc.documentType === "CREDIT_NOTE") {
    return NextResponse.json(
      {
        error: "SUPPRESSION INTERDITE : Conformément au Code de commerce et aux obligations fiscales françaises, une facture ou un avoir émis ne peut jamais être supprimé. Vous devez émettre un avoir ou marquer le document comme annulé avec traçabilité.",
      },
      { status: 403 }
    );
  }

  await prisma.documentRecord.delete({ where: { id: doc.id } });

  await logAudit({
    workspaceId: doc.workspaceId,
    userId: session.id,
    userEmail: session.email,
    userRole: session.role,
    action: AuditAction.DELETED,
    entityType: "Document",
    entityId: doc.id,
    entityReference: doc.documentNumber,
  });

  return NextResponse.json({ success: true, message: "Document brouillon supprimé" });
}
