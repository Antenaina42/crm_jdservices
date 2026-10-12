import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEntity } from "@/lib/apiGuard";
import { checkDocumentCompliance } from "@/lib/complianceEngine";
import { computeDocumentHash, logAudit } from "@/lib/audit";
import { AuditAction, DocumentStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await guardEntity("document", params.id, "issue");
  if (!g.ok) return g.response;
  const { session, role } = g.access;

  const doc = await prisma.documentRecord.findUnique({
    where: { id: params.id },
    include: {
      workspace: true,
      client: true,
      lines: true,
    },
  });

  if (!doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  if (doc.isImmutable) {
    return NextResponse.json({ error: "Ce document est déjà émis et verrouillé." }, { status: 400 });
  }

  // 1. Contrôle de conformité légale obligatoire (Code de commerce & CGI)
  const complianceData = {
    documentType: doc.documentType,
    documentNumber: doc.documentNumber,
    date: doc.date,
    dueDate: doc.dueDate,
    seller: {
      companyName: doc.workspace.companyName,
      legalForm: doc.workspace.legalForm,
      siren: doc.workspace.siren,
      siret: doc.workspace.siret,
      address: doc.workspace.address,
      postalCode: doc.workspace.postalCode,
      city: doc.workspace.city,
      vatNumber: doc.workspace.vatNumber,
    },
    client: {
      isCompany: doc.client.isCompany,
      companyName: doc.client.companyName,
      firstName: doc.client.firstName,
      lastName: doc.client.lastName,
      siren: doc.client.siren,
      address: doc.client.address,
      postalCode: doc.client.postalCode,
      city: doc.client.city,
      country: doc.client.country,
      deliveryAddress: doc.client.deliveryAddress,
    },
    lines: doc.lines.map((l) => ({
      designation: l.designation,
      quantity: l.quantity,
      unitPriceHt: l.unitPriceHt,
      taxRate: l.taxRate,
    })),
    totalHt: doc.totalHt,
    totalTtc: doc.totalTtc,
    paymentTerms: doc.paymentTerms,
  };

  const complianceResult = checkDocumentCompliance(complianceData);

  // Si le mode conformité est activé et qu'il y a des erreurs bloquantes, BLOQUER L'ÉMISSION
  if (doc.workspace.complianceCheck && !complianceResult.canIssue) {
    return NextResponse.json(
      {
        error: "Émission bloquée : Le document ne respecte pas toutes les obligations légales françaises.",
        checklist: complianceResult.checklist,
        errors: complianceResult.errors,
      },
      { status: 422 }
    );
  }

  // 2. Figer les snapshots immuables
  const snapshotSeller = JSON.stringify({
    companyName: doc.workspace.companyName,
    commercialName: doc.workspace.commercialName,
    legalForm: doc.workspace.legalForm,
    siren: doc.workspace.siren,
    siret: doc.workspace.siret,
    rcsCity: doc.workspace.rcsCity,
    vatNumber: doc.workspace.vatNumber,
    address: doc.workspace.address,
    postalCode: doc.workspace.postalCode,
    city: doc.workspace.city,
    country: doc.workspace.country,
    phone: doc.workspace.phone,
    email: doc.workspace.email,
  });

  const snapshotClient = JSON.stringify({
    isCompany: doc.client.isCompany,
    companyName: doc.client.companyName,
    name: `${doc.client.firstName} ${doc.client.lastName}`.trim(),
    siren: doc.client.siren,
    siret: doc.client.siret,
    vatNumber: doc.client.vatNumber,
    address: doc.client.address,
    postalCode: doc.client.postalCode,
    city: doc.client.city,
    country: doc.client.country,
  });

  // 3. Calcul de l'empreinte cryptographique SHA-256
  const documentHash = computeDocumentHash({
    documentNumber: doc.documentNumber,
    documentType: doc.documentType,
    date: doc.date,
    sellerSiren: doc.workspace.siren,
    clientIdentifier: doc.client.siren || doc.client.email,
    totalHt: doc.totalHt,
    totalTax: doc.totalTax,
    totalTtc: doc.totalTtc,
    lines: doc.lines.map((l) => ({
      designation: l.designation,
      quantity: l.quantity,
      unitPriceHt: l.unitPriceHt,
      taxRate: l.taxRate,
    })),
  });

  // 4. Verrouillage du document
  const updatedDoc = await prisma.documentRecord.update({
    where: { id: doc.id },
    data: {
      status: DocumentStatus.ISSUED,
      isImmutable: true,
      issuedAt: new Date(),
      issuedById: session.id,
      documentHash,
      snapshotSellerJson: snapshotSeller,
      snapshotClientJson: snapshotClient,
      complianceStatus: "VALID",
    },
  });

  // 5. Audit Log immuable
  await logAudit({
    workspaceId: doc.workspaceId,
    userId: session.id,
    userEmail: session.email,
    userRole: session.role,
    action: AuditAction.ISSUED,
    entityType: "Document",
    entityId: doc.id,
    entityReference: doc.documentNumber,
    newValue: {
      action: "Émission officielle du document et verrouillage",
      documentHash,
      totalTtc: doc.totalTtc,
    },
  });

  return NextResponse.json({
    success: true,
    document: updatedDoc,
    documentHash,
    checklist: complianceResult.checklist,
  });
}
