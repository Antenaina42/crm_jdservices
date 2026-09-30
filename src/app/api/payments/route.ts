import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { AuditAction, DocumentStatus, PaymentMethod } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) return NextResponse.json({ error: "workspaceId requis" }, { status: 400 });

  const payments = await prisma.payment.findMany({
    where: { workspaceId },
    include: {
      client: { select: { firstName: true, lastName: true, companyName: true, isCompany: true } },
      document: { select: { documentNumber: true, totalTtc: true, status: true, documentType: true } },
    },
    orderBy: { paymentDate: "desc" },
  });

  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      workspaceId,
      documentId,
      amount,
      paymentMethod = PaymentMethod.TRANSFER,
      paymentDate = new Date(),
      reference,
      notes,
    } = body;

    if (!workspaceId || !documentId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Document et montant supérieur à 0 obligatoires" }, { status: 400 });
    }

    const doc = await prisma.documentRecord.findUnique({
      where: { id: documentId },
    });

    if (!doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

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
      userRole: session.role,
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
