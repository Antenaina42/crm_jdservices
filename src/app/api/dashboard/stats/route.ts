import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DocumentType, DocumentStatus, ClientStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) return NextResponse.json({ error: "workspaceId requis" }, { status: 400 });

  // 1. Comptages clients & prospects (Strictement dans ce workspaceId !)
  const clientsCount = await prisma.client.count({
    where: { workspaceId, status: ClientStatus.ACTIVE },
  });

  const prospectsCount = await prisma.client.count({
    where: { workspaceId, status: ClientStatus.PROSPECT },
  });

  const activeProjectsCount = await prisma.project.count({
    where: { workspaceId, status: "IN_PROGRESS" },
  });

  // 2. Proformas par statut
  const proformasDraft = await prisma.documentRecord.count({
    where: { workspaceId, documentType: DocumentType.PROFORMA, status: DocumentStatus.DRAFT },
  });

  const proformasSent = await prisma.documentRecord.count({
    where: { workspaceId, documentType: DocumentType.PROFORMA, status: DocumentStatus.SENT },
  });

  const proformasAccepted = await prisma.documentRecord.count({
    where: { workspaceId, documentType: DocumentType.PROFORMA, status: DocumentStatus.ACCEPTED },
  });

  // 3. Factures par statut
  const invoicesIssued = await prisma.documentRecord.count({
    where: {
      workspaceId,
      documentType: DocumentType.INVOICE,
      status: { in: [DocumentStatus.ISSUED, DocumentStatus.SENT, DocumentStatus.PARTIALLY_PAID] },
    },
  });

  const invoicesPaid = await prisma.documentRecord.count({
    where: { workspaceId, documentType: DocumentType.INVOICE, status: DocumentStatus.PAID },
  });

  const now = new Date();
  const invoicesOverdue = await prisma.documentRecord.count({
    where: {
      workspaceId,
      documentType: DocumentType.INVOICE,
      dueDate: { lt: now },
      status: { notIn: [DocumentStatus.PAID, DocumentStatus.CANCELLED, DocumentStatus.CREDITED] },
    },
  });

  // 4. Signatures en attente
  const signaturesPending = await prisma.signatureRequest.count({
    where: { workspaceId, status: "PENDING" },
  });

  // 5. Chiffre d'Affaires et Totaux Financiers (Sur factures émises et payées)
  const invoices = await prisma.documentRecord.findMany({
    where: {
      workspaceId,
      documentType: DocumentType.INVOICE,
      status: { notIn: [DocumentStatus.CANCELLED, DocumentStatus.DRAFT] },
    },
    select: {
      totalHt: true,
      totalTax: true,
      totalTtc: true,
      totalPaid: true,
      balanceDue: true,
    },
  });

  let caHt = 0;
  let caTax = 0;
  let caTtc = 0;
  let caCollected = 0;
  let caPending = 0;

  for (const inv of invoices) {
    caHt += inv.totalHt;
    caTax += inv.totalTax;
    caTtc += inv.totalTtc;
    caCollected += inv.totalPaid;
    caPending += inv.balanceDue;
  }

  // 6. Activités Récentes (Journal d'audit et documents récents)
  const recentLogs = await prisma.auditLog.findMany({
    where: { workspaceId },
    orderBy: { timestamp: "desc" },
    take: 10,
  });

  const recentDocuments = await prisma.documentRecord.findMany({
    where: { workspaceId },
    include: { client: { select: { firstName: true, lastName: true, companyName: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json({
    kpis: {
      clientsCount,
      prospectsCount,
      activeProjectsCount,
      proformasDraft,
      proformasSent,
      proformasAccepted,
      invoicesIssued,
      invoicesPaid,
      invoicesOverdue,
      signaturesPending,
    },
    financial: {
      caHt: Math.round(caHt * 100) / 100,
      caTax: Math.round(caTax * 100) / 100,
      caTtc: Math.round(caTtc * 100) / 100,
      caCollected: Math.round(caCollected * 100) / 100,
      caPending: Math.round(caPending * 100) / 100,
    },
    recentLogs,
    recentDocuments,
  });
}
