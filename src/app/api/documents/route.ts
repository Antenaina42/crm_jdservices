import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateNextDocumentNumber } from "@/lib/numbering";
import { calculateDocumentTotals } from "@/lib/taxEngine";
import { logAudit } from "@/lib/audit";
import { AuditAction, DocumentType, DocumentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const type = searchParams.get("type") as DocumentType | null;

  if (!workspaceId) return NextResponse.json({ error: "workspaceId requis" }, { status: 400 });

  const whereClause: any = { workspaceId };
  if (type) whereClause.documentType = type;

  const documents = await prisma.documentRecord.findMany({
    where: whereClause,
    include: {
      client: { select: { id: true, firstName: true, lastName: true, companyName: true, isCompany: true, email: true } },
      project: { select: { id: true, title: true, projectNumber: true } },
      lines: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      workspaceId,
      clientId,
      projectId,
      documentType = DocumentType.PROFORMA,
      date = new Date(),
      dueDate,
      validityDays = 30,
      paymentTerms,
      notes,
      internalNotes,
      specialMentions,
      advancePercentage = 0,
      lines = [],
    } = body;

    if (!workspaceId || !clientId || lines.length === 0) {
      return NextResponse.json(
        { error: "Workspace, client et au moins une ligne de prestation sont obligatoires" },
        { status: 400 }
      );
    }

    // 1. Calculs financiers et ventilation TVA
    const lineInputs = lines.map((l: any) => ({
      unitPriceHt: Number(l.unitPriceHt) || 0,
      quantity: Number(l.quantity) || 1,
      taxRate: Number(l.taxRate) || 20.0,
      taxRateName: l.taxRateName || `TVA ${l.taxRate}%`,
    }));

    const totals = calculateDocumentTotals(lineInputs);

    // 2. Génération transactionnelle du numéro de document
    const { documentNumber, sequentialIndex, year } = await generateNextDocumentNumber(
      workspaceId,
      documentType as DocumentType
    );

    // 3. Date d'échéance par défaut si non fournie
    const computedDueDate = dueDate
      ? new Date(dueDate)
      : new Date(new Date(date).getTime() + validityDays * 24 * 60 * 60 * 1000);

    // 4. Création en base
    const document = await prisma.documentRecord.create({
      data: {
        workspaceId,
        clientId,
        projectId: projectId || null,
        documentType: documentType as DocumentType,
        documentNumber,
        sequentialIndex,
        year,
        status: DocumentStatus.DRAFT,
        date: new Date(date),
        dueDate: computedDueDate,
        validityDays: Number(validityDays),
        paymentTerms,
        notes,
        internalNotes,
        specialMentions,
        totalHt: totals.totalHt,
        totalTax: totals.totalTax,
        totalTtc: totals.totalTtc,
        totalPaid: 0,
        balanceDue: totals.totalTtc,
        advancePercentage: Number(advancePercentage),
        isImmutable: false,
        lines: {
          create: lines.map((l: any, idx: number) => {
            const lHt = Number(l.unitPriceHt) * Number(l.quantity);
            const lTax = (lHt * Number(l.taxRate)) / 100;
            return {
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
        },
      },
      include: {
        lines: true,
        client: true,
      },
    });

    // 5. Audit Log
    await logAudit({
      workspaceId,
      userId: session.id,
      userEmail: session.email,
      userRole: session.role,
      action: AuditAction.CREATED,
      entityType: "Document",
      entityId: document.id,
      entityReference: document.documentNumber,
      newValue: {
        documentNumber: document.documentNumber,
        type: document.documentType,
        totalTtc: document.totalTtc,
      },
    });

    return NextResponse.json({ success: true, document });
  } catch (error: any) {
    console.error("Erreur création document :", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
