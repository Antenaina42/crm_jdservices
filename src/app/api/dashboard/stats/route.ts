import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardWorkspace } from "@/lib/apiGuard";
import { DocumentType, DocumentStatus, ClientStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  const g = await guardWorkspace(workspaceId, "read");
  if (!g.ok) return g.response;

  const validWorkspaceId = g.access.workspaceId;

  // 1. Comptages clients & prospects (Strictement dans ce workspaceId !)
  const clientsCount = await prisma.client.count({
    where: { workspaceId: validWorkspaceId, status: ClientStatus.ACTIVE },
  });

  const prospectsCount = await prisma.client.count({
    where: { workspaceId: validWorkspaceId, status: ClientStatus.PROSPECT },
  });

  const activeProjectsCount = await prisma.project.count({
    where: { workspaceId: validWorkspaceId, status: "IN_PROGRESS" },
  });

  // 2. Proformas par statut
  const proformasDraft = await prisma.documentRecord.count({
    where: { workspaceId: validWorkspaceId, documentType: DocumentType.PROFORMA, status: DocumentStatus.DRAFT },
  });

  const proformasSent = await prisma.documentRecord.count({
    where: { workspaceId: validWorkspaceId, documentType: DocumentType.PROFORMA, status: DocumentStatus.SENT },
  });

  const proformasAccepted = await prisma.documentRecord.count({
    where: { workspaceId: validWorkspaceId, documentType: DocumentType.PROFORMA, status: DocumentStatus.ACCEPTED },
  });

  // 3. Factures par statut
  const invoicesIssued = await prisma.documentRecord.count({
    where: {
      workspaceId: validWorkspaceId,
      documentType: DocumentType.INVOICE,
      status: { in: [DocumentStatus.ISSUED, DocumentStatus.SENT, DocumentStatus.PARTIALLY_PAID] },
    },
  });

  const invoicesPaid = await prisma.documentRecord.count({
    where: { workspaceId: validWorkspaceId, documentType: DocumentType.INVOICE, status: DocumentStatus.PAID },
  });

  const now = new Date();
  const invoicesOverdue = await prisma.documentRecord.count({
    where: {
      workspaceId: validWorkspaceId,
      documentType: DocumentType.INVOICE,
      dueDate: { lt: now },
      status: { notIn: [DocumentStatus.PAID, DocumentStatus.CANCELLED, DocumentStatus.CREDITED] },
    },
  });

  // 4. Signatures en attente
  const signaturesPending = await prisma.signatureRequest.count({
    where: { workspaceId: validWorkspaceId, status: "PENDING" },
  });

  // 5. Chiffre d'Affaires et Totaux Financiers (Sur factures émises et payées)
  const invoices = await prisma.documentRecord.findMany({
    where: {
      workspaceId: validWorkspaceId,
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
    where: { workspaceId: validWorkspaceId },
    orderBy: { timestamp: "desc" },
    take: 10,
  });

  const recentDocuments = await prisma.documentRecord.findMany({
    where: { workspaceId: validWorkspaceId },
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
