import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSignatureProvider } from "@/lib/providers/signatureProvider";
import { getEmailProvider, renderEmailTemplate } from "@/lib/providers/emailProvider";
import { logAudit } from "@/lib/audit";
import { formatCurrency } from "@/lib/utils";
import { AuditAction, EmailTemplateType, SignatureStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const doc = await prisma.documentRecord.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      workspace: true,
    },
  });

  if (!doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  const signerName = doc.client.isCompany && doc.client.companyName
    ? `${doc.client.firstName} ${doc.client.lastName} (${doc.client.companyName})`.trim()
    : `${doc.client.firstName} ${doc.client.lastName}`.trim();

  const signatureProvider = getSignatureProvider();

  // Création via l'abstraction SignatureProvider
  const sigResult = await signatureProvider.createSignatureRequest({
    documentId: doc.id,
    documentNumber: doc.documentNumber,
    signerName,
    signerEmail: doc.client.email,
    signerPhone: doc.client.phone,
    signerType: "CLIENT",
    validityDays: doc.validityDays || 30,
  });

  // Enregistrement en base de la demande
  const signatureRequest = await prisma.signatureRequest.create({
    data: {
      workspaceId: doc.workspaceId,
      documentId: doc.id,
      token: sigResult.token,
      provider: signatureProvider.name,
      externalRequestId: sigResult.externalRequestId,
      status: SignatureStatus.PENDING,
      signerType: "CLIENT",
      signerName,
      signerEmail: doc.client.email,
      signerPhone: doc.client.phone,
      expiresAt: sigResult.expiresAt,
      events: {
        create: {
          eventType: "CREATED",
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          userAgent: req.headers.get("user-agent") || "JD-Services Internal",
          payloadJson: JSON.stringify({ action: "Demande de signature électronique initialisée" }),
        },
      },
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const signatureUrl = `${appUrl}/client/signature/${sigResult.token}`;

  // Envoi optionnel d'un email de notification au signataire
  const emailProvider = getEmailProvider();
  const { subject, bodyHtml } = renderEmailTemplate(EmailTemplateType.SIGNATURE_REQUEST, {
    clientName: signerName,
    documentNumber: doc.documentNumber,
    totalTtc: formatCurrency(doc.totalTtc),
    viewUrl: signatureUrl,
    signUrl: signatureUrl,
    workspaceName: doc.workspace.name,
  });

  await emailProvider.sendEmail({
    workspaceId: doc.workspaceId,
    documentId: doc.id,
    templateType: EmailTemplateType.SIGNATURE_REQUEST,
    recipientEmail: doc.client.email,
    recipientName: signerName,
    subject,
    bodyHtml,
  });

  // Audit Log
  await logAudit({
    workspaceId: doc.workspaceId,
    userId: session.id,
    userEmail: session.email,
    userRole: session.role,
    action: AuditAction.SENT,
    entityType: "Document",
    entityId: doc.id,
    entityReference: doc.documentNumber,
    newValue: {
      action: "Demande de signature électronique créée",
      token: sigResult.token,
      signerEmail: doc.client.email,
    },
  });

  return NextResponse.json({
    success: true,
    signatureUrl,
    token: sigResult.token,
    expiresAt: sigResult.expiresAt,
  });
}
