import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardWorkspace } from "@/lib/apiGuard";
import { logAudit } from "@/lib/audit";
import { AuditAction, DocumentStatus, PaymentMethod } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  const g = await guardWorkspace(workspaceId, "read");
  if (!g.ok) return g.response;

  const payments = await prisma.payment.findMany({
    where: { workspaceId: g.access.workspaceId },
    include: {
      client: { select: { firstName: true, lastName: true, companyName: true, isCompany: true } },
      document: { select: { documentNumber: true, totalTtc: true, status: true, documentType: true } },
    },
    orderBy: { paymentDate: "desc" },
  });

  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      documentId,
      amount,
      paymentMethod = PaymentMethod.TRANSFER,
      paymentDate = new Date(),
      reference,
      notes,
    } = body;

    if (!documentId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Document et montant supérieur à 0 obligatoires" }, { status: 400 });
    }

    const doc = await prisma.documentRecord.findUnique({
      where: { id: documentId },
    });

    if (!doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

    // Isolation et permission : seul un utilisateur autorisé dans l'espace du document avec rôle payeur peut enregistrer un paiement
    const g = await guardWorkspace(doc.workspaceId, "pay", true);
    if (!g.ok) return g.response;
    const { session, role, workspaceId } = g.access;

    const payAmount = Number(amount);
    const newTotalPaid = Math.round((doc.totalPaid + payAmount) * 100) / 100;
    const newBalanceDue = Math.round((doc.totalTtc - newTotalPaid) * 100) / 100;

    let newStatus = doc.status;
    if (newBalanceDue <= 0) {
      newStatus = DocumentStatus.PAID;
    } else if (newTotalPaid > 0) {
      newStatus = DocumentStatus.PARTIALLY_PAID;
    }

    // Créer le paiement et mettre à jour le document dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          workspaceId,
          documentId,
          clientId: doc.clientId,
          amount: payAmount,
          paymentDate: new Date(paymentDate),
          paymentMethod: paymentMethod as PaymentMethod,
          reference: reference || null,
          notes: notes || null,
          receivedById: session.id,
        },
      });

      const updatedDoc = await tx.documentRecord.update({
        where: { id: doc.id },
        data: {
          totalPaid: newTotalPaid,
          balanceDue: Math.max(0, newBalanceDue),
          status: newStatus,
        },
      });

      return { payment, updatedDoc };
    });

    // Audit Log
    await logAudit({
      workspaceId,
      userId: session.id,
      userEmail: session.email,
      userRole: role,
      action: newStatus === DocumentStatus.PAID ? AuditAction.PAID : AuditAction.PARTIALLY_PAID,
      entityType: "Document",
      entityId: doc.id,
      entityReference: doc.documentNumber,
      newValue: {
        amountPaid: payAmount,
        totalPaid: newTotalPaid,
        remainingBalance: newBalanceDue,
        status: newStatus,
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Erreur enregistrement paiement :", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
